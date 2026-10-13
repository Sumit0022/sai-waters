import { NextResponse } from "next/server";
import {
  getBankReconciliationData,
  toggleBankTransactionMatch,
  recordDirectBankTransaction,
} from "@/lib/accounting";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const bankAccountId = url.searchParams.get("bankAccountId");
    const id = bankAccountId ? parseInt(bankAccountId, 10) : 1130;

    const brs = await getBankReconciliationData(id);
    return NextResponse.json(brs);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to load bank reconciliation data" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "TOGGLE_MATCH") {
      const { journalLineId, externalReference, clearedDate } = body;
      if (!journalLineId) {
        return NextResponse.json({ error: "Missing journalLineId" }, { status: 400 });
      }

      const result = await toggleBankTransactionMatch({
        journalLineId,
        externalReference,
        clearedDate,
        userId: body.userId || "usr_owner_01",
      });
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "DIRECT_BANK") {
      const { type, amountRupees, amountPaise, bankAccountId, narration, date } = body;
      const parsedPaise = amountPaise !== undefined ? Number(amountPaise) : Math.round(Number(amountRupees || 0) * 100);

      if (!parsedPaise || parsedPaise <= 0) {
        return NextResponse.json({ error: "Valid amount is required" }, { status: 400 });
      }

      const result = await recordDirectBankTransaction({
        type: type || "BANK_CHARGE",
        amountPaise: parsedPaise,
        bankAccountId: bankAccountId ? Number(bankAccountId) : 1130,
        narration,
        date,
        userId: body.userId || "usr_owner_01",
      });
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to process reconciliation action" }, { status: 400 });
  }
}
