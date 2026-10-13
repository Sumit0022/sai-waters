import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { chartOfAccounts } from "@/db/schema";
import { createCustomAccount, getAccountDisplay } from "@/lib/accounting";

export async function GET() {
  try {
    const db = getDb();
    const accounts = await db.select().from(chartOfAccounts).orderBy(chartOfAccounts.id);
    const enriched = accounts.map((acc: any) => ({
      ...acc,
      display: getAccountDisplay(acc),
    }));
    return NextResponse.json({ accounts: enriched });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch accounts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accountName, accountType, accountCode, isReconcilable } = body;

    if (!accountName || !accountType) {
      return NextResponse.json({ error: "accountName and accountType are required" }, { status: 400 });
    }

    const created = await createCustomAccount({
      accountName,
      accountType,
      accountCode,
      isReconcilable,
    });

    return NextResponse.json({ success: true, account: created });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to create account" }, { status: 400 });
  }
}
