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
  const [upiModalOpen, setUpiModalOpen] = useState(false);
  const [upiQrDataUrl, setUpiQrDataUrl] = useState("");
  const [printModalOpen, setPrintModalOpen] = useState(false);

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
    ])
      .then(([invData, custData]) => {
        setInvoices(invData.invoices || []);
        setCustomers(custData.customers || []);
        if (custData.customers?.length > 0 && !selectedCustomerId) {
          setSelectedCustomerId(custData.customers[0].id);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load invoices:", err);
        setLoading(false);
      });
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
            Spot delivery bills, monthly consolidated statements, dynamic UPI links, and 1-Click WhatsApp dispatch
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Issue New Invoice
        </button>
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
                <th className="py-3.5 px-4">Total Amount</th>
                <th className="py-3.5 px-4">Status & Dues</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <span className="font-extrabold text-slate-900 block">{inv.invoiceNumber}</span>
                    <span className="text-[11px] text-slate-400">{inv.invoiceDate} (Due: {inv.dueDate})</span>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-900 block">{inv.customerName}</span>
                    <span className="text-[11px] text-slate-400 font-mono">{inv.customerPhone}</span>
                  </td>

                  <td className="py-3.5 px-4 text-xs font-semibold text-slate-700">
                    {inv.billingType === "MONTHLY_CONSOLIDATED" ? "Monthly Batch" : "Spot Delivery"}
                  </td>

                  <td className="py-3.5 px-4 font-black text-slate-900">
                    {formatINR(inv.totalAmountPaise)}
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadge(
                        inv.status
                      )}`}
                    >
                      {inv.status}
                    </span>
                    {inv.outstandingPaise > 0 && (
                      <span className="block text-[11px] text-rose-600 font-bold mt-0.5">
                        Due: {formatINR(inv.outstandingPaise)}
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* 1-Click WhatsApp Share */}
                      <a
                        href={inv.whatsAppShareUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Share on WhatsApp"
                        className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </a>

                      {/* Dynamic UPI QR Modal */}
                      <button
                        onClick={() => {
                          setActiveInvoice(inv);
                          setUpiModalOpen(true);
                        }}
                        title="Show UPI QR Code"
                        className="p-2 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 transition-colors"
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
                        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE INVOICE */}
      {/* ========================================================================= */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Issue Commercial Invoice</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Customer</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
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
                    value={unitPriceRupees}
                    onChange={(e) => setUnitPriceRupees(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-sky-600"
                    required
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                <span className="text-slate-500 font-semibold">Total Invoice Amount:</span>
                <span className="text-base font-black text-slate-900">
                  {formatINR(Number(jarQuantity || 0) * Number(unitPriceRupees || 0) * 100)}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  {isSubmitting ? "Generating..." : "Post Official Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DYNAMIC UPI QR CODE */}
      {/* ========================================================================= */}
      {upiModalOpen && activeInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-sky-600 uppercase tracking-widest">
                Dynamic UPI Payment
              </span>
              <button onClick={() => setUpiModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900">{activeInvoice.customerName}</h3>
              <p className="text-xs text-slate-500">{activeInvoice.invoiceNumber}</p>
            </div>

            {/* QR Simulation Card */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col items-center">
              <div className="w-48 h-48 bg-white p-2.5 rounded-xl border border-slate-300 shadow-xs flex items-center justify-center">
                {upiQrDataUrl ? (
                  <img src={upiQrDataUrl} alt="UPI Payment QR" className="w-44 h-44 object-contain rounded-lg" />
                ) : (
                  <QrCode className="w-36 h-36 text-slate-900" />
                )}
              </div>
              <span className="text-2xl font-black text-slate-900 mt-2.5">
                {formatINR(activeInvoice.outstandingPaise)}
              </span>
              <span className="text-xs font-mono text-slate-500 mt-0.5">saiwaters@upi</span>
            </div>

            <p className="text-[11px] text-slate-400">
              Scan with GPay, PhonePe, Paytm, or BHIM. Zero payment gateway transaction fees.
            </p>

            <a
              href={activeInvoice.upiLink}
              className="block w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs rounded-xl shadow-xs"
            >
              Open Direct UPI App
            </a>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: PRINTABLE BILL OF SUPPLY VIEW */}
      {/* ========================================================================= */}
      {printModalOpen && activeInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl border border-slate-200 space-y-6">
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-2xl font-black text-sky-700 tracking-tight">SAI WATERS</h2>
                <p className="text-xs text-slate-500">20-Litre Mineral Water Distribution & Reusable Containers</p>
                <p className="text-xs text-slate-500">Bareilly, Uttar Pradesh, India • Phone: +91 98765 43210</p>
              </div>

              <div className="text-right">
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-slate-100 text-slate-800 border border-slate-200 uppercase tracking-widest inline-block mb-1">
                  BILL OF SUPPLY
                </span>
                <p className="text-[10px] text-slate-400 font-bold">
                  (Composition / Unregistered under GST Act)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-bold block uppercase tracking-wider text-[10px]">
                  Billed To:
                </span>
                <strong className="text-slate-900 font-bold text-sm block mt-0.5">
                  {activeInvoice.customerName}
                </strong>
                <p className="text-slate-600">Customer Code: {activeInvoice.customerCode}</p>
                <p className="text-slate-600">Mobile: {activeInvoice.customerPhone}</p>
              </div>

              <div className="text-right">
                <span className="text-slate-400 font-bold block uppercase tracking-wider text-[10px]">
                  Invoice Details:
                </span>
                <strong className="text-slate-900 font-bold text-sm block mt-0.5">
                  {activeInvoice.invoiceNumber}
                </strong>
                <p className="text-slate-600">Date: {activeInvoice.invoiceDate}</p>
                <p className="text-slate-600">Due Date: {activeInvoice.dueDate}</p>
              </div>
            </div>

            {/* Bill Lines */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-slate-500 text-[10px]">
                  <tr>
                    <th className="p-3">Description</th>
                    <th className="p-3 text-center">HSN/SAC</th>
                    <th className="p-3 text-center">Tax Rate</th>
                    <th className="p-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-3 font-semibold text-slate-800">
                      20-Litre Reusable Drinking Water Jar Supply
                    </td>
                    <td className="p-3 text-center text-slate-400">2201</td>
                    <td className="p-3 text-center text-slate-400">0.00%</td>
                    <td className="p-3 text-right font-black text-slate-900">
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
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                Print Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
