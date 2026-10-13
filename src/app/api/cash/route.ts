import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { cashCollectionSubmissions, cashHandovers, users, orders, customers } from "@/db/schema";
import { recordFieldCashCollection, verifyDriverCashHandover } from "@/lib/cash";
import { eq, desc } from "drizzle-orm";

export async function GET(request: Request) {
  const db = getDb();
  const url = new URL(request.url);
  const driverId = url.searchParams.get("driverId");

  const submissionsQuery = db
    .select({
      id: cashCollectionSubmissions.id,
      driverId: cashCollectionSubmissions.driverId,
      driverName: users.fullName,
      orderId: cashCollectionSubmissions.orderId,
      invoiceId: cashCollectionSubmissions.invoiceId,
      amountCollectedPaise: cashCollectionSubmissions.amountCollectedPaise,
      collectedAt: cashCollectionSubmissions.collectedAt,
      isHandedOver: cashCollectionSubmissions.isHandedOver,
    })
    .from(cashCollectionSubmissions)
    .innerJoin(users, eq(cashCollectionSubmissions.driverId, users.id))
    .orderBy(desc(cashCollectionSubmissions.collectedAt));

  const allSubmissions = await submissionsQuery;
  const filteredSubmissions = driverId
    ? allSubmissions.filter((s: any) => s.driverId === driverId)
    : allSubmissions;

  const handovers = await db
    .select({
      id: cashHandovers.id,
      driverId: cashHandovers.driverId,
      driverName: users.fullName,
      totalDeclaredPaise: cashHandovers.totalDeclaredPaise,
      totalVerifiedPaise: cashHandovers.totalVerifiedPaise,
      variancePaise: cashHandovers.variancePaise,
      status: cashHandovers.status,
      handoverTimestamp: cashHandovers.handoverTimestamp,
      notes: cashHandovers.notes,
    })
    .from(cashHandovers)
    .innerJoin(users, eq(cashHandovers.driverId, users.id))
    .orderBy(desc(cashHandovers.handoverTimestamp));

  // Compute unhanded cash summary per driver
  const pendingByDriver: Record<string, { driverName: string; totalPendingPaise: number; count: number }> = {};
  for (const sub of allSubmissions) {
    if (!sub.isHandedOver) {
      if (!pendingByDriver[sub.driverId]) {
        pendingByDriver[sub.driverId] = { driverName: sub.driverName, totalPendingPaise: 0, count: 0 };
      }
      pendingByDriver[sub.driverId].totalPendingPaise += sub.amountCollectedPaise;
      pendingByDriver[sub.driverId].count += 1;
    }
  }

  return NextResponse.json({
    submissions: filteredSubmissions,
    handovers,
    pendingByDriver,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "COLLECT") {
      const result = await recordFieldCashCollection({
        driverId: body.driverId || "usr_driver_01",
        orderId: body.orderId,
        invoiceId: body.invoiceId,
        customerId: body.customerId,
        amountCollectedPaise: Number(body.amountCollectedPaise),
        clientEventId: body.clientEventId,
      });
      return NextResponse.json({ success: true, ...result });
    } else if (action === "HANDOVER") {
      const result = await verifyDriverCashHandover({
        driverId: body.driverId || "usr_driver_01",
        receivedBy: body.receivedBy || "usr_owner_01",
        totalDeclaredPaise: Number(body.totalDeclaredPaise),
        totalVerifiedPaise: Number(body.totalVerifiedPaise),
        notes: body.notes,
      });
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json({ error: "Invalid action. Use 'COLLECT' or 'HANDOVER'" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed cash operation" }, { status: 400 });
  }
}
