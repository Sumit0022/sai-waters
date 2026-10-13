import { NextResponse } from "next/server";
import { getDb, ensureDatabaseReady } from "@/db";
import { jarMasters, orders, customers, deliveryAssignments, invoices, cashCollectionSubmissions, users } from "@/db/schema";
import { getTrialBalance, getProfitAndLoss } from "@/lib/accounting";
import { sql, eq, desc } from "drizzle-orm";
import { getTodayIST } from "@/lib/date-utils";

export async function GET() {
  await ensureDatabaseReady();
  const db = getDb();

  // 1. Jar Counts by Status
  const jars = await db.select().from(jarMasters);
  const totalJars = jars.length;
  const availableJars = jars.filter((j: any) => j.currentStatus === "AVAILABLE").length;
  const inTransitJars = jars.filter((j: any) => j.currentStatus === "IN_TRANSIT" || j.currentStatus === "ALLOCATED").length;
  const customerHeldJars = jars.filter((j: any) => j.currentStatus === "DELIVERED_CUSTOMER").length;
  const inspectionJars = jars.filter((j: any) => j.currentStatus === "RETURNED_INSPECT").length;
  const repairOrDamagedJars = jars.filter((j: any) => j.currentStatus === "UNDER_REPAIR" || j.currentStatus === "DAMAGED").length;
  const missingOrLostJars = jars.filter((j: any) => j.currentStatus === "MISSING_INVESTIG" || j.currentStatus === "CONFIRMED_LOST").length;

  // 2. Today's Logistics Orders
  const todayStr = getTodayIST();
  const todayOrders = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      orderType: orders.orderType,
      scheduledDate: orders.scheduledDate,
      quantityJars: orders.quantityJars,
      unitPricePaise: orders.unitPricePaise,
      totalAmountPaise: orders.totalAmountPaise,
      status: orders.status,
      customerName: customers.fullName,
      customerPhone: customers.phone,
      customerCode: customers.customerCode,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .where(eq(orders.scheduledDate, todayStr))
    .orderBy(desc(orders.createdAt));

  const todayTotalOrders = todayOrders.length;
  const todayDeliveredOrders = todayOrders.filter((o: any) => o.status === "DELIVERED").length;
  const todayDispatchedOrders = todayOrders.filter((o: any) => o.status === "DISPATCHED").length;
  const todayPendingOrders = todayOrders.filter((o: any) => o.status === "CONFIRMED" || o.status === "DRAFT").length;
  const todayTotalJarsScheduled = todayOrders.reduce((sum: number, o: any) => sum + (o.quantityJars || 0), 0);
  const todayTotalJarsDelivered = todayOrders
    .filter((o: any) => o.status === "DELIVERED")
    .reduce((sum: number, o: any) => sum + (o.quantityJars || 0), 0);

  // Recent 6 orders
  let recentOrders = todayOrders.slice(0, 6);
  if (recentOrders.length < 5) {
    const allRecent = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        orderType: orders.orderType,
        scheduledDate: orders.scheduledDate,
        quantityJars: orders.quantityJars,
        unitPricePaise: orders.unitPricePaise,
        totalAmountPaise: orders.totalAmountPaise,
        status: orders.status,
        customerName: customers.fullName,
        customerPhone: customers.phone,
        customerCode: customers.customerCode,
      })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .orderBy(desc(orders.createdAt))
      .limit(6);
    recentOrders = allRecent;
  }

  // 3. Driver Cash Clearing & Pending Submissions
  const unclearedSubmissions = await db
    .select({
      id: cashCollectionSubmissions.id,
      driverId: cashCollectionSubmissions.driverId,
      driverName: users.fullName,
      amountCollectedPaise: cashCollectionSubmissions.amountCollectedPaise,
    })
    .from(cashCollectionSubmissions)
    .innerJoin(users, eq(cashCollectionSubmissions.driverId, users.id))
    .where(eq(cashCollectionSubmissions.isHandedOver, false));

  const pendingCashDriversMap: Record<
    string,
    { driverId: string; driverName: string; totalPendingPaise: number; count: number; submissionIds: string[] }
  > = {};
  for (const s of unclearedSubmissions) {
    if (!pendingCashDriversMap[s.driverId]) {
      pendingCashDriversMap[s.driverId] = {
        driverId: s.driverId,
        driverName: s.driverName,
        totalPendingPaise: 0,
        count: 0,
        submissionIds: [],
      };
    }
    pendingCashDriversMap[s.driverId].totalPendingPaise += s.amountCollectedPaise;
    pendingCashDriversMap[s.driverId].count += 1;
    pendingCashDriversMap[s.driverId].submissionIds.push(s.id);
  }
  const pendingCashDrivers = Object.values(pendingCashDriversMap);

  // 4. Invoices / Receivables breakdown
  const allInvoices = await db.select().from(invoices);
  const dueInvoices = allInvoices.filter((inv: any) => inv.status === "ISSUED" || inv.status === "PARTIALLY_PAID");
  const totalDueAmountPaise = dueInvoices.reduce(
    (sum: number, inv: any) => sum + Math.max(0, inv.totalAmountPaise - (inv.paidAmountPaise || 0)),
    0
  );

  // 5. Financial Balances from Double-Entry General Ledger
  const tb = await getTrialBalance();
  const pnl = await getProfitAndLoss();

  const vaultCash = tb.balances.find((b: any) => b.id === 1110)?.netDebitPaise || 0;
  const driverClearing = tb.balances.find((b: any) => b.id === 1120)?.netDebitPaise || 0;
  const bankBalance = tb.balances.find((b: any) => b.id === 1130)?.netDebitPaise || 0;
  const accountsReceivable = tb.balances.find((b: any) => b.id === 1150)?.netDebitPaise || 0;
  const jarAssetValue = tb.balances.find((b: any) => b.id === 1210)?.netDebitPaise || 0;

  // 6. Customer counts
  const allCustomers = await db.select().from(customers);
  const totalCustomers = allCustomers.length;
  const recurringCustomers = allCustomers.filter((c: any) => c.customerType === "RESIDENTIAL" || c.customerType === "COMMERCIAL").length;
  const bulkCustomers = allCustomers.filter((c: any) => c.customerType === "EVENT").length;

  return NextResponse.json({
    jars: {
      total: totalJars,
      available: availableJars,
      inTransit: inTransitJars,
      withCustomer: customerHeldJars,
      returnedInspect: inspectionJars,
      underRepair: repairOrDamagedJars,
      missingOrLost: missingOrLostJars,
    },
    logistics: {
      todayDate: todayStr,
      todayTotalOrders,
      todayDelivered: todayDeliveredOrders,
      todayDispatched: todayDispatchedOrders,
      todayPending: todayPendingOrders,
      todayTotalJarsScheduled,
      todayTotalJarsDelivered,
      recentOrders,
    },
    financials: {
      vaultCashPaise: vaultCash,
      driverClearingPaise: driverClearing,
      bankBalancePaise: bankBalance,
      accountsReceivablePaise: accountsReceivable,
      jarAssetValuePaise: jarAssetValue,
      totalRevenuePaise: pnl.totalRevenuePaise,
      netProfitPaise: pnl.netProfitPaise,
      isTrialBalanceBalanced: tb.isBalanced,
      trialBalanceVariancePaise: tb.variancePaise,
      pendingCashDrivers,
      dueInvoicesCount: dueInvoices.length,
      totalDueAmountPaise,
    },
    crm: {
      totalCustomers,
      recurringCustomers,
      bulkCustomers,
    },
  });
}
