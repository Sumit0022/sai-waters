import { getDb } from "@/db";
import { jarMasters, qrIdentifiers, jarMovementEvents, jarCustodies, customers, damageLossCases } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { postJournalEntry } from "./accounting";

export type JarStatus =
  | "AVAILABLE"
  | "RESERVED"
  | "ALLOCATED"
  | "IN_TRANSIT"
  | "DELIVERED_CUSTOMER"
  | "RETURNED_INSPECT"
  | "UNDER_REPAIR"
  | "MISSING_INVESTIG"
  | "CONFIRMED_LOST"
  | "RETIRED";

// Valid State Transitions Map
const VALID_TRANSITIONS: Record<JarStatus, JarStatus[]> = {
  AVAILABLE: ["RESERVED", "ALLOCATED", "UNDER_REPAIR", "RETIRED"],
  RESERVED: ["ALLOCATED", "AVAILABLE"],
  ALLOCATED: ["IN_TRANSIT", "AVAILABLE"],
  IN_TRANSIT: ["DELIVERED_CUSTOMER", "ALLOCATED", "AVAILABLE"],
  DELIVERED_CUSTOMER: ["RETURNED_INSPECT", "MISSING_INVESTIG"],
  RETURNED_INSPECT: ["AVAILABLE", "UNDER_REPAIR", "RETIRED"],
  UNDER_REPAIR: ["AVAILABLE", "RETIRED"],
  MISSING_INVESTIG: ["RETURNED_INSPECT", "CONFIRMED_LOST"],
  CONFIRMED_LOST: ["RETIRED", "RETURNED_INSPECT"], // late recovery possible
  RETIRED: [],
};

/**
 * Validates whether a state transition is legal in the Finite State Machine
 */
export function isValidTransition(from: JarStatus, to: JarStatus): boolean {
  if (from === to) return true;
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Resolves a QR token or permanent Jar Code to the Master Jar Record
 */
export async function lookupJar(query: string) {
  const db = getDb();
  const trimmed = query.trim();

  // Try direct permanent code lookup
  const byCode = await db.select().from(jarMasters).where(eq(jarMasters.permanentJarCode, trimmed)).limit(1);
  if (byCode.length > 0) return byCode[0];

  // Try QR token lookup
  const byToken = await db
    .select({
      jar: jarMasters,
      qr: qrIdentifiers,
    })
    .from(qrIdentifiers)
    .innerJoin(jarMasters, eq(qrIdentifiers.jarId, jarMasters.id))
    .where(eq(qrIdentifiers.qrToken, trimmed))
    .limit(1);

  if (byToken.length > 0) {
    return byToken[0].jar;
  }

  return null;
}

/**
 * Updates Jar Status and records immutable movement event
 */
export async function transitionJarState(params: {
  jarId: string;
  toStatus: JarStatus;
  actorUserId: string;
  orderId?: string;
  assignmentId?: string;
  customerId?: string;
  geoLat?: string;
  geoLng?: string;
  clientEventId?: string;
  notes?: string;
}) {
  const db = getDb();

  const jar = (await db.select().from(jarMasters).where(eq(jarMasters.id, params.jarId)).limit(1))[0];
  if (!jar) {
    throw new Error(`Jar not found with ID ${params.jarId}`);
  }

  const fromStatus = jar.currentStatus as JarStatus;

  if (!isValidTransition(fromStatus, params.toStatus)) {
    throw new Error(
      `Illegal State Transition for jar ${jar.permanentJarCode}: cannot transition from '${fromStatus}' to '${params.toStatus}'`
    );
  }

  // 1. Update Jar Master
  await db
    .update(jarMasters)
    .set({
      currentStatus: params.toStatus,
      totalUsageCycles: params.toStatus === "RETURNED_INSPECT" ? jar.totalUsageCycles + 1 : jar.totalUsageCycles,
    })
    .where(eq(jarMasters.id, params.jarId));

  // 2. Insert Immutable Movement Event
  const eventId = `jme_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  await db.insert(jarMovementEvents).values({
    id: eventId,
    jarId: params.jarId,
    actorUserId: params.actorUserId,
    orderId: params.orderId || null,
    assignmentId: params.assignmentId || null,
    fromStatus,
    toStatus: params.toStatus,
    geoLat: params.geoLat || null,
    geoLng: params.geoLng || null,
    clientEventId: params.clientEventId || null,
    notes: params.notes || null,
    createdAt: new Date(),
  });

  // 3. Update Custody Table
  if (params.toStatus === "DELIVERED_CUSTOMER" && params.customerId) {
    await db
      .insert(jarCustodies)
      .values({
        jarId: params.jarId,
        custodyType: "WITH_CUSTOMER",
        customerId: params.customerId,
        holderUserId: null,
        transferredAt: new Date(),
      })
      .onConflictDoUpdate({
        target: jarCustodies.jarId,
        set: {
          custodyType: "WITH_CUSTOMER",
          customerId: params.customerId,
          holderUserId: null,
          transferredAt: new Date(),
        },
      });

    // Increment customer's active held jar count
    await db.execute(sql`
      UPDATE customers SET held_jars_count = held_jars_count + 1 WHERE id = ${params.customerId};
    `);
  } else if (params.toStatus === "RETURNED_INSPECT") {
    // If jar was with a customer, decrement customer custody count
    const existingCustody = (await db.select().from(jarCustodies).where(eq(jarCustodies.jarId, params.jarId)).limit(1))[0];
    if (existingCustody && existingCustody.customerId) {
      await db.execute(sql`
        UPDATE customers SET held_jars_count = GREATEST(0, held_jars_count - 1) WHERE id = ${existingCustody.customerId};
      `);
    }

    await db
      .insert(jarCustodies)
      .values({
        jarId: params.jarId,
        custodyType: "PLANT",
        customerId: null,
        holderUserId: null,
        transferredAt: new Date(),
      })
      .onConflictDoUpdate({
        target: jarCustodies.jarId,
        set: {
          custodyType: "PLANT",
          customerId: null,
          holderUserId: null,
          transferredAt: new Date(),
        },
      });
  }

  return { success: true, jarId: params.jarId, fromStatus, toStatus: params.toStatus };
}

/**
 * Re-label an existing jar with a new QR token while retaining master history
 */
export async function relabelJar(jarId: string, newQrToken: string, reason: string = "Label damaged / faded") {
  const db = getDb();

  // Retire existing active QR tokens for this jar
  await db
    .update(qrIdentifiers)
    .set({
      isActive: false,
      retiredAt: new Date(),
      retirementReason: reason,
    })
    .where(eq(qrIdentifiers.jarId, jarId));

  // Insert new active QR token
  const newQrId = `qr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  await db.insert(qrIdentifiers).values({
    id: newQrId,
    jarId,
    qrToken: newQrToken,
    isActive: true,
    issuedAt: new Date(),
  });

  return { success: true, jarId, newQrToken };
}

/**
 * Owner-authorized jar loss charge and accounting derecognition
 */
export async function authorizeJarLoss(params: {
  caseId: string;
  jarId: string;
  customerId: string;
  agreedChargePaise: number; // e.g. ₹200.00 = 20000
  authorizedBy: string;
  notes: string;
}) {
  const db = getDb();

  // 1. Move jar to CONFIRMED_LOST
  await transitionJarState({
    jarId: params.jarId,
    toStatus: "CONFIRMED_LOST",
    actorUserId: params.authorizedBy,
    customerId: params.customerId,
    notes: `Authorized loss charge: ${params.notes}`,
  });

  // 2. Update Damage Case
  await db
    .update(damageLossCases)
    .set({
      caseStatus: "APPROVED_LOSS_CHARGED",
      agreedChargePaise: params.agreedChargePaise,
      authorizedBy: params.authorizedBy,
      notes: params.notes,
      resolvedAt: new Date(),
    })
    .where(eq(damageLossCases.id, params.caseId));

  // 3. Post Accounting Journal Voucher:
  // Dr. Accounts Receivable (Customer owes agreed loss fee)
  // Cr. Jar Loss Recovery Income (Account 4210)
  if (params.agreedChargePaise > 0) {
    await postJournalEntry({
      sourceDocumentType: "LOSS_CHARGE",
      sourceDocumentId: params.caseId,
      narration: `Customer jar loss recovery charge for Jar ${params.jarId} (${params.notes})`,
      postedBy: params.authorizedBy,
      lines: [
        {
          accountId: 1150, // Accounts Receivable
          debitPaise: params.agreedChargePaise,
          creditPaise: 0,
          subLedgerType: "CUSTOMER",
          subLedgerId: params.customerId,
        },
        {
          accountId: 4210, // Jar Loss Recovery Income
          debitPaise: 0,
          creditPaise: params.agreedChargePaise,
        },
      ],
    });

    // Update customer outstanding balance
    await db.execute(sql`
      UPDATE customers SET current_balance_paise = current_balance_paise + ${params.agreedChargePaise} WHERE id = ${params.customerId};
    `);
  }

  return { success: true, jarId: params.jarId, agreedChargePaise: params.agreedChargePaise };
}
