"use client";

import { useEffect, useState } from "react";
import {
  Receipt,
  Search,
  Plus,
  Share2,
  QrCode,
  Printer,
  CheckCircle,
  Clock,
  Coins,
  X,
  ExternalLink,
  Building2,
  FileText,
  Zap,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Send,
  Eye,
  Truck,
  Wallet,
  CheckCheck,
  CreditCard,
  Scale,
  ShieldCheck,
} from "lucide-react";
import QRCode from "qrcode";
import { formatINR } from "@/lib/utils";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState<any>(null);
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [upiModalOpen, setUpiModalOpen] = useState(false);
  const [upiQrDataUrl, setUpiQrDataUrl] = useState("");
  const [printModalOpen, setPrintModalOpen] = useState(false);

  // Month-End Auto-Billing State
  const [monthEndModalOpen, setMonthEndModalOpen] = useState(false);
  const [selectedBillingMonth, setSelectedBillingMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [batchSummary, setBatchSummary] = useState<any>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [batchResults, setBatchResults] = useState<any>(null);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [billingType, setBillingType] = useState<"SPOT_DELIVERY" | "MONTHLY_CONSOLIDATED" | "EVENT_SETTLEMENT">(
    "SPOT_DELIVERY"
  );
  const [jarQuantity, setJarQuantity] = useState("2");
  const [unitPriceRupees, setUnitPriceRupees] = useState("35");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/invoices").then((r) => r.json()),
      fetch("/api/customers").then((r) => r.json()),
      fetch(`/api/invoices/monthly-batch?month=${selectedBillingMonth}`).then((r) => r.json()),
    ])
      .then(([invData, custData, batchData]) => {
        setInvoices(invData.invoices || []);
        setCustomers(custData.customers || []);
        if (batchData.success) {
          setBatchSummary(batchData);
        }
        if (custData.customers?.length > 0 && !selectedCustomerId) {
          const first = custData.customers[0];
          setSelectedCustomerId(first.id);
          const rate = Math.round((first.pricePerJarPaise ?? first.customPrice?.pricePerJarPaise ?? 3500) / 100);
          setUnitPriceRupees(rate.toString());
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load invoices:", err);
        setLoading(false);
      });
  };

  const loadBatchSummary = (monthStr: string) => {
    setBatchLoading(true);
    fetch(`/api/invoices/monthly-batch?month=${monthStr}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setBatchSummary(data);
        }
        setBatchLoading(false);
      })
      .catch(() => setBatchLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeInvoice?.upiLink) {
      QRCode.toDataURL(activeInvoice.upiLink, { width: 260, margin: 1 })
        .then((url) => setUpiQrDataUrl(url))
        .catch(() => setUpiQrDataUrl(""));
    }
  }, [activeInvoice]);

  const handleOpenMonthEndModal = () => {
    setBatchResults(null);
    setMonthEndModalOpen(true);
    loadBatchSummary(selectedBillingMonth);
  };

  const handleRunBatchBilling = async () => {
    setBatchSubmitting(true);
    try {
      const res = await fetch("/api/invoices/monthly-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: selectedBillingMonth }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBatchResults(data);
        loadData();
        loadBatchSummary(selectedBillingMonth);
      } else {
        alert(data.error || "Failed to generate monthly invoices");
      }
    } catch (e: any) {
      alert("Network error running batch billing");
    } finally {
      setBatchSubmitting(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          billingType,
          quantity: Number(jarQuantity),
          unitPricePaise: Math.round(Number(unitPriceRupees) * 100),
          description: `20-Litre Reusable Drinking Water Jars (${jarQuantity} units)`,
          notes,
        }),
      });
      if (res.ok) {
        setCreateModalOpen(false);
        loadData();
      }
    } catch (err) {
      console.error("Failed to create invoice:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredInvoices = invoices.filter((i) => {
    return (
      i.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.customerPhone?.includes(searchTerm)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "PARTIALLY_PAID":
        return "bg-amber-100 text-amber-800 border-amber-300";
      default:
        return "bg-sky-100 text-sky-800 border-sky-300";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
              Statutory Bill of Supply Format (0% Tax)
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Commercial Billing & Invoices
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Monthly consolidated customer billing, spot bills, dynamic UPI links, and 1-Click WhatsApp dispatch
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month-End Auto-Billing Trigger Button */}
          <button
            onClick={handleOpenMonthEndModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            <span>⚡ Run Month-End Auto Billing</span>
          </button>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Custom Invoice</span>
          </button>
        </div>
      </div>

      {/* Month-End Invoicing Alert Banner if unbilled regular customers exist */}
      {batchSummary && batchSummary.unbilledCount > 0 && (
        <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-sky-50 border border-purple-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900">
                Month-End Billing Ready ({batchSummary.unbilledCount} Regular Customers Pending)
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Regular daily customers have unbilled deliveries recorded for {batchSummary.targetMonth}.
              </p>
            </div>
          </div>
          <button
            onClick={handleOpenMonthEndModal}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Generate Invoices Now</span>
          </button>
        </div>
      )}

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Total Invoiced</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {formatINR(invoices.reduce((s, i) => s + (i.totalAmountPaise || 0), 0))}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">{invoices.length} Bills issued</p>
        </div>

        <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Collected</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-950">
            {formatINR(invoices.reduce((s, i) => s + (i.paidAmountPaise || 0), 0))}
          </div>
          <p className="text-[11px] text-emerald-800/80 mt-0.5">Advance + Driver collections</p>
        </div>

        <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200 shadow-xs">
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Outstanding Dues</span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-950">
            {formatINR(invoices.reduce((s, i) => s + (i.outstandingPaise || 0), 0))}
          </div>
          <p className="text-[11px] text-rose-800/80 mt-0.5">Pending collection from customers</p>
        </div>

        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 shadow-xs">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending Settlement</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-950">
            {invoices.filter((i) => (i.outstandingPaise || 0) > 0).length}{" "}
            <span className="text-xs font-normal text-amber-800">Invoices</span>
          </div>
          <p className="text-[11px] text-amber-800/80 mt-0.5">Unpaid or partially paid bills</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search Invoice #, Customer Name, Mobile..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
          />
        </div>

        <span className="text-xs font-bold text-slate-500">
          Showing {filteredInvoices.length} Invoices
        </span>
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Invoice # & Date</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Billing Model</th>
                <th className="py-3.5 px-4">Invoiced Total</th>
                <th className="py-3.5 px-4">Payment Breakdown</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 italic">
                    No invoices found. Generate monthly batch invoices above or issue a custom invoice.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-extrabold text-slate-900 block">{inv.invoiceNumber}</span>
                      <span className="text-[11px] text-slate-400">{inv.invoiceDate} (Due: {inv.dueDate})</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block">{inv.customerName}</span>
                      <span className="text-[11px] text-slate-400 font-mono">{inv.customerPhone}</span>
                    </td>

                    <td className="py-3.5 px-4 text-xs font-semibold">
                      {inv.billingType === "MONTHLY_CONSOLIDATED" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <Calendar className="w-3 h-3" />
                          <span>Monthly Statement</span>
                        </span>
                      ) : inv.billingType === "EVENT_SETTLEMENT" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Bulk Event
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                          Spot Delivery
                        </span>
                      )}
                    </td>

                    {/* Invoiced Total */}
                    <td className="py-3.5 px-4 font-black text-slate-900 text-base">
                      {formatINR(inv.totalAmountPaise)}
                    </td>

                    {/* Payment Breakdown (Paid vs Due) */}
                    <td className="py-3.5 px-4">
                      <div className="text-xs space-y-0.5">
                        {inv.paidAmountPaise > 0 ? (
                          <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Paid: {formatINR(inv.paidAmountPaise)}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">No payment recorded</span>
                        )}
                        {inv.outstandingPaise > 0 ? (
                          <span className="text-rose-600 font-black flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                            Due: {formatINR(inv.outstandingPaise)}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-semibold text-[11px]">Fully Cleared</span>
                        )}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {inv.status === "PAID" || inv.outstandingPaise === 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3" /> Fully Paid
                        </span>
                      ) : inv.status === "PARTIALLY_PAID" || (inv.paidAmountPaise > 0 && inv.outstandingPaise > 0) ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                          <Clock className="w-3 h-3 text-amber-700" /> Partially Paid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">
                          <AlertCircle className="w-3 h-3 text-rose-600" /> Unpaid
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Inspect Invoice Button */}
                        <button
                          onClick={() => {
                            setActiveInvoice(inv);
                            setInspectModalOpen(true);
                          }}
                          title="Inspect Invoice Breakdown & Payment History"
                          className="p-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* WhatsApp Share Link */}
                        <a
                          href={inv.whatsAppShareUrl}
                          target="_blank"
                          rel="noreferrer"
                          title="Share Invoice on WhatsApp"
                          className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </a>

                        {/* UPI QR Display */}
                        <button
                          onClick={() => {
                            setActiveInvoice(inv);
                            setUpiModalOpen(true);
                          }}
                          title="Display Dynamic UPI QR Code"
                          className="p-2 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 transition-colors cursor-pointer"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>

                        {/* Print Bill of Supply View */}
                        <button
                          onClick={() => {
                            setActiveInvoice(inv);
                            setPrintModalOpen(true);
                          }}
                          title="View / Print Commercial Invoice"
                          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 0: MONTH-END AUTO-BILLING BATCH RUNNER */}
      {/* ========================================================================= */}
      {monthEndModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto space-y-5 animate-in zoom-in-95">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-purple-100 text-purple-700">
                    <Zap className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      Month-End Auto Invoicing Engine
                    </h3>
                    <p className="text-xs text-slate-500">
                      Consolidate recurring daily deliveries into official monthly bills for regular customers
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setMonthEndModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Month Selector */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-xs font-bold text-slate-700 block">Select Billing Month:</span>
                <span className="text-[11px] text-slate-400">Pura mahina summarize hoga</span>
              </div>
              <select
                value={selectedBillingMonth}
                onChange={(e) => {
                  setSelectedBillingMonth(e.target.value);
                  loadBatchSummary(e.target.value);
                }}
                className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 shadow-2xs"
              >
                <option value="2026-10">October 2026 (Current Month)</option>
                <option value="2026-09">September 2026</option>
                <option value="2026-08">August 2026</option>
                <option value="2026-11">November 2026</option>
              </select>
            </div>

            {/* Results Screen after successful batch generation */}
            {batchResults ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
                  <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto mb-2 shadow-md shadow-emerald-500/20">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-black text-emerald-900">
                    {batchResults.generatedCount} Monthly Invoices Generated Successfully!
                  </h4>
                  <p className="text-xs text-emerald-700">
                    All deliveries for {batchResults.monthName} have been invoiced and posted to the General Ledger.
                  </p>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                  {batchResults.invoices.map((inv: any, idx: number) => (
                    <div key={idx} className="p-3.5 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <span className="font-bold text-xs text-slate-900 block">{inv.customerName}</span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {inv.invoiceNumber} • {inv.totalJars} Jars • {formatINR(inv.totalAmountPaise)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={inv.whatsAppShareUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs"
                        >
                          <Send className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setMonthEndModalOpen(false)}
                  className="w-full py-3 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl"
                >
                  Done
                </button>
              </div>
            ) : (
              /* Pre-run Summary & Customers Table */
              <div className="space-y-4">
                {batchLoading ? (
                  <div className="p-8 text-center text-slate-500 text-xs font-bold">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-600" />
                    Scanning customer recurring deliveries...
                  </div>
                ) : batchSummary ? (
                  <>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl">
                        <span className="text-[10px] font-extrabold uppercase text-purple-600 block">Pending To Bill</span>
                        <span className="text-xl font-black text-purple-900 block mt-0.5">
                          {batchSummary.unbilledCount}
                        </span>
                      </div>
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
                        <span className="text-[10px] font-extrabold uppercase text-emerald-600 block">Already Billed</span>
                        <span className="text-xl font-black text-emerald-900 block mt-0.5">
                          {batchSummary.billedCount}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                        <span className="text-[10px] font-extrabold uppercase text-slate-500 block">Total Customers</span>
                        <span className="text-xl font-black text-slate-900 block mt-0.5">
                          {batchSummary.summary?.length || 0}
                        </span>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                      <table className="w-full text-left text-xs text-slate-600">
                        <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                          <tr>
                            <th className="p-2.5">Customer</th>
                            <th className="p-2.5 text-center">Trips</th>
                            <th className="p-2.5 text-center">Jars</th>
                            <th className="p-2.5 text-right">Est. Amount</th>
                            <th className="p-2.5 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {batchSummary.summary?.map((cust: any) => (
                            <tr key={cust.customerId} className="hover:bg-slate-50">
                              <td className="p-2.5">
                                <span className="font-bold text-slate-900 block">{cust.customerName}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{cust.customerCode}</span>
                              </td>
                              <td className="p-2.5 text-center font-bold">{cust.deliveryTrips}</td>
                              <td className="p-2.5 text-center font-bold text-sky-700">{cust.totalJars}</td>
                              <td className="p-2.5 text-right font-black text-slate-900">
                                {formatINR(cust.estimatedAmountPaise)}
                              </td>
                              <td className="p-2.5 text-center">
                                {cust.isBilled ? (
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                                    Billed ({cust.existingInvoiceNumber})
                                  </span>
                                ) : cust.totalJars > 0 ? (
                                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">
                                    Pending Bill
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded-full">
                                    No Deliveries
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <button
                      onClick={handleRunBatchBilling}
                      disabled={batchSubmitting || batchSummary.unbilledCount === 0}
                      className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Zap className="w-4 h-4" />
                      <span>
                        {batchSubmitting
                          ? "Generating Invoices..."
                          : batchSummary.unbilledCount === 0
                          ? "All Customers Already Billed for This Month"
                          : `Generate Official Invoices (${batchSummary.unbilledCount} Pending Customers)`}
                      </span>
                    </button>
                  </>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE CUSTOM INVOICE */}
      {/* ========================================================================= */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Issue Custom Commercial Invoice</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Customer</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setSelectedCustomerId(newId);
                    const cust = customers.find((c) => c.id === newId);
                    if (cust) {
                      const rate = Math.round((cust.pricePerJarPaise ?? cust.customPrice?.pricePerJarPaise ?? 3500) / 100);
                      setUnitPriceRupees(rate.toString());
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold"
                  required
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.customerCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Billing Type</label>
                <select
                  value={billingType}
                  onChange={(e: any) => setBillingType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold"
                >
                  <option value="SPOT_DELIVERY">Spot Delivery Billing (Per-Order)</option>
                  <option value="MONTHLY_CONSOLIDATED">Monthly Consolidated Statement</option>
                  <option value="EVENT_SETTLEMENT">Bulk Event Settlement</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Jar Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={jarQuantity}
                    onChange={(e) => setJarQuantity(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Rate per Jar (₹)</label>
                  <input
                    type="number"
                    min="1"
                    value={unitPriceRupees}
                    onChange={(e) => setUnitPriceRupees(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Notes / Narration</label>
                <input
                  type="text"
                  placeholder="Optional delivery details..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Generating..." : "Post Official Invoice (GL Voucher)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DYNAMIC UPI QR SCANNER POPUP */}
      {/* ========================================================================= */}
      {upiModalOpen && activeInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black uppercase text-sky-700 tracking-wider">
                Instant UPI Payment
              </span>
              <button onClick={() => setUpiModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900">{activeInvoice.customerName}</h3>
              <p className="text-xs text-slate-500">
                Invoice: <strong>{activeInvoice.invoiceNumber}</strong>
              </p>
              <div className="text-2xl font-black text-slate-900 pt-1">
                {formatINR(activeInvoice.outstandingPaise)}
              </div>
            </div>

            {upiQrDataUrl ? (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 inline-block shadow-inner">
                <img src={upiQrDataUrl} alt="UPI QR Code" className="w-48 h-48 mx-auto rounded-xl" />
                <span className="text-[10px] text-slate-400 font-bold block mt-2">
                  Scan via GPay, PhonePe, Paytm, or BHIM UPI
                </span>
              </div>
            ) : (
              <div className="w-48 h-48 mx-auto flex items-center justify-center bg-slate-100 rounded-2xl">
                <span className="text-xs text-slate-400">Loading QR...</span>
              </div>
            )}

            <div className="pt-2">
              <a
                href={activeInvoice.whatsAppShareUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all block"
              >
                <Share2 className="w-4 h-4" />
                <span>Send Bill via WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: COMMERCIAL BILL OF SUPPLY (PRINT VIEW) */}
      {/* ========================================================================= */}
      {printModalOpen && activeInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                  Bill of Supply (Section 31(3)(c))
                </span>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">Sai Waters</h2>
                <p className="text-xs text-slate-500">
                  Bareilly, Uttar Pradesh • Contact: +91 98765 43210
                </p>
                <p className="text-[11px] text-slate-400 font-semibold">
                  GST Status: Unregistered Supplier (Tax not charged)
                </p>
              </div>

              <div className="text-right">
                <span className="text-base font-black text-slate-900 block">
                  {activeInvoice.invoiceNumber}
                </span>
                <span className="text-xs text-slate-500 block">Date: {activeInvoice.invoiceDate}</span>
                <span className="text-xs text-slate-500 block">Due Date: {activeInvoice.dueDate}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block mb-1">
                  Bill To (Customer Details):
                </span>
                <strong className="text-slate-900 text-sm block">{activeInvoice.customerName}</strong>
                <span className="text-slate-600 block">Code: {activeInvoice.customerCode}</span>
                <span className="text-slate-600 block">Phone: {activeInvoice.customerPhone}</span>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block mb-1">
                  Payment Remittance:
                </span>
                <strong className="text-slate-900 block">UPI: saiwaters@upi</strong>
                <span className="text-slate-600 block">Bank: State Bank of India</span>
                <span className="text-slate-600 block">A/C: 10023456789 (IFSC: SBIN0001234)</span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 font-bold uppercase tracking-wider text-[10px] text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Description</th>
                    <th className="py-2 px-3 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-3 px-3">
                      <strong className="text-slate-900 block">
                        {activeInvoice.billingType === "MONTHLY_CONSOLIDATED"
                          ? "Monthly Consolidated Water Jar Supply"
                          : "20L Reusable Drinking Water Jars"}
                      </strong>
                      <span className="text-slate-500 text-[11px]">
                        Reverse Osmosis (RO) Purified 20-Litre Standard Polycarbonate Jars
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-black text-slate-900">
                      {formatINR(activeInvoice.totalAmountPaise)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-end pt-2">
              <div className="text-[11px] text-slate-400 max-w-xs">
                <strong>Statutory Declaration:</strong> This is a commercial Bill of Supply issued by an entity currently unregistered under the Central Goods and Services Tax Act.
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-500 font-bold block">Total Payable:</span>
                <span className="text-2xl font-black text-slate-900 block">
                  {formatINR(activeInvoice.totalAmountPaise)}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPrintModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Document</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: DETAILED INVOICE INSPECTION & PAYMENT AUDIT TRAIL */}
      {/* ========================================================================= */}
      {inspectModalOpen && activeInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-6">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                    Audit Trail & Inspection
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    ID: {activeInvoice.id}
                  </span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
                  <span>Invoice {activeInvoice.invoiceNumber}</span>
                  {activeInvoice.status === "PAID" || activeInvoice.outstandingPaise === 0 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Fully Paid
                    </span>
                  ) : activeInvoice.status === "PARTIALLY_PAID" || (activeInvoice.paidAmountPaise > 0 && activeInvoice.outstandingPaise > 0) ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                      <Clock className="w-3.5 h-3.5 text-amber-700" /> Partially Paid
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Unpaid
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Billed on <strong>{activeInvoice.invoiceDate}</strong> • Due by <strong>{activeInvoice.dueDate}</strong>
                </p>
              </div>

              <button
                onClick={() => setInspectModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* 4 Financial KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Invoiced
                </span>
                <span className="text-lg font-black text-slate-900 mt-1 block">
                  {formatINR(activeInvoice.totalAmountPaise)}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Order Billing Total</span>
              </div>

              <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-200">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                  Advance Paid
                </span>
                <span className="text-lg font-black text-indigo-900 mt-1 block">
                  {formatINR(activeInvoice.advanceReceivedPaise || 0)}
                </span>
                <span className="text-[10px] text-indigo-700/80 font-medium">At Order Booking</span>
              </div>

              <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                  Driver Doorstep Cash
                </span>
                <span className="text-lg font-black text-emerald-900 mt-1 block">
                  {formatINR(activeInvoice.driverCollectedPaise || (activeInvoice.paidAmountPaise - (activeInvoice.advanceReceivedPaise || 0)) || 0)}
                </span>
                <span className="text-[10px] text-emerald-700/80 font-medium">Collected at Delivery</span>
              </div>

              <div className={`${(activeInvoice.outstandingPaise || 0) > 0 ? "bg-rose-50/70 border-rose-200 text-rose-900" : "bg-emerald-50/70 border-emerald-200 text-emerald-900"} p-3.5 rounded-2xl border`}>
                <span className={`text-[10px] font-bold ${(activeInvoice.outstandingPaise || 0) > 0 ? "text-rose-600" : "text-emerald-700"} uppercase tracking-wider block`}>
                  {(activeInvoice.outstandingPaise || 0) > 0 ? "Net Balance Due" : "Settlement"}
                </span>
                <span className="text-lg font-black mt-1 block">
                  {formatINR(activeInvoice.outstandingPaise || 0)}
                </span>
                <span className={`text-[10px] ${(activeInvoice.outstandingPaise || 0) > 0 ? "text-rose-700" : "text-emerald-700"} font-medium`}>
                  {(activeInvoice.outstandingPaise || 0) > 0 ? "Awaiting Payment" : "Fully Settled"}
                </span>
              </div>
            </div>

            {/* Customer & Linked Order Context */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer Box */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Customer Information
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    {activeInvoice.customerCode}
                  </span>
                </div>
                <div>
                  <strong className="text-slate-900 text-base block">{activeInvoice.customerName}</strong>
                  <span className="text-xs text-slate-600 block">📞 {activeInvoice.customerPhone}</span>
                </div>
                <div className="pt-1 text-[11px] text-slate-500">
                  Billing Model:{" "}
                  <strong className="text-slate-700">
                    {activeInvoice.billingType === "MONTHLY_CONSOLIDATED"
                      ? "Monthly Consolidated"
                      : activeInvoice.billingType === "EVENT_SETTLEMENT"
                      ? "Event / Bulk Supply"
                      : "Spot Delivery"}
                  </strong>
                </div>
              </div>

              {/* Order Box */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Linked Order Details
                  </span>
                  {activeInvoice.orderNumber && (
                    <span className="text-xs font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                      {activeInvoice.orderNumber}
                    </span>
                  )}
                </div>
                {activeInvoice.orderNumber ? (
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Quantity Delivered:</span>
                      <strong className="text-slate-900">{activeInvoice.orderQuantityJars || "—"} Jars</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Agreed Unit Rate:</span>
                      <strong className="text-slate-900">
                        {activeInvoice.orderUnitPricePaise
                          ? formatINR(activeInvoice.orderUnitPricePaise)
                          : activeInvoice.orderQuantityJars
                          ? formatINR(Math.round(activeInvoice.totalAmountPaise / activeInvoice.orderQuantityJars))
                          : "—"}
                        /Jar
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Order Delivery Status:</span>
                      <span className="font-bold text-emerald-700">{activeInvoice.orderStatus || "DELIVERED"}</span>
                    </div>
                    {activeInvoice.eventName && (
                      <div className="flex justify-between pt-1 border-t border-slate-200">
                        <span className="text-slate-500">Event:</span>
                        <strong className="text-indigo-700">{activeInvoice.eventName}</strong>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic pt-2">
                    Direct commercial invoice issued without linked route delivery order.
                  </p>
                )}
              </div>
            </div>

            {/* Driver Doorstep Cash Collections Section */}
            <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Doorstep Field Collections by Driver
                  </h4>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Total Collected: {formatINR(activeInvoice.driverCollectedPaise || (activeInvoice.paidAmountPaise - (activeInvoice.advanceReceivedPaise || 0)) || 0)}
                </span>
              </div>

              {activeInvoice.cashCollections && activeInvoice.cashCollections.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {activeInvoice.cashCollections.map((c: any) => (
                    <div key={c.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-slate-900">{c.driverName || "Route Driver"}</strong>
                          <span className="text-[11px] text-slate-400 font-mono">
                            Slip #{c.id?.slice(-6).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 block mt-0.5">
                          Collected: {c.collectedDateTimeIST || c.collectedTimeIST || "Doorstep delivery"}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-emerald-700 text-sm block">
                          {formatINR(c.amountCollectedPaise)}
                        </span>
                        <span className={`text-[10px] font-bold ${c.isHandedOver ? "text-emerald-600" : "text-amber-600"}`}>
                          {c.isHandedOver ? "✓ Verified & Vault Deposited" : "In Driver Transit (GL 1120)"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : activeInvoice.advanceReceivedPaise > 0 ? (
                <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 text-xs flex justify-between items-center">
                  <span className="text-indigo-900">
                    Advance Payment received at order booking:
                  </span>
                  <strong className="text-indigo-700 text-sm">{formatINR(activeInvoice.advanceReceivedPaise)}</strong>
                </div>
              ) : (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center text-xs text-slate-400 italic">
                  No doorstep cash recorded yet. Amount payable: {formatINR(activeInvoice.outstandingPaise)}
                </div>
              )}
            </div>

            {/* Official Receipts History */}
            {activeInvoice.receipts && activeInvoice.receipts.length > 0 && (
              <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-sky-600" />
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      Official Payment Receipts & Vouchers
                    </h4>
                  </div>
                  <span className="text-xs font-bold text-slate-400">
                    {activeInvoice.receipts.length} Receipt(s)
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {activeInvoice.receipts.map((r: any) => (
                    <div key={r.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <strong className="text-slate-900 block font-mono">{r.receiptNumber}</strong>
                        <span className="text-[11px] text-slate-500 block">
                          Mode: <span className="font-semibold">{r.paymentMode}</span> • Ref: {r.transactionReference || "Direct Cash"}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-slate-900 block">{formatINR(r.amountPaise)}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{r.receiptDate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Double-Entry General Ledger (GL) Audit Trail */}
            <div className="border border-indigo-100 rounded-2xl p-4 bg-indigo-50/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-indigo-700" />
                  <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider">
                    Double-Entry General Ledger (GL) Audit Trail
                  </h4>
                </div>
                <span className="text-[10px] font-bold bg-white text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                  Balanced Books
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {/* Entry 1: Invoice Posting */}
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">1. Revenue Recognition</span>
                    <span className="text-slate-700">Dr. 1150 Accounts Receivable / Cr. 4110 Water Sales</span>
                  </div>
                  <strong className="text-slate-900">{formatINR(activeInvoice.totalAmountPaise)}</strong>
                </div>

                {/* Entry 2: Cash Collection */}
                {(activeInvoice.driverCollectedPaise > 0 || activeInvoice.paidAmountPaise > 0) && (
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">2. Field Collection Credit</span>
                      <span className="text-slate-700">Dr. 1120 Driver Clearing / Cr. 1150 Accounts Receivable</span>
                    </div>
                    <strong className="text-emerald-700">
                      {formatINR(activeInvoice.driverCollectedPaise || activeInvoice.paidAmountPaise)}
                    </strong>
                  </div>
                )}

                {/* Entry 3: Customer Outstanding */}
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">3. Net Receivable Balance</span>
                    <span className="text-slate-700">Customer Balance remaining in A/C 1150</span>
                  </div>
                  <strong className={(activeInvoice.outstandingPaise || 0) > 0 ? "text-rose-600 font-black" : "text-emerald-600 font-bold"}>
                    {formatINR(activeInvoice.outstandingPaise || 0)}
                  </strong>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setInspectModalOpen(false);
                    setPrintModalOpen(true);
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Bill</span>
                </button>

                {activeInvoice.outstandingPaise > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setInspectModalOpen(false);
                        setUpiModalOpen(true);
                      }}
                      className="px-4 py-2.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>UPI QR ({formatINR(activeInvoice.outstandingPaise)})</span>
                    </button>

                    <a
                      href={activeInvoice.whatsAppShareUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>WhatsApp Due Reminder</span>
                    </a>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => setInspectModalOpen(false)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
