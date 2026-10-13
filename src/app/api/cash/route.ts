import { NextResponse } from "next/server";
import { getDb, ensureDatabaseReady } from "@/db";
import { cashCollectionSubmissions, cashHandovers, users, orders, invoices, customers } from "@/db/schema";
import { recordFieldCashCollection, verifyDriverCashHandover } from "@/lib/cash";
import { eq, desc } from "drizzle-orm";
import { getDateStrIST, formatTimeIST, formatDateTimeIST, getTodayIST } from "@/lib/date-utils";

export async function GET(request: Request) {
  await ensureDatabaseReady();
  const db = getDb();
  const url = new URL(request.url);
  const driverId = url.searchParams.get("driverId");
  const dateFilter = url.searchParams.get("date"); // YYYY-MM-DD
  const statusFilter = url.searchParams.get("status"); // ALL, PENDING, HANDED_OVER

  // 1. Fetch all submissions with joined users, orders, invoices
  const rawSubmissions = await db
    .select({
      id: cashCollectionSubmissions.id,
      driverId: cashCollectionSubmissions.driverId,
      driverName: users.fullName,
      orderId: cashCollectionSubmissions.orderId,
      orderNumber: orders.orderNumber,
      orderType: orders.orderType,
      orderCustomerId: orders.customerId,
      invoiceId: cashCollectionSubmissions.invoiceId,
      invoiceNumber: invoices.invoiceNumber,
      invoiceCustomerId: invoices.customerId,
      amountCollectedPaise: cashCollectionSubmissions.amountCollectedPaise,
      clientEventId: cashCollectionSubmissions.clientEventId,
      collectedAt: cashCollectionSubmissions.collectedAt,
      handoverId: cashCollectionSubmissions.handoverId,
      isHandedOver: cashCollectionSubmissions.isHandedOver,
    })
    .from(cashCollectionSubmissions)
    .innerJoin(users, eq(cashCollectionSubmissions.driverId, users.id))
    .leftJoin(orders, eq(cashCollectionSubmissions.orderId, orders.id))
    .leftJoin(invoices, eq(cashCollectionSubmissions.invoiceId, invoices.id))
    .orderBy(desc(cashCollectionSubmissions.collectedAt));

  // 2. Fetch customer dictionary to map names and codes
  const allCustomers = await db
    .select({
      id: customers.id,
      fullName: customers.fullName,
      customerCode: customers.customerCode,
      phone: customers.phone,
    })
    .from(customers);
  const custMap = new Map<string, (typeof allCustomers)[0]>();
  for (const c of allCustomers) {
    custMap.set(c.id, c);
  }

  // 3. Format and enrich submissions
  const todayIST = getTodayIST();
  let totalUnclearedCashPaise = 0;
  let totalHandedOverTodayPaise = 0;
  let totalCollectedTodayPaise = 0;

  const pendingByDriver: Record<string, { driverName: string; totalPendingPaise: number; count: number }> = {};
  const daySummary: Record<
    string,
    {
      date: string;
      totalCollectedPaise: number;
      totalPendingPaise: number;
      totalHandedOverPaise: number;
      totalCount: number;
      pendingCount: number;
      handedOverCount: number;
    }
  > = {};

  const enrichedSubmissions = rawSubmissions.map((s: any) => {
    const custId = s.orderCustomerId || s.invoiceCustomerId;
    const cust = custId ? custMap.get(custId) : null;
    const dateIST = getDateStrIST(s.collectedAt);
    const timeIST = formatTimeIST(s.collectedAt);
    const dateTimeIST = formatDateTimeIST(s.collectedAt);

    // Global aggregations
    if (!s.isHandedOver) {
      totalUnclearedCashPaise += s.amountCollectedPaise;
      if (!pendingByDriver[s.driverId]) {
        pendingByDriver[s.driverId] = { driverName: s.driverName, totalPendingPaise: 0, count: 0 };
      }
      pendingByDriver[s.driverId].totalPendingPaise += s.amountCollectedPaise;
      pendingByDriver[s.driverId].count += 1;
    }

    if (dateIST === todayIST) {
      totalCollectedTodayPaise += s.amountCollectedPaise;
      if (s.isHandedOver) {
        totalHandedOverTodayPaise += s.amountCollectedPaise;
      }
    }

    // Day-wise groupings
    if (!daySummary[dateIST]) {
      daySummary[dateIST] = {
        date: dateIST,
        totalCollectedPaise: 0,
        totalPendingPaise: 0,
        totalHandedOverPaise: 0,
        totalCount: 0,
        pendingCount: 0,
        handedOverCount: 0,
      };
    }
    daySummary[dateIST].totalCollectedPaise += s.amountCollectedPaise;
    daySummary[dateIST].totalCount += 1;
    if (s.isHandedOver) {
      daySummary[dateIST].totalHandedOverPaise += s.amountCollectedPaise;
      daySummary[dateIST].handedOverCount += 1;
    } else {
      daySummary[dateIST].totalPendingPaise += s.amountCollectedPaise;
      daySummary[dateIST].pendingCount += 1;
    }

    return {
      id: s.id,
      driverId: s.driverId,
      driverName: s.driverName,
      orderId: s.orderId,
      orderNumber: s.orderNumber || null,
      orderType: s.orderType || null,
      invoiceId: s.invoiceId,
      invoiceNumber: s.invoiceNumber || null,
      amountCollectedPaise: s.amountCollectedPaise,
      clientEventId: s.clientEventId,
      collectedAt: s.collectedAt,
      collectionDateIST: dateIST,
      collectionTimeIST: timeIST,
      collectionDateTimeIST: dateTimeIST,
      isHandedOver: s.isHandedOver,
      handoverId: s.handoverId,
      customerId: custId || null,
      customerName: cust ? cust.fullName : "Doorstep Water Customer",
      customerCode: cust ? cust.customerCode : "-",
      customerPhone: cust ? cust.phone : "-",
    };
  });

  // Apply filters if requested
  let filteredSubmissions = enrichedSubmissions;
  if (driverId) {
    filteredSubmissions = filteredSubmissions.filter((s: any) => s.driverId === driverId);
  }
  if (dateFilter) {
    filteredSubmissions = filteredSubmissions.filter((s: any) => s.collectionDateIST === dateFilter);
  }
  if (statusFilter === "PENDING") {
    filteredSubmissions = filteredSubmissions.filter((s: any) => !s.isHandedOver);
  } else if (statusFilter === "HANDED_OVER") {
    filteredSubmissions = filteredSubmissions.filter((s: any) => s.isHandedOver);
  }

  // 4. Fetch Handover log history
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

  return NextResponse.json({
    submissions: filteredSubmissions,
    allSubmissions: enrichedSubmissions,
    handovers,
    pendingByDriver,
    daySummary,
    totalUnclearedCashPaise,
    totalHandedOverTodayPaise,
    totalCollectedTodayPaise,
    todayIST,
  });
}

export async function POST(request: Request) {
  try {
    await ensureDatabaseReady();
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
    } else if (action === "HANDOVER" || action === "VERIFY_HANDOVER") {
      const declared = Number(body.totalDeclaredPaise ?? body.totalVerifiedPaise ?? 0);
      const verified = Number(body.totalVerifiedPaise ?? body.totalDeclaredPaise ?? 0);
      const result = await verifyDriverCashHandover({
        driverId: body.driverId || "usr_driver_01",
        receivedBy: body.receivedBy || "usr_owner_01",
        totalDeclaredPaise: declared,
        totalVerifiedPaise: verified,
        targetAccountId: body.targetAccountId ? Number(body.targetAccountId) : 1110,
        submissionIds: Array.isArray(body.submissionIds) && body.submissionIds.length > 0 ? body.submissionIds : undefined,
        notes: body.notes,
      });
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json({ error: "Invalid action. Use 'COLLECT' or 'HANDOVER'" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed cash operation" }, { status: 400 });
  }
}
