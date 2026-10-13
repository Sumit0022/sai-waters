import { getDb } from "@/db";
import { offlineSyncEvents, jarMasters, dispatchRecords, orders } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { transitionJarState, lookupJar } from "./jars";
import { recordFieldCashCollection } from "./cash";

export interface ClientOfflineEvent {
  clientEventId: string;
  deviceId?: string;
  userId: string;
  eventType: "DELIVERY_CONFIRM" | "DISPATCH_SCAN" | "CASH_COLLECT" | "EXCEPTION_REPORT";
  payload: any;
  clientTimestamp: string;
}

/**
 * Server-side Idempotent Offline Sync Processor
 */
export async function processOfflineSyncBatch(events: ClientOfflineEvent[]) {
  const db = getDb();
  const results = [];

  for (const event of events) {
    // 1. Idempotency Check
    const existing = await db
      .select()
      .from(offlineSyncEvents)
      .where(eq(offlineSyncEvents.clientEventId, event.clientEventId))
      .limit(1);

    if (existing.length > 0) {
      results.push({
        clientEventId: event.clientEventId,
        status: existing[0].syncStatus,
        message: "Already processed (idempotent duplicate skipped)",
      });
      continue;
    }

    try {
      if (event.eventType === "DELIVERY_CONFIRM") {
        const { orderId, customerId, fullJarsScanned, emptyJarsScanned, cashCollectedPaise } = event.payload;

        // Transition delivered jars to DELIVERED_CUSTOMER
        for (const tokenOrCode of fullJarsScanned || []) {
          const jar = await lookupJar(tokenOrCode);
          if (jar) {
            await transitionJarState({
              jarId: jar.id,
              toStatus: "DELIVERED_CUSTOMER",
              actorUserId: event.userId,
              orderId,
              customerId,
              clientEventId: event.clientEventId,
              notes: "Offline synced delivery confirmation",
            });
          }
        }

        // Transition returned jars to RETURNED_INSPECT
        for (const tokenOrCode of emptyJarsScanned || []) {
          const jar = await lookupJar(tokenOrCode);
          if (jar) {
            await transitionJarState({
              jarId: jar.id,
              toStatus: "RETURNED_INSPECT",
              actorUserId: event.userId,
              orderId,
              clientEventId: event.clientEventId,
              notes: "Offline synced empty return",
            });
          }
        }

        // Update dispatch record
        if (orderId) {
          await db
            .update(dispatchRecords)
            .set({
              status: "DELIVERED",
              fullJarsDelivered: (fullJarsScanned || []).length,
              emptyJarsReturned: (emptyJarsScanned || []).length,
            })
            .where(eq(dispatchRecords.orderId, orderId));

          await db.update(orders).set({ status: "DELIVERED" }).where(eq(orders.id, orderId));
        }

        // If cash was collected
        if (cashCollectedPaise && cashCollectedPaise > 0) {
          await recordFieldCashCollection({
            driverId: event.userId,
            orderId,
            customerId,
            amountCollectedPaise: cashCollectedPaise,
            clientEventId: event.clientEventId,
          });
        }
      } else if (event.eventType === "CASH_COLLECT") {
        const { customerId, orderId, invoiceId, amountCollectedPaise } = event.payload;
        await recordFieldCashCollection({
          driverId: event.userId,
          orderId,
          invoiceId,
          customerId,
          amountCollectedPaise,
          clientEventId: event.clientEventId,
        });
      }

      // Record successful sync log
      await db.insert(offlineSyncEvents).values({
        id: `ose_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        clientEventId: event.clientEventId,
        deviceId: event.deviceId || null,
        userId: event.userId,
        eventType: event.eventType,
        payloadJson: JSON.stringify(event.payload),
        syncStatus: "PROCESSED",
        processedAt: new Date(),
      });

      results.push({ clientEventId: event.clientEventId, status: "PROCESSED" });
    } catch (err: any) {
      // Record conflict / rejection log
      await db.insert(offlineSyncEvents).values({
        id: `ose_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        clientEventId: event.clientEventId,
        deviceId: event.deviceId || null,
        userId: event.userId,
        eventType: event.eventType,
        payloadJson: JSON.stringify(event.payload),
        syncStatus: "CONFLICT_REJECTED",
        errorLog: err?.message || String(err),
        processedAt: new Date(),
      });

      results.push({
        clientEventId: event.clientEventId,
        status: "CONFLICT_REJECTED",
        error: err?.message,
      });
    }
  }

  return { success: true, processedCount: results.length, details: results };
}
