"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Droplets,
  QrCode,
  Truck,
  Users,
  Receipt,
  BookOpen,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Building2,
  Wallet,
  Smartphone,
  Database,
  CheckCircle2,
  Clock,
  ChevronRight,
  TrendingUp,
  Package,
  Calendar,
  Layers,
  ArrowRight,
  Check,
  X,
  CreditCard,
  UserCheck,
} from "lucide-react";
import { formatINR } from "@/lib/utils";
import { formatTimeIST, formatDateIST, getTodayIST } from "@/lib/date-utils";

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Live Driver Events Stream
  const [recentMovements, setRecentMovements] = useState<any[]>([]);
  const [recentCashEvents, setRecentCashEvents] = useState<any[]>([]);
  const [lastLiveUpdate, setLastLiveUpdate] = useState<string>("");
  const [livePulsing, setLivePulsing] = useState(false);
  const pollTimerRef = useRef<any>(null);

  // Order List Filter in Left Panel
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("ALL");

  // Activity Filter in Right Panel
  const [activityTab, setActivityTab] = useState<"ALL" | "SCANS" | "CASH">("ALL");

  // Quick Cash Handover Modal State
  const [handoverModalOpen, setHandoverModalOpen] = useState(false);
  const [selectedDriverHandover, setSelectedDriverHandover] = useState<any>(null);
  const [handoverAmountRupees, setHandoverAmountRupees] = useState("");
  const [handoverTargetAccount, setHandoverTargetAccount] = useState<number>(1110); // 1110 = Vault, 1130 = Bank
  const [handoverNotes, setHandoverNotes] = useState("");
  const [isSubmittingHandover, setIsSubmittingHandover] = useState(false);
  const [handoverSuccessBanner, setHandoverSuccessBanner] = useState<string | null>(null);
  const [handoverErrorBanner, setHandoverErrorBanner] = useState<string | null>(null);

  // Depreciation Trigger
  const [depreciating, setDepreciating] = useState(false);
  const [depreciationMsg, setDepreciationMsg] = useState("");

  const loadStats = async () => {
    try {
      const res = await fetch("/api/dashboard/stats");
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Failed to load dashboard stats:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const pollLiveEvents = async () => {
    try {
      const res = await fetch("/api/sync/events");
      const data = await res.json();
      if (data.success) {
        setRecentMovements(data.recentMovements || []);
        setRecentCashEvents(data.recentCashEvents || []);
        setLastLiveUpdate(formatTimeIST(new Date()));
        setLivePulsing(true);
        setTimeout(() => setLivePulsing(false), 1200);
      }
    } catch (err) {
      // offline or silent
    }
  };

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    loadStats();
    pollLiveEvents();
  };

  useEffect(() => {
    loadStats();
    pollLiveEvents();

    // Auto-poll driver events every 5 seconds to keep dashboard continuously updated
    pollTimerRef.current = setInterval(() => {
      pollLiveEvents();
      loadStats();
    }, 5000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // Open Handover Modal for a specific driver
  const openHandoverModal = (driverInfo?: any) => {
    if (driverInfo) {
      setSelectedDriverHandover(driverInfo);
      setHandoverAmountRupees((driverInfo.totalPendingPaise / 100).toString());
    } else if (stats?.financials?.pendingCashDrivers?.length > 0) {
      const first = stats.financials.pendingCashDrivers[0];
      setSelectedDriverHandover(first);
      setHandoverAmountRupees((first.totalPendingPaise / 100).toString());
    } else {
      setSelectedDriverHandover({
        driverId: "usr_driver_01",
        driverName: "Ramesh Kumar (Default Driver)",
        totalPendingPaise: stats?.financials?.driverClearingPaise || 0,
      });
      setHandoverAmountRupees(((stats?.financials?.driverClearingPaise || 0) / 100).toString());
    }
    setHandoverTargetAccount(1110);
    setHandoverNotes("Verified cash deposited into vault at plant");
    setHandoverSuccessBanner(null);
    setHandoverErrorBanner(null);
    setHandoverModalOpen(true);
  };

  // Submit Handover to Vault (Calls /api/cash action HANDOVER)
  const handleConfirmHandover = async () => {
    if (!selectedDriverHandover) return;
    const amountNum = parseFloat(handoverAmountRupees);
    if (isNaN(amountNum) || amountNum <= 0) {
      setHandoverErrorBanner("Please enter a valid cash amount in Rupees.");
      return;
    }

    setIsSubmittingHandover(true);
    setHandoverErrorBanner(null);

    try {
      const res = await fetch("/api/cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "HANDOVER",
          driverId: selectedDriverHandover.driverId,
          totalVerifiedPaise: Math.round(amountNum * 100),
          targetAccountId: Number(handoverTargetAccount),
          submissionIds: selectedDriverHandover.submissionIds,
          notes: handoverNotes || "Handover verified on dashboard",
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setHandoverSuccessBanner(
          `✅ Successfully received ₹${amountNum.toFixed(2)} from ${selectedDriverHandover.driverName}! Transferred from Driver Clearing (1120) to ${
            handoverTargetAccount === 1110 ? "Central Vault (1110)" : "Bank Current (1130)"
          }.`
        );
        setTimeout(() => {
          setHandoverModalOpen(false);
          loadStats();
          pollLiveEvents();
        }, 1800);
      } else {
        setHandoverErrorBanner(`❌ ${data.error || "Failed to process cash handover"}`);
      }
    } catch (err: any) {
      setHandoverErrorBanner(`❌ ${err.message || "Network error"}`);
    } finally {
      setIsSubmittingHandover(false);
    }
  };

  // Run Depreciation
  const handleRunDepreciation = async () => {
    setDepreciating(true);
    setDepreciationMsg("");
    try {
      const res = await fetch("/api/accounting/depreciation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setDepreciationMsg(`✅ Monthly depreciation posted! (JV: ${data.entryNumber})`);
        loadStats();
      } else {
        setDepreciationMsg(`❌ ${data.error || "Failed to post depreciation"}`);
      }
    } catch (err: any) {
      setDepreciationMsg(`❌ ${err.message}`);
    } finally {
      setDepreciating(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-8 bg-white rounded-3xl border border-slate-200/80 shadow-sm max-w-sm w-full mx-auto">
          <div className="w-12 h-12 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-base font-bold text-slate-800">Sai Waters ERP</h3>
          <p className="text-slate-500 text-xs mt-1">Connecting to live operations telemetry & ledger...</p>
        </div>
      </div>
    );
  }

  const { jars, logistics, financials, crm } = stats || {};

  // Logistics calculations
  const totalOrders = logistics?.todayTotalOrders || 0;
  const deliveredOrders = logistics?.todayDelivered || 0;
  const dispatchedOrders = logistics?.todayDispatched || 0;
  const pendingOrders = logistics?.todayPending || 0;
  const fulfillmentPct = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0;

  // Filtered orders list for the left panel
  const allOrdersList: any[] = logistics?.recentOrders || [];
  const filteredOrders = allOrdersList.filter((o: any) => {
    if (orderStatusFilter === "ALL") return true;
    if (orderStatusFilter === "DELIVERED") return o.status === "DELIVERED";
    if (orderStatusFilter === "DISPATCHED") return o.status === "DISPATCHED" || o.status === "IN_TRANSIT";
    if (orderStatusFilter === "PENDING") return o.status === "CONFIRMED" || o.status === "DRAFT";
    return true;
  });

  // Fleet total and percentages
  const jarTotal = jars?.total || 1;
  const pctAvailable = Math.round(((jars?.available || 0) / jarTotal) * 100);
  const pctTransit = Math.round(((jars?.inTransit || 0) / jarTotal) * 100);
  const pctCustomer = Math.round(((jars?.withCustomer || 0) / jarTotal) * 100);
  const pctInspect = Math.round(((jars?.returnedInspect || 0) / jarTotal) * 100);
  const pctRepair = Math.round(((jars?.underRepair || 0) / jarTotal) * 100);

  // Filtered activity feed for right panel
  const combinedActivities: any[] = [];
  if (activityTab === "ALL" || activityTab === "SCANS") {
    recentMovements.forEach((m: any) => {
      combinedActivities.push({
        type: "SCAN",
        id: `scan-${m.id}`,
        timestamp: m.createdAt,
        title: `${m.jarCode || "20L Jar"} → ${m.eventType?.replace(/_/g, " ")}`,
        subtitle: `Scanned by ${m.actorName || "Driver"}`,
        notes: m.notes,
        raw: m,
      });
    });
  }
  if (activityTab === "ALL" || activityTab === "CASH") {
    recentCashEvents.forEach((c: any) => {
      combinedActivities.push({
        type: "CASH",
        id: `cash-${c.id}`,
        timestamp: c.collectedAt,
        title: `Doorstep Cash: ${formatINR(c.amountPaise)}`,
        subtitle: `Collected by ${c.driverName || "Driver"}`,
        notes: "Pending cashier handover to vault",
        raw: c,
      });
    });
  }
  combinedActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* =========================================================================
          1. HEADER COMMAND STRIP
          ========================================================================= */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/70">
                Operations
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 text-slate-500 border border-slate-200/60">
                Bill of supply
              </span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Driver sync: 5s</span>
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
              Sai Waters Operations
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Serialized 20L jar tracking, doorstep driver collections, and double-entry accounts ledger.
            </p>
          </div>

          {/* Quick Header Telemetry & Refresh */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* General Ledger Health Badge */}
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200/70">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="text-left">
                <span className="text-[10px] font-medium text-slate-500 block">
                  General ledger
                </span>
                <span className="text-xs font-semibold text-slate-800 tabular-nums">
                  {financials?.isTrialBalanceBalanced ? "Balanced (₹0 variance)" : "Discrepancy detected"}
                </span>
              </div>
            </div>

            {/* Live IST Clock Badge */}
            <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200/70 text-left">
              <span className="text-[10px] font-medium text-slate-500 block">
                Operational date
              </span>
              <span className="text-xs font-semibold text-slate-800 tabular-nums">
                {formatDateIST(new Date())}
              </span>
            </div>

            {/* 1-Click Refresh Button */}
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              title="Refresh all real-time stats and sync events"
              className="h-9 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Depreciation Notification Banner if triggered */}
      {depreciationMsg && (
        <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 text-sm font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
            <span>{depreciationMsg}</span>
          </div>
          <button onClick={() => setDepreciationMsg("")} className="text-xs underline font-bold text-sky-800 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* =========================================================================
          2. CORE EXECUTIVE KPI CARDS (4 HIGH-IMPACT PILLARS)
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Today's Deliveries / Dispatch Progress */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium text-slate-500">Today&apos;s deliveries</span>
              <Truck className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
                {deliveredOrders} <span className="text-sm text-slate-400 font-normal">/ {totalOrders}</span>
              </span>
              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80 tabular-nums">
                {fulfillmentPct}%
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-normal">
              {logistics?.todayTotalJarsDelivered || 0} of {logistics?.todayTotalJarsScheduled || 0} jars delivered today
            </p>

            {/* Progress bar */}
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${fulfillmentPct}%` }}
              ></div>
            </div>
          </div>

          <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-normal">Transit: {dispatchedOrders} • Pending: {pendingOrders}</span>
            <Link href="/orders" className="font-medium text-sky-600 hover:text-sky-700 flex items-center gap-1">
              Orders <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Card 2: Driver Cash in Transit (A/C 1120) */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium text-slate-500">
                Driver cash in transit
              </span>
              <Wallet className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
              {formatINR(financials?.driverClearingPaise || 0)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-normal">
              {(financials?.driverClearingPaise || 0) > 0
                ? "Collected at doorstep, pending cashier handover"
                : "All field cash deposited into central vault"}
            </p>

            {/* Driver names holding cash */}
            {financials?.pendingCashDrivers && financials.pendingCashDrivers.length > 0 && (
              <div className="mt-2.5 bg-slate-50 rounded-lg p-2 border border-slate-200/70 text-[11px] text-slate-700">
                <span className="font-medium block tabular-nums">
                  {financials.pendingCashDrivers[0].driverName}: {formatINR(financials.pendingCashDrivers[0].totalPendingPaise)}
                </span>
              </div>
            )}
          </div>

          <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            {(financials?.driverClearingPaise || 0) > 0 ? (
              <button
                onClick={() => openHandoverModal()}
                className="w-full h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium transition-colors flex items-center justify-center gap-1.5 text-xs cursor-pointer"
              >
                <span>Handover to vault</span>
              </button>
            ) : (
              <div className="flex items-center justify-between w-full text-slate-600 font-medium">
                <span className="flex items-center gap-1 text-emerald-600">
                  <Check className="w-3.5 h-3.5" /> Vault reconciled
                </span>
                <Link href="/accounting" className="hover:text-slate-900">
                  Ledger →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Accounts Receivable / Customer Dues (A/C 1150) */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium text-slate-500">Customer receivables</span>
              <Receipt className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
              {formatINR(financials?.accountsReceivablePaise || 0)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-normal">
              Total uncollected receivables on customer accounts (1150)
            </p>

            <div className="mt-2.5 flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200/70 tabular-nums">
                {financials?.dueInvoicesCount || 0} pending invoices
              </span>
              <span className="text-[11px] text-slate-500 font-normal tabular-nums">
                {formatINR(financials?.totalDueAmountPaise || 0)} due
              </span>
            </div>
          </div>

          <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-normal">{crm?.totalCustomers || 0} customers</span>
            <Link
              href="/invoices"
              className="font-medium text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              Collect dues <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Card 4: Operating Liquidity (Vault Cash + Bank Balance) */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium text-slate-500">Liquid reserves</span>
              <Building2 className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
              {formatINR((financials?.vaultCashPaise || 0) + (financials?.bankBalancePaise || 0))}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-normal">
              Combined vault cash (1110) & bank current (1130)
            </p>

            <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-[10px]">
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                <span className="text-slate-500 block font-normal">Vault cash</span>
                <span className="font-semibold text-slate-900 block mt-0.5 tabular-nums">
                  {formatINR(financials?.vaultCashPaise || 0)}
                </span>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                <span className="text-slate-500 block font-normal">Bank current</span>
                <span className="font-semibold text-slate-900 block mt-0.5 tabular-nums">
                  {formatINR(financials?.bankBalancePaise || 0)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-600 font-normal tabular-nums">
              Net profit: <strong className="text-emerald-700 font-semibold">{formatINR(financials?.netProfitPaise || 0)}</strong>
            </span>
            <Link
              href="/accounting"
              className="font-medium text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              Trial balance <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. INTERACTIVE OPERATIONAL ACTIONS
          ========================================================================= */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            Quick actions
          </h2>
          <span className="text-[11px] text-slate-400 font-normal">Common workflows</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Action 1: Dispatch Jars */}
          <Link
            href="/orders"
            className="p-3.5 rounded-xl bg-white border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 transition-colors flex flex-col items-center text-center cursor-pointer shadow-2xs"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center mb-2 text-slate-600">
              <Truck className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-slate-900">
              Dispatch orders
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5">Vehicle loading</span>
          </Link>

          {/* Action 2: New Event / Bulk Order */}
          <Link
            href="/orders"
            className="p-3.5 rounded-xl bg-white border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 transition-colors flex flex-col items-center text-center cursor-pointer shadow-2xs"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center mb-2 text-slate-600">
              <Package className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-slate-900">
              Bulk event
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5">Events & functions</span>
          </Link>

          {/* Action 3: Settle Driver Cash */}
          <button
            onClick={() => openHandoverModal()}
            className="p-3.5 rounded-xl bg-white border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 transition-colors flex flex-col items-center text-center cursor-pointer shadow-2xs"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center mb-2 text-slate-600">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-slate-900">
              Handover cash
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5">Deposit into vault</span>
          </button>

          {/* Action 4: Invoices & UPI */}
          <Link
            href="/invoices"
            className="p-3.5 rounded-xl bg-white border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 transition-colors flex flex-col items-center text-center cursor-pointer shadow-2xs"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center mb-2 text-slate-600">
              <Receipt className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-slate-900">
              Invoices & dues
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5">Monthly billing</span>
          </Link>

          {/* Action 5: Bulk 1-Click Return */}
          <Link
            href="/jars"
            className="p-3.5 rounded-xl bg-white border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 transition-colors flex flex-col items-center text-center cursor-pointer shadow-2xs"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center mb-2 text-slate-600">
              <QrCode className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-slate-900">
              Jar registry
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5">Inspect & returns</span>
          </Link>

          {/* Action 6: Customers & CRM */}
          <Link
            href="/customers"
            className="p-3.5 rounded-xl bg-white border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 transition-colors flex flex-col items-center text-center cursor-pointer shadow-2xs"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center mb-2 text-slate-600">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-slate-900">
              Customers
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5">Client accounts</span>
          </Link>
        </div>
      </div>

      {/* =========================================================================
          4. 20L SERIALIZED JAR FLEET CUSTODY & STATUS BAR
          ========================================================================= */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Droplets className="w-4 h-4 text-sky-600" />
              20L jar fleet custody
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Location breakdown of {jars?.total || 0} serialized asset jars
            </p>
          </div>
          <Link
            href="/jars"
            className="text-xs font-medium text-sky-600 hover:text-sky-700 flex items-center gap-1 self-start sm:self-auto"
          >
            View all jars <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Visual Multi-Segment Bar */}
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex my-3.5">
          <div
            title={`Available: ${jars?.available || 0} jars (${pctAvailable}%)`}
            style={{ width: `${pctAvailable}%` }}
            className="bg-emerald-500 h-full transition-all duration-500"
          ></div>
          <div
            title={`In Transit: ${jars?.inTransit || 0} jars (${pctTransit}%)`}
            style={{ width: `${pctTransit}%` }}
            className="bg-sky-500 h-full transition-all duration-500"
          ></div>
          <div
            title={`With Customers: ${jars?.withCustomer || 0} jars (${pctCustomer}%)`}
            style={{ width: `${pctCustomer}%` }}
            className="bg-indigo-500 h-full transition-all duration-500"
          ></div>
          <div
            title={`Returned/Inspect: ${jars?.returnedInspect || 0} jars (${pctInspect}%)`}
            style={{ width: `${pctInspect}%` }}
            className="bg-slate-400 h-full transition-all duration-500"
          ></div>
          <div
            title={`Under Repair/Damaged: ${jars?.underRepair || 0} jars (${pctRepair}%)`}
            style={{ width: `${pctRepair}%` }}
            className="bg-rose-500 h-full transition-all duration-500"
          ></div>
        </div>

        {/* Grid of 5 Status Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {/* Tile 1: Available */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-600">Available at plant</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            </div>
            <span className="text-xl font-semibold text-slate-900 block mt-1 tabular-nums">{jars?.available || 0}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5 tabular-nums">{pctAvailable}% • Ready</span>
          </div>

          {/* Tile 2: In-Transit */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-600">On delivery trucks</span>
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
            </div>
            <span className="text-xl font-semibold text-slate-900 block mt-1 tabular-nums">{jars?.inTransit || 0}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5 tabular-nums">{pctTransit}% • In transit</span>
          </div>

          {/* Tile 3: With Customers */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-600">With customers</span>
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
            </div>
            <span className="text-xl font-semibold text-slate-900 block mt-1 tabular-nums">{jars?.withCustomer || 0}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5 tabular-nums">{pctCustomer}% • Custody</span>
          </div>

          {/* Tile 4: Factory Inspection */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-600">Empty return bay</span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            </div>
            <span className="text-xl font-semibold text-slate-900 block mt-1 tabular-nums">{jars?.returnedInspect || 0}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5 tabular-nums">{pctInspect}% • Unloaded</span>
          </div>

          {/* Tile 5: Under Repair / Damaged */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70 text-left col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-600">Repair & QA bay</span>
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            </div>
            <span className="text-xl font-semibold text-slate-900 block mt-1 tabular-nums">{jars?.underRepair || 0}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5 tabular-nums">{pctRepair}% • Maintenance</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          5. DUAL LIVE OPERATIONS PANELS (ORDERS PIPELINE VS LIVE STREAM)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Panel: Today's Orders & Dispatch Status */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-slate-100">
              <div>
                <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                  <Package className="w-4 h-4 text-sky-600" />
                  Today&apos;s orders & dispatch
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Route orders for {logistics?.todayDate || getTodayIST()}
                </p>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg text-xs font-normal">
                <button
                  onClick={() => setOrderStatusFilter("ALL")}
                  className={`px-2 py-0.5 rounded-md transition-colors ${
                    orderStatusFilter === "ALL" ? "bg-white text-slate-900 shadow-2xs font-medium" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All ({allOrdersList.length})
                </button>
                <button
                  onClick={() => setOrderStatusFilter("DELIVERED")}
                  className={`px-2 py-0.5 rounded-md transition-colors ${
                    orderStatusFilter === "DELIVERED"
                      ? "bg-white text-emerald-800 shadow-2xs font-medium"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Done
                </button>
                <button
                  onClick={() => setOrderStatusFilter("DISPATCHED")}
                  className={`px-2 py-0.5 rounded-md transition-colors ${
                    orderStatusFilter === "DISPATCHED"
                      ? "bg-white text-sky-800 shadow-2xs font-medium"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Transit
                </button>
                <button
                  onClick={() => setOrderStatusFilter("PENDING")}
                  className={`px-2 py-0.5 rounded-md transition-colors ${
                    orderStatusFilter === "PENDING"
                      ? "bg-white text-slate-900 shadow-2xs font-medium"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Pending
                </button>
              </div>
            </div>

            {/* Orders List */}
            <div className="space-y-2">
              {filteredOrders.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  <p className="text-xs text-slate-500">No orders matching this filter.</p>
                  <Link
                    href="/orders"
                    className="inline-block mt-1 text-xs font-medium text-sky-600 hover:underline"
                  >
                    Create order →
                  </Link>
                </div>
              ) : (
                filteredOrders.slice(0, 5).map((ord: any) => (
                  <div
                    key={ord.id}
                    className="p-2.5 rounded-lg bg-slate-50/70 hover:bg-slate-50 border border-slate-200/60 flex items-center justify-between text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center font-medium text-slate-700 text-xs shrink-0 tabular-nums">
                        {ord.quantityJars}J
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-slate-900">{ord.customerName}</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-normal bg-slate-100 text-slate-600 border border-slate-200/60">
                            {ord.orderType === "ONE_TIME_EVENT" ? "Bulk" : "Daily"}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 tabular-nums">
                          <span>{ord.orderNumber}</span>
                          <span>•</span>
                          <span>₹{(ord.unitPricePaise / 100).toFixed(0)}/jar</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-medium ${
                          ord.status === "DELIVERED"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200/70"
                            : ord.status === "DISPATCHED"
                            ? "bg-sky-50 text-sky-800 border border-sky-200/70"
                            : "bg-slate-100 text-slate-700 border border-slate-200/70"
                        }`}
                      >
                        {ord.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-2.5 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-normal">Updated live</span>
            <Link href="/orders" className="text-sky-600 font-medium hover:underline flex items-center gap-0.5">
              Orders hub →
            </Link>
          </div>
        </div>

        {/* Right Panel: Live Driver Activity & Cash Stream */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">
                    Live driver activity
                  </h3>
                  <p className="text-[10px] text-slate-500 tabular-nums">
                    Last update: {lastLiveUpdate || "Connecting..."}
                  </p>
                </div>
              </div>

              {/* Feed Tabs */}
              <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg text-xs font-normal">
                <button
                  onClick={() => setActivityTab("ALL")}
                  className={`px-2 py-0.5 rounded-md transition-colors ${
                    activityTab === "ALL" ? "bg-white text-slate-900 shadow-2xs font-medium" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setActivityTab("SCANS")}
                  className={`px-2 py-0.5 rounded-md transition-colors ${
                    activityTab === "SCANS" ? "bg-white text-sky-800 shadow-2xs font-medium" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  QR scans
                </button>
                <button
                  onClick={() => setActivityTab("CASH")}
                  className={`px-2 py-0.5 rounded-md transition-colors ${
                    activityTab === "CASH" ? "bg-white text-slate-900 shadow-2xs font-medium" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Cash
                </button>
              </div>
            </div>

            {/* Events Stream */}
            <div className="space-y-2">
              {combinedActivities.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  <p className="text-xs text-slate-500">Awaiting mobile driver events...</p>
                </div>
              ) : (
                combinedActivities.slice(0, 5).map((act) => (
                  <div
                    key={act.id}
                    className="p-2.5 rounded-lg bg-slate-50/70 border border-slate-200/60 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center font-medium text-xs shrink-0">
                        {act.type === "CASH" ? "₹" : "QR"}
                      </div>
                      <div>
                        <span className="font-medium text-slate-900 block leading-tight">
                          {act.title}
                        </span>
                        <span className="text-[10px] text-slate-500 mt-0.5 block">{act.subtitle}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-mono text-slate-500 block tabular-nums">
                        {formatTimeIST(act.timestamp)}
                      </span>
                      {act.type === "CASH" && (
                        <button
                          onClick={() => openHandoverModal()}
                          className="mt-0.5 text-[10px] font-medium text-sky-600 hover:underline cursor-pointer"
                        >
                          Handover →
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-2.5 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-normal">Driver scanning online</span>
            <Link href="/accounting" className="text-sky-600 font-medium hover:underline">
              Cash audit log →
            </Link>
          </div>
        </div>
      </div>

      {/* =========================================================================
          6. MODAL: QUICK DRIVER CASH HANDOVER TO VAULT
          ========================================================================= */}
      {handoverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full p-5 relative">
            <button
              onClick={() => setHandoverModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                <Wallet className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Verify driver cash handover
                </h3>
                <p className="text-xs text-slate-500">
                  Transfer cash from Driver clearing (1120) to Central vault or bank
                </p>
              </div>
            </div>

            {handoverSuccessBanner && (
              <div className="p-3 mb-3.5 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-900 text-xs font-medium">
                {handoverSuccessBanner}
              </div>
            )}

            {handoverErrorBanner && (
              <div className="p-3 mb-3.5 rounded-lg bg-rose-50 border border-rose-200/80 text-rose-900 text-xs font-medium">
                {handoverErrorBanner}
              </div>
            )}

            <div className="space-y-3.5">
              {/* Driver info */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] font-medium">
                    Driver
                  </span>
                  <span className="font-semibold text-slate-900 text-sm">
                    {selectedDriverHandover?.driverName || "Driver"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[10px] font-medium">
                    Uncleared balance
                  </span>
                  <span className="font-semibold text-slate-900 text-sm tabular-nums">
                    {formatINR(selectedDriverHandover?.totalPendingPaise || 0)}
                  </span>
                </div>
              </div>

              {/* Amount input */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Verified cash amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
                  <input
                    type="number"
                    step="1"
                    value={handoverAmountRupees}
                    onChange={(e) => setHandoverAmountRupees(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-200 font-semibold text-slate-900 text-sm focus:outline-hidden focus:ring-1 focus:ring-sky-500 tabular-nums"
                  />
                </div>
              </div>

              {/* Target Account selector */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Deposit target account
                </label>
                <select
                  value={handoverTargetAccount}
                  onChange={(e) => setHandoverTargetAccount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-medium text-slate-800 text-xs focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                >
                  <option value={1110}>1110 — Central Vault Cash-in-Hand (Physical Safe)</option>
                  <option value={1130}>1130 — Operating Bank Current Account</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Verification memo
                </label>
                <input
                  type="text"
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  placeholder="e.g. End of day cash count verified"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 font-normal focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                />
              </div>

              {/* Double-Entry Preview Box */}
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70 text-[11px] space-y-1">
                <span className="font-medium text-slate-700 block">General ledger journal preview:</span>
                <div className="flex justify-between font-mono text-slate-600 tabular-nums">
                  <span>Dr. {handoverTargetAccount} {handoverTargetAccount === 1110 ? "Central vault cash" : "Bank current"}</span>
                  <span className="font-semibold text-slate-900">+₹{parseFloat(handoverAmountRupees || "0").toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-mono text-slate-600 tabular-nums">
                  <span>Cr. 1120 Driver collection clearing</span>
                  <span className="font-semibold text-slate-900">-₹{parseFloat(handoverAmountRupees || "0").toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Modal actions */}
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setHandoverModalOpen(false)}
                className="h-9 px-3 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer border border-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmHandover}
                disabled={isSubmittingHandover}
                className="h-9 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors active:scale-98 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmittingHandover ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Confirm handover
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
