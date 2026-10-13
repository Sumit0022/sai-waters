import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { expenseRecords, chartOfAccounts, users } from "@/db/schema";
import { recordBusinessExpense, getAccountDisplay } from "@/lib/accounting";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: expenseRecords.id,
        expenseDate: expenseRecords.expenseDate,
        amountPaise: expenseRecords.amountPaise,
        notes: expenseRecords.notes,
        receiptImageUrl: expenseRecords.receiptImageUrl,
        accountId: expenseRecords.accountId,
        accountName: chartOfAccounts.accountName,
        accountCode: chartOfAccounts.accountCode,
        accountType: chartOfAccounts.accountType,
        paidViaAccountId: expenseRecords.paidViaAccountId,
        recordedBy: expenseRecords.recordedBy,
      })
      .from(expenseRecords)
      .innerJoin(chartOfAccounts, eq(expenseRecords.accountId, chartOfAccounts.id))
      .orderBy(desc(expenseRecords.expenseDate), desc(expenseRecords.id))
      .limit(50);

    const accounts = await db.select().from(chartOfAccounts);
    const accMap = new Map<number, any>();
    for (const a of accounts) {
      accMap.set(a.id, a);
    }

    const enriched = rows.map((r: any) => {
      const paidVia = accMap.get(r.paidViaAccountId);
      return {
        ...r,
        expenseDisplay: getAccountDisplay({ id: r.accountId, accountName: r.accountName, accountCode: r.accountCode, accountType: r.accountType }),
        paidViaDisplay: paidVia ? getAccountDisplay(paidVia) : null,
      };
    });

    return NextResponse.json({ expenses: enriched });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accountId, amountRupees, amountPaise, paidViaAccountId, expenseDate, notes, receiptImageUrl } = body;

    const parsedPaise = amountPaise !== undefined ? Number(amountPaise) : Math.round(Number(amountRupees || 0) * 100);

    if (!accountId || !parsedPaise || parsedPaise <= 0 || !paidViaAccountId) {
      return NextResponse.json(
        { error: "accountId, valid amount, and paidViaAccountId are required" },
        { status: 400 }
      );
    }

    const result = await recordBusinessExpense({
      accountId: Number(accountId),
      amountPaise: parsedPaise,
      paidViaAccountId: Number(paidViaAccountId),
      expenseDate,
      notes,
      receiptImageUrl,
      recordedBy: body.recordedBy || "usr_owner_01",
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to record expense" }, { status: 400 });
  }
}
