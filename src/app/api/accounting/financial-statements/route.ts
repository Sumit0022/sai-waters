import { NextResponse } from "next/server";
import { getProfitAndLoss, getBalanceSheet } from "@/lib/accounting";

export async function GET() {
  try {
    const pnl = await getProfitAndLoss();
    const bs = await getBalanceSheet();

    return NextResponse.json({
      profitAndLoss: pnl,
      balanceSheet: bs,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to load financial statements" }, { status: 500 });
  }
}
