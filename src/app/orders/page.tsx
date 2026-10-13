"use client";

import { useEffect, useState } from "react";
import {
  ShoppingCart,
  Search,
  Plus,
  Calendar,
  MapPin,
  Phone,
  Users,
  CheckCircle,
  Clock,
  X,
  Sparkles,
  Truck,
  QrCode,
  ArrowRight,
  ShieldCheck,
  CheckCheck,
  RotateCcw,
  AlertTriangle,
  Layers,
  Trash2,
  PackageCheck,
  Check,
} from "lucide-react";
import { formatINR } from "@/lib/utils";
import { getTodayIST } from "@/lib/date-utils";
import QrCameraScanner from "@/components/QrCameraScanner";

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [availableJars, setAvailableJars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "CONFIRMED" | "IN_TRANSIT" | "DELIVERED">("ALL");

  // Booking Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [useExistingCustomer, setUseExistingCustomer] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customCustomerName, setCustomCustomerName] = useState("");
  const [customCustomerPhone, setCustomCustomerPhone] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [eventName, setEventName] = useState("");
  const [quantityJars, setQuantityJars] = useState("25");
  const [ratePerJarRupees, setRatePerJarRupees] = useState("35");
  const [depositAmountRupees, setDepositAmountRupees] = useState("1000");
  const [scheduledDate, setScheduledDate] = useState(getTodayIST());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dispatch Modal State (Owner Warehouse Dispatch)
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [selectedOrderForDispatch, setSelectedOrderForDispatch] = useState<any>(null);
  const [dispatchDriverId, setDispatchDriverId] = useState("usr_driver_01");
  const [dispatchVehicle, setDispatchVehicle] = useState("UP 25 SW 1001");
  const [dispatchedJarsList, setDispatchedJarsList] = useState<string[]>([]);
  const [dispatchScannerOpen, setDispatchScannerOpen] = useState(false);
  const [manualJarInput, setManualJarInput] = useState("");
  const [isDispatching, setIsDispatching] = useState(false);

  // Settlement Modal State (Owner Delivery Approval & Settlement)
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [selectedOrderForSettle, setSelectedOrderForSettle] = useState<any>(null);
  const [undeliveredJarsList, setUndeliveredJarsList] = useState<string[]>([]);
  const [manualUndeliveredInput, setManualUndeliveredInput] = useState("");
  const [settleScannerOpen, setSettleScannerOpen] = useState(false);
  const [settleCashCollected, setSettleCashCollected] = useState("0");
  const [isSettling, setIsSettling] = useState(false);

  // Load Only Bulk & Event Orders (Excluding Daily Recurring Runs)
  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/orders?bulk=true").then((r) => r.json()),
      fetch("/api/customers").then((r) => r.json()),
      fetch("/api/jars").then((r) => r.json()),
    ])
      .then(([ordData, custData, jarsData]) => {
        setOrders(ordData.orders || []);
        setCustomers(custData.customers || []);
        setAvailableJars((jarsData.jars || []).filter((j: any) => j.currentStatus === "AVAILABLE"));
        if (custData.customers?.length > 0 && !selectedCustomerId) {
          const first = custData.customers[0];
          setSelectedCustomerId(first.id);
          const rate = Math.round((first.pricePerJarPaise ?? first.customPrice?.pricePerJarPaise ?? 3500) / 100);
          setRatePerJarRupees(rate.toString());
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load orders:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  // Submit New Bulk Order Booking
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload: any = {
        orderType: "ONE_TIME_EVENT",
        quantityJars: Number(quantityJars),
        unitPricePaise: Math.round(Number(ratePerJarRupees) * 100),
        scheduledDate,
        eventName: eventName || "Bulk Event Order",
        depositAmountPaise: Math.round(Number(depositAmountRupees || 0) * 100),
      };

      if (useExistingCustomer) {
        payload.customerId = selectedCustomerId;
        const cust = customers.find((c) => c.id === selectedCustomerId);
        payload.addressId = cust?.addresses?.[0]?.id || "addr_001";
      } else {
        payload.customCustomerName = customCustomerName;
        payload.customCustomerPhone = customCustomerPhone;
        payload.venueAddress = venueAddress;
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setAddModalOpen(false);
        setCustomCustomerName("");
        setCustomCustomerPhone("");
        setVenueAddress("");
        setEventName("");
        loadData();
      }
    } catch (err) {
      console.error("Failed to create order:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Dispatch Modal for an order
  const handleOpenDispatch = (order?: any) => {
    const pendingOrders = orders.filter((o) => o.status === "CONFIRMED" || o.status === "DRAFT");
    const target = order || pendingOrders[0];
    if (!target) {
      alert("Koi pending bulk order nahi hai jisko dispatch kiya ja sake.");
      return;
    }
    setSelectedOrderForDispatch(target);
    setDispatchedJarsList([]);
    setManualJarInput("");
    setDispatchScannerOpen(false);
    setDispatchModalOpen(true);
  };

  // Add jar to dispatch list
  const handleAddJarToDispatch = (code: string) => {
    const clean = code.replace("urn:sw:j:", "").trim();
    if (!clean) return;
    if (dispatchedJarsList.includes(clean)) {
      alert(`⚠️ Jar '${clean}' already loaded list mein shamil hai!`);
      return;
    }
    setDispatchedJarsList((prev) => [...prev, clean]);
    setManualJarInput("");
  };

  // Auto-fill available jars for fast truck loading
  const handleAutoFillAvailableJars = () => {
    if (!selectedOrderForDispatch) return;
    const needed = selectedOrderForDispatch.quantityJars || 1;
    const availableCodes = availableJars.map((j) => j.permanentJarCode).filter((c) => !dispatchedJarsList.includes(c));

    if (availableCodes.length === 0) {
      alert("Warehouse mein koi AVAILABLE status ka jar nahi mila.");
      return;
    }

    const toAdd = availableCodes.slice(0, Math.max(0, needed - dispatchedJarsList.length));
    setDispatchedJarsList((prev) => [...prev, ...toAdd]);
  };

  // Submit Bulk Dispatch (Owner Warehouse Side)
  const handleConfirmDispatch = async () => {
    if (!selectedOrderForDispatch || dispatchedJarsList.length === 0) {
      alert("Kripya kam se kam 1 jar scan karein dispatch karne ke liye.");
      return;
    }

    setIsDispatching(true);
    try {
      const res = await fetch("/api/orders/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrderForDispatch.id,
          driverId: dispatchDriverId,
          vehicleNumber: dispatchVehicle,
          jarCodes: dispatchedJarsList,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setDispatchModalOpen(false);
        loadData();
      } else {
        alert(data.error || "Dispatch failed");
      }
    } catch (e: any) {
      alert(e.message || "Network error dispatching order");
    } finally {
      setIsDispatching(false);
    }
  };

  // Open Owner Settlement Modal (Dual Approval Power)
  const handleOpenSettle = (order: any) => {
    setSelectedOrderForSettle(order);
    setUndeliveredJarsList([]);
    setManualUndeliveredInput("");
    setSettleScannerOpen(false);
    setSettleCashCollected((order.totalAmountPaise / 100).toString());
    setSettleModalOpen(true);
  };

  // Add undelivered/rejected jar
  const handleAddUndeliveredJar = (code: string) => {
    const clean = code.replace("urn:sw:j:", "").trim();
    if (!clean) return;
    if (undeliveredJarsList.includes(clean)) {
      alert(`⚠️ Jar '${clean}' already undelivered list mein shamil hai!`);
      return;
    }
    setUndeliveredJarsList((prev) => [...prev, clean]);
    setManualUndeliveredInput("");
  };

  // Submit Settlement / Approval
  const handleConfirmSettle = async () => {
    if (!selectedOrderForSettle) return;

    setIsSettling(true);
    try {
      const res = await fetch("/api/orders/deliver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrderForSettle.id,
          undeliveredJarCodes: undeliveredJarsList,
          cashCollectedPaise: Math.round(Number(settleCashCollected || 0) * 100),
          approvedBy: "usr_owner_01",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSettleModalOpen(false);
        loadData();
      } else {
        alert(data.error || "Settlement failed");
      }
    } catch (e: any) {
      alert(e.message || "Network error settling delivery");
    } finally {
      setIsSettling(false);
    }
  };

  // Counts for status tabs
  const allCount = orders.length;
  const pendingCount = orders.filter((o) => o.status === "CONFIRMED" || o.status === "DRAFT").length;
  const inTransitCount = orders.filter((o) => o.status === "IN_TRANSIT" || o.status === "DISPATCHED").length;
  const deliveredCount = orders.filter((o) => o.status === "DELIVERED").length;

  const filteredOrders = orders.filter((o) => {
    const matchesStatus =
      statusFilter === "ALL"
        ? true
        : statusFilter === "CONFIRMED"
        ? o.status === "CONFIRMED" || o.status === "DRAFT"
        : statusFilter === "IN_TRANSIT"
        ? o.status === "IN_TRANSIT" || o.status === "DISPATCHED"
        : o.status === "DELIVERED";

    const matchesSearch =
      searchTerm === "" ||
      o.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.eventName?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200 uppercase tracking-wider">
              Bulk & Event Logistics Hub
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Dispatch & Reverse Settlement Active
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Event & Bulk Orders Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage weddings, bulk functions, vehicle dispatch loading, and doorstep delivery settlements
          </p>
        </div>

        {/* Dual Actions: Dispatch Order & Book Order */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={() => handleOpenDispatch()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
          >
            <Truck className="w-4 h-4" />
            <span>Dispatch Bulk Order</span>
          </button>

          <button
            onClick={() => {
              setUseExistingCustomer(false);
              setAddModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Book Event / Bulk Order</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 justify-between items-center">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto w-full md:w-auto">
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === "ALL" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Bookings ({allCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("CONFIRMED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === "CONFIRMED"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Pending Dispatch ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("IN_TRANSIT")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === "IN_TRANSIT"
                ? "bg-purple-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            In-Transit / Truck Loaded ({inTransitCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("DELIVERED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === "DELIVERED"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Delivered ({deliveredCount})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search Order #, Event Name, Customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOrders.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200 p-6">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-700 text-sm">No bulk orders found</h3>
            <p className="text-xs text-slate-500 mt-1">
              {statusFilter === "CONFIRMED"
                ? "No pending bulk orders waiting for dispatch."
                : statusFilter === "IN_TRANSIT"
                ? "No bulk orders currently in transit on vehicles."
                : "Book a new event order using the button above."}
            </p>
          </div>
        ) : (
          filteredOrders.map((ord) => {
            const isPending = ord.status === "CONFIRMED" || ord.status === "DRAFT";
            const isInTransit = ord.status === "IN_TRANSIT" || ord.status === "DISPATCHED";
            const isDelivered = ord.status === "DELIVERED";

            return (
              <div
                key={ord.id}
                className={`bg-white rounded-2xl border p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
                  isInTransit
                    ? "border-purple-300 ring-1 ring-purple-200"
                    : isPending
                    ? "border-amber-200"
                    : "border-slate-200"
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          {ord.orderNumber}
                        </span>
                        {ord.eventName && (
                          <span className="text-[10px] font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200 truncate max-w-40">
                            {ord.eventName}
                          </span>
                        )}
                      </div>
                      <h3 className="font-black text-slate-900 text-base mt-1.5">{ord.customerName}</h3>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase shrink-0 ${
                        isInTransit
                          ? "bg-purple-100 text-purple-800 animate-pulse"
                          : isPending
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {isInTransit ? "IN TRANSIT (ON TRUCK)" : ord.status}
                    </span>
                  </div>

                  {/* Card Details */}
                  <div className="py-3 space-y-1.5 text-xs text-slate-600">
                    <p className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        Date: <strong>{ord.scheduledDate}</strong>
                      </span>
                    </p>
                    <p className="flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="truncate">
                        {ord.streetAddress}, {ord.locality}
                      </span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{ord.customerPhone}</span>
                    </p>
                    {isInTransit && (
                      <p className="flex items-center gap-1.5 text-purple-700 font-bold bg-purple-50 p-1.5 rounded-lg border border-purple-100">
                        <Truck className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          Driver: {ord.assignedDriverName || "Vikram Singh"} ({ord.vehicleNumber || "UP 25 SW 1001"})
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Jars & Amount Summary */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs mb-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">
                        {isInTransit ? "Dispatched" : isDelivered ? "Delivered" : "Target"}
                      </span>
                      <span className="text-sm font-black text-slate-900">
                        {ord.deliveredCount ?? ord.quantityJars} Jars
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Amount</span>
                      <span className="text-sm font-black text-slate-900">{formatINR(ord.totalAmountPaise)}</span>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  {isPending && (
                    <button
                      type="button"
                      onClick={() => handleOpenDispatch(ord)}
                      className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Truck className="w-4 h-4" />
                      <span>Dispatch Jars for Order</span>
                    </button>
                  )}

                  {isInTransit && (
                    <button
                      type="button"
                      onClick={() => handleOpenSettle(ord)}
                      className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <CheckCheck className="w-4 h-4" />
                      <span>Settle & Approve Delivery (Owner)</span>
                    </button>
                  )}

                  {isDelivered && (
                    <div className="w-full py-2 text-center text-xs font-bold text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-200">
                      ✓ Successfully Delivered & Invoiced
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: BOOK EVENT / BULK ORDER */}
      {/* ========================================================================= */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <div>
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                  New Bulk Booking
                </span>
                <h3 className="text-base font-black text-slate-900">Book Event / Bulk Order</h3>
              </div>
              <button onClick={() => setAddModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-3.5">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-slate-700">Select pre-registered customer?</span>
                <input
                  type="checkbox"
                  checked={useExistingCustomer}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setUseExistingCustomer(checked);
                    if (checked && selectedCustomerId) {
                      const cust = customers.find((c) => c.id === selectedCustomerId);
                      if (cust) {
                        const rate = Math.round(
                          (cust.pricePerJarPaise ?? cust.customPrice?.pricePerJarPaise ?? 3500) / 100
                        );
                        setRatePerJarRupees(rate.toString());
                      }
                    }
                  }}
                  className="w-4 h-4 rounded text-amber-600 cursor-pointer"
                />
              </div>

              {!useExistingCustomer ? (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Customer / Host Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Verma Family / Royal Banquet"
                      value={customCustomerName}
                      onChange={(e) => setCustomCustomerName(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Contact Mobile Number *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 9811223344"
                      value={customCustomerPhone}
                      onChange={(e) => setCustomCustomerPhone(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Delivery Venue / Address *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Hotel Anand Lawn, Rampur Garden"
                      value={venueAddress}
                      onChange={(e) => setVenueAddress(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Choose Customer:</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setSelectedCustomerId(newId);
                      const cust = customers.find((c) => c.id === newId);
                      if (cust) {
                        const rate = Math.round(
                          (cust.pricePerJarPaise ?? cust.customPrice?.pricePerJarPaise ?? 3500) / 100
                        );
                        setRatePerJarRupees(rate.toString());
                      }
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName} ({c.customerCode})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Event Occasion / Name</label>
                <input
                  type="text"
                  placeholder="e.g. Wedding Reception, Birthday Party"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Quantity (Jars) *</label>
                  <input
                    type="number"
                    min="1"
                    value={quantityJars}
                    onChange={(e) => setQuantityJars(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-black text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Rate (₹ / Jar) *</label>
                  <input
                    type="number"
                    value={ratePerJarRupees}
                    onChange={(e) => setRatePerJarRupees(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-black text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Delivery Date *</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Security Deposit (₹)</label>
                  <input
                    type="number"
                    value={depositAmountRupees}
                    onChange={(e) => setDepositAmountRupees(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-black text-amber-700"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {isSubmitting ? "Booking..." : "Confirm Event Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: BULK ORDER DISPATCH HUB (OWNER WAREHOUSE LOADING) */}
      {/* ========================================================================= */}
      {dispatchModalOpen && selectedOrderForDispatch && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-indigo-200 max-h-[92vh] overflow-y-auto space-y-4">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-indigo-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                    Warehouse Loading Hub
                  </span>
                  <h3 className="text-base font-black text-slate-900">Dispatch Bulk Order</h3>
                </div>
              </div>
              <button
                onClick={() => setDispatchModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step 1: Select Order Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Select Pending Bulk Order:</label>
              <select
                value={selectedOrderForDispatch.id}
                onChange={(e) => {
                  const target = orders.find((o) => o.id === e.target.value);
                  if (target) {
                    setSelectedOrderForDispatch(target);
                    setDispatchedJarsList([]);
                  }
                }}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-slate-50"
              >
                {orders
                  .filter((o) => o.status === "CONFIRMED" || o.status === "DRAFT")
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.orderNumber} • {o.eventName || o.customerName} ({o.quantityJars} Jars) - {o.streetAddress}
                    </option>
                  ))}
              </select>
            </div>

            {/* Selected Order Overview Card */}
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-xs space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-md">
                    {selectedOrderForDispatch.orderNumber}
                  </span>
                  <h4 className="font-black text-slate-900 text-sm mt-1">
                    {selectedOrderForDispatch.eventName || selectedOrderForDispatch.customerName}
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {selectedOrderForDispatch.streetAddress}, {selectedOrderForDispatch.locality} • 📞{" "}
                    {selectedOrderForDispatch.customerPhone}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-indigo-800 uppercase block">Required Jars</span>
                  <span className="text-lg font-black text-indigo-900">
                    {selectedOrderForDispatch.quantityJars} Jars
                  </span>
                </div>
              </div>

              {/* Driver & Vehicle Allocation */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-indigo-100/80">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Assigned Driver</label>
                  <select
                    value={dispatchDriverId}
                    onChange={(e) => {
                      setDispatchDriverId(e.target.value);
                      setDispatchVehicle(e.target.value === "usr_driver_02" ? "UP 25 SW 1002" : "UP 25 SW 1001");
                    }}
                    className="w-full p-1.5 rounded-lg border border-indigo-200 text-xs font-semibold bg-white"
                  >
                    <option value="usr_driver_01">Vikram Singh (Driver 1)</option>
                    <option value="usr_driver_02">Ramesh Kumar (Driver 2)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Vehicle Number</label>
                  <input
                    type="text"
                    value={dispatchVehicle}
                    onChange={(e) => setDispatchVehicle(e.target.value)}
                    className="w-full p-1.5 rounded-lg border border-indigo-200 text-xs font-semibold bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Jar Loading & Scanner Section */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800">Scanned & Loaded onto Vehicle:</span>
                  <span className="text-[11px] text-slate-500 block">
                    Target: {selectedOrderForDispatch.quantityJars} Jars
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-xl text-xs font-black ${
                      dispatchedJarsList.length >= selectedOrderForDispatch.quantityJars
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : "bg-amber-100 text-amber-800 border border-amber-300"
                    }`}
                  >
                    {dispatchedJarsList.length} / {selectedOrderForDispatch.quantityJars} Jars
                  </span>

                  {/* Auto-fill button for fast warehouse loading */}
                  <button
                    type="button"
                    onClick={handleAutoFillAvailableJars}
                    title="Auto-fill available jars from warehouse stock"
                    className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Auto-Fill</span>
                  </button>
                </div>
              </div>

              {/* Scanner Toggle Button */}
              <button
                type="button"
                onClick={() => setDispatchScannerOpen(!dispatchScannerOpen)}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <QrCode className="w-4 h-4" />
                <span>{dispatchScannerOpen ? "Close Camera Scanner" : "Open Camera Scanner (Scan Jars)"}</span>
              </button>

              {/* Embedded Camera Scanner */}
              {dispatchScannerOpen && (
                <div className="p-2 bg-slate-900 rounded-2xl">
                  <QrCameraScanner
                    embedded={true}
                    title="Scanning 20L Water Jars"
                    subtitle="Align Jar QR inside frame"
                    helperText="Scan each jar as loaded on vehicle"
                    onClose={() => setDispatchScannerOpen(false)}
                    onScanSuccess={(code) => handleAddJarToDispatch(code)}
                    onManualSubmit={(code) => handleAddJarToDispatch(code)}
                  />
                </div>
              )}

              {/* Manual Barcode / Gun Scanner Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Scan with handheld gun or enter code (e.g. JAR-20L-0012)..."
                  value={manualJarInput}
                  onChange={(e) => setManualJarInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddJarToDispatch(manualJarInput);
                    }
                  }}
                  className="flex-1 p-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => handleAddJarToDispatch(manualJarInput)}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  Add Jar
                </button>
              </div>

              {/* Loaded Jars List */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl max-h-40 overflow-y-auto">
                <div className="flex flex-wrap gap-1.5">
                  {dispatchedJarsList.map((code, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[11px] font-mono font-bold text-slate-800 shadow-2xs"
                    >
                      <span>{code}</span>
                      <button
                        type="button"
                        onClick={() => setDispatchedJarsList((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-rose-400 hover:text-rose-700 p-0.5 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {dispatchedJarsList.length === 0 && (
                    <span className="text-xs text-slate-400 italic">
                      Koi jar abhi scan nahi hua. Camera ya manual input se jars add karein.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Step 3: Confirm Dispatch Button */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDispatchModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDispatch}
                disabled={isDispatching || dispatchedJarsList.length === 0}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Truck className="w-4 h-4" />
                <span>
                  {isDispatching
                    ? "Dispatching..."
                    : `Confirm Dispatch & In-Transit (${dispatchedJarsList.length} Jars Loaded)`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: OWNER SETTLEMENT & DELIVERY APPROVAL (WEB ERP) */}
      {/* ========================================================================= */}
      {settleModalOpen && selectedOrderForSettle && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-emerald-200 max-h-[92vh] overflow-y-auto space-y-4">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-emerald-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                    Owner Delivery Settlement
                  </span>
                  <h3 className="text-base font-black text-slate-900">Approve & Settle Bulk Delivery</h3>
                </div>
              </div>
              <button
                onClick={() => setSettleModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Order Overview */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1.5">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                    {selectedOrderForSettle.orderNumber}
                  </span>
                  <h4 className="font-black text-slate-900 text-sm mt-1">
                    {selectedOrderForSettle.eventName || selectedOrderForSettle.customerName}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {selectedOrderForSettle.streetAddress} • Rate: {formatINR(selectedOrderForSettle.unitPricePaise)}/Jar
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Dispatched</span>
                  <span className="text-base font-black text-purple-700">
                    {selectedOrderForSettle.dispatchedJars?.length || selectedOrderForSettle.quantityJars} Jars
                  </span>
                </div>
              </div>
            </div>

            {/* The Reverse Undelivered Workflow ("Ulta Scene") */}
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs space-y-2">
              <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                <RotateCcw className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Reverse Undelivered Scan (Ulta Scene):</span>
              </div>
              <p className="text-[11px] text-amber-800 font-medium">
                Customer ne jitne jars wapas kiye/reject kiye sirf unhe scan karein. Baki sabhi jars automatically
                delivered count honge.
              </p>

              {/* Undelivered Counter & Controls */}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Scan rejected jar code (e.g. JAR-20L-0012)..."
                  value={manualUndeliveredInput}
                  onChange={(e) => setManualUndeliveredInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddUndeliveredJar(manualUndeliveredInput);
                    }
                  }}
                  className="flex-1 p-2 rounded-xl border border-amber-200 text-xs font-mono font-bold bg-white"
                />
                <button
                  type="button"
                  onClick={() => handleAddUndeliveredJar(manualUndeliveredInput)}
                  className="px-3 py-2 bg-amber-800 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  Reject Jar (+1)
                </button>
              </div>

              {/* Undelivered Jars List */}
              {undeliveredJarsList.length > 0 && (
                <div className="flex flex-wrap gap-1 p-2 bg-white rounded-xl border border-amber-200">
                  {undeliveredJarsList.map((code, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 border border-rose-200 text-[10px] font-mono font-bold text-rose-800"
                    >
                      <span>{code}</span>
                      <button
                        type="button"
                        onClick={() => setUndeliveredJarsList((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-rose-500 hover:text-rose-800 p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Live Settlement Calculations */}
            {(() => {
              const totalDispatched =
                selectedOrderForSettle.dispatchedJars?.length || selectedOrderForSettle.quantityJars || 1;
              const undeliveredCount = undeliveredJarsList.length;
              const acceptedDelivered = Math.max(0, totalDispatched - undeliveredCount);
              const unitRate = selectedOrderForSettle.unitPricePaise / 100;
              const billAmount = acceptedDelivered * unitRate;

              return (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Dispatched</span>
                      <span className="font-black text-slate-900 text-sm">{totalDispatched} Jars</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-rose-600 uppercase block">Undelivered</span>
                      <span className="font-black text-rose-700 text-sm">-{undeliveredCount} Jars</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-emerald-700 uppercase block">Accepted</span>
                      <span className="font-black text-emerald-700 text-base">{acceptedDelivered} Jars</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Cash Collected at Venue (₹):
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        value={settleCashCollected}
                        onChange={(e) => setSettleCashCollected(e.target.value)}
                        className="w-full pl-7 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-black text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Calculated Bill: <strong>₹{billAmount}</strong> ({acceptedDelivered} Jars @ ₹{unitRate})
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setSettleModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmSettle}
                      disabled={isSettling}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCheck className="w-4 h-4" />
                      <span>
                        {isSettling
                          ? "Approving..."
                          : `Approve Delivery (${acceptedDelivered} Jars Accepted • ₹${billAmount})`}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
