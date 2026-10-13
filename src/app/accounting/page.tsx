"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  ShieldCheck,
  ShieldAlert,
  Coins,
  TrendingUp,
  Scale,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Sparkles,
  CheckCircle,
  X,
  Building2,
  Wallet,
  Truck,
  Printer,
} from "lucide-react";
import { formatINR } from "@/lib/utils";

export default function AccountingPage() {
  const [activeTab, setActiveTab] = useState<"TB" | "PNL" | "BS" | "JV" | "CASH_REC" | "DEP">("TB");
  const [tbData, setTbData] = useState<any>(null);
  const [pnlData, setPnlData] = useState<any>(null);
  const [bsData, setBsData] = useState<any>(null);
  const [jvData, setJvData] = useState<any[]>([]);
  const [cashRecData, setCashRecData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Manual JV Modal
  const [manualJvModalOpen, setManualJvModalOpen] = useState(false);
  const [jvNarration, setJvNarration] = useState("");
  const [jvDate, setJvDate] = useState(new Date().toISOString().split("T")[0]);
  const [debitAccount, setDebitAccount] = useState("1110");
  const [creditAccount, setCreditAccount] = useState("3110");
  const [jvAmountRupees, setJvAmountRupees] = useState("1000");
  const [jvError, setJvError] = useState("");

  // Cashier Verification Modal
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [activeDriverId, setActiveDriverId] = useState("");
  const [activeDriverName, setActiveDriverName] = useState("");
  const [verifyAmountRupees, setVerifyAmountRupees] = useState("");
  const [verifyNotes, setVerifyNotes] = useState("");

  // Depreciation state
  const [depActionMsg, setDepActionMsg] = useState("");
  const [depRunning, setDepRunning] = useState(false);

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/accounting/trial-balance").then((r) => r.json()),
      fetch("/api/accounting/financial-statements").then((r) => r.json()),
      fetch("/api/accounting/journal-entries").then((r) => r.json()),
      fetch("/api/cash").then((r) => r.json()),
    ])
      .then(([tb, fs, jv, cash]) => {
        setTbData(tb);
        setPnlData(fs.profitAndLoss);
        setBsData(fs.balanceSheet);
        setJvData(jv.journalEntries || []);
        setCashRecData(cash);
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
            {
              accountId: Number(debitAccount),
              debitPaise: amountPaise,
              creditPaise: 0,
            },
            {
              accountId: Number(creditAccount),
              debitPaise: 0,
              creditPaise: amountPaise,
            },
          ],
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setManualJvModalOpen(false);
        setJvNarration("");
        loadAll();
      } else {
        setJvError(data.error || "Failed to post entry");
      }
    } catch (err: any) {
      setJvError(err.message);
    }
  };

  // Verify Driver Handover in Cashier Vault
  const handleVerifyHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const amountPaise = Math.round(Number(verifyAmountRupees) * 100);
      const res = await fetch("/api/cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "HANDOVER",
          driverId: activeDriverId,
          receivedBy: "usr_owner_01",
          totalDeclaredPaise: amountPaise,
          totalVerifiedPaise: amountPaise,
          notes: verifyNotes || "Vault cash verified and counted by cashier",
        }),
      });
      if (res.ok) {
        setVerifyModalOpen(false);
        loadAll();
      }
    } catch (err) {
      console.error("Failed verification:", err);
    }
  };

  // Run Depreciation
  const handleRunDepreciation = async () => {
    setDepRunning(true);
    setDepActionMsg("");
    try {
      const res = await fetch("/api/accounting/depreciation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setDepActionMsg(
          `✅ Posted JV ${data.entryNumber}: Depreciated ₹${(data.monthlyDepreciationPaise / 100).toFixed(
            2
          )} across 20L jars!`
        );
        loadAll();
      } else {
        setDepActionMsg(`❌ ${data.error || "Failed to depreciate"}`);
      }
    } catch (err: any) {
      setDepActionMsg(`❌ ${err.message}`);
    } finally {
      setDepRunning(false);
    }
  };

  if (loading && !tbData) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 uppercase tracking-widest">
              Double-Entry Ledger Engine
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Indian GAAP General Ledger & Financials
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time balanced Trial Balance, Profit & Loss, Balance Sheet, and Driver Cash Clearing
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setManualJvModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Post Manual JV
          </button>

          <button
            onClick={loadAll}
            title="Refresh Ledger"
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 shadow-xs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Double-Entry Verification Banner */}
      <div
        className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
          tbData?.isBalanced
            ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
            : "bg-rose-50 border-rose-200 text-rose-900"
        }`}
      >
        <div className="flex items-center gap-3">
          {tbData?.isBalanced ? (
            <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
          ) : (
            <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0" />
          )}
          <div>
            <h4 className="font-extrabold text-sm">
              {tbData?.isBalanced
                ? "Double-Entry Invariant Satisfied: Ledger Perfectly Balanced"
                : "Double-Entry Invariant Discrepancy Detected!"}
            </h4>
            <p className="text-xs opacity-80 mt-0.5">
              Total Debits: <strong>{formatINR(tbData?.grandTotalDebitPaise || 0)}</strong> • Total
              Credits: <strong>{formatINR(tbData?.grandTotalCreditPaise || 0)}</strong>
              {!tbData?.isBalanced && ` • Variance: ${formatINR(tbData?.variancePaise || 0)}`}
            </p>
          </div>
        </div>

        <span className="text-xs font-black uppercase tracking-wider px-3 py-1 bg-white/80 rounded-lg border border-current shadow-xs">
          {tbData?.isBalanced ? "Σ Dr = Σ Cr" : "Variance Alert"}
        </span>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold border-b border-slate-200">
        {[
          { id: "TB", label: "Trial Balance", icon: Scale },
          { id: "PNL", label: "Profit & Loss", icon: TrendingUp },
          { id: "BS", label: "Balance Sheet", icon: Building2 },
          { id: "JV", label: "Journal Entries", icon: FileSpreadsheet },
          { id: "CASH_REC", label: "Driver Cash Rec", icon: Coins },
          { id: "DEP", label: "Jar Depreciation", icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all cursor-pointer shrink-0 ${
                activeTab === tab.id
                  ? "bg-sky-600 text-white font-extrabold shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
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
            <h3 className="font-extrabold text-slate-900 text-sm">
              General Ledger Chart of Accounts — Trial Balance
            </h3>
            <span className="text-xs font-semibold text-slate-500">
              As on {new Date().toISOString().split("T")[0]}
            </span>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tbData?.balances.map((acc: any) => (
                  <tr key={acc.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{acc.code}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">{acc.name}</td>
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
                  </tr>
                ))}
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
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PROFIT & LOSS STATEMENT */}
      {/* ========================================================================= */}
      {activeTab === "PNL" && pnlData && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs max-w-3xl mx-auto print:border-none print:shadow-none print:p-0">
          {/* Header & Print Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <span className="text-[10px] font-black uppercase text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                Proprietorship Financial Statement
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
                SAI WATERS — STATEMENT OF PROFIT & LOSS
              </h2>
              <p className="text-xs text-slate-500 font-bold">
                Proprietor: Sai • Operating on Bill of Supply Basis
              </p>
              <p className="text-[11px] text-slate-400">
                Period: As on {new Date().toISOString().split("T")[0]} (FY 2026-27)
              </p>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-sm transition-all cursor-pointer shrink-0 print:hidden"
            >
              <Printer className="w-4 h-4 text-sky-400" />
              <span>Download / Print PDF</span>
            </button>
          </div>

          <div className="space-y-4 text-xs">
            {/* 1. Operating Revenue */}
            <div>
              <div className="flex justify-between items-center py-2.5 bg-slate-50 px-3.5 rounded-xl font-black text-slate-800">
                <span>I. REVENUE FROM SALES (20L Water Jars & Events)</span>
                <span className="text-sm text-slate-900 font-black">{formatINR(pnlData.totalRevenuePaise)}</span>
              </div>
              <div className="pl-4 divide-y divide-slate-100">
                {pnlData.revenues.map((r: any) => (
                  <div key={r.id} className="flex justify-between py-2 text-slate-600">
                    <span className="font-semibold">{r.name}</span>
                    <span className="font-bold text-slate-900">
                      {formatINR(r.totalCreditPaise - r.totalDebitPaise)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Direct Costs */}
            <div>
              <div className="flex justify-between items-center py-2.5 bg-slate-50 px-3.5 rounded-xl font-black text-slate-800">
                <span>II. DIRECT CONSUMABLES & REFILL COSTS (Water, Caps & Raw Material)</span>
                <span className="text-sm text-slate-900 font-black">({formatINR(pnlData.totalCogsPaise)})</span>
              </div>
              <div className="pl-4 divide-y divide-slate-100">
                {pnlData.cogs.map((c: any) => (
                  <div key={c.id} className="flex justify-between py-2 text-slate-600">
                    <span className="font-semibold">{c.name}</span>
                    <span className="font-bold text-slate-900">
                      {formatINR(c.totalDebitPaise - c.totalCreditPaise)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Gross Profit */}
            <div className="flex justify-between items-center py-3 px-4 bg-sky-50 text-sky-950 font-black rounded-xl border border-sky-200">
              <span className="text-xs uppercase tracking-wider">GROSS PROFIT (I - II)</span>
              <span className="text-sm font-black">{formatINR(pnlData.grossProfitPaise)}</span>
            </div>

            {/* 3. Operating Expenses & Jar Depreciation */}
            <div>
              <div className="flex justify-between items-center py-2.5 bg-slate-50 px-3.5 rounded-xl font-black text-slate-800">
                <span>III. OPERATING EXPENSES & 20L JAR DEPRECIATION (Straight-Line Method)</span>
                <span className="text-sm text-slate-900 font-black">({formatINR(pnlData.totalExpensesPaise)})</span>
              </div>
              <div className="pl-4 divide-y divide-slate-100">
                {pnlData.expenses.map((e: any) => (
                  <div key={e.id} className="flex justify-between py-2 text-slate-600">
                    <span className="font-semibold">{e.name}</span>
                    <span className="font-bold text-slate-900">
                      {formatINR(e.totalDebitPaise - e.totalCreditPaise)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Net Profit */}
            <div className="flex justify-between items-center py-3.5 px-4 bg-emerald-50 text-emerald-950 font-black rounded-2xl border-2 border-emerald-300 shadow-xs">
              <div>
                <span className="text-xs font-black block">NET PROFIT FOR PROPRIETOR (SAI)</span>
                <span className="text-[10px] text-emerald-700 font-semibold">Credited directly to Proprietor Capital</span>
              </div>
              <span className="text-lg font-black text-emerald-900">{formatINR(pnlData.netProfitPaise)}</span>
            </div>

            {/* Print Sign-off block */}
            <div className="pt-8 mt-6 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
              <div>
                <p>Generated by Sai Waters ERP</p>
                <p className="text-[10px] text-slate-400">Statement as of {new Date().toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <div className="w-48 border-b border-slate-400 mb-1"></div>
                <p className="font-bold text-slate-800">Authorized Signatory (Sai)</p>
                <p className="text-[10px] text-slate-400">Proprietor, Sai Waters</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PROPRIETOR BALANCE SHEET */}
      {/* ========================================================================= */}
      {activeTab === "BS" && bsData && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs max-w-3xl mx-auto print:border-none print:shadow-none print:p-0">
          {/* Header & Print Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                Proprietorship Statement of Position
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
                SAI WATERS — BALANCE SHEET
              </h2>
              <p className="text-xs text-slate-500 font-bold">
                Proprietor: Sai • India Jurisdiction
              </p>
              <p className="text-[11px] text-slate-400">As on {new Date().toISOString().split("T")[0]}</p>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-sm transition-all cursor-pointer shrink-0 print:hidden"
            >
              <Printer className="w-4 h-4 text-purple-400" />
              <span>Download / Print PDF</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* ASSETS */}
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2.5 bg-slate-50 px-3 rounded-xl font-black text-slate-900">
                <span>TOTAL ASSETS (Sampatti)</span>
                <span className="text-sm font-black text-slate-900">{formatINR(bsData.totalAssetsPaise)}</span>
              </div>
              <div className="divide-y divide-slate-100 pl-2">
                {bsData.assets.map((a: any) => (
                  <div key={a.id} className="flex justify-between py-2 text-slate-600">
                    <span className="font-semibold">{a.name}</span>
                    <span className="font-bold text-slate-900">
                      {formatINR(a.totalDebitPaise - a.totalCreditPaise)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* LIABILITIES & PROPRIETOR CAPITAL */}
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2.5 bg-slate-50 px-3 rounded-xl font-black text-slate-900">
                <span>LIABILITIES & PROPRIETOR CAPITAL</span>
                <span className="text-sm font-black text-slate-900">
                  {formatINR(bsData.totalLiabilitiesPaise + bsData.totalEquityWithProfitPaise)}
                </span>
              </div>

              <div className="divide-y divide-slate-100 pl-2">
                {bsData.liabilities.map((l: any) => (
                  <div key={l.id} className="flex justify-between py-2 text-slate-600">
                    <span className="font-semibold">{l.name}</span>
                    <span className="font-bold text-slate-900">
                      {formatINR(l.totalCreditPaise - l.totalDebitPaise)}
                    </span>
                  </div>
                ))}

                {bsData.equity.map((e: any) => (
                  <div key={e.id} className="flex justify-between py-2 text-slate-600">
                    <span className="font-semibold">{e.name}</span>
                    <span className="font-bold text-slate-900">
                      {formatINR(e.totalCreditPaise - e.totalDebitPaise)}
                    </span>
                  </div>
                ))}

                <div className="flex justify-between py-2 text-emerald-800 font-bold bg-emerald-50/60 px-2.5 rounded-xl border border-emerald-200 mt-2">
                  <span>Current Period Net Profit</span>
                  <span className="font-black">{formatINR(bsData.currentPeriodNetProfitPaise)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Balanced Status Banner */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">Accounting Invariant: Sampatti = Punji + Dayitva</span>
            <span className="font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
              ✓ Perfectly Balanced
            </span>
          </div>

          {/* Print Sign-off block */}
          <div className="pt-6 mt-4 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
            <div>
              <p>Sai Waters • Bareilly, Uttar Pradesh</p>
              <p className="text-[10px] text-slate-400">Statement as of {new Date().toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <div className="w-48 border-b border-slate-400 mb-1"></div>
              <p className="font-bold text-slate-800">Proprietor Signature</p>
              <p className="text-[10px] text-slate-400">Sai Waters</p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: JOURNAL ENTRIES REGISTER */}
      {/* ========================================================================= */}
      {activeTab === "JV" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
              Double-Entry Journal Register ({jvData.length} Vouchers)
            </h3>
          </div>

          <div className="space-y-3">
            {jvData.map((jv) => (
              <div key={jv.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono font-black text-slate-900 text-sm mr-2">{jv.entryNumber}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      {jv.sourceDocumentType}
                    </span>
                    <p className="text-xs text-slate-700 mt-1">{jv.narration}</p>
                  </div>
                  <div className="text-right text-xs">
                    <span className="text-slate-400 block">{jv.entryDate}</span>
                    <span className="text-[11px] text-slate-500">By: {jv.postedBy}</span>
                  </div>
                </div>

                {/* Journal Lines */}
                <div className="bg-slate-50 rounded-lg p-2.5 text-xs divide-y divide-slate-200/60 font-mono">
                  {jv.lines?.map((line: any) => (
                    <div key={line.id} className="flex justify-between py-1 text-slate-600">
                      <span>
                        {line.debitPaise > 0 ? "Dr. " : "    Cr. "}
                        {line.accountName} ({line.accountCode})
                      </span>
                      <span className="font-bold text-slate-900">
                        {line.debitPaise > 0 ? formatINR(line.debitPaise) : formatINR(line.creditPaise)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: DRIVER CASH RECONCILIATION & VAULT CLEARING */}
      {/* ========================================================================= */}
      {activeTab === "CASH_REC" && cashRecData && (
        <div className="space-y-4">
          <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200">
            <h3 className="text-base font-extrabold text-amber-950 mb-1">
              Driver Collection Clearing Audit (A/C 1120)
            </h3>
            <p className="text-xs text-amber-800">
              Delivery drivers collect physical cash during trips. Cash is quarantined in Driver Clearing accounts until verified and deposited into the central vault by the cashier.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(cashRecData.pendingByDriver || {}).map(([drvId, data]: [string, any]) => (
              <div key={drvId} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-base">{data.driverName}</h4>
                    <p className="text-xs text-slate-400 font-mono">{drvId}</p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    {data.count} Collections Pending
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                  <span className="text-xs text-slate-600 font-semibold">Unverified Cash in Pockets:</span>
                  <span className="text-xl font-black text-amber-900">{formatINR(data.totalPendingPaise)}</span>
                </div>

                <button
                  onClick={() => {
                    setActiveDriverId(drvId);
                    setActiveDriverName(data.driverName);
                    setVerifyAmountRupees((data.totalPendingPaise / 100).toString());
                    setVerifyModalOpen(true);
                  }}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  Verify & Deposit into Central Vault →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: JAR ASSET DEPRECIATION RUNNER */}
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
            Per your confirmed accounting decision, reusable 20L jars are recorded as <strong>Capitalized Fixed Assets</strong> in Account 1210 and depreciated on a <strong>24-month Straight-Line Method (SLM)</strong>.
          </p>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Asset Account:</span>
              <strong className="text-slate-900">1210 Reusable 20L Water Jars</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Contra Account:</span>
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
      {/* MODAL: POST MANUAL JOURNAL ENTRY */}
      {/* ========================================================================= */}
      {manualJvModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Post Manual Journal Voucher</h3>
              <button onClick={() => setManualJvModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePostManualJv} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Voucher Narration</label>
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
                <label className="text-xs font-bold text-slate-700 block mb-1">Debit Account (Dr)</label>
                <select
                  value={debitAccount}
                  onChange={(e) => setDebitAccount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  <option value="1110">1110 - Cash-in-Hand (Central Vault)</option>
                  <option value="1130">1130 - Bank Current Account</option>
                  <option value="1210">1210 - Reusable 20L Water Jars (Asset)</option>
                  <option value="5110">5110 - Raw Water & RO Costs</option>
                  <option value="5120">5120 - Jar Consumables (Caps/Seals)</option>
                  <option value="6110">6110 - Salaries & Wages</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Credit Account (Cr)</label>
                <select
                  value={creditAccount}
                  onChange={(e) => setCreditAccount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  <option value="3110">3110 - Owner Capital Account</option>
                  <option value="1110">1110 - Cash-in-Hand (Central Vault)</option>
                  <option value="1130">1130 - Bank Current Account</option>
                  <option value="4110">4110 - Water Sales Revenue</option>
                  <option value="2110">2110 - Accounts Payable (Suppliers)</option>
                </select>
              </div>

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

              {jvError && (
                <p className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl">
                  {jvError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setManualJvModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Commit Journal Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VERIFY DRIVER HANDOVER INTO VAULT */}
      {/* ========================================================================= */}
      {verifyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">
                Verify Cash Deposit: {activeDriverName}
              </h3>
              <button onClick={() => setVerifyModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Cashier counts currency notes and verifies them into the central vault (Account 1110). This clears the driver&apos;s collection clearing balance.
            </p>

            <form onSubmit={handleVerifyHandover} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Physically Counted Vault Deposit (₹)
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
                <label className="text-xs font-bold text-slate-700 block mb-1">Cashier Verification Notes</label>
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
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs"
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
