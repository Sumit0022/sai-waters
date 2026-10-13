"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Search,
  Plus,
  Phone,
  MapPin,
  Calendar,
  QrCode,
  X,
  Edit,
  Printer,
  ChevronRight,
  TrendingUp,
  Receipt,
  CheckCircle2,
  AlertCircle,
  FileText,
  Archive,
  ArchiveRestore,
  Trash2,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Truck,
} from "lucide-react";
import QRCode from "qrcode";
import { formatINR } from "@/lib/utils";
import { formatTimeIST } from "@/lib/date-utils";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Directory Tab Filter
  const [customerTab, setCustomerTab] = useState<"ACTIVE" | "ARCHIVED" | "ALL">("ACTIVE");

  // Deletion Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<any>(null);
  const [deleteConfirmationCode, setDeleteConfirmationCode] = useState("");
  const [userInputCode, setUserInputCode] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [ledgerModalOpen, setLedgerModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  // Active Customer & Ledger Data
  const [activeCustomer, setActiveCustomer] = useState<any>(null);
  const [activeLedger, setActiveLedger] = useState<any>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("ALL");
  const [customerQrDataUrl, setCustomerQrDataUrl] = useState("");

  // Add / Edit Form State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [locality, setLocality] = useState("Civil Lines");
  const [specialPriceRupees, setSpecialPriceRupees] = useState("35");
  const [recurringQuantity, setRecurringQuantity] = useState("1");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const generateConfirmationCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "DEL-";
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleOpenDelete = (cust: any) => {
    setCustomerToDelete(cust);
    setDeleteConfirmationCode(generateConfirmationCode());
    setUserInputCode("");
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!customerToDelete) return;
    if (userInputCode.trim().toUpperCase() !== deleteConfirmationCode.toUpperCase()) {
      alert("Verification code does not match!");
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/customers?customerId=${customerToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setDeleteModalOpen(false);
        setCustomerToDelete(null);
        loadCustomers();
      } else {
        alert(data.error || "Failed to delete customer");
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleArchive = async (cust: any, shouldArchive: boolean) => {
    const confirmMsg = shouldArchive
      ? `Are you sure you want to archive "${cust.fullName}"? They will be hidden from the active customer directory and delivery trips.`
      : `Restore "${cust.fullName}" back to the active customer directory?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch("/api/customers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: cust.id,
          action: shouldArchive ? "ARCHIVE" : "UNARCHIVE",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        loadCustomers();
      } else {
        alert(data.error || "Failed to update customer archive status");
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const loadCustomers = () => {
    setLoading(true);
    fetch("/api/customers")
      .then((r) => r.json())
      .then((data) => {
        setCustomers(data.customers || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load customers:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  // Open Ledger Modal for a customer
  const handleOpenLedger = async (cust: any) => {
    setActiveCustomer(cust);
    setLedgerModalOpen(true);
    setLedgerLoading(true);
    try {
      const res = await fetch(`/api/customers?customerId=${cust.id}`);
      const data = await res.json();
      if (data.success) {
        setActiveLedger(data);
      }
    } catch (e) {
      console.error("Failed to load customer ledger:", e);
    } finally {
      setLedgerLoading(false);
    }
  };

  // Open QR Sticker Modal for a customer
  const handleOpenQrSticker = async (cust: any) => {
    setActiveCustomer(cust);
    setQrModalOpen(true);
    try {
      const token = `urn:sw:c:${cust.customerCode}`;
      const url = await QRCode.toDataURL(token, {
        width: 320,
        margin: 2,
        color: { dark: "#0F172A", light: "#FFFFFF" },
      });
      setCustomerQrDataUrl(url);
    } catch (e) {
      console.error("Failed to generate QR:", e);
    }
  };

  // Open Edit Customer Modal
  const handleOpenEdit = (cust: any) => {
    setActiveCustomer(cust);
    setFullName(cust.fullName || "");
    setPhone(cust.phone || "");
    setStreetAddress(cust.address?.streetAddress || cust.addresses?.[0]?.streetAddress || "");
    setLocality(cust.address?.locality || cust.addresses?.[0]?.locality || "Civil Lines");
    const rateRupees = (cust.pricePerJarPaise ?? cust.customPrice?.pricePerJarPaise)
      ? ((cust.pricePerJarPaise ?? cust.customPrice?.pricePerJarPaise) / 100).toString()
      : "20";
    setSpecialPriceRupees(rateRupees);
    setRecurringQuantity((cust.schedule?.quantityJars || 1).toString());
    setEditModalOpen(true);
  };

  // Submit Add Customer
  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          phone,
          streetAddress,
          locality,
          specialPricePerJarPaise: Math.round(Number(specialPriceRupees) * 100),
          recurringQuantity: Number(recurringQuantity || 1),
        }),
      });
      if (res.ok) {
        setAddModalOpen(false);
        setFullName("");
        setPhone("");
        setStreetAddress("");
        setSpecialPriceRupees("35");
        setRecurringQuantity("1");
        loadCustomers();
      }
    } catch (err) {
      console.error("Failed to add customer:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit Customer
  const handleEditCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/customers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: activeCustomer.id,
          fullName,
          phone,
          streetAddress,
          locality,
          specialPricePerJarPaise: Math.round(Number(specialPriceRupees) * 100),
          recurringQuantity: Number(recurringQuantity || 1),
        }),
      });
      if (res.ok) {
        setEditModalOpen(false);
        loadCustomers();
      }
    } catch (err) {
      console.error("Failed to update customer:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeCount = customers.filter((c) => c.isActive !== false && c.isActive !== 0).length;
  const archivedCount = customers.filter((c) => c.isActive === false || c.isActive === 0).length;
  const totalCount = customers.length;

  const filteredCustomers = customers
    .filter((c) => {
      const isArchived = c.isActive === false || c.isActive === 0;
      if (customerTab === "ACTIVE") return !isArchived;
      if (customerTab === "ARCHIVED") return isArchived;
      return true;
    })
    .filter(
      (c) =>
        c.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm) ||
        c.customerCode?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  // Compute monthly calculations for active ledger
  const deliveriesList = activeLedger?.deliveries || [];
  const filteredDeliveries = deliveriesList.filter((d: any) => {
    if (selectedMonth === "ALL") return true;
    return d.scheduledDate?.startsWith(selectedMonth);
  });

  const totalDeliveredJars = filteredDeliveries.reduce((sum: number, d: any) => sum + (d.quantityJars || 0), 0);
  const totalDeliveryAmountPaise = filteredDeliveries.reduce((sum: number, d: any) => sum + (d.totalAmountPaise || 0), 0);
  const totalPaidPaise = (activeLedger?.receipts || []).reduce((sum: number, r: any) => sum + (r.amountPaise || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-200 uppercase tracking-wider">
              Recurring Delivery Clients
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Customer QR Allotment Active
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Daily Customer Directory & Ledgers
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage recurring jar clients, stick individual station QRs, and track monthly delivery ledgers
          </p>
        </div>

        <button
          onClick={() => setAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Recurring Customer</span>
        </button>
      </div>

      {/* Directory Filter Tabs & Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setCustomerTab("ACTIVE")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              customerTab === "ACTIVE"
                ? "bg-white text-sky-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Active Directory ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setCustomerTab("ARCHIVED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              customerTab === "ARCHIVED"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Archived ({archivedCount})
          </button>
          <button
            type="button"
            onClick={() => setCustomerTab("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              customerTab === "ALL"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Clients ({totalCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by customer name, mobile number, or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-slate-200 text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Customers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200 p-6">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-700 text-sm">No customers found</h3>
            <p className="text-xs text-slate-500 mt-1">
              {customerTab === "ARCHIVED"
                ? "No archived customers found."
                : "Try adjusting your search criteria or add a new customer."}
            </p>
          </div>
        ) : (
          filteredCustomers.map((cust) => {
            const isArchived = cust.isActive === false || cust.isActive === 0;
            const isBulkEvent = cust.customerType === "EVENT" || cust.customerCode?.startsWith("EVT-");
            const ratePaise = cust.pricePerJarPaise ?? cust.customPrice?.pricePerJarPaise ?? 2000;
            const quota = cust.schedule?.quantityJars || (isBulkEvent ? (cust.heldJarsCount || 0) : 1);
            const address = cust.address?.streetAddress || cust.addresses?.[0]?.streetAddress || "Bareilly";
            const locality = cust.address?.locality || cust.addresses?.[0]?.locality || "";

            return (
              <div
                key={cust.id}
                className={`bg-white rounded-2xl border shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between ${
                  isArchived
                    ? "border-amber-200/80 bg-amber-50/20"
                    : isBulkEvent
                    ? "border-purple-200 hover:border-purple-300"
                    : "border-slate-200 hover:border-sky-300"
                }`}
              >
                <div>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                            isBulkEvent
                              ? "text-purple-800 bg-purple-50 border-purple-200"
                              : "text-sky-700 bg-sky-50 border-sky-200"
                          }`}
                        >
                          {cust.customerCode}
                        </span>
                        {isArchived && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                            <Archive className="w-3 h-3" /> Archived
                          </span>
                        )}
                      </div>
                      <h3
                        className={`font-black text-base mt-1 leading-tight ${
                          isArchived ? "text-slate-500 line-through decoration-slate-300" : "text-slate-900"
                        }`}
                      >
                        {cust.fullName}
                      </h3>
                    </div>
                    {isBulkEvent ? (
                      <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200 shrink-0 flex items-center gap-1">
                        <Truck className="w-3 h-3 text-purple-700" />
                        <span>Bulk / Event Client</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                        Daily {quota} Jars
                      </span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="py-3 space-y-1.5 text-xs text-slate-600">
                    <p className="flex items-center gap-1.5 font-medium">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{cust.phone}</span>
                    </p>
                    <p className="flex items-start gap-1.5 text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="truncate">{address}, {locality}</span>
                    </p>
                  </div>

                  {/* Rates & Custody Summary Box */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs mb-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block uppercase">Allotted Rate</span>
                      <span className="font-black text-slate-900">{formatINR(ratePaise)} / jar</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block uppercase">Jars in Custody</span>
                      <span className="font-black text-purple-700">{cust.heldJarsCount || 0} Jars</span>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenLedger(cust)}
                    className="flex-1 py-2 px-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Ledger</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenQrSticker(cust)}
                    title="Print Customer Entrance QR Sticker"
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                  >
                    <QrCode className="w-4 h-4 text-purple-600" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(cust)}
                    title="Edit Customer Details"
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                  >
                    <Edit className="w-4 h-4 text-slate-600" />
                  </button>

                  {isArchived ? (
                    <button
                      type="button"
                      onClick={() => handleToggleArchive(cust, false)}
                      title="Restore Customer to Active Directory"
                      className="p-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggleArchive(cust, true)}
                      title="Archive Customer (Hide from active trips)"
                      className="p-2 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors cursor-pointer"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenDelete(cust)}
                    title="Delete Customer & Cascade All Associated Bills/Orders"
                    className="p-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: DETAILED CUSTOMER MONTHLY DELIVERY LEDGER */}
      {/* ========================================================================= */}
      {ledgerModalOpen && activeCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto flex flex-col justify-between">
            <div>
              {/* Ledger Header */}
              <div className="flex justify-between items-start pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold bg-sky-100 text-sky-800 px-2 py-0.5 rounded-md">
                      {activeCustomer.customerCode}
                    </span>
                    <h3 className="text-lg font-black text-slate-900">{activeCustomer.fullName}</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Allotted Rate: <strong>{formatINR(activeCustomer.pricePerJarPaise ?? activeCustomer.customPrice?.pricePerJarPaise ?? 3500)} / Jar</strong> • Phone: {activeCustomer.phone}
                  </p>
                </div>
                <button
                  onClick={() => setLedgerModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Month Selector Filter */}
              <div className="flex items-center justify-between py-3">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Monthly Delivery History:
                </span>
                <select
                  aria-label="Filter Month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="p-1.5 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50"
                >
                  <option value="ALL">All Recorded Deliveries</option>
                  <option value="2026-10">October 2026</option>
                  <option value="2026-09">September 2026</option>
                  <option value="2026-08">August 2026</option>
                </select>
              </div>

              {/* Delivery Entries Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 font-bold uppercase tracking-wider text-[10px] text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3.5">Date & Time</th>
                        <th className="py-2.5 px-3.5 text-center">Jars Delivered</th>
                        <th className="py-2.5 px-3.5 text-right">Allotted Rate</th>
                        <th className="py-2.5 px-3.5 text-right">Total Amount</th>
                        <th className="py-2.5 px-3.5 text-center">Delivery Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredDeliveries.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                            No deliveries recorded for this period yet.
                          </td>
                        </tr>
                      ) : (
                        filteredDeliveries.map((del: any) => (
                          <tr key={del.id} className="hover:bg-slate-50/80">
                            <td className="py-2.5 px-3.5 font-bold text-slate-900">
                              {del.scheduledDate}
                              <span className="text-[10px] text-slate-400 font-normal block">
                                {formatTimeIST(del.createdAt)}
                              </span>
                            </td>
                            <td className="py-2.5 px-3.5 text-center font-extrabold text-sky-700">
                              {del.quantityJars} 20L Jars
                            </td>
                            <td className="py-2.5 px-3.5 text-right font-semibold">
                              {formatINR(del.unitPricePaise)}
                            </td>
                            <td className="py-2.5 px-3.5 text-right font-black text-slate-900">
                              {formatINR(del.totalAmountPaise)}
                            </td>
                            <td className="py-2.5 px-3.5 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                {del.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Bottom Monthly Summary Calculation Box */}
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Jars</span>
                  <span className="text-lg font-black text-slate-900">{totalDeliveredJars} Jars</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Billed</span>
                  <span className="text-lg font-black text-slate-900">{formatINR(totalDeliveryAmountPaise)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase block">Total Paid</span>
                  <span className="text-lg font-black text-emerald-700">{formatINR(totalPaidPaise)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-rose-700 uppercase block">Balance Due</span>
                  <span className="text-lg font-black text-rose-700">
                    {formatINR(Math.max(0, totalDeliveryAmountPaise - totalPaidPaise))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: PRINTABLE CUSTOMER ENTRANCE QR STICKER */}
      {/* ========================================================================= */}
      {qrModalOpen && activeCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">
                Entrance Station Sticker
              </span>
              <button onClick={() => setQrModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Sticker Box */}
            <div className="p-4 bg-slate-50 border-2 border-dashed border-purple-300 rounded-2xl text-center space-y-2">
              <div className="text-xs font-black tracking-tight text-slate-900 uppercase">
                SAI WATERS • 20L DELIVERY STATION
              </div>
              <div className="font-extrabold text-sm text-purple-900">{activeCustomer.fullName}</div>
              <div className="text-[11px] font-mono text-slate-500">{activeCustomer.customerCode}</div>

              {customerQrDataUrl ? (
                <img
                  src={customerQrDataUrl}
                  alt="Customer QR Code"
                  className="w-48 h-48 mx-auto rounded-xl shadow-xs border border-slate-200 bg-white p-2"
                />
              ) : (
                <div className="w-48 h-48 mx-auto flex items-center justify-center text-xs text-slate-400">
                  Generating QR...
                </div>
              )}

              <p className="text-[10px] text-slate-500 font-semibold px-2">
                Driver instructions: Scan this QR code first at doorstep, then scan delivered jars.
              </p>
            </div>

            <button
              onClick={() => window.print()}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Sticker Label</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT CUSTOMER DETAILS */}
      {/* ========================================================================= */}
      {editModalOpen && activeCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-black text-slate-900">Edit Customer Details</h3>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditCustomer} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Customer Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Mobile Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Allotted Rate (₹ / Jar)</label>
                  <input
                    type="number"
                    value={specialPriceRupees}
                    onChange={(e) => setSpecialPriceRupees(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Daily Jar Quota</label>
                  <input
                    type="number"
                    value={recurringQuantity}
                    onChange={(e) => setRecurringQuantity(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Street Address</label>
                <input
                  type="text"
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Locality</label>
                <input
                  type="text"
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: ADD NEW RECURRING CUSTOMER */}
      {/* ========================================================================= */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-black text-slate-900">Add Recurring Daily Customer</h3>
              <button onClick={() => setAddModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Customer / House Name</label>
                <input
                  type="text"
                  placeholder="e.g. Agarwal Niwas, Gupta Sweets"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Mobile Phone</label>
                <input
                  type="text"
                  placeholder="e.g. 9811223344"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Allotted Rate (₹ / Jar)</label>
                  <input
                    type="number"
                    value={specialPriceRupees}
                    onChange={(e) => setSpecialPriceRupees(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Daily Jar Quota</label>
                  <input
                    type="number"
                    value={recurringQuantity}
                    onChange={(e) => setRecurringQuantity(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Street Address</label>
                <input
                  type="text"
                  placeholder="e.g. Flat 102, Shanti Vihar"
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Locality</label>
                <input
                  type="text"
                  placeholder="e.g. Civil Lines, Bareilly"
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  {isSubmitting ? "Creating..." : "Save & Generate Station QR"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: PERMANENT DELETE CUSTOMER CONFIRMATION (CASCADE) */}
      {/* ========================================================================= */}
      {deleteModalOpen && customerToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-rose-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-rose-950">Permanent Cascade Delete</h3>
                  <p className="text-[11px] font-semibold text-rose-600">Danger: Irreversible Action</p>
                </div>
              </div>
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Warning Message */}
            <div className="p-3.5 bg-rose-50/80 border border-rose-200 rounded-2xl text-xs space-y-2 text-rose-950">
              <p className="font-bold">
                You are about to permanently delete:
              </p>
              <div className="p-2.5 bg-white rounded-xl border border-rose-200">
                <div className="font-black text-slate-900 text-sm">{customerToDelete.fullName}</div>
                <div className="text-[11px] font-mono text-slate-500">{customerToDelete.customerCode} • {customerToDelete.phone}</div>
              </div>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-rose-800 font-medium">
                <li>All linked invoices, receipts, and order entries will be deleted.</li>
                <li>Delivery records and accounting ledger lines will be removed.</li>
                <li>
                  Any jars held in custody (<strong className="text-rose-950">{customerToDelete.heldJarsCount || 0} jars</strong>) will be safely released back to Plant stock as <strong>AVAILABLE</strong>.
                </li>
              </ul>
            </div>

            {/* Random Verification Code Box */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Type the verification code below to confirm:
              </label>
              <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl text-center">
                <span className="text-[11px] text-slate-400 font-medium">Confirmation Code:</span>
                <span className="font-mono text-base font-black tracking-widest text-amber-400 select-all">
                  {deleteConfirmationCode}
                </span>
              </div>
              <input
                type="text"
                value={userInputCode}
                onChange={(e) => setUserInputCode(e.target.value.toUpperCase())}
                placeholder={`Type "${deleteConfirmationCode}" here`}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold uppercase tracking-wider text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={
                  isDeleting ||
                  userInputCode.trim().toUpperCase() !== deleteConfirmationCode.toUpperCase()
                }
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm & Permanently Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
