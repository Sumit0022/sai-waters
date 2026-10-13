import { getDb } from "@/db";
import {
  chartOfAccounts,
  journalEntries,
  journalLines,
  invoices,
  receipts,
  customers,
  expenseRecords,
  reconciliationMatches,
  reconciliationSessions,
} from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

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
 * Clean & Professional Business Account Metadata (Standard English)
 */
export const ACCOUNT_FRIENDLY_INFO: Record<
  number,
  { simpleTitle: string; subtitle: string; help: string }
> = {
  1110: {
    simpleTitle: "Cash-in-Hand",
    subtitle: "Central Vault Physical Cash",
    help: "Central cash drawer & vault balance",
  },
  1120: {
    simpleTitle: "Driver Cash in Transit",
    subtitle: "Delivery Route Clearing",
    help: "Cash collected on delivery route awaiting cashier handover",
  },
  1130: {
    simpleTitle: "Bank Account",
    subtitle: "Current & Operating Bank A/C",
    help: "Primary commercial operating bank account",
  },
  1140: {
    simpleTitle: "Online UPI & QR Clearing",
    subtitle: "Digital Payment Gateway Escrow",
    help: "Customer UPI & QR payments in gateway transit",
  },
  1150: {
    simpleTitle: "Accounts Receivable",
    subtitle: "Customer Trade Debtors",
    help: "Pending customer monthly delivery balances",
  },
  1210: {
    simpleTitle: "Reusable 20L Water Jars",
    subtitle: "Asset Stock at Cost",
    help: "Commercial polycarbonate water containers at acquisition cost",
  },
  1220: {
    simpleTitle: "Accumulated Depreciation — Jars",
    subtitle: "Contra Asset Reserve",
    help: "Cumulative straight-line depreciation deducted on jars pool",
  },
  2110: {
    simpleTitle: "Accounts Payable",
    subtitle: "Trade Creditors & Suppliers",
    help: "Unpaid vendor bills for caps, seals, raw water and spare parts",
  },
  2120: {
    simpleTitle: "Customer Jar Deposits",
    subtitle: "Refundable Security Held",
    help: "Refundable security deposits received from customers for jars",
  },
  2130: {
    simpleTitle: "Customer Advance Payments",
    subtitle: "Unearned Customer Revenue",
    help: "Prepayments received from customers in advance of deliveries",
  },
  3110: {
    simpleTitle: "Owner Capital Account",
    subtitle: "Proprietor Equity",
    help: "Proprietor net investment and equity in business",
  },
  4110: {
    simpleTitle: "Water Jar Sales Revenue",
    subtitle: "Regular 20L Route Deliveries",
    help: "Operating sales revenue from daily residential and commercial supply",
  },
  4120: {
    simpleTitle: "Bulk Event Water Revenue",
    subtitle: "Functions, Weddings & Parties",
    help: "Revenue from temporary event supply contracts",
  },
  4210: {
    simpleTitle: "Jar Loss Recovery Income",
    subtitle: "Lost Jar Replacement Charges",
    help: "Compensation billed to customers for damaged or unreturned containers",
  },
  5110: {
    simpleTitle: "Raw Water & RO Pumping Costs",
    subtitle: "Direct Production COGS",
    help: "Electricity, intake water, and RO plant filtration consumables",
  },
  5120: {
    simpleTitle: "Jar Caps, Seals & Consumables",
    subtitle: "Packaging Materials (COGS)",
    help: "Plastic caps, neck shrink bands, labels and sanitary consumables",
  },
  6110: {
    simpleTitle: "Staff Salaries & Driver Wages",
    subtitle: "Payroll & Driver Allowances",
    help: "Monthly salaries for plant operators, cashiers and delivery drivers",
  },
  6210: {
    simpleTitle: "Vehicle Fuel & Diesel",
    subtitle: "Delivery Van & Fleet Fuel",
    help: "Diesel and petrol expenses for delivery trucks and vans",
  },
  6220: {
    simpleTitle: "Vehicle Repair & Maintenance",
    subtitle: "Fleet Servicing, Tyres & Repairs",
    help: "Delivery vehicle servicing, maintenance, and tyre repairs",
  },
  6310: {
    simpleTitle: "Plant & Godown Rent",
    subtitle: "Factory & Warehouse Lease",
    help: "Monthly lease and rent for water purification plant and warehouse",
  },
  6320: {
    simpleTitle: "Staff Welfare & Refreshments",
    subtitle: "Tea, Snacks & Daily Provisions",
    help: "Daily tea, refreshments and worker welfare provisions",
  },
  6410: {
    simpleTitle: "Bank & Payment Gateway Charges",
    subtitle: "Bank Service Fees & MDR",
    help: "Bank ledger charges, SMS notification fees and UPI processing cuts",
  },
  6510: {
    simpleTitle: "Depreciation Expense — Jars",
    subtitle: "Monthly 24-Month SLM Write-off",
    help: "Periodic non-cash depreciation expense charged against operations",
  },
  6520: {
    simpleTitle: "Confirmed Jar Loss & Scrappage",
    subtitle: "Damaged / Broken Jars Write-off",
    help: "Derecognition of broken, worn-out or untraceable water jars",
  },
};

export function getAccountDisplay(acc: {
  id: number;
  accountName?: string;
  name?: string;
  accountCode?: string;
  code?: string;
  accountType?: string;
  type?: string;
}) {
  const id = Number(acc.id);
  const info = ACCOUNT_FRIENDLY_INFO[id];
  const origName = acc.accountName || acc.name || "";
  const code = acc.accountCode || acc.code || String(id);
  const type = acc.accountType || acc.type || "EXPENSE";

  if (info) {
    return {
      id,
      code,
      simpleTitle: info.simpleTitle,
      subtitle: info.subtitle,
      fullName: info.simpleTitle,
      help: info.help,
      type,
    };
  }

  return {
    id,
    code,
    simpleTitle: origName,
    subtitle: `${type} Account`,
    fullName: origName,
    help: `${type} Account`,
    type,
  };
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
      display: getAccountDisplay(acc),
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

/**
 * Create Custom Account in Chart of Accounts
 */
export async function createCustomAccount(params: {
  accountName: string;
  accountType: "EXPENSE" | "COGS" | "ASSET" | "LIABILITY" | "REVENUE";
  accountCode?: string;
  isReconcilable?: boolean;
}) {
  const db = getDb();
  const trimmedName = params.accountName.trim();
  if (!trimmedName) throw new Error("Account name is required");

  const existing = await db.select().from(chartOfAccounts);
  if (existing.some((a: any) => a.accountName.toLowerCase() === trimmedName.toLowerCase())) {
    throw new Error(`Account "${trimmedName}" already exists.`);
  }

  let codeNum = 0;
  if (params.accountCode && params.accountCode.trim()) {
    codeNum = parseInt(params.accountCode.trim(), 10);
  } else {
    const prefixMap: Record<string, number> = {
      ASSET: 1300,
      LIABILITY: 2200,
      REVENUE: 4300,
      COGS: 5200,
      EXPENSE: 6200,
    };
    const base = prefixMap[params.accountType] || 6200;
    codeNum = base;
    while (existing.some((a: any) => a.id === codeNum)) {
      codeNum += 10;
    }
  }

  const accountCode = String(codeNum);
  const isReconcilable =
    params.isReconcilable ??
    (params.accountType === "ASSET" &&
      (trimmedName.toLowerCase().includes("bank") || trimmedName.toLowerCase().includes("cash")));

  await db.insert(chartOfAccounts).values({
    id: codeNum,
    accountCode,
    accountName: trimmedName,
    accountType: params.accountType,
    isReconcilable,
    isActive: true,
  });

  return {
    id: codeNum,
    accountCode,
    accountName: trimmedName,
    accountType: params.accountType,
    isReconcilable,
    display: getAccountDisplay({ id: codeNum, accountName: trimmedName, accountCode, accountType: params.accountType }),
  };
}

/**
 * Record and Settle Business Expense
 * Inserts expense record & posts balanced double-entry voucher
 */
export async function recordBusinessExpense(params: {
  accountId: number;
  amountPaise: number;
  paidViaAccountId: number;
  expenseDate?: string;
  notes?: string;
  receiptImageUrl?: string;
  recordedBy?: string;
}) {
  const db = getDb();
  if (params.amountPaise <= 0) {
    throw new Error("Expense amount must be greater than zero");
  }

  const dateStr = params.expenseDate || new Date().toISOString().split("T")[0];
  const expenseId = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const recordedBy = params.recordedBy || "usr_owner_01";
  const narration = params.notes?.trim() || "Business Expense Settlement";

  // 1. Insert into expenseRecords
  await db.insert(expenseRecords).values({
    id: expenseId,
    expenseDate: dateStr,
    accountId: params.accountId,
    amountPaise: params.amountPaise,
    paidViaAccountId: params.paidViaAccountId,
    receiptImageUrl: params.receiptImageUrl || null,
    notes: narration,
    recordedBy,
  });

  // 2. Post balanced Double-Entry Journal Entry
  // Dr. Expense Account
  // Cr. Paid Via Account (Cash / Bank)
  const jvResult = await postJournalEntry({
    entryDate: dateStr,
    sourceDocumentType: "MANUAL",
    sourceDocumentId: expenseId,
    narration: `Expense Settlement: ${narration}`,
    postedBy: recordedBy,
    lines: [
      {
        accountId: params.accountId,
        debitPaise: params.amountPaise,
        creditPaise: 0,
      },
      {
        accountId: params.paidViaAccountId,
        debitPaise: 0,
        creditPaise: params.amountPaise,
      },
    ],
  });

  return {
    success: true,
    expenseId,
    ...jvResult,
  };
}

/**
 * Bank Reconciliation Engine (BRS)
 */
export async function getBankReconciliationData(bankAccountId: number = 1130) {
  const db = getDb();

  const bankAcc = (
    await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.id, bankAccountId)).limit(1)
  )[0];
  if (!bankAcc) throw new Error("Bank account not found");

  const rawLines = await db
    .select({
      lineId: journalLines.id,
      journalEntryId: journalLines.journalEntryId,
      debitPaise: journalLines.debitPaise,
      creditPaise: journalLines.creditPaise,
      entryNumber: journalEntries.entryNumber,
      entryDate: journalEntries.entryDate,
      narration: journalEntries.narration,
      sourceDocumentType: journalEntries.sourceDocumentType,
      sourceDocumentId: journalEntries.sourceDocumentId,
    })
    .from(journalLines)
    .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
    .where(eq(journalLines.accountId, bankAccountId))
    .orderBy(desc(journalEntries.entryDate), desc(journalLines.id));

  const matches = await db.select().from(reconciliationMatches);
  const matchMap = new Map<string, any>();
  for (const m of matches) {
    matchMap.set(m.journalLineId, m);
  }

  let totalBookDebitPaise = 0;
  let totalBookCreditPaise = 0;
  let unclearedDepositsPaise = 0;
  let unclearedWithdrawalsPaise = 0;
  let clearedDebitsPaise = 0;
  let clearedCreditsPaise = 0;

  const transactions = rawLines.map((l: any) => {
    totalBookDebitPaise += l.debitPaise;
    totalBookCreditPaise += l.creditPaise;

    const match = matchMap.get(l.lineId);
    const isCleared = !!match;

    if (isCleared) {
      clearedDebitsPaise += l.debitPaise;
      clearedCreditsPaise += l.creditPaise;
    } else {
      unclearedDepositsPaise += l.debitPaise;
      unclearedWithdrawalsPaise += l.creditPaise;
    }

    return {
      lineId: l.lineId,
      journalEntryId: l.journalEntryId,
      entryNumber: l.entryNumber,
      entryDate: l.entryDate,
      narration: l.narration,
      sourceType: l.sourceDocumentType,
      debitPaise: l.debitPaise,
      creditPaise: l.creditPaise,
      isCleared,
      clearedAt: match?.matchedAt ? new Date(match.matchedAt).toISOString().split("T")[0] : null,
      externalReference: match?.externalReference || null,
    };
  });

  const bookBalancePaise = totalBookDebitPaise - totalBookCreditPaise;
  // Standard BRS: Passbook balance = Book balance - Uncleared Inflows + Uncleared Outflows
  const bankStatementBalancePaise = bookBalancePaise - unclearedDepositsPaise + unclearedWithdrawalsPaise;

  return {
    bankAccount: {
      id: bankAcc.id,
      code: bankAcc.accountCode,
      name: bankAcc.accountName,
      display: getAccountDisplay(bankAcc),
    },
    bookBalancePaise,
    unclearedDepositsPaise,
    unclearedWithdrawalsPaise,
    bankStatementBalancePaise,
    totalTransactions: transactions.length,
    clearedCount: transactions.filter((t: any) => t.isCleared).length,
    unclearedCount: transactions.filter((t: any) => !t.isCleared).length,
    transactions,
  };
}

export async function toggleBankTransactionMatch(params: {
  journalLineId: string;
  externalReference?: string;
  clearedDate?: string;
  userId?: string;
}) {
  const db = getDb();
  const existing = await db
    .select()
    .from(reconciliationMatches)
    .where(eq(reconciliationMatches.journalLineId, params.journalLineId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .delete(reconciliationMatches)
      .where(eq(reconciliationMatches.journalLineId, params.journalLineId));
    return { isCleared: false, journalLineId: params.journalLineId };
  } else {
    const line = (
      await db.select().from(journalLines).where(eq(journalLines.id, params.journalLineId)).limit(1)
    )[0];
    if (!line) throw new Error("Journal line not found");

    const amount = line.debitPaise > 0 ? line.debitPaise : line.creditPaise;
    const sessionId = `bs_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    await db.insert(reconciliationSessions).values({
      id: sessionId,
      reconciliationType: "BANK",
      sessionDate: params.clearedDate || new Date().toISOString().split("T")[0],
      reconciledBy: params.userId || "usr_owner_01",
      closingVariancePaise: 0,
      notes: "Bank Reconciliation Match",
    });

    await db.insert(reconciliationMatches).values({
      id: `match_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionId,
      journalLineId: params.journalLineId,
      externalReference: params.externalReference || "Passbook Verified",
      matchedAmountPaise: amount,
      matchedAt: new Date(),
    });

    return { isCleared: true, journalLineId: params.journalLineId };
  }
}

export async function recordDirectBankTransaction(params: {
  type: "BANK_CHARGE" | "BANK_INTEREST" | "DIRECT_DEPOSIT";
  amountPaise: number;
  bankAccountId?: number;
  narration?: string;
  date?: string;
  userId?: string;
}) {
  const bankAccId = params.bankAccountId || 1130;
  const dateStr = params.date || new Date().toISOString().split("T")[0];
  const user = params.userId || "usr_owner_01";

  if (params.type === "BANK_CHARGE") {
    // Dr. 6410 Bank Charges, Cr. Bank Account
    const result = await postJournalEntry({
      entryDate: dateStr,
      sourceDocumentType: "MANUAL",
      narration: params.narration || "Bank Service / SMS Charges",
      postedBy: user,
      lines: [
        { accountId: 6410, debitPaise: params.amountPaise, creditPaise: 0 },
        { accountId: bankAccId, debitPaise: 0, creditPaise: params.amountPaise },
      ],
    });
    return result;
  } else {
    // Direct Interest or Deposit: Dr. Bank Account, Cr. 4110 / Other Revenue
    const result = await postJournalEntry({
      entryDate: dateStr,
      sourceDocumentType: "MANUAL",
      narration: params.narration || "Direct Bank Interest / Deposit",
      postedBy: user,
      lines: [
        { accountId: bankAccId, debitPaise: params.amountPaise, creditPaise: 0 },
        { accountId: 4210, debitPaise: 0, creditPaise: params.amountPaise },
      ],
    });
    return result;
  }
}

