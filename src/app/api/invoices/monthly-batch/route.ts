import { NextResponse } from "next/server";
import { ensureDatabaseReady } from "@/db";
import { generateMonthlyConsolidatedInvoices, getUnbilledMonthlySummary } from "@/lib/billing";

export async function GET(request: Request) {
  try {
    await ensureDatabaseReady();
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || undefined;

    const summary = await getUnbilledMonthlySummary(month);
    return NextResponse.json({ success: true, ...summary });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureDatabaseReady();
    const body = await request.json().catch(() => ({}));
    const { month, customerId, forceAll, postedBy } = body;

    const result = await generateMonthlyConsolidatedInvoices({
      billingMonth: month,
      customerId,
      forceAll: Boolean(forceAll),
      postedBy: postedBy || "usr_owner_01",
    });

    return NextResponse.json({
      message: `Month-end auto-invoicing completed: ${result.generatedCount} invoice(s) generated for ${result.monthName}`,
      ...result,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
