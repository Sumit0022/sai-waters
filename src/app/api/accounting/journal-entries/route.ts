import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { journalEntries, journalLines, chartOfAccounts, users, reconciliationMatches } from "@/db/schema";
import { postJournalEntry, getAccountDisplay } from "@/lib/accounting";
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
      accountType: chartOfAccounts.accountType,
      debitPaise: journalLines.debitPaise,
      creditPaise: journalLines.creditPaise,
      subLedgerType: journalLines.subLedgerType,
      subLedgerId: journalLines.subLedgerId,
    })
    .from(journalLines)
    .innerJoin(chartOfAccounts, eq(journalLines.accountId, chartOfAccounts.id));

  const enriched = entries.map((entry: any) => ({
    ...entry,
    lines: allLines
      .filter((l: any) => l.journalEntryId === entry.id)
      .map((l: any) => ({
        ...l,
        display: getAccountDisplay({
          id: l.accountId,
          accountName: l.accountName,
          accountCode: l.accountCode,
          accountType: l.accountType,
        }),
      })),
  }));

  return NextResponse.json({ journalEntries: enriched });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. REVERSE EXISTING JOURNAL ENTRY
    if (body.action === "REVERSE") {
      const { entryId, reason } = body;
      if (!entryId) {
        return NextResponse.json({ error: "Missing entryId to reverse" }, { status: 400 });
      }

      const db = getDb();
      const orig = (await db.select().from(journalEntries).where(eq(journalEntries.id, entryId)).limit(1))[0];
      if (!orig) {
        return NextResponse.json({ error: "Entry not found" }, { status: 404 });
      }

      const origLines = await db.select().from(journalLines).where(eq(journalLines.journalEntryId, entryId));
      if (origLines.length === 0) {
        return NextResponse.json({ error: "No lines found for this entry" }, { status: 400 });
      }

      // Invert lines: swap debits and credits
      const reversedLines = origLines.map((l: any) => ({
        accountId: l.accountId,
        debitPaise: l.creditPaise, // swapped
        creditPaise: l.debitPaise, // swapped
        subLedgerType: (l.subLedgerType as any) || "NONE",
        subLedgerId: l.subLedgerId || undefined,
      }));

      const todayStr = new Date().toISOString().split("T")[0];
      const revResult = await postJournalEntry({
        entryNumber: `REV-${orig.entryNumber}`,
        entryDate: todayStr,
        sourceDocumentType: "MANUAL",
        sourceDocumentId: orig.id,
        narration: `REVERSAL of ${orig.entryNumber}: ${reason || orig.narration}`,
        postedBy: body.postedBy || "usr_owner_01",
        lines: reversedLines,
      });

      return NextResponse.json({ success: true, reversedEntry: revResult });
    }

    // 2. REGULAR POST JOURNAL ENTRY
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

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const entryId = url.searchParams.get("id");

    if (!entryId) {
      return NextResponse.json({ error: "Missing entry id" }, { status: 400 });
    }

    const db = getDb();
    // Delete any reconciliation matches for these lines
    const lines = await db.select().from(journalLines).where(eq(journalLines.journalEntryId, entryId));
    for (const l of lines) {
      await db.delete(reconciliationMatches).where(eq(reconciliationMatches.journalLineId, l.id));
    }

    // Delete lines
    await db.delete(journalLines).where(eq(journalLines.journalEntryId, entryId));
    // Delete header
    await db.delete(journalEntries).where(eq(journalEntries.id, entryId));

    return NextResponse.json({ success: true, deletedId: entryId });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to delete journal entry" }, { status: 500 });
  }
}
