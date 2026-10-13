import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { journalEntries, journalLines, chartOfAccounts, users } from "@/db/schema";
import { postJournalEntry } from "@/lib/accounting";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const db = getDb();

  const entries = await db
    .select({
      id: journalEntries.id,
      entryNumber: journalEntries.entryNumber,
      entryDate: journalEntries.entryDate,
      sourceDocumentType: journalEntries.sourceDocumentType,
      sourceDocumentId: journalEntries.sourceDocumentId,
      narration: journalEntries.narration,
      isPosted: journalEntries.isPosted,
      postedBy: users.fullName,
      postedAt: journalEntries.postedAt,
    })
    .from(journalEntries)
    .innerJoin(users, eq(journalEntries.postedBy, users.id))
    .orderBy(desc(journalEntries.entryDate), desc(journalEntries.postedAt));

  const allLines = await db
    .select({
      id: journalLines.id,
      journalEntryId: journalLines.journalEntryId,
      accountId: journalLines.accountId,
      accountCode: chartOfAccounts.accountCode,
      accountName: chartOfAccounts.accountName,
      debitPaise: journalLines.debitPaise,
      creditPaise: journalLines.creditPaise,
      subLedgerType: journalLines.subLedgerType,
      subLedgerId: journalLines.subLedgerId,
    })
    .from(journalLines)
    .innerJoin(chartOfAccounts, eq(journalLines.accountId, chartOfAccounts.id));

  const enriched = entries.map((entry: any) => ({
    ...entry,
    lines: allLines.filter((l: any) => l.journalEntryId === entry.id),
  }));

  return NextResponse.json({ journalEntries: enriched });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await postJournalEntry({
      entryNumber: body.entryNumber,
      entryDate: body.entryDate,
      sourceDocumentType: body.sourceDocumentType || "MANUAL",
      sourceDocumentId: body.sourceDocumentId,
      narration: body.narration,
      postedBy: body.postedBy || "usr_owner_01",
      lines: body.lines,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to post journal entry" }, { status: 400 });
  }
}
