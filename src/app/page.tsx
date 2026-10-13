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
  Radio,
  CheckCircle2,
} from "lucide-react";
import { formatINR } from "@/lib/utils";
import { formatTimeIST } from "@/lib/date-utils";

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [depreciating, setDepreciating] = useState(false);
  const [depreciationMsg, setDepreciationMsg] = useState("");

  // Live Driver Events Stream
  const [recentMovements, setRecentMovements] = useState<any[]>([]);
  const [recentCashEvents, setRecentCashEvents] = useState<any[]>([]);
  const [lastLiveUpdate, setLastLiveUpdate] = useState<string>("");
  const [livePulsing, setLivePulsing] = useState(false);
  const pollTimerRef = useRef<any>(null);

  const loadStats = () => {
    fetch("/api/dashboard/stats")
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load dashboard stats:", err);
        setLoading(false);
      });
  };

  const pollLiveEvents = () => {
    fetch("/api/sync/events")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setRecentMovements(data.recentMovements || []);
          setRecentCashEvents(data.recentCashEvents || []);
          setLastLiveUpdate(formatTimeIST(new Date()));
          setLivePulsing(true);
          setTimeout(() => setLivePulsing(false), 1200);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadStats();
    pollLiveEvents();

    // Auto-poll driver events every 5 seconds to keep localhost continuously updated
    pollTimerRef.current = setInterval(() => {
      pollLiveEvents();
      loadStats();
    }, 5000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

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
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-600 text-sm font-semibold">Loading Sai Waters ERP Real-Time Data...</p>
        </div>
      </div>
    );
  }

  const { jars, logistics, financials, crm } = stats || {};

  return (
    <div className="space-y-6">
      {/* Top Banner: Status & Double-Entry Health */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-sky-100 text-sky-800 border border-sky-200 uppercase tracking-wider">
              Business Command
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
              GST: Unregistered (Bill of Supply)
            </span>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className={`w-2 h-2 rounded-full bg-emerald-500 ${livePulsing ? "scale-150 animate-ping" : ""}`}></span>
              <span>Driver Sync: Live Polling</span>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Sai Waters ERP Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            20L Jar Logistics, Mobile Driver Scanning, and Strict Double-Entry General Ledger
          </p>
        </div>

        {/* Double-Entry Ledger Verification Card */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-800 shadow-xs">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="text-left">
              <span className="text-[10px] font-extrabold text-emerald-600 block uppercase tracking-wider">
                Double-Entry Balance
              </span>
              <span className="text-xs font-bold text-emerald-900">
                {financials?.isTrialBalanceBalanced
                  ? "Ledger Invariant Verified (Σ Dr = Σ Cr)"
                  : "Ledger Discrepancy Detected!"}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              loadStats();
              pollLiveEvents();
            }}
            title="Refresh Real-Time Data"
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors shadow-xs cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Depreciation Alert if any */}
      {depreciationMsg && (
        <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 text-xs sm:text-sm font-semibold flex items-center justify-between">
          <span>{depreciationMsg}</span>
          <button onClick={() => setDepreciationMsg("")} className="text-xs underline font-bold cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Financial Health Overview (4 Pillars) */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Financial & Cash Clearing Controls
          </h2>
          <span className="text-[11px] text-slate-400 font-medium">Auto-updated via local PGlite</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Central Vault Cash */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Vault Cash-in-Hand</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">
              {formatINR(financials?.vaultCashPaise || 0)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Verified physical cash in central vault (A/C 1110)</p>
          </div>

          {/* Driver Cash Clearing */}
          <Link
            href="/accounting?tab=CASH_REC"
            className="bg-amber-50/50 p-5 rounded-2xl border border-amber-200/90 shadow-xs hover:border-amber-400 hover:shadow-md transition-all group block cursor-pointer"
          >
            <div className="flex items-center justify-between text-amber-700 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider group-hover:text-amber-900 transition-colors">
                Driver Cash Clearing
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-900">
              {formatINR(financials?.driverClearingPaise || 0)}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-amber-200/60 text-[11px]">
              <span className="text-amber-800/80">Awaiting cashier handover (A/C 1120)</span>
              <span className="font-bold text-amber-800 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 shrink-0">
                Verify & Approve →
              </span>
            </div>
          </Link>

          {/* Operating Bank Balance */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Bank Current Account</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">
              {formatINR(financials?.bankBalancePaise || 0)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Primary operating bank balance (A/C 1130)</p>
          </div>

          {/* Accounts Receivable */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Accounts Receivable</span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">
              {formatINR(financials?.accountsReceivablePaise || 0)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Customer outstanding dues balance (A/C 1150)</p>
          </div>
        </div>
      </div>

      {/* Jar Asset Inventory Grid */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Individually Serialized 20L Jar Inventory
          </h2>
          <Link
            href="/jars"
            className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
          >
            Manage All Jars <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-xs">
            <span className="text-[11px] text-slate-500 font-bold block">Total Jars Owned</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{jars?.total || 0}</span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Capitalized Asset Pool</span>
          </div>

          <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 text-center shadow-xs">
            <span className="text-[11px] text-emerald-800 font-bold block">Available at Plant</span>
            <span className="text-2xl font-black text-emerald-800 mt-1 block">{jars?.available || 0}</span>
            <span className="text-[10px] text-emerald-600 mt-0.5 block">Ready for Dispatch</span>
          </div>

          <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200 text-center shadow-xs">
            <span className="text-[11px] text-blue-800 font-bold block">In Transit / Trucks</span>
            <span className="text-2xl font-black text-blue-800 mt-1 block">{jars?.inTransit || 0}</span>
            <span className="text-[10px] text-blue-600 mt-0.5 block">On Delivery Routes</span>
          </div>

          <div className="bg-purple-50/60 p-4 rounded-xl border border-purple-200 text-center shadow-xs">
            <span className="text-[11px] text-purple-800 font-bold block">With Customers</span>
            <span className="text-2xl font-black text-purple-800 mt-1 block">{jars?.withCustomer || 0}</span>
            <span className="text-[10px] text-purple-600 mt-0.5 block">Customer Custody</span>
          </div>

          <div className="bg-cyan-50/60 p-4 rounded-xl border border-cyan-200 text-center shadow-xs">
            <span className="text-[11px] text-cyan-800 font-bold block">Factory Inspection</span>
            <span className="text-2xl font-black text-cyan-800 mt-1 block">{jars?.returnedInspect || 0}</span>
            <span className="text-[10px] text-cyan-600 mt-0.5 block">Empties Returned</span>
          </div>

          <div className="bg-rose-50/60 p-4 rounded-xl border border-rose-200 text-center shadow-xs">
            <span className="text-[11px] text-rose-800 font-bold block">Under Repair / QA</span>
            <span className="text-2xl font-black text-rose-800 mt-1 block">{jars?.underRepair || 0}</span>
            <span className="text-[10px] text-rose-600 mt-0.5 block">Maintenance Bay</span>
          </div>
        </div>
      </div>

      {/* Real-Time Live Driver Activity Feed & Logistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Live Driver Scanning Feed */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Live Driver Field Stream
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                Updated: {lastLiveUpdate || "Connecting..."}
              </span>
            </div>

            <div className="space-y-2.5">
              {recentMovements.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  Waiting for driver scan events...
                </p>
              ) : (
                recentMovements.slice(0, 4).map((m: any) => (
                  <div
                    key={m.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                        QR
                      </div>
                      <div>
                        <span className="font-extrabold text-slate-900 block">
                          {m.jarCode || "20L Jar"} → {m.eventType}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          by {m.actorName || "Driver"}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatTimeIST(m.createdAt)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Driver remote phone scanning connected</span>
            <Link href="/jars" className="text-sky-600 font-bold hover:underline">
              View Movement Log →
            </Link>
          </div>
        </div>

        {/* Dispatch Progress & Orders Routing */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm">Today&apos;s Delivery Progress</h3>
              <span className="text-xs font-semibold text-slate-500">{logistics?.todayDate}</span>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>Deliveries Completed</span>
                  <span className="text-emerald-700">
                    {logistics?.todayDelivered || 0} of {logistics?.todayTotalOrders || 0} (
                    {logistics?.todayTotalOrders
                      ? Math.round((logistics.todayDelivered / logistics.todayTotalOrders) * 100)
                      : 0}
                    %)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        logistics?.todayTotalOrders
                          ? Math.round((logistics.todayDelivered / logistics.todayTotalOrders) * 100)
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block text-[10px]">Scheduled</span>
                  <span className="text-base font-bold text-slate-900">{logistics?.todayTotalOrders || 0}</span>
                </div>
                <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                  <span className="text-emerald-700 block text-[10px]">Delivered</span>
                  <span className="text-base font-bold text-emerald-800">{logistics?.todayDelivered || 0}</span>
                </div>
                <div className="bg-amber-50 p-2 rounded-xl border border-amber-100">
                  <span className="text-amber-700 block text-[10px]">In Transit</span>
                  <span className="text-base font-bold text-amber-800">{logistics?.todayPending || 0}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Live order fulfillment status</span>
            <Link href="/orders" className="text-sky-600 font-bold hover:underline">
              View All Orders & Deliveries →
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Actions Dock */}
      <div>
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
          Operational Dock
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Link
            href="/jars"
            className="p-4 rounded-xl bg-white border border-slate-200 hover:border-sky-300 hover:shadow-md transition-all flex flex-col items-center text-center group"
          >
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
              <QrCode className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800">Scan Jar QR</span>
            <span className="text-[10px] text-slate-400">Camera lookup</span>
          </Link>

          <Link
            href="/driver"
            className="p-4 rounded-xl bg-white border border-slate-200 hover:border-purple-300 hover:shadow-md transition-all flex flex-col items-center text-center group"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
              <Smartphone className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800">Driver Portal</span>
            <span className="text-[10px] text-slate-400">Mobile scanning</span>
          </Link>

          <Link
            href="/orders"
            className="p-4 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col items-center text-center group"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
              <Droplets className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800">New Order</span>
            <span className="text-[10px] text-slate-400">Recurring or event</span>
          </Link>

          <Link
            href="/invoices"
            className="p-4 rounded-xl bg-white border border-slate-200 hover:border-amber-300 hover:shadow-md transition-all flex flex-col items-center text-center group"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
              <Receipt className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800">Invoices</span>
            <span className="text-[10px] text-slate-400">UPI & WhatsApp</span>
          </Link>

          <Link
            href="/accounting"
            className="p-4 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col items-center text-center group"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800">General Ledger</span>
            <span className="text-[10px] text-slate-400">Trial Balance & P&L</span>
          </Link>

          <Link
            href="/backup"
            className="p-4 rounded-xl bg-white border border-slate-200 hover:border-purple-300 hover:shadow-md transition-all flex flex-col items-center text-center group"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
              <Database className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800">Backup & Data</span>
            <span className="text-[10px] text-slate-400">Local snapshots</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
