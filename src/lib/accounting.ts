import { getDb } from "@/db";
import { chartOfAccounts, journalEntries, journalLines, invoices, receipts, customers } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export interface JournalLineInput {
  accountId: number;
  debitPaise: number;
  creditPaise: number;
  subLedgerType?: "CUSTOMER" | "SUPPLIER" | "DRIVER" | "NONE";
  subLedgerId?: string;
}

export interface PostJournalInput {
  entryNumber?: string;
  entryDate?: string;
  sourceDocumentType: "INVOICE" | "RECEIPT" | "HANDOVER" | "DEPRECIATION" | "MANUAL" | "LOSS_CHARGE";
  sourceDocumentId?: string;
  narration: string;
  postedBy: string;
  lines: JournalLineInput[];
}

/**
 * Core Double-Entry Accounting Posting Engine
 * Enforces fundamental accounting invariant: sum(Debits) === sum(Credits)
 */
export async function postJournalEntry(input: PostJournalInput) {
  const db = getDb();

  const totalDebits = input.lines.reduce((sum, l) => sum + (l.debitPaise || 0), 0);
  const totalCredits = input.lines.reduce((sum, l) => sum + (l.creditPaise || 0), 0);

  if (totalDebits !== totalCredits) {
    throw new Error(
      `Double-Entry Invariant Violation: Debits (₹${(totalDebits / 100).toFixed(2)}) must equal Credits (₹${(totalCredits / 100).toFixed(2)})`
    );
  }

  if (totalDebits === 0) {
    throw new Error("Journal entry must have non-zero debit and credit lines.");
  }

  const todayStr = input.entryDate || new Date().toISOString().split("T")[0];
  const entryId = `jv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const entryNumber = input.entryNumber || `JV-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;

  // Insert Journal Header
  await db.insert(journalEntries).values({
    id: entryId,
    entryNumber,
    entryDate: todayStr,
    sourceDocumentType: input.sourceDocumentType,
    sourceDocumentId: input.sourceDocumentId || null,
    narration: input.narration,
    isPosted: true,
    postedBy: input.postedBy,
    postedAt: new Date(),
  });

  // Insert Journal Lines
  for (const line of input.lines) {
    const lineId = `jl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await db.insert(journalLines).values({
      id: lineId,
      journalEntryId: entryId,
      accountId: line.accountId,
      debitPaise: line.debitPaise || 0,
      creditPaise: line.creditPaise || 0,
      subLedgerType: line.subLedgerType || "NONE",
      subLedgerId: line.subLedgerId || null,
    });
  }

  return { entryId, entryNumber, totalAmountPaise: totalDebits };
}

/**
 * Computes Trial Balance: sum of debits and credits per account
 * Invariant: Total Debits must equal Total Credits across all accounts
 */
export async function getTrialBalance() {
  const db = getDb();

  const accounts = await db.select().from(chartOfAccounts).orderBy(chartOfAccounts.id);

  const lines = await db.select().from(journalLines);

  const balances = accounts.map((acc: any) => {
    const accLines = lines.filter((l: any) => l.accountId === acc.id);
    const totalDebitPaise = accLines.reduce((sum: number, l: any) => sum + l.debitPaise, 0);
    const totalCreditPaise = accLines.reduce((sum: number, l: any) => sum + l.creditPaise, 0);
    
    // Net balance according to normal account type
    let netDebitPaise = 0;
    let netCreditPaise = 0;

    if (acc.accountType === "ASSET" || acc.accountType === "COGS" || acc.accountType === "EXPENSE") {
      const net = totalDebitPaise - totalCreditPaise;
      if (net >= 0) netDebitPaise = net;
      else netCreditPaise = Math.abs(net);
    } else {
      // LIABILITY, EQUITY, REVENUE
      const net = totalCreditPaise - totalDebitPaise;
      if (net >= 0) netCreditPaise = net;
      else netDebitPaise = Math.abs(net);
    }

    return {
      id: acc.id,
      code: acc.accountCode,
      name: acc.accountName,
      type: acc.accountType,
      totalDebitPaise,
      totalCreditPaise,
      netDebitPaise,
      netCreditPaise,
    };
  });

  const grandTotalDebitPaise = balances.reduce((sum: number, b: any) => sum + b.netDebitPaise, 0);
  const grandTotalCreditPaise = balances.reduce((sum: number, b: any) => sum + b.netCreditPaise, 0);
  const isBalanced = grandTotalDebitPaise === grandTotalCreditPaise;

  return {
    balances,
    grandTotalDebitPaise,
    grandTotalCreditPaise,
    isBalanced,
    variancePaise: grandTotalDebitPaise - grandTotalCreditPaise,
  };
}

/**
 * Computes Profit & Loss Statement
 * Revenue (4000s) - Cost of Goods Sold (5000s) - Expenses (6000s) = Net Profit/Loss
 */
export async function getProfitAndLoss() {
  const tb = await getTrialBalance();

  const revenues = tb.balances.filter((b: any) => b.type === "REVENUE");
  const cogs = tb.balances.filter((b: any) => b.type === "COGS");
  const expenses = tb.balances.filter((b: any) => b.type === "EXPENSE");

  const totalRevenuePaise = revenues.reduce((s: number, r: any) => s + (r.totalCreditPaise - r.totalDebitPaise), 0);
  const totalCogsPaise = cogs.reduce((s: number, c: any) => s + (c.totalDebitPaise - c.totalCreditPaise), 0);
  const grossProfitPaise = totalRevenuePaise - totalCogsPaise;

  const totalExpensesPaise = expenses.reduce((s: number, e: any) => s + (e.totalDebitPaise - e.totalCreditPaise), 0);
  const netProfitPaise = grossProfitPaise - totalExpensesPaise;

  return {
    revenues,
    cogs,
    expenses,
    totalRevenuePaise,
    totalCogsPaise,
    grossProfitPaise,
    totalExpensesPaise,
    netProfitPaise,
  };
}

/**
 * Computes Balance Sheet
 * Assets = Liabilities + Equity + Current Period Net Profit
 */
export async function getBalanceSheet() {
  const tb = await getTrialBalance();
  const pnl = await getProfitAndLoss();

  const assets = tb.balances.filter((b: any) => b.type === "ASSET");
  const liabilities = tb.balances.filter((b: any) => b.type === "LIABILITY");
  const equity = tb.balances.filter((b: any) => b.type === "EQUITY");

  const totalAssetsPaise = assets.reduce((s: number, a: any) => s + (a.totalDebitPaise - a.totalCreditPaise), 0);
  const totalLiabilitiesPaise = liabilities.reduce((s: number, l: any) => s + (l.totalCreditPaise - l.totalDebitPaise), 0);
  const totalEquityBasePaise = equity.reduce((s: number, e: any) => s + (e.totalCreditPaise - e.totalDebitPaise), 0);
  const totalEquityWithProfitPaise = totalEquityBasePaise + pnl.netProfitPaise;

  const isBalanced = totalAssetsPaise === (totalLiabilitiesPaise + totalEquityWithProfitPaise);

  return {
    assets,
    liabilities,
    equity,
    currentPeriodNetProfitPaise: pnl.netProfitPaise,
    totalAssetsPaise,
    totalLiabilitiesPaise,
    totalEquityWithProfitPaise,
    isBalanced,
    variancePaise: totalAssetsPaise - (totalLiabilitiesPaise + totalEquityWithProfitPaise),
  };
}
