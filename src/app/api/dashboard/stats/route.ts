import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { jarMasters, orders, customers, deliveryAssignments } from "@/db/schema";
import { getTrialBalance, getProfitAndLoss } from "@/lib/accounting";
import { sql, eq } from "drizzle-orm";

export async function GET() {
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
  const todayStr = new Date().toISOString().split("T")[0];
  const todayOrders = await db.select().from(orders).where(eq(orders.scheduledDate, todayStr));
  const todayDeliveredOrders = todayOrders.filter((o: any) => o.status === "DELIVERED").length;

  // 3. Financial Balances from Double-Entry General Ledger
  const tb = await getTrialBalance();
  const pnl = await getProfitAndLoss();

  const vaultCash = tb.balances.find((b: any) => b.id === 1110)?.netDebitPaise || 0;
  const driverClearing = tb.balances.find((b: any) => b.id === 1120)?.netDebitPaise || 0;
  const bankBalance = tb.balances.find((b: any) => b.id === 1130)?.netDebitPaise || 0;
  const accountsReceivable = tb.balances.find((b: any) => b.id === 1150)?.netDebitPaise || 0;
  const jarAssetValue = tb.balances.find((b: any) => b.id === 1210)?.netDebitPaise || 0;

  // 4. Customer counts
  const allCustomers = await db.select().from(customers);
  const totalCustomers = allCustomers.length;

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
      todayTotalOrders: todayOrders.length,
      todayDelivered: todayDeliveredOrders,
      todayPending: todayOrders.length - todayDeliveredOrders,
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
    },
    crm: {
      totalCustomers,
    },
  });
}
