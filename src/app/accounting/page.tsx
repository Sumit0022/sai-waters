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
  CheckCircle,
  HelpCircle,
  ArrowRightLeft,
  BookOpen,
} from "lucide-react";
import { formatINR } from "@/lib/utils";

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
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [expenseError, setExpenseError] = useState("");

  // Manual JV Modal State
  const [manualJvModalOpen, setManualJvModalOpen] = useState(false);
  const [jvNarration, setJvNarration] = useState("");
  const [jvDate, setJvDate] = useState(new Date().toISOString().split("T")[0]);
  const [debitAccount, setDebitAccount] = useState("1110");
  const [creditAccount, setCreditAccount] = useState("3110");
  const [jvAmountRupees, setJvAmountRupees] = useState("1000");
  const [jvError, setJvError] = useState("");

  // Cashier Verification Modal State
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [activeDriverId, setActiveDriverId] = useState("");
  const [activeDriverName, setActiveDriverName] = useState("");
  const [verifyAmountRupees, setVerifyAmountRupees] = useState("");
  const [verifyNotes, setVerifyNotes] = useState("");

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
    loadAll();
  }, []);

  // Post Manual JV
  const handlePostManualJv = async (e: React.FormEvent) => {
    e.preventDefault();
    setJvError("");
    const amountPaise = Math.round(Number(jvAmountRupees) * 100);

    if (debitAccount === creditAccount) {
      setJvError("Debit aur Credit accounts alag-alag hone chahiye.");
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
    if (!confirm(`Kya aap voucher ${entry.entryNumber} ko reverse (ulat) karna chahte hain?`)) return;
    try {
      const res = await fetch("/api/accounting/journal-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REVERSE",
          entryId: entry.id,
          reason: `Reversal requested by Owner for voucher ${entry.entryNumber}`,
        }),
      });
      if (res.ok) {
        alert(`Voucher ${entry.entryNumber} safaltapoorvak reverse ho gaya!`);
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
    if (!confirm(`Warning: Kya aap voucher ${entry.entryNumber} ko system se delete karna chahte hain?`)) return;
    try {
      const res = await fetch(`/api/accounting/journal-entries?id=${entry.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        alert(`Voucher ${entry.entryNumber} delete ho gaya!`);
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
        setCreateAccountError(data.error || "Khata banane mein asafal");
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
      setExpenseError("Kripya sahi raqam dalein.");
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
        setExpenseError(data.error || "Kharcha record karne mein asafal");
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
          clearedDate: new Date().toISOString().split("T")[0],
          externalReference: "Passbook Verified",
        }),
      });
      if (res.ok) {
        // Refresh BRS
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
          date: new Date().toISOString().split("T")[0],
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

  // Verify Driver Handover into Vault
  const handleVerifyHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "VERIFY_HANDOVER",
          driverId: activeDriverId,
          totalVerifiedPaise: Math.round(Number(verifyAmountRupees) * 100),
          notes: verifyNotes,
        }),
      });
      if (res.ok) {
        setVerifyModalOpen(false);
        loadAll();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to verify handover");
      }
    } catch (err: any) {
      alert(err.message);
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
          `Voucher ${data.entryNumber} post ho gaya! Total Jar Depreciation: ${formatINR(
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
        // Find other opposite account for Particulars
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
            Sai Waters — Hisab Kitab (Accounting & Ledger)
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Khata Bahi (T-Accounts), Roznamcha (Journals), Bank Reconciliation (BRS), aur Munafa-Nuksan
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Expense Settle Button */}
          <button
            onClick={() => setExpenseModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Receipt className="w-4 h-4" />
            <span>Kharcha Settle Karein</span>
          </button>

          {/* New Custom Account Button */}
          <button
            onClick={() => setCreateAccountModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Naya Khata Banayein</span>
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
            title="Refresh Karein"
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
                ? "Double-Entry Santulan: Khata Bahi Bilkul Balanced Hai (Debits == Credits)"
                : "Khata Bahi mein Discrepancy payi gayi!"}
            </h4>
            <p className="text-[11px] opacity-80 mt-0.5">
              Kul Jama/Debit: <strong>{formatINR(tbData?.grandTotalDebitPaise || 0)}</strong> • Kul
              Naame/Credit: <strong>{formatINR(tbData?.grandTotalCreditPaise || 0)}</strong>
              {!tbData?.isBalanced && ` • Farak: ${formatINR(tbData?.variancePaise || 0)}`}
            </p>
          </div>
        </div>

        <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 bg-white rounded-lg border border-current shadow-xs">
          {tbData?.isBalanced ? "Balanced ✓" : "Alert ⚠️"}
        </span>
      </div>

      {/* Navigation Tabs (Basic & Clean Titles) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold border-b border-slate-200">
        {[
          { id: "TB", label: "Khata Bahi (Trial Balance)", icon: Scale },
          { id: "TL", label: "T-Shape Khata (Ledger)", icon: BookOpen },
          { id: "JV", label: "Roznamcha (General Journal)", icon: FileSpreadsheet },
          { id: "BRS", label: "Bank Reconcile (BRS)", icon: Landmark },
          { id: "EXP", label: "Kharcha List (Expenses)", icon: Receipt },
          { id: "PNL", label: "Munafa & Nuksan (P&L)", icon: TrendingUp },
          { id: "BS", label: "Balance Sheet", icon: Building2 },
          { id: "CASH_REC", label: "Driver Cash", icon: Coins },
          { id: "DEP", label: "Jar Ghisawat", icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer shrink-0 ${
                activeTab === tab.id
                  ? "bg-sky-600 text-white font-extrabold shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TRIAL BALANCE (KHATA BAHI SUMMARY) */}
      {/* ========================================================================= */}
      {activeTab === "TB" && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">
                Sabhi Khaton ka Kul Balance (Trial Balance)
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Har khate ka antim debit ya credit hisab
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
                  <th className="py-3 px-4">Khata Vivaran (Account Title)</th>
                  <th className="py-3 px-4">Prakar (Type)</th>
                  <th className="py-3 px-4 text-right">Debit / Jama (₹)</th>
                  <th className="py-3 px-4 text-right">Credit / Naame (₹)</th>
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
                          {disp.hindiSubtitle || acc.name}
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
                          T-Khata →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-100 font-black text-slate-900 text-xs border-t-2 border-slate-300">
                <tr>
                  <td colSpan={3} className="py-3 px-4 uppercase tracking-wider">
                    Total Santulan (Grand Total)
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
      {/* TAB 2: T-SHAPE ACCOUNTS (KHATA BAHI / T-ACCOUNT LEDGER) */}
      {/* ========================================================================= */}
      {activeTab === "TL" && (
        <div className="space-y-4">
          {/* Account Selector Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-sky-600" />
              <label className="text-xs font-black text-slate-900">Khata Chunein (Select Account):</label>
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
                { id: 1130, label: "Bank Khata" },
                { id: 1110, label: "Gullak Cash" },
                { id: 1120, label: "Driver Cash" },
                { id: 1150, label: "Grahak Udhar" },
                { id: 4110, label: "Jar Bikri" },
                { id: 6210, label: "Diesel" },
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
                  Dr. (Debit / Naame)
                </span>
                <div>
                  <h2 className="text-base font-black tracking-wide uppercase">
                    {activeTAccount.accountCode} — {activeTAccount.display?.simpleTitle || activeTAccount.accountName}
                  </h2>
                  <p className="text-[11px] text-slate-300 font-medium">
                    {activeTAccount.display?.hindiSubtitle || activeTAccount.accountType}
                  </p>
                </div>
                <span className="text-sky-400 uppercase tracking-widest text-sm font-black">
                  Cr. (Credit / Jama)
                </span>
              </div>
            </div>

            {/* Split T-Shape Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x-2 divide-slate-300">
              {/* LEFT SIDE: DEBIT */}
              <div className="flex flex-col justify-between">
                <div>
                  <div className="bg-emerald-50/70 border-b border-slate-200 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-emerald-900 flex justify-between">
                    <span>Date • Particulars (Vivaran)</span>
                    <span>Amount (₹)</span>
                  </div>

                  <div className="divide-y divide-slate-100 min-h-48 text-xs">
                    {tAccountDebitLines.length === 0 && !isDebitBalance && (
                      <div className="p-8 text-center text-slate-400 text-xs italic">
                        Is khate mein koi Debit entry nahi hai
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
                          <span>To Balance c/d (Baki Closing)</span>
                          <span className="text-[10px] text-amber-600 block">Credit Adhik hone par</span>
                        </div>
                        <span className="font-black">{formatINR(closingBalancePaise)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Left Side Total Bar */}
                <div className="bg-slate-100 border-t-2 border-slate-300 p-3 flex justify-between items-center font-black text-xs text-slate-900">
                  <span>Kul Debit (Dr. Total)</span>
                  <span className="text-sm font-black border-b-2 border-double border-slate-900 pb-0.5">
                    {formatINR(tGrandTotalPaise)}
                  </span>
                </div>
              </div>

              {/* RIGHT SIDE: CREDIT */}
              <div className="flex flex-col justify-between">
                <div>
                  <div className="bg-sky-50/70 border-b border-slate-200 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-sky-900 flex justify-between">
                    <span>Date • Particulars (Vivaran)</span>
                    <span>Amount (₹)</span>
                  </div>

                  <div className="divide-y divide-slate-100 min-h-48 text-xs">
                    {tAccountCreditLines.length === 0 && isDebitBalance && (
                      <div className="p-8 text-center text-slate-400 text-xs italic">
                        Is khate mein koi Credit entry nahi hai
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
                          <span>By Balance c/d (Antim Baki)</span>
                          <span className="text-[10px] text-emerald-700 block">Current Closing Balance</span>
                        </div>
                        <span className="font-black">{formatINR(closingBalancePaise)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side Total Bar */}
                <div className="bg-slate-100 border-t-2 border-slate-300 p-3 flex justify-between items-center font-black text-xs text-slate-900">
                  <span>Kul Credit (Cr. Total)</span>
                  <span className="text-sm font-black border-b-2 border-double border-slate-900 pb-0.5">
                    {formatINR(tGrandTotalPaise)}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Summary Callout */}
            <div className="bg-slate-50 p-3.5 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-600">
                Antim Khata Status:{" "}
                <strong className="text-slate-900">
                  {isDebitBalance ? "Debit / Jama Baki" : "Credit / Naame Baki"}
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
      {/* TAB 3: ROZNAMCHA (STANDARD GENERAL JOURNAL FORMAT) */}
      {/* Date | Particulars (Account Dr, To Account, Narration) | L.F. | Dr | Cr */}
      {/* ========================================================================= */}
      {activeTab === "JV" && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-0">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">
                Roznamcha (General Journal Book)
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Standard format: Tariq, Khata Vivaran (Debit / To Credit), L.F. aur Raqam
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
                  <th className="py-3 px-4">Particulars (Khata Vivaran & Narration)</th>
                  <th className="py-3 px-3 w-16 text-center">L.F.</th>
                  <th className="py-3 px-4 text-right w-28">Debit (₹)</th>
                  <th className="py-3 px-4 text-right w-28">Credit (₹)</th>
                  <th className="py-3 px-3 text-center w-24 print:hidden">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-200">
                {jvData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">
                      Koi Journal Voucher record nahi mila.
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
                              By: {entry.postedBy || "Owner"}
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
                            title="Reverse (Ulat) voucher entry"
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
                1. Bank Balance as per Books (GL 1130)
              </span>
              <span className="text-xl font-black text-slate-900 mt-1 block">
                {formatINR(brsData?.bookBalancePaise || 0)}
              </span>
              <span className="text-[10px] text-slate-400">System khate ka balance</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-xs">
              <span className="text-[10px] font-black uppercase text-amber-700 block tracking-wider">
                2. Less: Cheques / UPI Pending in Bank
              </span>
              <span className="text-xl font-black text-amber-900 mt-1 block">
                {formatINR(brsData?.unclearedDepositsPaise || 0)}
              </span>
              <span className="text-[10px] text-amber-600">Books mein jama, par bank mein baki</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-sky-200 bg-sky-50/30 shadow-xs">
              <span className="text-[10px] font-black uppercase text-sky-700 block tracking-wider">
                3. Add: Unpresented Payments
              </span>
              <span className="text-xl font-black text-sky-900 mt-1 block">
                {formatINR(brsData?.unclearedWithdrawalsPaise || 0)}
              </span>
              <span className="text-[10px] text-sky-600">Books mein cut chuka, bank se debited nahi</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border-2 border-emerald-400 bg-emerald-50/50 shadow-xs">
              <span className="text-[10px] font-black uppercase text-emerald-800 block tracking-wider">
                4. Reconciled Passbook Balance
              </span>
              <span className="text-xl font-black text-emerald-950 mt-1 block">
                {formatINR(brsData?.bankStatementBalancePaise || 0)}
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold">
                Passbook se milne yogya balance
              </span>
            </div>
          </div>

          {/* Passbook Live Matcher Box */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Landmark className="w-4 h-4 text-sky-600" />
                Passbook Milan Check (Bank App Balance Matcher)
              </h3>
              <p className="text-xs text-slate-500">
                Apne bank app ya passbook ka live balance yahan daal kar check karein ki zero variance hai ya nahi.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-black text-slate-400">₹</span>
                <input
                  type="number"
                  placeholder="Passbook Balance (e.g. 50000)"
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

          {/* Live Matcher Result Indicator */}
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
                      ? "Badhai! Bank Passbook aur System Khata 100% Reconcile ho gaya! (Zero Variance)"
                      : "Difference Detected: Bank Passbook aur System mein farak hai"}
                  </h4>
                  <p className="text-[11px] opacity-80">
                    Entered Passbook Balance: {formatINR(Math.round(Number(passbookInputRupees) * 100))} •
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
                  Bank Transactions List & Clearance Marking
                </h4>
                <p className="text-[10px] text-slate-400">
                  Jo transaction bank statement / passbook mein aa chuki hai, use &apos;Cleared&apos; mark karein
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
                    <th className="py-3 px-4">Vivaran / Narration</th>
                    <th className="py-3 px-4 text-right">Inflow / Jama (Dr ₹)</th>
                    <th className="py-3 px-4 text-right">Outflow / Nikasi (Cr ₹)</th>
                    <th className="py-3 px-4 text-center">Bank Clearance Status</th>
                    <th className="py-3 px-4 text-right print:hidden">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {brsData?.transactions?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">
                        Is bank khate mein abhi koi transaction nahi hai.
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
      {/* TAB 5: KHARCHA LIST & SETTLEMENT */}
      {/* ========================================================================= */}
      {activeTab === "EXP" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex justify-between items-center">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">
                Business Ke Daily Kharche (Operational Expenses)
              </h3>
              <p className="text-[11px] text-slate-400">
                Diesel, gaadi repair, bijli, godown kiraya aur workers ka chai-nashta
              </p>
            </div>

            <button
              onClick={() => setExpenseModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Naya Kharcha Note Karein</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Tariq (Date)</th>
                    <th className="py-3 px-4">Kharcha Category</th>
                    <th className="py-3 px-4">Vivaran / Notes</th>
                    <th className="py-3 px-4">Kahan se Diya (Payment Mode)</th>
                    <th className="py-3 px-4 text-right">Raqam (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expensesData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400">
                        Abhi tak koi kharcha record nahi hua hai. &apos;Naya Kharcha Note Karein&apos; par click karein.
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
                          {exp.notes || "Kharcha settlement"}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-800">
                            {exp.paidViaDisplay?.simpleTitle || "Cash in Hand"}
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
                Munafa aur Nuksan Vivaran (Profit & Loss)
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">Kul Aamdani - Kharche = Net Munafa</p>
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
                1. Kul Bikri & Aamdani (Revenues)
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
                  <span>Kul Aamdani (Total Revenue):</span>
                  <span>{formatINR(pnlData.totalRevenuePaise)}</span>
                </div>
              </div>
            </div>

            {/* COGS */}
            <div>
              <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider mb-2">
                2. Direct Utpadan Lagat (Cost of Production / COGS)
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
                  <span>Kul Utpadan Kharcha:</span>
                  <span>{formatINR(pnlData.totalCogsPaise)}</span>
                </div>
              </div>
            </div>

            {/* Gross Profit */}
            <div className="p-3 bg-sky-50 rounded-xl flex justify-between font-black text-sky-950 text-sm">
              <span>Gross Profit (Mool Munafa):</span>
              <span>{formatINR(pnlData.grossProfitPaise)}</span>
            </div>

            {/* Operating Expenses */}
            <div>
              <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider mb-2">
                3. Vyaparik Kharche (Operating Expenses)
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
                  <span>Kul Vyaparik Kharcha:</span>
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
              <span>Net Shuddh Munafa (Net Profit):</span>
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
                Balance Sheet (Sampatti aur Denadari)
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Assets = Liabilities + Owner Equity + Net Profit
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
                Sampatti (Assets)
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
                <span>Kul Sampatti (Total Assets):</span>
                <span>{formatINR(bsData.totalAssetsPaise)}</span>
              </div>
            </div>

            {/* Liabilities & Equity */}
            <div className="space-y-3">
              <h4 className="font-black text-sky-800 text-xs uppercase tracking-wider border-b pb-1">
                Denadari & Poonji (Liabilities & Equity)
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
                  <span>Is Avadhi ka Shuddh Munafa:</span>
                  <span>{formatINR(bsData.currentPeriodNetProfitPaise)}</span>
                </div>
              </div>
              <div className="p-3 bg-sky-50 rounded-xl flex justify-between font-black text-sky-950">
                <span>Kul Denadari & Poonji:</span>
                <span>{formatINR(bsData.totalLiabilitiesPaise + bsData.totalEquityWithProfitPaise)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: DRIVER CASH CLEARING */}
      {/* ========================================================================= */}
      {activeTab === "CASH_REC" && cashRecData && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl flex justify-between items-center">
            <div>
              <h3 className="font-extrabold text-amber-950 text-xs">
                Driver Cash Handover & Central Vault Verification
              </h3>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Driver dwara delivery route se collect kiya gaya cash jab galle mein jama hota hai tab verify karein.
              </p>
            </div>
            <span className="text-xs font-black text-amber-950 bg-white px-3 py-1.5 rounded-xl border border-amber-300">
              Pending Handover: {formatINR(cashRecData.totalUnclearedCashPaise)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(cashRecData.pendingByDriver || {}).map(([drvId, data]: any) => (
              <div key={drvId} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-black text-slate-900 text-sm">{data.driverName}</h4>
                    <span className="text-[10px] text-slate-400 font-mono">{drvId}</span>
                  </div>
                  <span className="text-xl font-black text-amber-900">{formatINR(data.totalPendingPaise)}</span>
                </div>

                <button
                  onClick={() => {
                    setActiveDriverId(drvId);
                    setActiveDriverName(data.driverName);
                    setVerifyAmountRupees((data.totalPendingPaise / 100).toString());
                    setVerifyModalOpen(true);
                  }}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Verify & Deposit into Central Vault →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
            Reusable 20L jars ko Account 1210 mein Fixed Asset maana gaya hai aur har mahine 24-month Straight-Line Method (SLM) se ghisawat calculate hoti hai.
          </p>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Asset Khata:</span>
              <strong className="text-slate-900">1210 Reusable 20L Water Jars Stock</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Ghisawat Khata:</span>
              <strong className="text-slate-900">1220 Accumulated Depreciation — Jars</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Kharcha Khata:</span>
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
      {/* MODAL 1: NAYA KHATA BANAYEIN (ADD CUSTOM ACCOUNT) */}
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
                  <h3 className="text-sm font-black text-slate-900">Naya Khata Banayein (Add Account)</h3>
                  <p className="text-[10px] text-slate-400">Chart of Accounts mein naya khata jodein</p>
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
                Quick Preset Select Karein:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { name: "Gaadi Diesel & Petrol", type: "EXPENSE", icon: Fuel },
                  { name: "Gaadi Repair & Maintenance", type: "EXPENSE", icon: Wrench },
                  { name: "Plant & Godown Kiraya (Rent)", type: "EXPENSE", icon: Building2 },
                  { name: "Workers Chai-Nashta & Snacks", type: "EXPENSE", icon: Coffee },
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
                  Khate ka Naam (Account Name)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tempo Diesel Kharcha, Chai-Pani, Electricity"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Khate ka Prakar (Category)
                  </label>
                  <select
                    value={newAccountType}
                    onChange={(e) => setNewAccountType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
                  >
                    <option value="EXPENSE">Vyaparik Kharcha (Expense)</option>
                    <option value="COGS">Utpadan Lagat (COGS)</option>
                    <option value="ASSET">Sampatti (Asset / Bank)</option>
                    <option value="LIABILITY">Denadari (Liability / Udhar)</option>
                    <option value="REVENUE">Aamdani (Revenue / Sales)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Account Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Auto-generated"
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
                  Khata Banayein
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: KHARCHA SETTLE KAREIN (QUICK EXPENSE VOUCHER) */}
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
                  <h3 className="text-sm font-black text-slate-900">Kharcha Note Karein (Expense Voucher)</h3>
                  <p className="text-[10px] text-slate-400">Diesel, Chai, Kiraya, Servicing turant settle karein</p>
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
                  Kiski Madad se Kharcha hua (Expense Account)
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
                    Kharcha Raqam (₹)
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
                    Tariq (Date)
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
                  Kahan se Diya (Payment Source)
                </label>
                <select
                  value={expensePaidViaId}
                  onChange={(e) => setExpensePaidViaId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white"
                  required
                >
                  <option value="1110">1110 — Gullak / Central Cash Vault (Galle ka Cash)</option>
                  <option value="1130">1130 — Bank Khata (Online / UPI / Cheque)</option>
                  <option value="1120">1120 — Driver Route Cash</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Vivaran / Notes (Narration)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tempo 5L diesel, Factory samosa lunch"
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
                  Settle & Voucher Post Karein
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
              <h3 className="text-sm font-black text-slate-900">Roznamcha Voucher (Manual Journal)</h3>
              <button
                onClick={() => setManualJvModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePostManualJv} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Vivaran (Narration)</label>
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
                <label className="text-xs font-bold text-slate-700 block mb-1">Debit Khata (Dr.)</label>
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
                <label className="text-xs font-bold text-slate-700 block mb-1">Credit Khata (Cr.)</label>
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
                  <label className="text-xs font-bold text-slate-700 block mb-1">Raqam (₹)</label>
                  <input
                    type="number"
                    value={jvAmountRupees}
                    onChange={(e) => setJvAmountRupees(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-black text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Tariq (Date)</label>
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
                  Post Journal Voucher
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
              <h3 className="text-sm font-black text-slate-900">Bank Entry (Fee / Interest)</h3>
              <button
                onClick={() => setDirectBankModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDirectBankEntry} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Entry Type</label>
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
                  <option value="BANK_CHARGE">Bank Charge / SMS / Penalty Fee (Dr. Charges, Cr. Bank)</option>
                  <option value="BANK_INTEREST">Bank Byaj / Interest Received (Dr. Bank, Cr. Income)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Raqam (₹)</label>
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
                <label className="text-xs font-bold text-slate-700 block mb-1">Vivaran / Narration</label>
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
      {verifyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">
                Verify Cash Deposit: {activeDriverName}
              </h3>
              <button
                onClick={() => setVerifyModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Cashier currency notes ginkar galle (A/C 1110 Central Vault) mein verify karein.
            </p>

            <form onSubmit={handleVerifyHandover} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Galle mein Jama Raqam (₹)
                </label>
                <input
                  type="number"
                  value={verifyAmountRupees}
                  onChange={(e) => setVerifyAmountRupees(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-base font-black text-emerald-800"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Verification Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Counted in cash drawer, zero variance"
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Verify & Deposit into Vault
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
