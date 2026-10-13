import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { jarMovementEvents, cashCollectionSubmissions, jarMasters, customers, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const db = await getDb();

    // Fetch recent jar movement events
    const movements = await db
      .select({
        id: jarMovementEvents.id,
        eventType: jarMovementEvents.toStatus,
        createdAt: jarMovementEvents.createdAt,
        notes: jarMovementEvents.notes,
        jarCode: jarMasters.permanentJarCode,
        actorName: users.fullName,
      })
      .from(jarMovementEvents)
      .leftJoin(jarMasters, eq(jarMovementEvents.jarId, jarMasters.id))
      .leftJoin(users, eq(jarMovementEvents.actorUserId, users.id))
      .orderBy(desc(jarMovementEvents.createdAt))
      .limit(15);

    // Fetch recent cash collections
    const cashEvents = await db
      .select({
        id: cashCollectionSubmissions.id,
        amountPaise: cashCollectionSubmissions.amountCollectedPaise,
        collectedAt: cashCollectionSubmissions.collectedAt,
        driverName: users.fullName,
      })
      .from(cashCollectionSubmissions)
      .leftJoin(users, eq(cashCollectionSubmissions.driverId, users.id))
      .orderBy(desc(cashCollectionSubmissions.collectedAt))
      .limit(10);

    return NextResponse.json({
      success: true,
      serverTime: new Date().toISOString(),
      recentMovements: movements,
      recentCashEvents: cashEvents,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
