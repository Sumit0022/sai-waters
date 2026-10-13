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
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-sky-950 text-white rounded-3xl p-6 sm:p-7 shadow-lg relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-2.5">
              <span className="px-3 py-1 rounded-full text-[11px] font-black bg-sky-500/20 text-sky-300 border border-sky-400/30 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-sky-400" />
                Operations Command
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/10 text-slate-300 border border-white/10">
                GST: Unregistered (Bill of Supply)
              </span>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <span className={`w-2 h-2 rounded-full bg-emerald-400 ${livePulsing ? "scale-150 animate-ping" : "animate-pulse"}`}></span>
                <span>Driver Telemetry: Live (5s)</span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              Sai Waters Operations Command
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              20L Jar serialized tracking, doorstep driver cash collection, and double-entry General Ledger control.
            </p>
          </div>

          {/* Quick Header Telemetry & Refresh */}
          <div className="flex flex-wrap items-center gap-3">
            {/* General Ledger Health Badge */}
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-white shadow-xs">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-left">
                <span className="text-[10px] font-black text-emerald-400 block uppercase tracking-wider">
                  General Ledger Invariant
                </span>
                <span className="text-xs font-bold text-slate-200">
                  {financials?.isTrialBalanceBalanced ? "Σ Dr = Σ Cr (₹0 Variance)" : "Discrepancy Detected"}
                </span>
              </div>
            </div>

            {/* Live IST Clock Badge */}
            <div className="px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-right">
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                IST Operational Date
              </span>
              <span className="text-xs font-extrabold text-white">
                {formatDateIST(new Date())}
              </span>
            </div>

            {/* 1-Click Refresh Button */}
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              title="Refresh all real-time stats and sync events"
              className="p-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Deliveries / Dispatch Progress */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Today&apos;s Deliveries</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">
                {deliveredOrders} <span className="text-lg text-slate-400 font-semibold">/ {totalOrders}</span>
              </span>
              <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {fulfillmentPct}%
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
              {logistics?.todayTotalJarsDelivered || 0} of {logistics?.todayTotalJarsScheduled || 0} jars delivered today
            </p>

            {/* Progress bar */}
            <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-700"
                style={{ width: `${fulfillmentPct}%` }}
              ></div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium">In-Transit: {dispatchedOrders} | Pending: {pendingOrders}</span>
            <Link href="/orders" className="font-bold text-sky-600 hover:text-sky-700 flex items-center gap-0.5 group">
              Manage Orders <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Card 2: Driver Cash in Transit (A/C 1120) — HIGH IMPACT FUNCTIONAL CARD */}
        <div
          className={`p-5 rounded-3xl border shadow-xs transition-all flex flex-col justify-between ${
            (financials?.driverClearingPaise || 0) > 0
              ? "bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/20"
              : "bg-white border-slate-200"
          }`}
        >
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Driver Cash in Transit
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-amber-950">
              {formatINR(financials?.driverClearingPaise || 0)}
            </div>
            <p className="text-[11px] text-amber-800/90 mt-1.5 font-medium">
              {(financials?.driverClearingPaise || 0) > 0
                ? "Collected at doorstep, awaiting cashier handover (A/C 1120)"
                : "All field cash deposited into central vault"}
            </p>

            {/* Driver names holding cash */}
            {financials?.pendingCashDrivers && financials.pendingCashDrivers.length > 0 && (
              <div className="mt-2.5 bg-amber-100/70 rounded-xl p-2 border border-amber-200/80 text-[11px] text-amber-900">
                <span className="font-bold block">
                  {financials.pendingCashDrivers[0].driverName}: {formatINR(financials.pendingCashDrivers[0].totalPendingPaise)}
                </span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-amber-200/60 flex items-center justify-between text-[11px]">
            {(financials?.driverClearingPaise || 0) > 0 ? (
              <button
                onClick={() => openHandoverModal()}
                className="w-full py-1.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Approve & Handover to Vault
              </button>
            ) : (
              <div className="flex items-center justify-between w-full text-emerald-700 font-bold">
                <span>✓ Vault Reconciled</span>
                <Link href="/accounting" className="hover:underline">
                  Ledger →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Accounts Receivable / Customer Dues (A/C 1150) */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-700">Customer Dues</span>
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900">
              {formatINR(financials?.accountsReceivablePaise || 0)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
              Total uncollected receivables on customer accounts (A/C 1150)
            </p>

            <div className="mt-3 flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200">
                {financials?.dueInvoicesCount || 0} Pending Invoices
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                {formatINR(financials?.totalDueAmountPaise || 0)} due
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium">{crm?.totalCustomers || 0} total customers</span>
            <Link
              href="/invoices"
              className="font-bold text-purple-700 hover:text-purple-800 flex items-center gap-0.5 group"
            >
              Collect Dues <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Card 4: Operating Liquidity (Vault Cash + Bank Balance) */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-700">Liquid Reserves</span>
              <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900">
              {formatINR((financials?.vaultCashPaise || 0) + (financials?.bankBalancePaise || 0))}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
              Combined Vault Cash (1110) & Operating Bank (1130)
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                <span className="text-slate-400 block font-semibold">Vault Cash</span>
                <span className="font-extrabold text-slate-900 block mt-0.5">
                  {formatINR(financials?.vaultCashPaise || 0)}
                </span>
              </div>
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                <span className="text-slate-400 block font-semibold">Bank Current</span>
                <span className="font-extrabold text-slate-900 block mt-0.5">
                  {formatINR(financials?.bankBalancePaise || 0)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-emerald-700 font-bold">
              Net Profit: {formatINR(financials?.netProfitPaise || 0)}
            </span>
            <Link
              href="/accounting"
              className="font-bold text-sky-600 hover:text-sky-700 flex items-center gap-0.5 group"
            >
              Trial Balance <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. INTERACTIVE OPERATIONAL COMMAND DOCK
          ========================================================================= */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            Quick Command Actions
          </h2>
          <span className="text-[11px] text-slate-400 font-medium">Direct one-click workflow triggers</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Action 1: Dispatch Jars */}
          <Link
            href="/orders"
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-sky-400 hover:shadow-md transition-all flex flex-col items-center text-center group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mb-2 group-hover:scale-110 group-hover:bg-sky-500 group-hover:text-white transition-all shadow-xs">
              <Truck className="w-5 h-5" />
            </div>
            <span className="text-xs font-black text-slate-900 group-hover:text-sky-600 transition-colors">
              Dispatch Orders
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">Vehicle scan loading</span>
          </Link>

          {/* Action 2: New Event / Bulk Order */}
          <Link
            href="/orders"
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-md transition-all flex flex-col items-center text-center group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-xs">
              <Package className="w-5 h-5" />
            </div>
            <span className="text-xs font-black text-slate-900 group-hover:text-emerald-600 transition-colors">
              New Bulk Order
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">Events & weddings</span>
          </Link>

          {/* Action 3: Settle Driver Cash */}
          <button
            onClick={() => openHandoverModal()}
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all flex flex-col items-center text-center group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mb-2 group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white transition-all shadow-xs">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-xs font-black text-slate-900 group-hover:text-amber-700 transition-colors">
              Handover Cash
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">Deposit into vault</span>
          </button>

          {/* Action 4: Invoices & UPI */}
          <Link
            href="/invoices"
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-purple-400 hover:shadow-md transition-all flex flex-col items-center text-center group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-2 group-hover:scale-110 group-hover:bg-purple-500 group-hover:text-white transition-all shadow-xs">
              <Receipt className="w-5 h-5" />
            </div>
            <span className="text-xs font-black text-slate-900 group-hover:text-purple-600 transition-colors">
              Invoices & Dues
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">UPI bills & WhatsApp</span>
          </Link>

          {/* Action 5: Bulk 1-Click Return */}
          <Link
            href="/jars"
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-cyan-400 hover:shadow-md transition-all flex flex-col items-center text-center group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center mb-2 group-hover:scale-110 group-hover:bg-cyan-500 group-hover:text-white transition-all shadow-xs">
              <QrCode className="w-5 h-5" />
            </div>
            <span className="text-xs font-black text-slate-900 group-hover:text-cyan-600 transition-colors">
              Jar Registry
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">1-Click event returns</span>
          </Link>

          {/* Action 6: Customers & CRM */}
          <Link
            href="/customers"
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all flex flex-col items-center text-center group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2 group-hover:scale-110 group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
              Customer Directory
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">Recurring & bulk</span>
          </Link>
        </div>
      </div>

      {/* =========================================================================
          4. 20L SERIALIZED JAR FLEET CUSTODY & STATUS BAR
          ========================================================================= */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Droplets className="w-5 h-5 text-sky-600" />
              20L Serialized Jar Fleet Custody
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live location breakdown of {jars?.total || 0} capitalized asset jars in circulation
            </p>
          </div>
          <Link
            href="/jars"
            className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 self-start sm:self-auto"
          >
            Manage All Jars <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Visual Multi-Segment Bar */}
        <div className="w-full bg-slate-100 rounded-2xl h-4 overflow-hidden flex mb-5 p-0.5 border border-slate-200/80">
          <div
            title={`Available: ${jars?.available || 0} jars (${pctAvailable}%)`}
            style={{ width: `${pctAvailable}%` }}
            className="bg-emerald-500 h-full rounded-l-xl transition-all duration-500"
          ></div>
          <div
            title={`In Transit: ${jars?.inTransit || 0} jars (${pctTransit}%)`}
            style={{ width: `${pctTransit}%` }}
            className="bg-blue-500 h-full transition-all duration-500"
          ></div>
          <div
            title={`With Customers: ${jars?.withCustomer || 0} jars (${pctCustomer}%)`}
            style={{ width: `${pctCustomer}%` }}
            className="bg-purple-500 h-full transition-all duration-500"
          ></div>
          <div
            title={`Returned/Inspect: ${jars?.returnedInspect || 0} jars (${pctInspect}%)`}
            style={{ width: `${pctInspect}%` }}
            className="bg-cyan-500 h-full transition-all duration-500"
          ></div>
          <div
            title={`Under Repair/Damaged: ${jars?.underRepair || 0} jars (${pctRepair}%)`}
            style={{ width: `${pctRepair}%` }}
            className="bg-rose-500 h-full rounded-r-xl transition-all duration-500"
          ></div>
        </div>

        {/* Grid of 5 Status Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Tile 1: Available */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-800">Available at Plant</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
            <span className="text-2xl font-black text-emerald-950 block mt-1">{jars?.available || 0}</span>
            <span className="text-[10px] text-emerald-700 block mt-0.5">{pctAvailable}% of fleet • Ready</span>
          </div>

          {/* Tile 2: In-Transit */}
          <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/80 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-800">On Delivery Trucks</span>
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            </div>
            <span className="text-2xl font-black text-blue-950 block mt-1">{jars?.inTransit || 0}</span>
            <span className="text-[10px] text-blue-700 block mt-0.5">{pctTransit}% of fleet • In-Transit</span>
          </div>

          {/* Tile 3: With Customers */}
          <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-200/80 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-purple-800">With Customers</span>
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            </div>
            <span className="text-2xl font-black text-purple-950 block mt-1">{jars?.withCustomer || 0}</span>
            <span className="text-[10px] text-purple-700 block mt-0.5">{pctCustomer}% of fleet • Custody</span>
          </div>

          {/* Tile 4: Factory Inspection */}
          <div className="p-3.5 rounded-2xl bg-cyan-50/60 border border-cyan-200/80 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-cyan-800">Empty Return Bay</span>
              <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
            </div>
            <span className="text-2xl font-black text-cyan-950 block mt-1">{jars?.returnedInspect || 0}</span>
            <span className="text-[10px] text-cyan-700 block mt-0.5">{pctInspect}% of fleet • Unloaded</span>
          </div>

          {/* Tile 5: Under Repair / Damaged */}
          <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200/80 text-left col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-rose-800">Repair & QA Bay</span>
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            </div>
            <span className="text-2xl font-black text-rose-950 block mt-1">{jars?.underRepair || 0}</span>
            <span className="text-[10px] text-rose-700 block mt-0.5">{pctRepair}% of fleet • Maintenance</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          5. DUAL LIVE OPERATIONS PANELS (ORDERS PIPELINE VS LIVE STREAM)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel: Today's Orders & Dispatch Telemetry */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                  <Package className="w-4 h-4 text-sky-600" />
                  Today&apos;s Order Pipeline & Dispatch Status
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Route orders scheduled for {logistics?.todayDate || getTodayIST()}
                </p>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[10px] font-bold">
                <button
                  onClick={() => setOrderStatusFilter("ALL")}
                  className={`px-2 py-1 rounded-lg transition-all ${
                    orderStatusFilter === "ALL" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  All ({allOrdersList.length})
                </button>
                <button
                  onClick={() => setOrderStatusFilter("DELIVERED")}
                  className={`px-2 py-1 rounded-lg transition-all ${
                    orderStatusFilter === "DELIVERED"
                      ? "bg-white text-emerald-800 shadow-xs"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Done
                </button>
                <button
                  onClick={() => setOrderStatusFilter("DISPATCHED")}
                  className={`px-2 py-1 rounded-lg transition-all ${
                    orderStatusFilter === "DISPATCHED"
                      ? "bg-white text-blue-800 shadow-xs"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Transit
                </button>
                <button
                  onClick={() => setOrderStatusFilter("PENDING")}
                  className={`px-2 py-1 rounded-lg transition-all ${
                    orderStatusFilter === "PENDING"
                      ? "bg-white text-amber-800 shadow-xs"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Pending
                </button>
              </div>
            </div>

            {/* Orders List */}
            <div className="space-y-2.5">
              {filteredOrders.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-500 font-semibold">No orders matching this filter.</p>
                  <Link
                    href="/orders"
                    className="inline-block mt-2 text-xs font-bold text-sky-600 hover:underline"
                  >
                    Create a new order →
                  </Link>
                </div>
              ) : (
                filteredOrders.slice(0, 5).map((ord: any) => (
                  <div
                    key={ord.id}
                    className="p-3.5 rounded-2xl bg-slate-50/80 hover:bg-slate-50 border border-slate-100 flex items-center justify-between text-xs transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-[11px] shrink-0 ${
                          ord.status === "DELIVERED"
                            ? "bg-emerald-100 text-emerald-800"
                            : ord.status === "DISPATCHED"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {ord.quantityJars}J
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900">{ord.customerName}</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-slate-200/80 text-slate-700">
                            {ord.orderType === "ONE_TIME_EVENT" ? "Bulk Event" : "Daily"}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                          <span>{ord.orderNumber}</span>
                          <span>•</span>
                          <span>₹{(ord.unitPricePaise / 100).toFixed(0)}/jar</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          ord.status === "DELIVERED"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : ord.status === "DISPATCHED"
                            ? "bg-blue-100 text-blue-800 border border-blue-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
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

          <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Fulfillment tracking updated live</span>
            <Link href="/orders" className="text-sky-600 font-bold hover:underline flex items-center gap-0.5">
              Open Full Orders Hub →
            </Link>
          </div>
        </div>

        {/* Right Panel: Live Driver Activity & Cash Stream */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">
                    Live Driver Activity & Cash Stream
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Last update: {lastLiveUpdate || "Connecting..."}
                  </p>
                </div>
              </div>

              {/* Feed Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[10px] font-bold">
                <button
                  onClick={() => setActivityTab("ALL")}
                  className={`px-2 py-1 rounded-lg transition-all ${
                    activityTab === "ALL" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setActivityTab("SCANS")}
                  className={`px-2 py-1 rounded-lg transition-all ${
                    activityTab === "SCANS" ? "bg-white text-sky-800 shadow-xs" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  QR Scans
                </button>
                <button
                  onClick={() => setActivityTab("CASH")}
                  className={`px-2 py-1 rounded-lg transition-all ${
                    activityTab === "CASH" ? "bg-white text-amber-800 shadow-xs" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Cash Collections
                </button>
              </div>
            </div>

            {/* Events Stream */}
            <div className="space-y-2.5">
              {combinedActivities.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-400">Waiting for real-time mobile driver events...</p>
                </div>
              ) : (
                combinedActivities.slice(0, 5).map((act) => (
                  <div
                    key={act.id}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-[10px] shrink-0 ${
                          act.type === "CASH" ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-sky-800"
                        }`}
                      >
                        {act.type === "CASH" ? "₹" : "QR"}
                      </div>
                      <div>
                        <span className="font-extrabold text-slate-900 block leading-tight">
                          {act.title}
                        </span>
                        <span className="text-[10px] text-slate-500 mt-0.5 block">{act.subtitle}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-mono text-slate-400 block">
                        {formatTimeIST(act.timestamp)}
                      </span>
                      {act.type === "CASH" && (
                        <button
                          onClick={() => openHandoverModal()}
                          className="mt-1 text-[10px] font-bold text-amber-700 hover:underline cursor-pointer"
                        >
                          Approve Handover →
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">PWA Mobile Driver Scanning Online</span>
            <Link href="/accounting" className="text-sky-600 font-bold hover:underline">
              View Cash Audit Log →
            </Link>
          </div>
        </div>
      </div>

      {/* =========================================================================
          6. MODAL: QUICK DRIVER CASH HANDOVER TO VAULT (ACTUAL LIVE FUNCTIONALITY)
          ========================================================================= */}
      {handoverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 relative">
            <button
              onClick={() => setHandoverModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Verify & Handover Driver Cash
                </h3>
                <p className="text-xs text-slate-500">
                  Transfer field cash from Driver Clearing (A/C 1120) into Central Vault or Bank
                </p>
              </div>
            </div>

            {handoverSuccessBanner && (
              <div className="p-3.5 mb-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold">
                {handoverSuccessBanner}
              </div>
            )}

            {handoverErrorBanner && (
              <div className="p-3.5 mb-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold">
                {handoverErrorBanner}
              </div>
            )}

            <div className="space-y-4">
              {/* Driver info */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                    Driver Account
                  </span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {selectedDriverHandover?.driverName || "Driver"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                    Un-cleared Balance
                  </span>
                  <span className="font-black text-amber-800 text-sm">
                    {formatINR(selectedDriverHandover?.totalPendingPaise || 0)}
                  </span>
                </div>
              </div>

              {/* Amount input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Verified Physical Cash Amount (₹ Rupees)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-extrabold text-slate-400">₹</span>
                  <input
                    type="number"
                    step="1"
                    value={handoverAmountRupees}
                    onChange={(e) => setHandoverAmountRupees(e.target.value)}
                    placeholder="Enter verified cash amount"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 font-extrabold text-slate-900 text-base focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Target Account selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Deposit Target Account
                </label>
                <select
                  value={handoverTargetAccount}
                  onChange={(e) => setHandoverTargetAccount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-800 text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                >
                  <option value={1110}>1110 — Central Vault Cash-in-Hand (Physical Safe)</option>
                  <option value={1130}>1130 — Operating Bank Current Account</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Handover Notes / Verification Memo
                </label>
                <input
                  type="text"
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  placeholder="e.g. End of day cash count verified by cashier"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Double-Entry Preview Box */}
              <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/80 text-[11px] space-y-1">
                <span className="font-extrabold text-amber-900 block">General Ledger Journal Preview:</span>
                <div className="flex justify-between font-mono text-amber-800">
                  <span>Dr. {handoverTargetAccount} {handoverTargetAccount === 1110 ? "Central Vault Cash" : "Bank Current"}</span>
                  <span className="font-bold">+₹{parseFloat(handoverAmountRupees || "0").toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-mono text-amber-800">
                  <span>Cr. 1120 Driver Collection Clearing</span>
                  <span className="font-bold">-₹{parseFloat(handoverAmountRupees || "0").toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Modal actions */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setHandoverModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmHandover}
                disabled={isSubmittingHandover}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmittingHandover ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Posting to Ledger...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Confirm Vault Handover
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
