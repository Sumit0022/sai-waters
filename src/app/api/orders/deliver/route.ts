import { NextResponse } from "next/server";
import { getDb, ensureDatabaseReady } from "@/db";
import {
  orders,
  customers,
  jarMasters,
  jarCustodies,
  jarMovementEvents,
  invoices,
  invoiceLines,
  receipts,
  cashCollectionSubmissions,
  users,
} from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { lookupJar, transitionJarState } from "@/lib/jars";
import { recordFieldCashCollection } from "@/lib/cash";

// POST: Settle bulk order delivery with reverse undelivered logic
export async function POST(request: Request) {
  try {
    await ensureDatabaseReady();
    const db = getDb();
    const body = await request.json();

    const { orderId, undeliveredJarCodes = [], cashCollectedPaise = 0, approvedBy = "usr_driver_01" } = body;

    if (!orderId) {
      return NextResponse.json({ error: "Missing required field: orderId" }, { status: 400 });
    }

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) {
      return NextResponse.json({ error: `Order '${orderId}' not found` }, { status: 404 });
    }

    const [cust] = await db.select().from(customers).where(eq(customers.id, order.customerId)).limit(1);

    // Parse dispatch metadata from deliveryNotes
    let dispatchMeta: any = {};
    if (order.deliveryNotes) {
      try {
        dispatchMeta = JSON.parse(order.deliveryNotes);
      } catch (e) {
        dispatchMeta = { notes: order.deliveryNotes };
      }
    }

    const dispatchedJars: string[] = dispatchMeta.dispatchedJars || [];

    // Clean undelivered jar codes
    const cleanUndelivered = Array.isArray(undeliveredJarCodes)
      ? undeliveredJarCodes.map((j: string) => String(j).replace("urn:sw:j:", "").trim()).filter(Boolean)
      : [];

    // Accepted jars = Dispatched jars MINUS undelivered/rejected jars
    let acceptedJars: string[] = [];
    let deliveredCount = 0;

    if (dispatchedJars.length > 0) {
      acceptedJars = dispatchedJars.filter((code) => !cleanUndelivered.includes(code));
      deliveredCount = acceptedJars.length;
    } else {
      // If order was dispatched with count only
      deliveredCount = Math.max(0, order.quantityJars - cleanUndelivered.length);
    }

    const totalAmountPaise = deliveredCount * order.unitPricePaise;

    // 1. Transition Accepted Jars to DELIVERED_CUSTOMER (Increment customer held count)
    const deliveredJarCodes: string[] = [];
    for (const code of acceptedJars) {
      const jar = await lookupJar(code);
      if (jar) {
        await transitionJarState({
          jarId: jar.id,
          toStatus: "DELIVERED_CUSTOMER",
          actorUserId: approvedBy,
          orderId: order.id,
          customerId: cust?.id,
          notes: `Doorstep accepted bulk jar (${order.orderNumber})`,
        });
        deliveredJarCodes.push(jar.permanentJarCode);
      }
    }

    // If untracked jars accepted, increment held count directly
    const untrackedDelivered = deliveredCount - deliveredJarCodes.length;
    if (untrackedDelivered > 0 && cust) {
      await db.execute(sql`
        UPDATE customers SET held_jars_count = held_jars_count + ${untrackedDelivered} WHERE id = ${cust.id};
      `);
    }

    // 2. Undelivered Jars remain in vehicle / return to plant
    for (const code of cleanUndelivered) {
      const jar = await lookupJar(code);
      if (jar) {
        // Log movement event indicating rejected/cancelled at doorstep
        await db.insert(jarMovementEvents).values({
          id: `jme_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          jarId: jar.id,
          actorUserId: approvedBy,
          orderId: order.id,
          fromStatus: "IN_TRANSIT",
          toStatus: "IN_TRANSIT",
          notes: `Doorstep return to truck - cancelled by venue (${order.orderNumber})`,
        });
      }
    }

    // 3. Update Order record
    const updatedMeta = {
      ...dispatchMeta,
      deliveredCount,
      undeliveredCount: cleanUndelivered.length,
      undeliveredJars: cleanUndelivered,
      deliveredJars: acceptedJars,
      settledAt: new Date().toISOString(),
      approvedBy,
      cashCollectedPaise: Number(cashCollectedPaise || 0),
    };

    await db
      .update(orders)
      .set({
        status: "DELIVERED",
        quantityJars: deliveredCount,
        totalAmountPaise,
        deliveryNotes: JSON.stringify(updatedMeta),
      })
      .where(eq(orders.id, order.id));

    // 4. Update existing Invoice (if one exists for this order) with new adjusted amount
    const [existingInv] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.orderId, order.id))
      .limit(1);

    let receiptNumber: string | null = null;

    if (existingInv) {
      await db
        .update(invoices)
        .set({
          subtotalPaise: totalAmountPaise,
          totalAmountPaise,
          status: Number(cashCollectedPaise) >= totalAmountPaise ? "PAID" : "ISSUED",
          paidAmountPaise: Math.min(Number(cashCollectedPaise || 0), totalAmountPaise),
        })
        .where(eq(invoices.id, existingInv.id));

      await db
        .update(invoiceLines)
        .set({
          quantity: deliveredCount,
          lineTotalPaise: totalAmountPaise,
        })
        .where(eq(invoiceLines.invoiceId, existingInv.id));

      // Record Cash Receipt if cash was paid on doorstep
      if (Number(cashCollectedPaise) > 0 && cust) {
        const cashRes = await recordFieldCashCollection({
          driverId: approvedBy,
          customerId: cust.id,
          invoiceId: existingInv.id,
          orderId: order.id,
          amountCollectedPaise: Number(cashCollectedPaise),
        });
        receiptNumber = cashRes.receiptNumber;
      }
    }

    return NextResponse.json({
      success: true,
      orderNumber: order.orderNumber,
      customerName: cust?.fullName || "Customer",
      dispatchedCount: dispatchedJars.length || order.quantityJars,
      deliveredCount,
      undeliveredCount: cleanUndelivered.length,
      totalAmountPaise,
      cashCollectedPaise: Number(cashCollectedPaise || 0),
      receiptNumber,
      approvedBy,
    });
  } catch (err: any) {
    console.error("Bulk delivery settlement error:", err);
    return NextResponse.json({ error: err.message || "Failed to settle bulk delivery" }, { status: 500 });
  }
}
