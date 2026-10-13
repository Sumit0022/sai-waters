"use client";

import { useEffect, useState } from "react";
import {
  Scale,
  TrendingUp,
  Building2,
  FileSpreadsheet,
  Coins,
  Sparkles,
  Plus,
  RefreshCw,
  Printer,
  ShieldCheck,
  ShieldAlert,
  X,
  Landmark,
  Receipt,
  Fuel,
  Wrench,
  Coffee,
  RotateCcw,
  Trash2,
  BookOpen,
  Calendar,
  Clock,
  User,
  Truck,
  Search,
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  Wallet,
  Banknote,
  CheckCheck,
} from "lucide-react";
import { formatINR } from "@/lib/utils";
import { getTodayIST, formatTimeIST, formatDateTimeIST, getDateStrIST } from "@/lib/date-utils";

export default function AccountingPage() {
  const [activeTab, setActiveTab] = useState<
    "TB" | "TL" | "JV" | "BRS" | "EXP" | "PNL" | "BS" | "CASH_REC" | "DEP"
  >("TB");

  const [tbData, setTbData] = useState<any>(null);
  const [pnlData, setPnlData] = useState<any>(null);
  const [bsData, setBsData] = useState<any>(null);
  const [jvData, setJvData] = useState<any[]>([]);
  const [cashRecData, setCashRecData] = useState<any>(null);
  const [brsData, setBrsData] = useState<any>(null);
  const [expensesData, setExpensesData] = useState<any[]>([]);
  const [allAccounts, setAllAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // T-Account Ledger View State
  const [selectedLedgerAccountId, setSelectedLedgerAccountId] = useState<number>(1130);

  // Bank Reconciliation State
  const [passbookInputRupees, setPassbookInputRupees] = useState<string>("");
  const [directBankModalOpen, setDirectBankModalOpen] = useState(false);
  const [directBankType, setDirectBankType] = useState<"BANK_CHARGE" | "BANK_INTEREST">("BANK_CHARGE");
  const [directBankAmountRupees, setDirectBankAmountRupees] = useState("");
  const [directBankNarration, setDirectBankNarration] = useState("Bank SMS & Service Charges");

  // New Custom Account Modal State
  const [createAccountModalOpen, setCreateAccountModalOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountType, setNewAccountType] = useState<"EXPENSE" | "COGS" | "ASSET" | "LIABILITY" | "REVENUE">("EXPENSE");
  const [newAccountCode, setNewAccountCode] = useState("");
  const [createAccountError, setCreateAccountError] = useState("");

  // Quick Expense Voucher Modal State
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseAccountId, setExpenseAccountId] = useState<string>("6210");
  const [expenseAmountRupees, setExpenseAmountRupees] = useState("");
  const [expensePaidViaId, setExpensePaidViaId] = useState<string>("1110");
  const [expenseNarration, setExpenseNarration] = useState("");
  const [expenseDate, setExpenseDate] = useState(getTodayIST());
  const [expenseError, setExpenseError] = useState("");

  // Manual JV Modal State
  const [manualJvModalOpen, setManualJvModalOpen] = useState(false);
  const [jvNarration, setJvNarration] = useState("");
  const [jvDate, setJvDate] = useState(getTodayIST());
  const [debitAccount, setDebitAccount] = useState("1110");
  const [creditAccount, setCreditAccount] = useState("3110");
  const [jvAmountRupees, setJvAmountRupees] = useState("1000");
  const [jvError, setJvError] = useState("");

  // Cashier Verification Modal & Driver Cash State
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [activeDriverId, setActiveDriverId] = useState("");
  const [activeDriverName, setActiveDriverName] = useState("");
  const [declaredAmountRupees, setDeclaredAmountRupees] = useState("");
  const [verifyAmountRupees, setVerifyAmountRupees] = useState("");
  const [targetAccountId, setTargetAccountId] = useState<number>(1110);
  const [verifyNotes, setVerifyNotes] = useState("");
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState<string[]>([]);
  const [submittingHandover, setSubmittingHandover] = useState(false);

  // Day-wise Collection View Filters
  const [cashDateFilter, setCashDateFilter] = useState<string>(getTodayIST());
  const [cashDriverFilter, setCashDriverFilter] = useState<string>("");
  const [cashStatusFilter, setCashStatusFilter] = useState<"ALL" | "PENDING" | "VERIFIED">("ALL");
  const [cashSearchQuery, setCashSearchQuery] = useState<string>("");

  // Depreciation State
  const [depActionMsg, setDepActionMsg] = useState("");
  const [depRunning, setDepRunning] = useState(false);

  // Data Loading
  const loadAll = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/accounting/trial-balance").then((r) => r.json()),
      fetch("/api/accounting/financial-statements").then((r) => r.json()),
      fetch("/api/accounting/journal-entries").then((r) => r.json()),
      fetch("/api/cash").then((r) => r.json()),
      fetch("/api/accounting/reconciliation").then((r) => r.json()),
      fetch("/api/accounting/expenses").then((r) => r.json()),
      fetch("/api/accounting/accounts").then((r) => r.json()),
    ])
      .then(([tb, fs, jv, cash, brs, exp, accs]) => {
        setTbData(tb);
        setPnlData(fs.profitAndLoss);
        setBsData(fs.balanceSheet);
        setJvData(jv.journalEntries || []);
        setCashRecData(cash);
        setBrsData(brs);
        setExpensesData(exp.expenses || []);
        setAllAccounts(accs.accounts || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load accounting data:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab && ["TB", "TL", "JV", "BRS", "EXP", "PNL", "BS", "CASH_REC", "DEP"].includes(tab)) {
        setActiveTab(tab as any);
      }
    }
    loadAll();
  }, []);

  const handleTabChange = (newTab: any) => {
    setActiveTab(newTab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", newTab);
      window.history.replaceState(null, "", url.toString());
    }
  };

  // Post Manual JV
  const handlePostManualJv = async (e: React.FormEvent) => {
    e.preventDefault();
    setJvError("");
    const amountPaise = Math.round(Number(jvAmountRupees) * 100);

    if (debitAccount === creditAccount) {
      setJvError("Debit and Credit accounts must be distinct.");
      return;
    }

    try {
      const res = await fetch("/api/accounting/journal-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryDate: jvDate,
          sourceDocumentType: "MANUAL",
          narration: jvNarration,
          lines: [
            { accountId: Number(debitAccount), debitPaise: amountPaise, creditPaise: 0 },
            { accountId: Number(creditAccount), debitPaise: 0, creditPaise: amountPaise },
          ],
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setManualJvModalOpen(false);
        setJvNarration("");
        setJvAmountRupees("1000");
        loadAll();
      } else {
        setJvError(data.error || "Failed to post entry");
      }
    } catch (err: any) {
      setJvError(err.message);
    }
  };

  // Reverse Journal Entry
  const handleReverseJv = async (entry: any) => {
    if (!confirm(`Are you sure you want to reverse journal voucher ${entry.entryNumber}?`)) return;
    try {
      const res = await fetch("/api/accounting/journal-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REVERSE",
          entryId: entry.id,
          reason: `Reversal requested for voucher ${entry.entryNumber}`,
        }),
      });
      if (res.ok) {
        alert(`Journal voucher ${entry.entryNumber} successfully reversed!`);
        loadAll();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to reverse entry");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Delete Manual Journal Entry
  const handleDeleteJv = async (entry: any) => {
    if (!confirm(`Warning: Are you sure you want to permanently delete voucher ${entry.entryNumber}?`)) return;
    try {
      const res = await fetch(`/api/accounting/journal-entries?id=${entry.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        alert(`Voucher ${entry.entryNumber} deleted.`);
        loadAll();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to delete entry");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Create New Custom Account
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateAccountError("");
    try {
      const res = await fetch("/api/accounting/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountName: newAccountName,
          accountType: newAccountType,
          accountCode: newAccountCode || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCreateAccountModalOpen(false);
        setNewAccountName("");
        setNewAccountCode("");
        loadAll();
      } else {
        setCreateAccountError(data.error || "Failed to create account");
      }
    } catch (err: any) {
      setCreateAccountError(err.message);
    }
  };

  // Settle Business Expense
  const handleSettleExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpenseError("");
    const amountRupeesNum = Number(expenseAmountRupees);
    if (!amountRupeesNum || amountRupeesNum <= 0) {
      setExpenseError("Please enter a valid expense amount.");
      return;
    }

    try {
      const res = await fetch("/api/accounting/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: Number(expenseAccountId),
          amountRupees: expenseAmountRupees,
          paidViaAccountId: Number(expensePaidViaId),
          expenseDate,
          notes: expenseNarration,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setExpenseModalOpen(false);
        setExpenseAmountRupees("");
        setExpenseNarration("");
        loadAll();
      } else {
        setExpenseError(data.error || "Failed to record expense");
      }
    } catch (err: any) {
      setExpenseError(err.message);
    }
  };

  // Toggle BRS Clearance Match
  const handleToggleBrsMatch = async (lineId: string) => {
    try {
      const res = await fetch("/api/accounting/reconciliation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TOGGLE_MATCH",
          journalLineId: lineId,
          clearedDate: getTodayIST(),
          externalReference: "Bank Statement Verified",
        }),
      });
      if (res.ok) {
        fetch("/api/accounting/reconciliation")
          .then((r) => r.json())
          .then((data) => setBrsData(data));
      }
    } catch (err) {
      console.error("Failed to toggle clearance:", err);
    }
  };

  // Post Direct Bank Charge / Interest
  const handleDirectBankEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/accounting/reconciliation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DIRECT_BANK",
          type: directBankType,
          amountRupees: directBankAmountRupees,
          narration: directBankNarration,
          date: getTodayIST(),
        }),
      });
      if (res.ok) {
        setDirectBankModalOpen(false);
        setDirectBankAmountRupees("");
        loadAll();
      }
    } catch (err) {
      console.error("Direct bank entry failed:", err);
    }
  };

  // Open Verification Modal Helper
  const openVerifyModal = (params: {
    driverId: string;
    driverName: string;
    amountPaise: number;
    submissionIds?: string[];
  }) => {
    setActiveDriverId(params.driverId);
    setActiveDriverName(params.driverName);
    const inRupees = (params.amountPaise / 100).toString();
    setDeclaredAmountRupees(inRupees);
    setVerifyAmountRupees(inRupees);
    setTargetAccountId(1110);
    setVerifyNotes("Counted in cash drawer, zero variance");
    setSelectedSubmissionIds(params.submissionIds || []);
    setVerifyModalOpen(true);
  };

  // Verify Driver Handover into Vault or Bank
  const handleVerifyHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingHandover(true);
    try {
      const declaredPaise = Math.round(Number(declaredAmountRupees || verifyAmountRupees) * 100);
      const verifiedPaise = Math.round(Number(verifyAmountRupees) * 100);
      const res = await fetch("/api/cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "HANDOVER",
          driverId: activeDriverId,
          totalDeclaredPaise: declaredPaise,
          totalVerifiedPaise: verifiedPaise,
          targetAccountId: Number(targetAccountId || 1110),
          notes: verifyNotes,
          submissionIds: selectedSubmissionIds.length > 0 ? selectedSubmissionIds : undefined,
        }),
      });
      if (res.ok) {
        setVerifyModalOpen(false);
        setSelectedSubmissionIds([]);
        loadAll();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to verify handover");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingHandover(false);
    }
  };

  // Run Depreciation
  const handleRunDepreciation = async () => {
    setDepRunning(true);
    setDepActionMsg("");
    try {
      const res = await fetch("/api/accounting/depreciation", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setDepActionMsg(
          `Voucher ${data.entryNumber} posted. Total Jar Depreciation: ${formatINR(
            data.totalDepreciationPaise
          )}`
        );
        loadAll();
      } else {
        setDepActionMsg(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setDepActionMsg(`Error: ${err.message}`);
    } finally {
      setDepRunning(false);
    }
  };

  // Compute T-Account Lines for selected account
  const activeTAccount = allAccounts.find((a) => a.id === selectedLedgerAccountId) || {
    id: selectedLedgerAccountId,
    accountName: "Account",
    accountCode: String(selectedLedgerAccountId),
    accountType: "ASSET",
  };

  const tAccountDebitLines: any[] = [];
  const tAccountCreditLines: any[] = [];

  for (const entry of jvData) {
    const lines = entry.lines || [];
    for (const l of lines) {
      if (l.accountId === selectedLedgerAccountId) {
        const oppositeLine = lines.find((other: any) => other.accountId !== selectedLedgerAccountId);
        const oppName = oppositeLine?.display?.simpleTitle || oppositeLine?.accountName || entry.narration;

        if (l.debitPaise > 0) {
          tAccountDebitLines.push({
            date: entry.entryDate,
            particulars: `To ${oppName}`,
            ref: entry.entryNumber,
            amountPaise: l.debitPaise,
            narration: entry.narration,
          });
        }
        if (l.creditPaise > 0) {
          tAccountCreditLines.push({
            date: entry.entryDate,
            particulars: `By ${oppName}`,
            ref: entry.entryNumber,
            amountPaise: l.creditPaise,
            narration: entry.narration,
          });
        }
      }
    }
  }

  const totalTDebitsPaise = tAccountDebitLines.reduce((s, r) => s + r.amountPaise, 0);
  const totalTCreditsPaise = tAccountCreditLines.reduce((s, r) => s + r.amountPaise, 0);

  const tDebitDiffPaise = totalTDebitsPaise - totalTCreditsPaise;
  const isDebitBalance = tDebitDiffPaise >= 0;
  const closingBalancePaise = Math.abs(tDebitDiffPaise);
  const tGrandTotalPaise = Math.max(totalTDebitsPaise, totalTCreditsPaise);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Scale className="w-7 h-7 text-sky-600" />
            Accounting & General Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Double-Entry General Ledger, T-Account View, General Journal, Bank Reconciliation (BRS), and P&L
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Expense Settle Button */}
          <button
            onClick={() => setExpenseModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Receipt className="w-4 h-4" />
            <span>Record Expense</span>
          </button>

          {/* New Custom Account Button */}
          <button
            onClick={() => setCreateAccountModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Account</span>
          </button>

          {/* Manual Journal Entry */}
          <button
            onClick={() => setManualJvModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Journal Voucher</span>
          </button>

          {/* Refresh Ledger */}
          <button
            onClick={loadAll}
            title="Refresh Ledger"
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 shadow-xs cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Double-Entry Balancing Banner */}
      <div
        className={`p-3.5 rounded-2xl border flex items-center justify-between gap-4 ${
          tbData?.isBalanced
            ? "bg-emerald-50/90 border-emerald-200 text-emerald-950"
            : "bg-rose-50 border-rose-200 text-rose-950"
        }`}
      >
        <div className="flex items-center gap-3">
          {tbData?.isBalanced ? (
            <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
          ) : (
            <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0" />
          )}
          <div>
            <h4 className="font-extrabold text-xs">
              {tbData?.isBalanced
                ? "Double-Entry Invariant Satisfied: General Ledger is Perfectly Balanced"
                : "Double-Entry Invariant Discrepancy Detected!"}
            </h4>
            <p className="text-[11px] opacity-80 mt-0.5">
              Total Debits: <strong>{formatINR(tbData?.grandTotalDebitPaise || 0)}</strong> • Total
              Credits: <strong>{formatINR(tbData?.grandTotalCreditPaise || 0)}</strong>
              {!tbData?.isBalanced && ` • Variance: ${formatINR(tbData?.variancePaise || 0)}`}
            </p>
          </div>
        </div>

        <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 bg-white rounded-lg border border-current shadow-xs">
          {tbData?.isBalanced ? "Balanced ✓" : "Alert ⚠️"}
        </span>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold border-b border-slate-200">
        {[
          { id: "TB", label: "Trial Balance", icon: Scale },
          { id: "TL", label: "T-Account Ledger", icon: BookOpen },
          { id: "JV", label: "General Journal", icon: FileSpreadsheet },
          { id: "BRS", label: "Bank Reconciliation (BRS)", icon: Landmark },
          { id: "EXP", label: "Expenses", icon: Receipt },
          { id: "PNL", label: "Profit & Loss (P&L)", icon: TrendingUp },
          { id: "BS", label: "Balance Sheet", icon: Building2 },
          { id: "CASH_REC", label: "Driver Cash Clearing", icon: Coins },
          { id: "DEP", label: "Jar Depreciation", icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer shrink-0 ${
                activeTab === tab.id
                  ? "bg-sky-600 text-white font-extrabold shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.id === "CASH_REC" && (cashRecData?.totalUnclearedCashPaise || 0) > 0 && (
                <span
                  className={`px-1.5 py-0.5 text-[9px] font-black rounded-full ${
                    activeTab === tab.id ? "bg-amber-400 text-slate-900" : "bg-amber-500 text-white"
                  }`}
                >
                  {formatINR(cashRecData.totalUnclearedCashPaise)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TRIAL BALANCE */}
      {/* ========================================================================= */}
      {activeTab === "TB" && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">
                General Ledger Trial Balance
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Summary of all active ledger account balances
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded-lg bg-white shadow-xs cursor-pointer print:hidden"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print TB</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Account Title</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Debit (₹)</th>
                  <th className="py-3 px-4 text-right">Credit (₹)</th>
                  <th className="py-3 px-4 text-center print:hidden">Ledger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tbData?.balances.map((acc: any) => {
                  const disp = acc.display || {};
                  return (
                    <tr key={acc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{acc.code}</td>
                      <td className="py-2.5 px-4">
                        <div className="font-bold text-slate-900">
                          {disp.simpleTitle || acc.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {disp.subtitle || acc.name}
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {acc.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                        {acc.netDebitPaise > 0 ? formatINR(acc.netDebitPaise) : "-"}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                        {acc.netCreditPaise > 0 ? formatINR(acc.netCreditPaise) : "-"}
                      </td>
                      <td className="py-2.5 px-4 text-center print:hidden">
                        <button
                          onClick={() => {
                            setSelectedLedgerAccountId(acc.id);
                            setActiveTab("TL");
                          }}
                          className="px-2 py-1 rounded-md text-[10px] font-bold bg-sky-50 text-sky-700 hover:bg-sky-100 cursor-pointer"
                        >
                          T-Account →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-100 font-black text-slate-900 text-xs border-t-2 border-slate-300">
                <tr>
                  <td colSpan={3} className="py-3 px-4 uppercase tracking-wider">
                    Total Trial Balance
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-700">
                    {formatINR(tbData?.grandTotalDebitPaise || 0)}
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-700">
                    {formatINR(tbData?.grandTotalCreditPaise || 0)}
                  </td>
                  <td className="print:hidden"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: T-ACCOUNT LEDGER */}
      {/* ========================================================================= */}
      {activeTab === "TL" && (
        <div className="space-y-4">
          {/* Account Selector Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-sky-600" />
              <label className="text-xs font-black text-slate-900">Select Ledger Account:</label>
              <select
                value={selectedLedgerAccountId}
                onChange={(e) => setSelectedLedgerAccountId(Number(e.target.value))}
                className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
              >
                {allAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountCode} — {acc.display?.simpleTitle || acc.accountName}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick account pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 1130, label: "Bank Account" },
                { id: 1110, label: "Cash-in-Hand" },
                { id: 1120, label: "Driver Cash" },
                { id: 1150, label: "Accounts Receivable" },
                { id: 4110, label: "Water Sales" },
                { id: 6210, label: "Vehicle Fuel" },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedLedgerAccountId(p.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    selectedLedgerAccountId === p.id
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* T-Account Box */}
          <div className="bg-white rounded-3xl border-2 border-slate-300 overflow-hidden shadow-sm">
            {/* T-Account Header */}
            <div className="bg-slate-900 text-white p-4 text-center border-b-2 border-slate-300">
              <div className="flex justify-between items-center text-xs font-black px-2">
                <span className="text-emerald-400 uppercase tracking-widest text-sm font-black">
                  Dr. (Debit)
                </span>
                <div>
                  <h2 className="text-base font-black tracking-wide uppercase">
                    {activeTAccount.accountCode} — {activeTAccount.display?.simpleTitle || activeTAccount.accountName}
                  </h2>
                  <p className="text-[11px] text-slate-300 font-medium">
                    {activeTAccount.display?.subtitle || activeTAccount.accountType}
                  </p>
                </div>
                <span className="text-sky-400 uppercase tracking-widest text-sm font-black">
                  Cr. (Credit)
                </span>
              </div>
            </div>

            {/* Split T-Shape Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x-2 divide-slate-300">
              {/* LEFT SIDE: DEBIT */}
              <div className="flex flex-col justify-between">
                <div>
                  <div className="bg-emerald-50/70 border-b border-slate-200 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-emerald-900 flex justify-between">
                    <span>Date • Particulars</span>
                    <span>Amount (₹)</span>
                  </div>

                  <div className="divide-y divide-slate-100 min-h-48 text-xs">
                    {tAccountDebitLines.length === 0 && !isDebitBalance && (
                      <div className="p-8 text-center text-slate-400 text-xs italic">
                        No debit entries recorded in this account
                      </div>
                    )}

                    {tAccountDebitLines.map((row, idx) => (
                      <div key={idx} className="p-2.5 flex items-start justify-between hover:bg-slate-50 gap-2">
                        <div>
                          <div className="font-bold text-slate-900">{row.particulars}</div>
                          <div className="text-[10px] text-slate-400">
                            {row.date} • {row.ref} {row.narration && `(${row.narration})`}
                          </div>
                        </div>
                        <div className="font-black text-slate-900 shrink-0">
                          {formatINR(row.amountPaise)}
                        </div>
                      </div>
                    ))}

                    {/* Closing balance row if Credit side was heavier */}
                    {!isDebitBalance && closingBalancePaise > 0 && (
                      <div className="p-2.5 bg-amber-50/50 flex items-center justify-between font-bold text-amber-900 border-t border-dashed border-amber-200">
                        <div>
                          <span>To Balance c/d (Closing Balance)</span>
                          <span className="text-[10px] text-amber-600 block">Credit Balance Carrydown</span>
                        </div>
                        <span className="font-black">{formatINR(closingBalancePaise)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Left Side Total Bar */}
                <div className="bg-slate-100 border-t-2 border-slate-300 p-3 flex justify-between items-center font-black text-xs text-slate-900">
                  <span>Total Debit (Dr.)</span>
                  <span className="text-sm font-black border-b-2 border-double border-slate-900 pb-0.5">
                    {formatINR(tGrandTotalPaise)}
                  </span>
                </div>
              </div>

              {/* RIGHT SIDE: CREDIT */}
              <div className="flex flex-col justify-between">
                <div>
                  <div className="bg-sky-50/70 border-b border-slate-200 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-sky-900 flex justify-between">
                    <span>Date • Particulars</span>
                    <span>Amount (₹)</span>
                  </div>

                  <div className="divide-y divide-slate-100 min-h-48 text-xs">
                    {tAccountCreditLines.length === 0 && isDebitBalance && (
                      <div className="p-8 text-center text-slate-400 text-xs italic">
                        No credit entries recorded in this account
                      </div>
                    )}

                    {tAccountCreditLines.map((row, idx) => (
                      <div key={idx} className="p-2.5 flex items-start justify-between hover:bg-slate-50 gap-2">
                        <div>
                          <div className="font-bold text-slate-900">{row.particulars}</div>
                          <div className="text-[10px] text-slate-400">
                            {row.date} • {row.ref} {row.narration && `(${row.narration})`}
                          </div>
                        </div>
                        <div className="font-black text-slate-900 shrink-0">
                          {formatINR(row.amountPaise)}
                        </div>
                      </div>
                    ))}

                    {/* Closing balance row if Debit side was heavier */}
                    {isDebitBalance && closingBalancePaise > 0 && (
                      <div className="p-2.5 bg-emerald-50/60 flex items-center justify-between font-bold text-emerald-950 border-t border-dashed border-emerald-300">
                        <div>
                          <span>By Balance c/d (Closing Balance)</span>
                          <span className="text-[10px] text-emerald-700 block">Debit Balance Carrydown</span>
                        </div>
                        <span className="font-black">{formatINR(closingBalancePaise)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side Total Bar */}
                <div className="bg-slate-100 border-t-2 border-slate-300 p-3 flex justify-between items-center font-black text-xs text-slate-900">
                  <span>Total Credit (Cr.)</span>
                  <span className="text-sm font-black border-b-2 border-double border-slate-900 pb-0.5">
                    {formatINR(tGrandTotalPaise)}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Summary Callout */}
            <div className="bg-slate-50 p-3.5 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-600">
                Net Account Position:{" "}
                <strong className="text-slate-900">
                  {isDebitBalance ? "Debit Balance" : "Credit Balance"}
                </strong>
              </span>
              <span className="text-sm font-black text-sky-800">
                Net Balance: {formatINR(closingBalancePaise)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: GENERAL JOURNAL */}
      {/* ========================================================================= */}
      {activeTab === "JV" && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-0">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">
                General Journal (Book of Original Entry)
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Chronological record of double-entry transactions (Date, Particulars, L.F., Dr, Cr)
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded-lg bg-white shadow-xs cursor-pointer print:hidden"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Journal</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-600 border-b-2 border-slate-300">
                <tr>
                  <th className="py-3 px-3 w-24">Date</th>
                  <th className="py-3 px-4">Particulars & Narration</th>
                  <th className="py-3 px-3 w-16 text-center">L.F.</th>
                  <th className="py-3 px-4 text-right w-28">Debit (₹)</th>
                  <th className="py-3 px-4 text-right w-28">Credit (₹)</th>
                  <th className="py-3 px-3 text-center w-24 print:hidden">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-200">
                {jvData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">
                      No journal entries recorded.
                    </td>
                  </tr>
                ) : (
                  jvData.map((entry) => {
                    const debitLines = (entry.lines || []).filter((l: any) => l.debitPaise > 0);
                    const creditLines = (entry.lines || []).filter((l: any) => l.creditPaise > 0);

                    return (
                      <tr key={entry.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Date */}
                        <td className="py-3 px-3 align-top font-bold text-slate-700 whitespace-nowrap">
                          {entry.entryDate}
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                            {entry.entryNumber}
                          </div>
                        </td>

                        {/* Particulars */}
                        <td className="py-3 px-4 align-top space-y-1.5">
                          {/* Debit lines */}
                          {debitLines.map((dl: any, idx: number) => (
                            <div key={`dr-${idx}`} className="flex justify-between items-center text-slate-900 font-bold">
                              <span>
                                {dl.display?.simpleTitle || dl.accountName} <span className="text-slate-500 font-medium">A/c</span>
                              </span>
                              <span className="text-slate-400 font-mono text-[11px]">.................... Dr.</span>
                            </div>
                          ))}

                          {/* Credit lines */}
                          {creditLines.map((cl: any, idx: number) => (
                            <div key={`cr-${idx}`} className="pl-6 text-slate-800 font-semibold">
                              <span>
                                To {cl.display?.simpleTitle || cl.accountName} <span className="text-slate-400 font-normal">A/c</span>
                              </span>
                            </div>
                          ))}

                          {/* Narration */}
                          <div className="pt-1 text-[11px] text-slate-500 italic">
                            (Being: {entry.narration || "Transaction recorded"})
                          </div>

                          <div className="flex items-center gap-2 pt-0.5">
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-600">
                              {entry.sourceDocumentType}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Posted By: {entry.postedBy || "Owner"}
                            </span>
                          </div>
                        </td>

                        {/* L.F. (Ledger Folio / Account Codes) */}
                        <td className="py-3 px-3 align-top text-center text-[10px] font-mono text-slate-500 space-y-1.5">
                          {debitLines.map((dl: any, idx: number) => (
                            <div key={idx}>{dl.accountCode}</div>
                          ))}
                          {creditLines.map((cl: any, idx: number) => (
                            <div key={idx}>{cl.accountCode}</div>
                          ))}
                        </td>

                        {/* Debit Amounts */}
                        <td className="py-3 px-4 align-top text-right space-y-1.5">
                          {debitLines.map((dl: any, idx: number) => (
                            <div key={idx} className="font-extrabold text-slate-900">
                              {formatINR(dl.debitPaise)}
                            </div>
                          ))}
                          {creditLines.map((_: any, idx: number) => (
                            <div key={idx} className="text-slate-300">-</div>
                          ))}
                        </td>

                        {/* Credit Amounts */}
                        <td className="py-3 px-4 align-top text-right space-y-1.5">
                          {debitLines.map((_: any, idx: number) => (
                            <div key={idx} className="text-slate-300">-</div>
                          ))}
                          {creditLines.map((cl: any, idx: number) => (
                            <div key={idx} className="font-extrabold text-slate-900">
                              {formatINR(cl.creditPaise)}
                            </div>
                          ))}
                        </td>

                        {/* Actions (Reverse & Delete) */}
                        <td className="py-3 px-3 align-top text-center space-y-1 print:hidden">
                          <button
                            type="button"
                            onClick={() => handleReverseJv(entry)}
                            title="Reverse voucher entry"
                            className="p-1 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center justify-center gap-1 w-full cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reverse</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteJv(entry)}
                            title="Delete voucher entry"
                            className="p-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold flex items-center justify-center gap-1 w-full cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: BANK RECONCILIATION STATEMENT (BRS) */}
      {/* ========================================================================= */}
      {activeTab === "BRS" && (
        <div className="space-y-6">
          {/* Top BRS KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
                1. Book Balance (GL 1130)
              </span>
              <span className="text-xl font-black text-slate-900 mt-1 block">
                {formatINR(brsData?.bookBalancePaise || 0)}
              </span>
              <span className="text-[10px] text-slate-400">Balance as per company ledger</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-xs">
              <span className="text-[10px] font-black uppercase text-amber-700 block tracking-wider">
                2. Less: Uncredited Deposits / Cheques
              </span>
              <span className="text-xl font-black text-amber-900 mt-1 block">
                {formatINR(brsData?.unclearedDepositsPaise || 0)}
              </span>
              <span className="text-[10px] text-amber-600">Recorded in books, pending in bank</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-sky-200 bg-sky-50/30 shadow-xs">
              <span className="text-[10px] font-black uppercase text-sky-700 block tracking-wider">
                3. Add: Unpresented Payments / Cheques
              </span>
              <span className="text-xl font-black text-sky-900 mt-1 block">
                {formatINR(brsData?.unclearedWithdrawalsPaise || 0)}
              </span>
              <span className="text-[10px] text-sky-600">Issued in books, not yet debited by bank</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border-2 border-emerald-400 bg-emerald-50/50 shadow-xs">
              <span className="text-[10px] font-black uppercase text-emerald-800 block tracking-wider">
                4. Reconciled Statement Balance
              </span>
              <span className="text-xl font-black text-emerald-950 mt-1 block">
                {formatINR(brsData?.bankStatementBalancePaise || 0)}
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold">
                Expected physical bank statement balance
              </span>
            </div>
          </div>

          {/* Statement Balance Matcher Box */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Landmark className="w-4 h-4 text-sky-600" />
                Bank Statement Matcher
              </h3>
              <p className="text-xs text-slate-500">
                Enter balance from your online NetBanking app or physical passbook to verify zero variance.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-black text-slate-400">₹</span>
                <input
                  type="number"
                  placeholder="Statement Balance"
                  value={passbookInputRupees}
                  onChange={(e) => setPassbookInputRupees(e.target.value)}
                  className="pl-7 pr-3 py-2 border border-slate-300 rounded-xl text-sm font-black text-slate-900 w-48 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <button
                onClick={() => setDirectBankModalOpen(true)}
                className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Bank Charge / Fee</span>
              </button>
            </div>
          </div>

          {/* Statement Matcher Result Indicator */}
          {passbookInputRupees && (
            <div
              className={`p-4 rounded-2xl border flex items-center justify-between ${
                Math.round(Number(passbookInputRupees) * 100) === (brsData?.bankStatementBalancePaise || 0)
                  ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                  : "bg-amber-50 border-amber-300 text-amber-950"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle className="w-5 h-5 text-current shrink-0" />
                <div>
                  <h4 className="font-black text-xs">
                    {Math.round(Number(passbookInputRupees) * 100) ===
                    (brsData?.bankStatementBalancePaise || 0)
                      ? "Reconciled! Bank statement and books match perfectly (Zero Variance)."
                      : "Variance Detected: Statement balance differs from ledger books"}
                  </h4>
                  <p className="text-[11px] opacity-80">
                    Entered Statement Balance: {formatINR(Math.round(Number(passbookInputRupees) * 100))} •
                    Calculated Bank Balance: {formatINR(brsData?.bankStatementBalancePaise || 0)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Bank Transactions Clearance Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h4 className="font-extrabold text-slate-900 text-xs">
                  Bank Account Transactions & Clearance Status
                </h4>
                <p className="text-[10px] text-slate-400">
                  Mark items as cleared when they appear in your official bank statement
                </p>
              </div>
              <span className="text-[11px] font-bold text-slate-500">
                Cleared: {brsData?.clearedCount || 0} • Pending: {brsData?.unclearedCount || 0}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Description & Reference</th>
                    <th className="py-3 px-4 text-right">Deposit (Dr ₹)</th>
                    <th className="py-3 px-4 text-right">Withdrawal (Cr ₹)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right print:hidden">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {brsData?.transactions?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">
                        No transactions recorded for this bank account.
                      </td>
                    </tr>
                  ) : (
                    brsData?.transactions?.map((tx: any) => (
                      <tr key={tx.lineId} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap">
                          {tx.entryDate}
                          <div className="text-[10px] text-slate-400 font-mono">{tx.entryNumber}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block">{tx.narration}</span>
                          <span className="text-[10px] text-slate-400 uppercase">{tx.sourceType}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-black text-emerald-700">
                          {tx.debitPaise > 0 ? formatINR(tx.debitPaise) : "-"}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-rose-700">
                          {tx.creditPaise > 0 ? formatINR(tx.creditPaise) : "-"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {tx.isCleared ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              ✓ Cleared in Bank
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                              ⏳ Pending Clearance
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right print:hidden">
                          <button
                            type="button"
                            onClick={() => handleToggleBrsMatch(tx.lineId)}
                            className={`px-3 py-1 rounded-lg text-[10px] font-bold shadow-2xs transition-all cursor-pointer ${
                              tx.isCleared
                                ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white"
                            }`}
                          >
                            {tx.isCleared ? "Mark Pending" : "Mark Cleared ✓"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: EXPENSES */}
      {/* ========================================================================= */}
      {activeTab === "EXP" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex justify-between items-center">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">
                Business Operational Expenses
              </h3>
              <p className="text-[11px] text-slate-400">
                Vehicle fuel, fleet maintenance, factory electricity, godown rent, and staff provisions
              </p>
            </div>

            <button
              onClick={() => setExpenseModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Record Expense</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Expense Category</th>
                    <th className="py-3 px-4">Notes / Narration</th>
                    <th className="py-3 px-4">Paid Via</th>
                    <th className="py-3 px-4 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expensesData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400">
                        No operational expenses recorded yet. Click &apos;Record Expense&apos; to add.
                      </td>
                    </tr>
                  ) : (
                    expensesData.map((exp: any) => (
                      <tr key={exp.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap">
                          {exp.expenseDate}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-extrabold text-slate-900 block">
                            {exp.expenseDisplay?.simpleTitle || exp.accountName}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {exp.accountCode}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700">
                          {exp.notes || "Operational expense"}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-800">
                            {exp.paidViaDisplay?.simpleTitle || "Cash-in-Hand"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-black text-rose-700 text-sm">
                          {formatINR(exp.amountPaise)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: PROFIT & LOSS STATEMENT */}
      {/* ========================================================================= */}
      {activeTab === "PNL" && pnlData && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs max-w-2xl mx-auto">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h3 className="font-black text-slate-900 text-base">
                Profit & Loss Statement (Income Statement)
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">Revenues - Cost of Goods Sold - Expenses = Net Profit</p>
            </div>
            <button
              onClick={() => window.print()}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded-lg bg-white shadow-xs cursor-pointer print:hidden flex items-center gap-1"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print P&L</span>
            </button>
          </div>

          <div className="space-y-4 text-xs">
            {/* Revenue */}
            <div>
              <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider mb-2">
                1. Operating Revenues
              </h4>
              <div className="space-y-1.5 pl-2">
                {pnlData.revenues.map((r: any) => (
                  <div key={r.id} className="flex justify-between py-1 border-b border-slate-100">
                    <span className="font-semibold text-slate-700">
                      {r.display?.simpleTitle || r.name}
                    </span>
                    <span className="font-bold text-slate-900">
                      {formatINR(r.totalCreditPaise - r.totalDebitPaise)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between pt-1 font-black text-emerald-800">
                  <span>Total Revenues:</span>
                  <span>{formatINR(pnlData.totalRevenuePaise)}</span>
                </div>
              </div>
            </div>

            {/* COGS */}
            <div>
              <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider mb-2">
                2. Cost of Goods Sold (COGS)
              </h4>
              <div className="space-y-1.5 pl-2">
                {pnlData.cogs.map((c: any) => (
                  <div key={c.id} className="flex justify-between py-1 border-b border-slate-100">
                    <span className="font-semibold text-slate-700">
                      {c.display?.simpleTitle || c.name}
                    </span>
                    <span className="font-bold text-slate-900">
                      {formatINR(c.totalDebitPaise - c.totalCreditPaise)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between pt-1 font-black text-slate-900">
                  <span>Total Direct Production Cost:</span>
                  <span>{formatINR(pnlData.totalCogsPaise)}</span>
                </div>
              </div>
            </div>

            {/* Gross Profit */}
            <div className="p-3 bg-sky-50 rounded-xl flex justify-between font-black text-sky-950 text-sm">
              <span>Gross Profit:</span>
              <span>{formatINR(pnlData.grossProfitPaise)}</span>
            </div>

            {/* Operating Expenses */}
            <div>
              <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider mb-2">
                3. Operating Expenses
              </h4>
              <div className="space-y-1.5 pl-2">
                {pnlData.expenses.map((e: any) => (
                  <div key={e.id} className="flex justify-between py-1 border-b border-slate-100">
                    <span className="font-semibold text-slate-700">
                      {e.display?.simpleTitle || e.name}
                    </span>
                    <span className="font-bold text-slate-900">
                      {formatINR(e.totalDebitPaise - e.totalCreditPaise)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between pt-1 font-black text-rose-800">
                  <span>Total Operating Expenses:</span>
                  <span>{formatINR(pnlData.totalExpensesPaise)}</span>
                </div>
              </div>
            </div>

            {/* Net Profit */}
            <div
              className={`p-4 rounded-xl flex justify-between font-black text-base ${
                pnlData.netProfitPaise >= 0
                  ? "bg-emerald-500 text-white shadow-xs"
                  : "bg-rose-600 text-white"
              }`}
            >
              <span>Net Profit:</span>
              <span>{formatINR(pnlData.netProfitPaise)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: BALANCE SHEET */}
      {/* ========================================================================= */}
      {activeTab === "BS" && bsData && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs max-w-3xl mx-auto">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h3 className="font-black text-slate-900 text-base">
                Balance Sheet (Statement of Financial Position)
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Assets = Liabilities + Owner Equity + Current Period Net Profit
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded-lg bg-white shadow-xs cursor-pointer print:hidden flex items-center gap-1"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print BS</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Assets */}
            <div className="space-y-3">
              <h4 className="font-black text-emerald-800 text-xs uppercase tracking-wider border-b pb-1">
                Assets
              </h4>
              <div className="space-y-1.5">
                {bsData.assets.map((a: any) => (
                  <div key={a.id} className="flex justify-between py-1 border-b border-slate-100">
                    <span className="font-semibold text-slate-700">
                      {a.display?.simpleTitle || a.name}
                    </span>
                    <span className="font-bold text-slate-900">
                      {formatINR(a.totalDebitPaise - a.totalCreditPaise)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl flex justify-between font-black text-emerald-950">
                <span>Total Assets:</span>
                <span>{formatINR(bsData.totalAssetsPaise)}</span>
              </div>
            </div>

            {/* Liabilities & Equity */}
            <div className="space-y-3">
              <h4 className="font-black text-sky-800 text-xs uppercase tracking-wider border-b pb-1">
                Liabilities & Equity
              </h4>
              <div className="space-y-1.5">
                {bsData.liabilities.map((l: any) => (
                  <div key={l.id} className="flex justify-between py-1 border-b border-slate-100">
                    <span className="font-semibold text-slate-700">
                      {l.display?.simpleTitle || l.name}
                    </span>
                    <span className="font-bold text-slate-900">
                      {formatINR(l.totalCreditPaise - l.totalDebitPaise)}
                    </span>
                  </div>
                ))}
                {bsData.equity.map((eq: any) => (
                  <div key={eq.id} className="flex justify-between py-1 border-b border-slate-100">
                    <span className="font-semibold text-slate-700">
                      {eq.display?.simpleTitle || eq.name}
                    </span>
                    <span className="font-bold text-slate-900">
                      {formatINR(eq.totalCreditPaise - eq.totalDebitPaise)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between py-1 border-b border-slate-100 font-bold text-emerald-800">
                  <span>Current Period Net Profit:</span>
                  <span>{formatINR(bsData.currentPeriodNetProfitPaise)}</span>
                </div>
              </div>
              <div className="p-3 bg-sky-50 rounded-xl flex justify-between font-black text-sky-950">
                <span>Total Liabilities & Equity:</span>
                <span>{formatINR(bsData.totalLiabilitiesPaise + bsData.totalEquityWithProfitPaise)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: DRIVER CASH CLEARING */}
      {/* ========================================================================= */}
      {activeTab === "CASH_REC" && cashRecData && (() => {
        const allCashList: any[] = cashRecData.allSubmissions || cashRecData.submissions || [];

        // Filter submissions based on user filters
        const displaySubmissions = allCashList.filter((item: any) => {
          if (cashDateFilter && item.collectionDateIST !== cashDateFilter) {
            return false;
          }
          if (cashDriverFilter && item.driverId !== cashDriverFilter) {
            return false;
          }
          if (cashStatusFilter === "PENDING" && item.isHandedOver) {
            return false;
          }
          if (cashStatusFilter === "VERIFIED" && !item.isHandedOver) {
            return false;
          }
          if (cashSearchQuery.trim()) {
            const q = cashSearchQuery.toLowerCase();
            const matchCust = item.customerName?.toLowerCase().includes(q) || item.customerCode?.toLowerCase().includes(q);
            const matchOrder = item.orderNumber?.toLowerCase().includes(q) || item.invoiceNumber?.toLowerCase().includes(q);
            const matchDriver = item.driverName?.toLowerCase().includes(q);
            if (!matchCust && !matchOrder && !matchDriver) return false;
          }
          return true;
        });

        // Totals for filtered view
        const filteredTotalPaise = displaySubmissions.reduce((sum, s) => sum + (s.amountCollectedPaise || 0), 0);
        const filteredPendingPaise = displaySubmissions
          .filter((s) => !s.isHandedOver)
          .reduce((sum, s) => sum + (s.amountCollectedPaise || 0), 0);
        const filteredHandedPaise = displaySubmissions
          .filter((s) => s.isHandedOver)
          .reduce((sum, s) => sum + (s.amountCollectedPaise || 0), 0);

        // Drivers available in list
        const uniqueDriversMap: Record<string, string> = {};
        allCashList.forEach((s) => {
          if (s.driverId && s.driverName) uniqueDriversMap[s.driverId] = s.driverName;
        });

        const activeDriversCount = Object.keys(cashRecData.pendingByDriver || {}).length;

        return (
          <div className="space-y-6">
            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Pending Handover */}
              <div className="bg-amber-50/70 p-5 rounded-2xl border border-amber-200/90 shadow-xs">
                <div className="flex items-center justify-between text-amber-700 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Awaiting Handover (A/C 1120)</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                    <Truck className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-amber-950">
                  {formatINR(cashRecData.totalUnclearedCashPaise || 0)}
                </div>
                <p className="text-[11px] text-amber-800/80 mt-1">Field cash awaiting cashier vault/bank handover</p>
              </div>

              {/* Collections Today */}
              <div className="bg-sky-50/70 p-5 rounded-2xl border border-sky-200/90 shadow-xs">
                <div className="flex items-center justify-between text-sky-700 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Collected Today (IST)</span>
                  <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                    <Coins className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-sky-950">
                  {formatINR(cashRecData.totalCollectedTodayPaise || 0)}
                </div>
                <p className="text-[11px] text-sky-800/80 mt-1">Total doorstep collections made today</p>
              </div>

              {/* Verified & Handed Over Today */}
              <div className="bg-emerald-50/70 p-5 rounded-2xl border border-emerald-200/90 shadow-xs">
                <div className="flex items-center justify-between text-emerald-700 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Handed Over Today</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-emerald-950">
                  {formatINR(cashRecData.totalHandedOverTodayPaise || 0)}
                </div>
                <p className="text-[11px] text-emerald-800/80 mt-1">Deposited into Central Vault (1110) / Bank (1130)</p>
              </div>

              {/* Active Drivers With Pending Cash */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Drivers With Cash</span>
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {activeDriversCount} <span className="text-xs font-normal text-slate-500">active staff</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Delivery agents holding cash in field</p>
              </div>
            </div>

            {/* Pending Drivers Handover Batch Cards */}
            {activeDriversCount > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Pending Driver Handovers Requiring Admin Verification
                  </h4>
                  <span className="text-xs text-slate-500">
                    {activeDriversCount} driver{activeDriversCount > 1 ? "s" : ""} awaiting clearing
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(cashRecData.pendingByDriver || {}).map(([drvId, data]: any) => (
                    <div
                      key={drvId}
                      className="bg-white p-5 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/30 to-white shadow-xs space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <Truck className="w-4 h-4 text-amber-600" />
                            <h5 className="font-black text-slate-900 text-sm">{data.driverName}</h5>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">{drvId}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-black text-amber-950 block">
                            {formatINR(data.totalPendingPaise)}
                          </span>
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full">
                            {data.count} pending collection{data.count > 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          openVerifyModal({
                            driverId: drvId,
                            driverName: data.driverName,
                            amountPaise: data.totalPendingPaise,
                          })
                        }
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <CheckCheck className="w-4 h-4" />
                        Verify & Clear Handover ({formatINR(data.totalPendingPaise)}) →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filter & Day-wise Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Date Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-sky-600" />
                    Day View:
                  </span>

                  {/* Quick Pills */}
                  <button
                    onClick={() => setCashDateFilter("")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      cashDateFilter === ""
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    All Days
                  </button>
                  <button
                    onClick={() => setCashDateFilter(cashRecData.todayIST || getTodayIST())}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      cashDateFilter === (cashRecData.todayIST || getTodayIST())
                        ? "bg-sky-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Today
                  </button>

                  {/* Native Date Picker */}
                  <input
                    type="date"
                    value={cashDateFilter}
                    onChange={(e) => setCashDateFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-sky-500 cursor-pointer"
                  />
                </div>

                {/* Driver Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-slate-500" />
                    Driver:
                  </span>
                  <select
                    value={cashDriverFilter}
                    onChange={(e) => setCashDriverFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-sky-500 cursor-pointer"
                  >
                    <option value="">All Delivery Staff</option>
                    {Object.entries(uniqueDriversMap).map(([id, name]) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status and Search Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                {/* Status Pills */}
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  {[
                    { id: "ALL", label: "All Collections", count: allCashList.length },
                    {
                      id: "PENDING",
                      label: "Pending Handover",
                      count: allCashList.filter((s) => !s.isHandedOver).length,
                    },
                    {
                      id: "VERIFIED",
                      label: "Handed Over & Verified",
                      count: allCashList.filter((s) => s.isHandedOver).length,
                    },
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() => setCashStatusFilter(st.id as any)}
                      className={`px-3 py-1.5 rounded-xl cursor-pointer transition-all ${
                        cashStatusFilter === st.id
                          ? "bg-sky-600 text-white font-extrabold shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {st.label} ({st.count})
                    </button>
                  ))}
                </div>

                {/* Search Field */}
                <div className="relative min-w-[240px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search customer, code, order #..."
                    value={cashSearchQuery}
                    onChange={(e) => setCashSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-sky-500"
                  />
                </div>
              </div>
            </div>

            {/* Itemized Day-wise Transactions Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap justify-between items-center gap-2">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                    <Coins className="w-4 h-4 text-emerald-600" />
                    Itemized Doorstep Cash Collections List
                    {cashDateFilter && (
                      <span className="text-xs font-normal text-slate-500">
                        {" "}for {cashDateFilter === (cashRecData.todayIST || getTodayIST()) ? "Today" : cashDateFilter}
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Showing {displaySubmissions.length} collection record{displaySubmissions.length === 1 ? "" : "s"}
                    {filteredTotalPaise > 0 && ` • Total: ${formatINR(filteredTotalPaise)}`}
                    {filteredPendingPaise > 0 && ` • Pending: ${formatINR(filteredPendingPaise)}`}
                  </p>
                </div>

                {filteredPendingPaise > 0 && (
                  <button
                    onClick={() => {
                      const firstDriver = displaySubmissions.find((s) => !s.isHandedOver);
                      if (firstDriver) {
                        openVerifyModal({
                          driverId: firstDriver.driverId,
                          driverName: firstDriver.driverName,
                          amountPaise: filteredPendingPaise,
                          submissionIds: displaySubmissions.filter((s) => !s.isHandedOver).map((s) => s.id),
                        });
                      }
                    }}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Verify Filtered Collections ({formatINR(filteredPendingPaise)}) →
                  </button>
                )}
              </div>

              {displaySubmissions.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <Coins className="w-8 h-8 text-slate-300 mx-auto" />
                  <h5 className="font-bold text-slate-700 text-sm">No cash collections found</h5>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    No field cash submissions match the selected date or filter criteria. Change filters to view collections.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500">
                        <th className="py-3 px-4">Time (IST)</th>
                        <th className="py-3 px-4">Delivery Staff</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Order / Invoice Ref</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4 text-right">Amount (₹)</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displaySubmissions.map((sub: any) => (
                        <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Time */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {sub.collectionTimeIST}
                            </div>
                            <span className="text-[10px] text-slate-400 block">{sub.collectionDateIST}</span>
                          </td>

                          {/* Driver */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <Truck className="w-3.5 h-3.5 text-amber-600" />
                              {sub.driverName}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">{sub.driverId}</span>
                          </td>

                          {/* Customer */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{sub.customerName}</div>
                            <div className="flex items-center gap-1 text-[10px] text-slate-500">
                              <span className="font-mono bg-slate-100 px-1 py-0.2 rounded text-slate-600">
                                {sub.customerCode}
                              </span>
                              {sub.customerPhone && sub.customerPhone !== "-" && (
                                <span>• {sub.customerPhone}</span>
                              )}
                            </div>
                          </td>

                          {/* Order / Invoice */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-mono font-bold text-slate-800">
                              {sub.orderNumber || sub.invoiceNumber || "Field Cash Entry"}
                            </div>
                            <span className="text-[10px] text-slate-400">Slip #{sub.id.slice(-6)}</span>
                          </td>

                          {/* Type */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                sub.orderType === "ONE_TIME_EVENT"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-sky-100 text-sky-800"
                              }`}
                            >
                              {sub.orderType === "ONE_TIME_EVENT" ? "EVENT SPOT" : "RECURRING"}
                            </span>
                          </td>

                          {/* Amount */}
                          <td className="py-3 px-4 text-right whitespace-nowrap font-black text-emerald-800 text-sm">
                            {formatINR(sub.amountCollectedPaise)}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {sub.isHandedOver ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3 h-3" />
                                Handed Over
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                                <Clock className="w-3 h-3" />
                                Awaiting Handover
                              </span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {sub.isHandedOver ? (
                              <span className="text-[10px] text-slate-400 font-mono">
                                #{sub.handoverId?.slice(-6) || "cleared"}
                              </span>
                            ) : (
                              <button
                                onClick={() =>
                                  openVerifyModal({
                                    driverId: sub.driverId,
                                    driverName: sub.driverName,
                                    amountPaise: sub.amountCollectedPaise,
                                    submissionIds: [sub.id],
                                  })
                                }
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-xs cursor-pointer transition-colors"
                              >
                                Clear Handover →
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Handover Settlement History Log */}
            {cashRecData.handovers && cashRecData.handovers.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                  <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Verified Cash Handover Settlements History (Double-Entry General Journal Logs)
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Historical log of cashier verified handovers transferred from A/C 1120 to Central Vault / Bank.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500">
                        <th className="py-3 px-4">Voucher ID</th>
                        <th className="py-3 px-4">Timestamp (IST)</th>
                        <th className="py-3 px-4">Delivery Staff</th>
                        <th className="py-3 px-4 text-right">Declared (₹)</th>
                        <th className="py-3 px-4 text-right">Verified (₹)</th>
                        <th className="py-3 px-4 text-right">Variance (₹)</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4">Cashier Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cashRecData.handovers.slice(0, 10).map((h: any) => (
                        <tr key={h.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4 font-mono font-bold text-slate-700">#{h.id.slice(-8)}</td>
                          <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                            {formatDateTimeIST(h.handoverTimestamp)}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">{h.driverName}</td>
                          <td className="py-3 px-4 text-right text-slate-600 font-bold">
                            {formatINR(h.totalDeclaredPaise)}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-emerald-800">
                            {formatINR(h.totalVerifiedPaise)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold">
                            {h.variancePaise === 0 ? (
                              <span className="text-slate-400">₹0.00</span>
                            ) : h.variancePaise < 0 ? (
                              <span className="text-rose-600">-{formatINR(Math.abs(h.variancePaise))}</span>
                            ) : (
                              <span className="text-blue-600">+{formatINR(h.variancePaise)}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                              {h.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 text-[11px]">{h.notes || "Counted and verified"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* TAB 9: JAR DEPRECIATION */}
      {/* ========================================================================= */}
      {activeTab === "DEP" && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 max-w-xl mx-auto shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-rose-600" />
            <h3 className="text-base font-extrabold text-slate-900">
              Monthly Straight-Line Jar Asset Depreciation
            </h3>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Reusable 20L polycarbonate containers are recorded as Fixed Assets in Account 1210 and depreciated over a 24-month lifespan using the Straight-Line Method (SLM).
          </p>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Asset Account:</span>
              <strong className="text-slate-900">1210 Reusable 20L Water Jars</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Contra Asset Account:</span>
              <strong className="text-slate-900">1220 Accumulated Depreciation — Jars</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Expense Account:</span>
              <strong className="text-slate-900">6510 Depreciation Expense — Jars</strong>
            </div>
          </div>

          {depActionMsg && (
            <p className="p-3 bg-sky-50 border border-sky-200 text-sky-900 text-xs font-bold rounded-xl">
              {depActionMsg}
            </p>
          )}

          <button
            onClick={handleRunDepreciation}
            disabled={depRunning}
            className="w-full py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
          >
            {depRunning ? "Posting Voucher..." : "Run Monthly Depreciation Voucher Now"}
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD ACCOUNT */}
      {/* ========================================================================= */}
      {createAccountModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Add New Account</h3>
                  <p className="text-[10px] text-slate-400">Add new ledger account to Chart of Accounts</p>
                </div>
              </div>
              <button
                onClick={() => setCreateAccountModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Presets */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Quick Category Presets:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { name: "Vehicle Fuel & Diesel", type: "EXPENSE", icon: Fuel },
                  { name: "Vehicle Repair & Maintenance", type: "EXPENSE", icon: Wrench },
                  { name: "Plant & Godown Rent", type: "EXPENSE", icon: Building2 },
                  { name: "Staff Welfare & Refreshments", type: "EXPENSE", icon: Coffee },
                  { name: "RO Chemicals & Filter Spares", type: "COGS", icon: Sparkles },
                ].map((pre) => (
                  <button
                    key={pre.name}
                    type="button"
                    onClick={() => {
                      setNewAccountName(pre.name);
                      setNewAccountType(pre.type as any);
                    }}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <pre.icon className="w-3 h-3" />
                    <span>{pre.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Account Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Vehicle Fuel, Office Supplies, Electricity"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Account Category
                  </label>
                  <select
                    value={newAccountType}
                    onChange={(e) => setNewAccountType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
                  >
                    <option value="EXPENSE">Operating Expense</option>
                    <option value="COGS">Direct Cost of Goods (COGS)</option>
                    <option value="ASSET">Asset (Bank / Cash / Asset)</option>
                    <option value="LIABILITY">Liability (Payable / Loan)</option>
                    <option value="REVENUE">Revenue (Sales / Income)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Account Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Auto-assigned"
                    value={newAccountCode}
                    onChange={(e) => setNewAccountCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              {createAccountError && (
                <p className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl">
                  {createAccountError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateAccountModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: RECORD BUSINESS EXPENSE */}
      {/* ========================================================================= */}
      {expenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Record Business Expense</h3>
                  <p className="text-[10px] text-slate-400">Post balanced voucher for vehicle fuel, repairs, rent, etc.</p>
                </div>
              </div>
              <button
                onClick={() => setExpenseModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSettleExpense} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Expense Account
                </label>
                <select
                  value={expenseAccountId}
                  onChange={(e) => setExpenseAccountId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white"
                  required
                >
                  {allAccounts
                    .filter((a) => a.accountType === "EXPENSE" || a.accountType === "COGS")
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountCode} — {acc.display?.simpleTitle || acc.accountName}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 500"
                    value={expenseAmountRupees}
                    onChange={(e) => setExpenseAmountRupees(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-black text-rose-700"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Paid From (Payment Account)
                </label>
                <select
                  value={expensePaidViaId}
                  onChange={(e) => setExpensePaidViaId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white"
                  required
                >
                  <option value="1110">1110 — Cash-in-Hand (Central Vault)</option>
                  <option value="1130">1130 — Bank Account (Online / Cheque / UPI)</option>
                  <option value="1120">1120 — Driver Cash in Transit</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Description / Narration
                </label>
                <input
                  type="text"
                  placeholder="e.g. Delivery van 10L diesel, factory snacks"
                  value={expenseNarration}
                  onChange={(e) => setExpenseNarration(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  required
                />
              </div>

              {expenseError && (
                <p className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl">
                  {expenseError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setExpenseModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Post Expense Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: MANUAL JOURNAL VOUCHER */}
      {/* ========================================================================= */}
      {manualJvModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">Post Manual Journal Entry</h3>
              <button
                onClick={() => setManualJvModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePostManualJv} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Narration / Description</label>
                <input
                  type="text"
                  placeholder="e.g. Purchase of water filter consumables"
                  value={jvNarration}
                  onChange={(e) => setJvNarration(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Debit Account (Dr.)</label>
                <select
                  value={debitAccount}
                  onChange={(e) => setDebitAccount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white"
                >
                  {allAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountCode} — {acc.display?.simpleTitle || acc.accountName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Credit Account (Cr.)</label>
                <select
                  value={creditAccount}
                  onChange={(e) => setCreditAccount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white"
                >
                  {allAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountCode} — {acc.display?.simpleTitle || acc.accountName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    value={jvAmountRupees}
                    onChange={(e) => setJvAmountRupees(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-black text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Date</label>
                  <input
                    type="date"
                    value={jvDate}
                    onChange={(e) => setJvDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold"
                    required
                  />
                </div>
              </div>

              {jvError && (
                <p className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl">
                  {jvError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setManualJvModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Commit Journal Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: DIRECT BANK ENTRY (CHARGES / INTEREST) */}
      {/* ========================================================================= */}
      {directBankModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">Record Bank Entry</h3>
              <button
                onClick={() => setDirectBankModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDirectBankEntry} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Transaction Type</label>
                <select
                  value={directBankType}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setDirectBankType(val);
                    setDirectBankNarration(
                      val === "BANK_CHARGE" ? "Bank SMS & Service Charges" : "Bank Savings/Current Interest Received"
                    );
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white"
                >
                  <option value="BANK_CHARGE">Bank Charge / Fee (Dr. Charges, Cr. Bank)</option>
                  <option value="BANK_INTEREST">Bank Interest Received (Dr. Bank, Cr. Income)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Amount (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 150"
                  value={directBankAmountRupees}
                  onChange={(e) => setDirectBankAmountRupees(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-black"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Narration / Description</label>
                <input
                  type="text"
                  value={directBankNarration}
                  onChange={(e) => setDirectBankNarration(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDirectBankModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Record & Auto-Clear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: VERIFY DRIVER HANDOVER INTO VAULT */}
      {/* ========================================================================= */}
      {verifyModalOpen && (() => {
        const declaredNum = Number(declaredAmountRupees || verifyAmountRupees || 0);
        const verifiedNum = Number(verifyAmountRupees || 0);
        const variance = verifiedNum - declaredNum;

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Coins className="w-5 h-5 text-emerald-600" />
                    Verify Cash Handover: {activeDriverName}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Clear driver collection clearing (A/C 1120) and deposit into Central Vault or Bank.
                  </p>
                </div>
                <button
                  onClick={() => setVerifyModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer p-1 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleVerifyHandover} className="space-y-4">
                {/* Declared Summary */}
                <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-amber-800 font-bold block">Declared Field Collections:</span>
                    <span className="text-[11px] text-amber-700">
                      {selectedSubmissionIds.length > 0
                        ? `${selectedSubmissionIds.length} Selected Transaction(s)`
                        : "All Unhanded Transactions for Driver"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-amber-950">
                      ₹{Number(declaredAmountRupees || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Target Destination Account Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                    Deposit Destination Account:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Option 1: Central Vault 1110 */}
                    <div
                      onClick={() => setTargetAccountId(1110)}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                        targetAccountId === 1110
                          ? "bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 font-bold"
                          : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black flex items-center gap-1.5">
                          <Wallet className="w-4 h-4 text-emerald-600" />
                          Central Vault (1110)
                        </span>
                        <input
                          type="radio"
                          name="targetAcc"
                          checked={targetAccountId === 1110}
                          onChange={() => setTargetAccountId(1110)}
                          className="accent-emerald-600 cursor-pointer"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500">
                        Physical currency kept in central plant cash drawer.
                      </span>
                    </div>

                    {/* Option 2: Bank Current Account 1130 */}
                    <div
                      onClick={() => setTargetAccountId(1130)}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                        targetAccountId === 1130
                          ? "bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 text-blue-950 font-bold"
                          : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-blue-600" />
                          Bank Account (1130)
                        </span>
                        <input
                          type="radio"
                          name="targetAcc"
                          checked={targetAccountId === 1130}
                          onChange={() => setTargetAccountId(1130)}
                          className="accent-blue-600 cursor-pointer"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500">
                        Driver directly deposited into company bank account.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Physically Counted Verified Amount */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Physically Counted / Received Amount (₹)
                    </label>
                    <button
                      type="button"
                      onClick={() => setVerifyAmountRupees(declaredAmountRupees)}
                      className="text-[11px] text-sky-600 hover:text-sky-800 font-bold cursor-pointer"
                    >
                      Match Declared (₹{declaredAmountRupees})
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={verifyAmountRupees}
                    onChange={(e) => setVerifyAmountRupees(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-lg font-black text-slate-900 focus:outline-emerald-500"
                    required
                  />

                  {/* Variance Indicator */}
                  {variance === 0 ? (
                    <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      Exact Physical Match — Zero Variance (₹0.00)
                    </div>
                  ) : variance < 0 ? (
                    <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      Shortage Discrepancy: Short by ₹{Math.abs(variance).toFixed(2)}
                    </div>
                  ) : (
                    <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      Surplus Discrepancy: Excess of ₹{variance.toFixed(2)}
                    </div>
                  )}
                </div>

                {/* Verification Notes */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Cashier / Approval Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Counted in cash drawer, zero variance"
                    value={verifyNotes}
                    onChange={(e) => setVerifyNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-sky-500"
                  />
                </div>

                {/* Double-Entry Journal Entry Preview Card */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-[11px] space-y-1.5 font-mono">
                  <div className="flex justify-between text-slate-500 font-sans font-bold">
                    <span>Double-Entry Journal Voucher:</span>
                    <span className="text-emerald-700">Auto-Posted</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>
                      Dr. {targetAccountId === 1130 ? "1130 Bank Current Account" : "1110 Cash-in-Hand (Vault)"}
                    </span>
                    <span>+₹{Number(verifyAmountRupees || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-700 font-bold">
                    <span>Cr. 1120 Driver Collection Clearing ({activeDriverName})</span>
                    <span>-₹{Number(verifyAmountRupees || 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setVerifyModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingHandover}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCheck className="w-4 h-4" />
                    {submittingHandover ? "Posting Voucher..." : "Approve & Post Journal Entry"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
