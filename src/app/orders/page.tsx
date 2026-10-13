"use client";

import { useEffect, useState, useMemo } from "react";
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
  Edit3,
  Filter,
  RefreshCw,
  Eye,
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
  const [ratePerJarRupees, setRatePerJarRupees] = useState("20");
  const [depositAmountRupees, setDepositAmountRupees] = useState("0");
  const [scheduledDate, setScheduledDate] = useState(getTodayIST());
  const [paymentType, setPaymentType] = useState<"PAY_ON_DELIVERY" | "PARTIAL_ADVANCE" | "PREPAID">("PAY_ON_DELIVERY");
  const [advanceReceivedRupees, setAdvanceReceivedRupees] = useState("");
  const [advancePaymentMode, setAdvancePaymentMode] = useState<"CASH" | "BANK">("CASH");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dispatch Modal State (Owner Warehouse Dispatch)
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [selectedOrderForDispatch, setSelectedOrderForDispatch] = useState<any>(null);
  const [dispatchDriverId, setDispatchDriverId] = useState("usr_driver_01");
  const [dispatchVehicle, setDispatchVehicle] = useState("UP 25 SW 1001");
  const [activeDriversList, setActiveDriversList] = useState<any[]>([]);
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

  // Month Filter State
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [editEventName, setEditEventName] = useState("");
  const [editScheduledDate, setEditScheduledDate] = useState("");
  const [editQuantityJars, setEditQuantityJars] = useState("1");
  const [editRatePerJarRupees, setEditRatePerJarRupees] = useState("20");
  const [editStreetAddress, setEditStreetAddress] = useState("");
  const [editLocality, setEditLocality] = useState("");
  const [editContactPerson, setEditContactPerson] = useState("");
  const [editContactPhone, setEditContactPhone] = useState("");
  const [editDeliveryNotes, setEditDeliveryNotes] = useState("");
  const [editPaymentType, setEditPaymentType] = useState<"PAY_ON_DELIVERY" | "PARTIAL_ADVANCE" | "PREPAID">("PAY_ON_DELIVERY");
  const [editAdvanceReceivedRupees, setEditAdvanceReceivedRupees] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Delete Modal State (with random verification code)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<any>(null);
  const [deleteConfirmationCode, setDeleteConfirmationCode] = useState("");
  const [userInputCode, setUserInputCode] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Inspect Modal State
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [inspectingOrder, setInspectingOrder] = useState<any>(null);

  // Load Only Bulk & Event Orders (Excluding Daily Recurring Runs)
  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/orders?bulk=true").then((r) => r.json()),
      fetch("/api/customers").then((r) => r.json()),
      fetch("/api/jars").then((r) => r.json()),
      fetch("/api/drivers?activeOnly=true").then((r) => r.json()).catch(() => ({ drivers: [] })),
    ])
      .then(([ordData, custData, jarsData, driversData]) => {
        setOrders(ordData.orders || []);
        setCustomers(custData.customers || []);
        setAvailableJars((jarsData.jars || []).filter((j: any) => j.currentStatus === "AVAILABLE"));
        if (driversData?.drivers?.length > 0) {
          setActiveDriversList(driversData.drivers);
          setDispatchDriverId(driversData.drivers[0].id);
        }
        if (custData.customers?.length > 0 && !selectedCustomerId) {
          const first = custData.customers[0];
          setSelectedCustomerId(first.id);
          const rate = Math.round((first.pricePerJarPaise ?? first.customPrice?.pricePerJarPaise ?? 2000) / 100);
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
      const totalBillRupees = Number(quantityJars || 0) * Number(ratePerJarRupees || 0);
      let advancePaise = 0;
      if (paymentType === "PREPAID") {
        advancePaise = totalBillRupees * 100;
      } else if (paymentType === "PARTIAL_ADVANCE") {
        advancePaise = Math.round(Number(advanceReceivedRupees || 0) * 100);
      }

      const payload: any = {
        orderType: "ONE_TIME_EVENT",
        quantityJars: Number(quantityJars),
        unitPricePaise: Math.round(Number(ratePerJarRupees) * 100),
        scheduledDate,
        eventName: eventName || "Bulk Event Order",
        depositAmountPaise: Math.round(Number(depositAmountRupees || 0) * 100),
        paymentType,
        advancePaymentMode,
        advanceReceivedPaise: advancePaise,
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

      const data = await res.json();
      if (res.ok) {
        setAddModalOpen(false);
        setCustomCustomerName("");
        setCustomCustomerPhone("");
        setVenueAddress("");
        setEventName("");
        setPaymentType("PAY_ON_DELIVERY");
        setAdvanceReceivedRupees("");
        setAdvancePaymentMode("CASH");
        setDepositAmountRupees("0");
        loadData();
      } else {
        alert(data.error || "Event order create nahi ho saka. Kripya details check karein.");
      }
    } catch (err: any) {
      console.error("Failed to create order:", err);
      alert(err.message || "Network error booking order");
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

  // Open Edit Order Modal
  const handleOpenEdit = (ord: any) => {
    setEditingOrder(ord);
    setEditEventName(ord.eventName || "");
    setEditScheduledDate(ord.scheduledDate || getTodayIST());
    setEditQuantityJars((ord.quantityJars || 1).toString());
    const rate = Math.round((ord.unitPricePaise || 2000) / 100);
    setEditRatePerJarRupees(rate.toString());
    setEditStreetAddress(ord.streetAddress || "");
    setEditLocality(ord.locality || "Bareilly");
    setEditContactPerson(ord.venueContactPerson || ord.customerName || "");
    setEditContactPhone(ord.venueContactPhone || ord.customerPhone || "");
    setEditDeliveryNotes(
      typeof ord.deliveryNotes === "string" && !ord.deliveryNotes.startsWith("{") ? ord.deliveryNotes : ""
    );
    setEditPaymentType(ord.paymentType || "PAY_ON_DELIVERY");
    setEditAdvanceReceivedRupees(
      ord.advanceReceivedPaise ? Math.round(ord.advanceReceivedPaise / 100).toString() : ""
    );
    setEditModalOpen(true);
  };

  // Submit Edit Order
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    setIsEditing(true);
    try {
      const editTotalRupees = Number(editQuantityJars || 0) * Number(editRatePerJarRupees || 0);
      let editAdvancePaise = 0;
      if (editPaymentType === "PREPAID") {
        editAdvancePaise = editTotalRupees * 100;
      } else if (editPaymentType === "PARTIAL_ADVANCE") {
        editAdvancePaise = Math.round(Number(editAdvanceReceivedRupees || 0) * 100);
      }

      const res = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: editingOrder.id,
          eventName: editEventName,
          scheduledDate: editScheduledDate,
          quantityJars: Number(editQuantityJars),
          unitPricePaise: Math.round(Number(editRatePerJarRupees) * 100),
          streetAddress: editStreetAddress,
          locality: editLocality,
          venueContactPerson: editContactPerson,
          venueContactPhone: editContactPhone,
          deliveryNotes: editDeliveryNotes,
          paymentType: editPaymentType,
          advanceReceivedPaise: editAdvancePaise,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setEditModalOpen(false);
        setEditingOrder(null);
        loadData();
      } else {
        alert(data.error || "Failed to update order");
      }
    } catch (err: any) {
      alert(err.message || "Network error updating order");
    } finally {
      setIsEditing(false);
    }
  };

  // Open Delete Order Modal (with random confirmation code)
  const handleOpenDelete = (ord: any) => {
    setOrderToDelete(ord);
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setDeleteConfirmationCode(code);
    setUserInputCode("");
    setDeleteModalOpen(true);
  };

  // Confirm Delete Order
  const handleConfirmDelete = async () => {
    if (!orderToDelete) return;
    if (userInputCode.trim().toUpperCase() !== deleteConfirmationCode.toUpperCase()) {
      alert("Verification code mismatch! Please type the exact code.");
      return;
    }
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/orders?orderId=${encodeURIComponent(orderToDelete.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setDeleteModalOpen(false);
        setOrderToDelete(null);
        loadData();
      } else {
        alert(data.error || "Failed to delete order");
      }
    } catch (err: any) {
      alert(err.message || "Network error deleting order");
    } finally {
      setIsDeleting(false);
    }
  };

  // Open Inspect Order Modal
  const handleOpenInspect = (ord: any) => {
    setInspectingOrder(ord);
    setInspectModalOpen(true);
  };

  // Available months from orders for month filter
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      if (o.scheduledDate && o.scheduledDate.length >= 7) {
        set.add(o.scheduledDate.substring(0, 7));
      }
    });
    return Array.from(set).sort().reverse();
  }, [orders]);

  const formatMonthLabel = (m: string) => {
    try {
      const [y, mo] = m.split("-");
      const d = new Date(Number(y), Number(mo) - 1, 1);
      return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
    } catch (e) {
      return m;
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

    const matchesMonth =
      selectedMonth === "ALL" || (o.scheduledDate && o.scheduledDate.startsWith(selectedMonth));

    const matchesSearch =
      searchTerm === "" ||
      o.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.eventName?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesMonth && matchesSearch;
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

      {/* Month Filter Bar & Selected Month Summary */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 justify-between items-center">
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mr-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Month:</span>
          </div>

          <button
            type="button"
            onClick={() => setSelectedMonth("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedMonth === "ALL"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            All Months
          </button>

          {availableMonths.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setSelectedMonth(m)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedMonth === m
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              {formatMonthLabel(m)}
            </button>
          ))}

          {/* Native Month Picker */}
          <input
            type="month"
            value={selectedMonth === "ALL" ? "" : selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value || "ALL")}
            className="px-2.5 py-1 text-xs border border-slate-200 rounded-xl font-bold text-slate-700 bg-white"
          />
        </div>

        {/* Live Filter Stats */}
        <div className="flex items-center gap-3 text-xs bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shrink-0">
          <span className="text-slate-600 font-medium">
            Orders: <strong className="text-slate-900">{filteredOrders.length}</strong>
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-600 font-medium">
            Jars: <strong className="text-sky-700">{filteredOrders.reduce((sum, o) => sum + (o.deliveredCount ?? o.quantityJars ?? 0), 0)}</strong>
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-emerald-700 font-black">
            {formatINR(filteredOrders.reduce((sum, o) => sum + (o.totalAmountPaise || 0), 0))}
          </span>
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
                      <span className="text-[11px] font-bold text-sky-700 block mt-0.5">
                        Rate: ₹{Math.round((ord.unitPricePaise || 2000) / 100)}/jar
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Amount</span>
                      <span className="text-sm font-black text-slate-900">{formatINR(ord.totalAmountPaise)}</span>
                      {ord.paymentType === "PREPAID" ? (
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded block mt-0.5">
                          💳 100% Prepaid (Collect ₹0)
                        </span>
                      ) : ord.paymentType === "PARTIAL_ADVANCE" ? (
                        <span className="text-[10px] font-black text-purple-700 bg-purple-100/80 px-1.5 py-0.5 rounded block mt-0.5">
                          Adv: ₹{Math.round((ord.advanceReceivedPaise || 0) / 100)} • Due: ₹{Math.round((ord.balanceDuePaise || 0) / 100)}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500 block mt-0.5">
                          💵 Pay on Delivery
                        </span>
                      )}
                      {ord.depositAmountPaise > 0 && (
                        <span className="text-[10px] text-amber-700 font-bold block mt-0.5">
                          Deposit: {formatINR(ord.depositAmountPaise)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                  {/* Primary Workflow Button */}
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
                    <div className="w-full py-2 px-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs font-bold text-emerald-800">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Delivered & Invoiced</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenInspect(ord)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black rounded-lg text-[11px] shadow-xs cursor-pointer flex items-center gap-1 transition-all"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect Order</span>
                      </button>
                    </div>
                  )}

                  {/* Secondary Management Buttons: Inspect, Edit & Delete */}
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenInspect(ord)}
                      className="py-1.5 px-2 rounded-xl border border-sky-200 bg-sky-50/70 hover:bg-sky-100 text-sky-800 font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-sky-600" />
                      <span>Inspect</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(ord)}
                      className="py-1.5 px-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenDelete(ord)}
                      className="py-1.5 px-2 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100/80 text-rose-700 font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Delete</span>
                    </button>
                  </div>
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

              {/* Delivery Date & Security Deposit placed high up to ensure native calendar never clips */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Delivery Date *</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Security Deposit (₹)</label>
                  <input
                    type="number"
                    value={depositAmountRupees}
                    onChange={(e) => setDepositAmountRupees(e.target.value)}
                    placeholder="0"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-black text-slate-800 bg-white"
                  />
                </div>
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

              {/* Payment Type Selection */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                <label className="text-xs font-bold text-slate-800 block">Payment Terms / Settlement *</label>
                <div className="grid grid-cols-3 gap-2">
                  <label
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center cursor-pointer transition-all ${
                      paymentType === "PAY_ON_DELIVERY"
                        ? "bg-sky-50 border-sky-400 text-sky-950 font-black shadow-2xs"
                        : "bg-white border-slate-200 text-slate-600 font-semibold hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentType"
                      value="PAY_ON_DELIVERY"
                      checked={paymentType === "PAY_ON_DELIVERY"}
                      onChange={() => setPaymentType("PAY_ON_DELIVERY")}
                      className="sr-only"
                    />
                    <span className="text-xs">💵 Pay on Delivery</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">Full Driver Collection</span>
                  </label>

                  <label
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center cursor-pointer transition-all ${
                      paymentType === "PARTIAL_ADVANCE"
                        ? "bg-purple-50 border-purple-400 text-purple-950 font-black shadow-2xs"
                        : "bg-white border-slate-200 text-slate-600 font-semibold hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentType"
                      value="PARTIAL_ADVANCE"
                      checked={paymentType === "PARTIAL_ADVANCE"}
                      onChange={() => setPaymentType("PARTIAL_ADVANCE")}
                      className="sr-only"
                    />
                    <span className="text-xs">🟡 Advance Received</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">Partial Paid Upfront</span>
                  </label>

                  <label
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center cursor-pointer transition-all ${
                      paymentType === "PREPAID"
                        ? "bg-emerald-50 border-emerald-400 text-emerald-950 font-black shadow-2xs"
                        : "bg-white border-slate-200 text-slate-600 font-semibold hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentType"
                      value="PREPAID"
                      checked={paymentType === "PREPAID"}
                      onChange={() => setPaymentType("PREPAID")}
                      className="sr-only"
                    />
                    <span className="text-xs">💳 100% Prepaid</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">Collect ₹0 Cash</span>
                  </label>
                </div>

                {/* Advance Amount Input if Partial */}
                {paymentType === "PARTIAL_ADVANCE" && (
                  <div className="pt-2 border-t border-slate-200 space-y-1.5">
                    <label className="text-[11px] font-bold text-purple-900 block">
                      Advance Amount Received from Customer (₹) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={Number(quantityJars || 0) * Number(ratePerJarRupees || 0)}
                      placeholder="e.g. 200"
                      value={advanceReceivedRupees}
                      onChange={(e) => setAdvanceReceivedRupees(e.target.value)}
                      className="w-full p-2 rounded-xl border border-purple-300 bg-white text-xs font-black text-purple-950 focus:outline-hidden focus:ring-2 focus:ring-purple-400"
                      required
                    />
                  </div>
                )}

                {/* Advance Payment Accounting Mode (Cash vs Bank/UPI) */}
                {(paymentType === "PARTIAL_ADVANCE" || paymentType === "PREPAID") && (
                  <div className="pt-2 border-t border-slate-200 space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 block">
                      Payment Account for Advance (GL Journal Entry) *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAdvancePaymentMode("CASH")}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center transition-all cursor-pointer ${
                          advancePaymentMode === "CASH"
                            ? "bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span className="flex items-center gap-1">💵 Cash in Hand</span>
                        <span className="text-[10px] text-emerald-700 font-semibold">Dr. A/C 1110 (Central Vault)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAdvancePaymentMode("BANK")}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center transition-all cursor-pointer ${
                          advancePaymentMode === "BANK"
                            ? "bg-sky-50 border-sky-500 text-sky-950 ring-2 ring-sky-500/20 shadow-xs"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span className="flex items-center gap-1">🏦 Bank / Online UPI</span>
                        <span className="text-[10px] text-sky-700 font-semibold">Dr. A/C 1130 (Bank Account)</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Live Financial Breakdown Summary */}
                {(() => {
                  const billTotal = Number(quantityJars || 0) * Number(ratePerJarRupees || 0);
                  const adv =
                    paymentType === "PREPAID"
                      ? billTotal
                      : paymentType === "PARTIAL_ADVANCE"
                      ? Number(advanceReceivedRupees || 0)
                      : 0;
                  const driverDue = Math.max(0, billTotal - adv);

                  return (
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between text-slate-600 font-medium">
                        <span>Total Water Bill:</span>
                        <span className="font-bold text-slate-900">₹{billTotal}</span>
                      </div>
                      {adv > 0 && (
                        <div className="flex items-center justify-between text-purple-700 font-medium">
                          <span>
                            Advance Received ({advancePaymentMode === "BANK" ? "Bank/UPI" : "Cash"}):
                          </span>
                          <span className="font-bold">- ₹{adv}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 font-black">
                        <span className="text-slate-700">Driver Doorstep Due:</span>
                        <span className={driverDue > 0 ? "text-sky-700 text-sm" : "text-emerald-700 text-sm"}>
                          {driverDue > 0 ? `₹${driverDue}` : "₹0 (Already Paid)"}
                        </span>
                      </div>
                    </div>
                  );
                })()}
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
                    {activeDriversList.length > 0 ? (
                      activeDriversList.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.fullName} ({d.phone})
                        </option>
                      ))
                    ) : (
                      <option value="usr_driver_01">Vikram Singh (Driver 1)</option>
                    )}
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

      {/* ========================================================================= */}
      {/* MODAL 4: EDIT BULK ORDER */}
      {/* ========================================================================= */}
      {editModalOpen && editingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Edit Order Details</h3>
                  <p className="text-xs text-slate-500 font-mono">{editingOrder.orderNumber}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Event / Function Name</label>
                <input
                  type="text"
                  value={editEventName}
                  onChange={(e) => setEditEventName(e.target.value)}
                  placeholder="e.g. Sharma Marriage Function"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Quantity of Jars</label>
                  <input
                    type="number"
                    min="1"
                    value={editQuantityJars}
                    onChange={(e) => setEditQuantityJars(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-black text-sky-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Rate per Jar (₹) <span className="text-emerald-600 font-black">*Fixed</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editRatePerJarRupees}
                    onChange={(e) => setEditRatePerJarRupees(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-black text-emerald-800"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between text-xs">
                <span className="text-emerald-800 font-bold">Calculated Order Total:</span>
                <span className="text-base font-black text-emerald-900">
                  ₹{Number(editQuantityJars || 0) * Number(editRatePerJarRupees || 0)}
                </span>
              </div>

              {/* Payment Type Selection in Edit */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                <label className="text-xs font-bold text-slate-800 block">Payment Terms / Settlement *</label>
                <div className="grid grid-cols-3 gap-2">
                  <label
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center cursor-pointer transition-all ${
                      editPaymentType === "PAY_ON_DELIVERY"
                        ? "bg-sky-50 border-sky-400 text-sky-950 font-black shadow-2xs"
                        : "bg-white border-slate-200 text-slate-600 font-semibold hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="editPaymentType"
                      value="PAY_ON_DELIVERY"
                      checked={editPaymentType === "PAY_ON_DELIVERY"}
                      onChange={() => setEditPaymentType("PAY_ON_DELIVERY")}
                      className="sr-only"
                    />
                    <span className="text-xs">💵 Pay on Delivery</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">Driver Collects Full</span>
                  </label>

                  <label
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center cursor-pointer transition-all ${
                      editPaymentType === "PARTIAL_ADVANCE"
                        ? "bg-purple-50 border-purple-400 text-purple-950 font-black shadow-2xs"
                        : "bg-white border-slate-200 text-slate-600 font-semibold hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="editPaymentType"
                      value="PARTIAL_ADVANCE"
                      checked={editPaymentType === "PARTIAL_ADVANCE"}
                      onChange={() => setEditPaymentType("PARTIAL_ADVANCE")}
                      className="sr-only"
                    />
                    <span className="text-xs">🟡 Advance Received</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">Partial Paid</span>
                  </label>

                  <label
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center cursor-pointer transition-all ${
                      editPaymentType === "PREPAID"
                        ? "bg-emerald-50 border-emerald-400 text-emerald-950 font-black shadow-2xs"
                        : "bg-white border-slate-200 text-slate-600 font-semibold hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="editPaymentType"
                      value="PREPAID"
                      checked={editPaymentType === "PREPAID"}
                      onChange={() => setEditPaymentType("PREPAID")}
                      className="sr-only"
                    />
                    <span className="text-xs">💳 100% Prepaid</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">Collect ₹0 Cash</span>
                  </label>
                </div>

                {editPaymentType === "PARTIAL_ADVANCE" && (
                  <div className="pt-2 border-t border-slate-200 space-y-1.5">
                    <label className="text-[11px] font-bold text-purple-900 block">
                      Advance Amount Received from Customer (₹) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={Number(editQuantityJars || 0) * Number(editRatePerJarRupees || 0)}
                      placeholder="e.g. 200"
                      value={editAdvanceReceivedRupees}
                      onChange={(e) => setEditAdvanceReceivedRupees(e.target.value)}
                      className="w-full p-2 rounded-xl border border-purple-300 bg-white text-xs font-black text-purple-950 focus:outline-hidden focus:ring-2 focus:ring-purple-400"
                      required
                    />
                  </div>
                )}

                {(() => {
                  const billTotal = Number(editQuantityJars || 0) * Number(editRatePerJarRupees || 0);
                  const adv =
                    editPaymentType === "PREPAID"
                      ? billTotal
                      : editPaymentType === "PARTIAL_ADVANCE"
                      ? Number(editAdvanceReceivedRupees || 0)
                      : 0;
                  const driverDue = Math.max(0, billTotal - adv);

                  return (
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between text-slate-600 font-medium">
                        <span>Total Water Bill:</span>
                        <span className="font-bold text-slate-900">₹{billTotal}</span>
                      </div>
                      {adv > 0 && (
                        <div className="flex items-center justify-between text-purple-700 font-medium">
                          <span>Advance Received Upfront:</span>
                          <span className="font-bold">- ₹{adv}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 font-black">
                        <span className="text-slate-700">Driver Doorstep Due:</span>
                        <span className={driverDue > 0 ? "text-sky-700 text-sm" : "text-emerald-700 text-sm"}>
                          {driverDue > 0 ? `₹${driverDue}` : "₹0 (Already Paid)"}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Scheduled Date</label>
                <input
                  type="date"
                  value={editScheduledDate}
                  onChange={(e) => setEditScheduledDate(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Venue / Delivery Address</label>
                <input
                  type="text"
                  value={editStreetAddress}
                  onChange={(e) => setEditStreetAddress(e.target.value)}
                  placeholder="Street address or venue landmark"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={editContactPerson}
                    onChange={(e) => setEditContactPerson(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={editContactPhone}
                    onChange={(e) => setEditContactPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Delivery Notes</label>
                <input
                  type="text"
                  value={editDeliveryNotes}
                  onChange={(e) => setEditDeliveryNotes(e.target.value)}
                  placeholder="Special instructions or notes"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditing}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isEditing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{isEditing ? "Saving Changes..." : "Save Order Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: DELETE ORDER CONFIRMATION (WITH RANDOM VERIFICATION CODE) */}
      {/* ========================================================================= */}
      {deleteModalOpen && orderToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Delete Order Permanently</h3>
                  <p className="text-xs text-rose-600 font-bold">Irreversible Action</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Warning Message */}
            <div className="p-3.5 bg-rose-50/80 border border-rose-200 rounded-2xl text-xs space-y-2 text-rose-950">
              <p className="font-bold">You are about to permanently delete this order:</p>
              <div className="p-2.5 bg-white rounded-xl border border-rose-200 space-y-0.5">
                <div className="font-black text-slate-900 text-sm">
                  {orderToDelete.orderNumber} • {orderToDelete.eventName || orderToDelete.customerName}
                </div>
                <div className="text-[11px] font-bold text-slate-600">
                  {orderToDelete.quantityJars} Jars • {formatINR(orderToDelete.totalAmountPaise)} • Date: {orderToDelete.scheduledDate}
                </div>
              </div>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-rose-800 font-medium">
                <li>All linked invoices, receipts, and order items will be permanently deleted.</li>
                <li>Delivery records and accounting journal entries will be cleaned up.</li>
                <li>
                  Any jars currently loaded/in-transit for this order will be safely released back to Plant stock as <strong>AVAILABLE</strong>.
                </li>
              </ul>
            </div>

            {/* Random Verification Code Box */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Type the verification code below to confirm deletion:
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

      {/* ========================================================================= */}
      {/* MODAL 6: INSPECT ORDER AUDIT & DETAILS MODAL */}
      {/* ========================================================================= */}
      {inspectModalOpen && inspectingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto border border-slate-200">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-sky-50 text-sky-700 rounded-2xl border border-sky-100">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-slate-900 text-amber-400">
                      {inspectingOrder.orderNumber}
                    </span>
                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        inspectingOrder.status === "DELIVERED"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : inspectingOrder.status === "IN_TRANSIT"
                          ? "bg-purple-100 text-purple-800 border border-purple-200 animate-pulse"
                          : "bg-amber-100 text-amber-800 border border-amber-200"
                      }`}
                    >
                      {inspectingOrder.status === "IN_TRANSIT" ? "IN TRANSIT (ON TRUCK)" : inspectingOrder.status}
                    </span>
                  </div>
                  <h3 className="font-black text-slate-900 text-base mt-1">
                    {inspectingOrder.eventName || inspectingOrder.customerName}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grid 1: Customer & Venue */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5 text-xs">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  Customer & Contact
                </span>
                <p className="font-black text-slate-900 text-sm">{inspectingOrder.customerName}</p>
                <p className="text-slate-600 font-mono flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <a href={`tel:${inspectingOrder.customerPhone}`} className="text-sky-700 hover:underline font-bold">
                    {inspectingOrder.customerPhone}
                  </a>
                </p>
                {inspectingOrder.venueContactPerson && (
                  <p className="text-slate-500 text-[11px]">
                    Contact Person: <strong>{inspectingOrder.venueContactPerson}</strong>
                  </p>
                )}
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5 text-xs">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  Delivery Venue & Schedule
                </span>
                <p className="font-bold text-slate-800 flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>{inspectingOrder.streetAddress}, {inspectingOrder.locality}</span>
                </p>
                <p className="text-slate-600 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Scheduled Date: <strong>{inspectingOrder.scheduledDate}</strong></span>
                </p>
              </div>
            </div>

            {/* Grid 2: Quantity & Financials */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3">
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider block">
                Order Billing & Commercials
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2.5 bg-slate-800 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-bold">Booked Jars</span>
                  <span className="text-base font-black text-white">{inspectingOrder.quantityJars} Units</span>
                </div>
                <div className="p-2.5 bg-slate-800 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-bold">Agreed Rate</span>
                  <span className="text-base font-black text-emerald-400">
                    ₹{Math.round((inspectingOrder.unitPricePaise || 2000) / 100)} / jar
                  </span>
                </div>
                <div className="p-2.5 bg-slate-800 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-bold">Delivered Jars</span>
                  <span className="text-base font-black text-sky-400">
                    {inspectingOrder.deliveredCount ?? inspectingOrder.quantityJars} Units
                  </span>
                </div>
                <div className="p-2.5 bg-slate-800 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-bold">Total Bill</span>
                  <span className="text-base font-black text-emerald-400">
                    {formatINR(inspectingOrder.totalAmountPaise)}
                  </span>
                </div>
              </div>

              {/* Payment Terms & Collection Audit */}
              <div className="pt-2 border-t border-slate-800 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Payment Terms:</span>
                  {inspectingOrder.paymentType === "PREPAID" ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      💳 100% PREPAID (Collect ₹0)
                    </span>
                  ) : inspectingOrder.paymentType === "PARTIAL_ADVANCE" ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      🟡 Partial Advance Received
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-500/20 text-sky-300 border border-sky-500/30">
                      💵 Pay on Delivery
                    </span>
                  )}
                </div>

                {inspectingOrder.advanceReceivedPaise > 0 && (
                  <div className="flex items-center justify-between text-purple-300">
                    <span>Advance Received Upfront:</span>
                    <span className="font-bold">
                      {formatINR(inspectingOrder.advanceReceivedPaise)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-slate-300">
                  <span>Balance Allotted for Driver Collection:</span>
                  <span className="font-bold">
                    {formatINR(inspectingOrder.balanceDuePaise || 0)}
                  </span>
                </div>

                {inspectingOrder.cashCollectedPaise > 0 && (
                  <div className="flex items-center justify-between text-emerald-400 font-bold border-t border-slate-800/80 pt-1">
                    <span>Actual Cash Collected by Driver:</span>
                    <span>{formatINR(inspectingOrder.cashCollectedPaise)}</span>
                  </div>
                )}
              </div>

              {inspectingOrder.depositAmountPaise > 0 && (
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Advance Security Deposit:</span>
                  <span className="font-black text-amber-400">
                    {formatINR(inspectingOrder.depositAmountPaise)} ({inspectingOrder.depositStatus || "PAID"})
                  </span>
                </div>
              )}
            </div>

            {/* Section 3: Logistics & Jars Audit */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-indigo-600" />
                  <span>Logistics & Scanned Jars Audit</span>
                </span>
                {inspectingOrder.assignedDriverName && (
                  <span className="text-[11px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                    Driver: {inspectingOrder.assignedDriverName} ({inspectingOrder.vehicleNumber || "UP 25 SW 1001"})
                  </span>
                )}
              </div>

              {/* Dispatched Jars Badges */}
              {inspectingOrder.dispatchedJars?.length > 0 ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                    <span>Scanned Truck Jars ({inspectingOrder.dispatchedJars.length}):</span>
                    <span>Delivered: {inspectingOrder.deliveredCount ?? inspectingOrder.dispatchedJars.length} Jars</span>
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto p-2 bg-white rounded-xl border border-slate-200">
                    {inspectingOrder.dispatchedJars.map((code: string, idx: number) => {
                      const isRejected = inspectingOrder.undeliveredJars?.includes(code);
                      return (
                        <span
                          key={idx}
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                            isRejected
                              ? "bg-rose-50 text-rose-700 border-rose-200 line-through"
                              : "bg-indigo-50 text-indigo-700 border-indigo-200"
                          }`}
                        >
                          {code}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 italic bg-white p-2.5 rounded-xl border border-slate-200">
                  {inspectingOrder.status === "CONFIRMED"
                    ? "Order is pending dispatch. Jars will be recorded when owner dispatches order."
                    : `${inspectingOrder.quantityJars} bulk units assigned without individual barcodes.`}
                </p>
              )}

              {/* Undelivered / Rejected Jars */}
              {inspectingOrder.undeliveredJars?.length > 0 && (
                <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200 text-xs space-y-1">
                  <span className="font-bold text-rose-800 text-[11px] flex items-center gap-1">
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Rejected / Returned Jars ({inspectingOrder.undeliveredJars.length}):</span>
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {inspectingOrder.undeliveredJars.map((code: string, idx: number) => (
                      <span key={idx} className="font-mono text-[10px] px-1.5 py-0.5 bg-white text-rose-800 rounded border border-rose-200 font-bold">
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Notes / Special Instructions */}
            {inspectingOrder.deliveryNotes && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Notes:</span>
                <p className="text-slate-700 font-medium">
                  {typeof inspectingOrder.deliveryNotes === "string" && !inspectingOrder.deliveryNotes.startsWith("{")
                    ? inspectingOrder.deliveryNotes
                    : "Order processed with digital verification & custody tracking."}
                </p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setInspectModalOpen(false);
                    handleOpenEdit(inspectingOrder);
                  }}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Edit Order</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setInspectModalOpen(false);
                    handleOpenDelete(inspectingOrder);
                  }}
                  className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100/80 text-rose-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Delete</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {inspectingOrder.status === "CONFIRMED" && (
                  <button
                    type="button"
                    onClick={() => {
                      setInspectModalOpen(false);
                      handleOpenDispatch(inspectingOrder);
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Truck className="w-4 h-4" />
                    <span>Dispatch Now</span>
                  </button>
                )}

                {inspectingOrder.status === "IN_TRANSIT" && (
                  <button
                    type="button"
                    onClick={() => {
                      setInspectModalOpen(false);
                      handleOpenSettle(inspectingOrder);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span>Settle Delivery</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setInspectModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
