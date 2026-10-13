"use client";

import { useEffect, useState } from "react";
import {
  Truck,
  QrCode,
  CheckCircle,
  MapPin,
  Camera,
  Coins,
  RefreshCw,
  X,
  LogOut,
  Calendar,
  Clock,
  ChevronRight,
  PackageCheck,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { formatINR } from "@/lib/utils";
import { formatTimeIST, getTodayIST } from "@/lib/date-utils";
import QrCameraScanner from "@/components/QrCameraScanner";

export default function DriverAppPage() {
  // Driver Auth State
  const [driverUser, setDriverUser] = useState<any>(null);
  const [selectedDriverId, setSelectedDriverId] = useState("usr_driver_01");
  const [pinInput, setPinInput] = useState("");
  const [loginError, setLoginError] = useState("");

  // Navigation Tab: "DELIVERY" | "TIMELINE"
  const [activeTab, setActiveTab] = useState<"DELIVERY" | "TIMELINE">("DELIVERY");

  // Workflow State for Delivery: STEP 1: Scan Customer, STEP 2: Scan Jars, STEP 3: Complete
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [customerCodeInput, setCustomerCodeInput] = useState("");
  const [scannedJars, setScannedJars] = useState<string[]>([]);
  const [cashCollected, setCashCollected] = useState("0");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txSuccess, setTxSuccess] = useState<any>(null);

  // Camera Scanner Modal State
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [scanTarget, setScanTarget] = useState<"CUSTOMER" | "JAR">("CUSTOMER");

  // Timeline State
  const [timelineDate, setTimelineDate] = useState(getTodayIST());
  const [timelineData, setTimelineData] = useState<any>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Network State
  const [isOnline, setIsOnline] = useState(true);

  // Load Driver Session on mount
  useEffect(() => {
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const saved = localStorage.getItem("sw_driver_session");
    if (saved) {
      try {
        setDriverUser(JSON.parse(saved));
      } catch (e) {}
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Fetch Timeline whenever timelineDate or tab changes
  const fetchTimeline = () => {
    if (!driverUser) return;
    setTimelineLoading(true);
    fetch(`/api/driver/timeline?driverId=${driverUser.id}&date=${timelineDate}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setTimelineData(data);
        }
        setTimelineLoading(false);
      })
      .catch(() => setTimelineLoading(false));
  };

  useEffect(() => {
    if (activeTab === "TIMELINE" && driverUser) {
      fetchTimeline();
    }
  }, [activeTab, timelineDate, driverUser]);

  // Handle Driver Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    // Default PIN: 1234
    if (pinInput !== "1234") {
      setLoginError("Invalid PIN. Default PIN: 1234");
      return;
    }

    const driverProfiles: Record<string, any> = {
      usr_driver_01: { id: "usr_driver_01", name: "Vikram Singh", vehicle: "UP 25 SW 1001" },
      usr_driver_02: { id: "usr_driver_02", name: "Ramesh Kumar", vehicle: "UP 25 SW 1002" },
    };

    const profile = driverProfiles[selectedDriverId] || driverProfiles.usr_driver_01;
    setDriverUser(profile);
    localStorage.setItem("sw_driver_session", JSON.stringify(profile));
  };

  const handleLogout = () => {
    setDriverUser(null);
    localStorage.removeItem("sw_driver_session");
  };

  // STEP 1: Resolve Customer by QR Token or Code
  const handleResolveCustomer = async (code: string) => {
    const raw = code.trim();
    if (!raw) return;

    // VICE-VERSA GUARD: Reject if driver scans a Jar QR while in Customer step
    const isJarQr =
      raw.startsWith("urn:sw:j:") ||
      raw.toUpperCase().startsWith("JAR-") ||
      raw.toLowerCase().startsWith("jar_") ||
      raw.includes("20L");

    if (isJarQr) {
      alert("❌ Galat QR Code! Ye 20L Water Jar ka QR sticker hai.\nKripya pehle Grahak ka Customer Station QR sticker scan karein.");
      return;
    }

    const clean = raw.replace("urn:sw:c:", "").trim();

    try {
      const res = await fetch(`/api/customers?customerId=${encodeURIComponent(clean)}`);
      const data = await res.json();
      if (res.ok && data.customer) {
        setCustomerInfo(data.customer);
        setCurrentStep(2);
        setCameraModalOpen(false);
      } else {
        alert(data.error || `Customer '${clean}' not found. Please verify the customer QR sticker.`);
      }
    } catch (e: any) {
      alert("Network error resolving customer. Check connection.");
    }
  };

  // STEP 2: Add Jar Code
  const handleAddJar = (code: string): boolean => {
    const raw = code.trim();
    if (!raw) return false;

    // GUARD 1: Reject if driver accidentally scans Customer QR while in Jar scanning step
    const isCustomerQr =
      raw.startsWith("urn:sw:c:") ||
      raw.toUpperCase().startsWith("CUST-") ||
      raw.toLowerCase().startsWith("cust_") ||
      (customerInfo && (
        raw === customerInfo.customerCode ||
        raw === customerInfo.id ||
        raw === customerInfo.phone ||
        raw.toLowerCase() === (customerInfo.customerCode || "").toLowerCase()
      ));

    if (isCustomerQr) {
      alert("❌ Galat QR Code! Ye Customer Station QR hai, 20L Water Jar nahi.\nKripya 20L Water Jar par chipka hua QR code scan karein.");
      return false;
    }

    // Normalize jar code (strip urn:sw:j: prefix if present)
    const cleanJar = raw.replace("urn:sw:j:", "").trim();

    // GUARD 2: Prevent duplicate scans in the same delivery batch
    if (scannedJars.includes(cleanJar) || scannedJars.includes(raw)) {
      alert(`⚠️ Jar '${cleanJar}' is delivery batch mein pehle se shamil hai!`);
      return false;
    }

    setScannedJars((prev) => [...prev, cleanJar]);
    return true;
  };

  // Remove Jar from list
  const handleRemoveJar = (idx: number) => {
    const updated = scannedJars.filter((_, i) => i !== idx);
    setScannedJars(updated);
  };

  // STEP 3: Complete Transaction
  const handleCompleteTransaction = async () => {
    if (!driverUser || !customerInfo || scannedJars.length === 0) return;

    setIsSubmitting(true);
    try {
      const cashPaise = Math.round(Number(cashCollected || 0) * 100);

      const res = await fetch("/api/driver/deliver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId: driverUser.id,
          customerIdentifier: customerInfo.id,
          jarCodes: scannedJars,
          unitPricePaise: currentRateRupees * 100,
          cashCollectedPaise: cashPaise,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setTxSuccess({
          customerName: customerInfo.fullName,
          jarsCount: scannedJars.length,
          jarCodes: scannedJars,
          orderNumber: data.orderNumber,
          totalAmountPaise: data.totalAmountPaise || currentTotalRupees * 100,
          cashCollectedPaise: cashPaise,
          receiptNumber: data.cashReceiptNumber || data.receiptNumber,
        });

        // Reset for next delivery
        setCustomerInfo(null);
        setCustomerCodeInput("");
        setScannedJars([]);
        setCashCollected("0");
        setCurrentStep(1);
      } else {
        alert(data.error || "Failed to submit delivery transaction.");
      }
    } catch (err: any) {
      alert(`Delivery submission failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentRateRupees = Math.round(
    (customerInfo?.pricePerJarPaise ??
      customerInfo?.customPrice?.pricePerJarPaise ??
      customerInfo?.priceAgreements?.[0]?.pricePerJarPaise ??
      3500) / 100
  );
  const currentTotalRupees = scannedJars.length * currentRateRupees;

  // =========================================================================
  // VIEW 1: DRIVER PIN LOGIN SCREEN
  // =========================================================================
  if (!driverUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-sm bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-sky-600 text-white flex items-center justify-center mx-auto mb-3 shadow-lg">
              <Truck className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Sai Waters</h1>
            <p className="text-xs font-bold text-sky-700 uppercase tracking-widest mt-0.5">
              Driver Field Portal & Scanner
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Select Driver Profile:</label>
              <select
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 bg-white"
              >
                <option value="usr_driver_01">Vikram Singh (UP 25 SW 1001)</option>
                <option value="usr_driver_02">Ramesh Kumar (UP 25 SW 1002)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Enter Driver PIN:</label>
              <input
                type="password"
                maxLength={4}
                placeholder="Default: 1234"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-full p-3 text-center tracking-widest text-xl font-black rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                autoFocus
              />
              <span className="text-[11px] text-slate-400 block text-center mt-1">Default Driver PIN: 1234</span>
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold text-center">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-black text-sm shadow-md transition-all cursor-pointer"
            >
              Sign In to Delivery App
            </button>
          </form>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: LOGGED-IN DRIVER PWA DASHBOARD
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between max-w-md mx-auto shadow-2xl relative">
      {/* Top Mobile App Header */}
      <div className="bg-slate-900 text-white p-4 shadow-md sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-600 flex items-center justify-center font-black text-white shadow-xs">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-black tracking-tight block leading-tight">
                {driverUser.name}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {driverUser.vehicle} • {isOnline ? "🟢 Online" : "🔴 Offline"}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher: Delivery vs Timeline */}
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab("DELIVERY")}
            className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "DELIVERY"
                ? "bg-sky-600 text-white shadow-xs"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <PackageCheck className="w-4 h-4" />
            <span>Nayi Delivery</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("TIMELINE")}
            className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "TIMELINE"
                ? "bg-sky-600 text-white shadow-xs"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Rozana Timeline</span>
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 p-4 space-y-4">
        {/* ========================================================================= */}
        {/* TAB 1: DELIVERY WORKFLOW */}
        {/* ========================================================================= */}
        {activeTab === "DELIVERY" && (
          <>
            {/* Success Celebration Alert if just delivered */}
            {txSuccess && (
              <div className="p-4 bg-emerald-500 text-white rounded-2xl shadow-lg animate-in fade-in space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-black text-sm">Delivery Recorded!</span>
                  </div>
                  <button onClick={() => setTxSuccess(null)} className="text-white/80 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-xs text-emerald-50 bg-emerald-600/60 p-2.5 rounded-xl space-y-0.5">
                  <p>Customer: <strong>{txSuccess.customerName}</strong></p>
                  <p>Jars: <strong>{txSuccess.jarsCount} Containers</strong> ({txSuccess.jarCodes?.join(", ")})</p>
                  <p>Order: <strong>{txSuccess.orderNumber}</strong></p>
                  {txSuccess.cashCollectedPaise > 0 && (
                    <p>Cash Collected: <strong>{formatINR(txSuccess.cashCollectedPaise)}</strong> (Receipt: {txSuccess.receiptNumber})</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 1: Scan Customer Station QR */}
            {currentStep === 1 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 font-black flex items-center justify-center text-sm">
                    1
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-900">Step 1: Grahak Station QR Scan Karein</h2>
                    <p className="text-[11px] text-slate-500">
                      Grahak ke ghar/shop par laga hua Sai Waters station QR scan karein
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setScanTarget("CUSTOMER");
                    setCameraModalOpen(true);
                  }}
                  className="w-full py-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <Camera className="w-5 h-5" />
                  <span>📷 Scan Customer Station QR</span>
                </button>

                <div className="flex items-center gap-2">
                  <div className="h-px bg-slate-200 flex-1"></div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Ya Code Likhein</span>
                  <div className="h-px bg-slate-200 flex-1"></div>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleResolveCustomer(customerCodeInput);
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    placeholder="e.g. CUST-001 ya Phone..."
                    value={customerCodeInput}
                    onChange={(e) => setCustomerCodeInput(e.target.value)}
                    className="flex-1 p-3 rounded-xl border border-slate-300 text-sm font-semibold"
                  />
                  <button
                    type="submit"
                    className="px-4 py-3 bg-slate-900 text-white font-bold text-xs rounded-xl"
                  >
                    OK
                  </button>
                </form>
              </div>
            )}

            {/* Step 2: Customer Verified & Scan Jars One-by-One */}
            {currentStep === 2 && customerInfo && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
                {/* Customer Banner */}
                <div className="p-3.5 bg-sky-50 rounded-xl border border-sky-200 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase text-sky-700">Customer Verified</span>
                      <span className="text-[10px] font-black bg-sky-200/80 text-sky-900 px-2 py-0.5 rounded-md">
                        Allotted Rate: ₹{currentRateRupees}/Jar
                      </span>
                    </div>
                    <h3 className="text-sm font-black text-slate-900">{customerInfo.fullName}</h3>
                    <p className="text-[11px] text-slate-600 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-sky-600 shrink-0" />
                      {customerInfo.addresses?.[0]?.streetAddress || "Registered Location"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep(1);
                      setCustomerInfo(null);
                      setScannedJars([]);
                    }}
                    className="text-[10px] font-bold text-slate-400 hover:text-slate-600 underline"
                  >
                    Change
                  </button>
                </div>

                {/* Scan Jars Button */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                    <span>Step 2: Deliver kiye gaye Jars Scan Karein:</span>
                    <span className="text-sky-600">Rate: ₹{currentRateRupees}/Jar</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setScanTarget("JAR");
                      setCameraModalOpen(true);
                    }}
                    className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    <QrCode className="w-5 h-5" />
                    <span>📷 Scan 20L Full Jar QR (+1)</span>
                  </button>
                </div>

                {/* Scanned Jars List */}
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                  <div className="flex justify-between items-center text-xs font-extrabold text-slate-700 pb-1 border-b border-slate-200">
                    <span>Jars Ready to Deliver ({scannedJars.length})</span>
                    <span>Total: ₹{currentTotalRupees}</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 min-h-12 items-center">
                    {scannedJars.map((code, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-mono font-bold text-slate-800 shadow-2xs"
                      >
                        <span>{code}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveJar(idx)}
                          className="text-rose-400 hover:text-rose-600 p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {scannedJars.length === 0 && (
                      <span className="text-xs text-slate-400 italic py-1">
                        Abhi koi jar scan nahi kiya. Upar camera button dabayein.
                      </span>
                    )}
                  </div>
                </div>

                {/* Cash Collected on Doorstep */}
                <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-amber-900 block">Cash Collected on Doorstep (₹):</label>
                    <span className="text-[10px] text-amber-700">
                      Default ₹0 (Monthly Billing) • Order Amount: <strong>₹{currentTotalRupees}</strong>
                    </span>
                  </div>
                  <input
                    type="number"
                    value={cashCollected}
                    onChange={(e) => setCashCollected(e.target.value)}
                    className="w-24 p-2 rounded-lg border border-amber-300 text-sm font-black text-slate-900 text-right focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Confirm Delivery Button */}
                <button
                  type="button"
                  onClick={handleCompleteTransaction}
                  disabled={scannedJars.length === 0 || isSubmitting}
                  className={`w-full py-4 rounded-2xl font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    scannedJars.length > 0
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-5 h-5" />
                  )}
                  <span>
                    {isSubmitting
                      ? "Recording Delivery..."
                      : `Delivery Confirm Karein (${scannedJars.length} Jars • ₹${currentTotalRupees})`}
                  </span>
                </button>
              </div>
            )}
          </>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ROZANA TIMELINE (DAY-WISE LOG) */}
        {/* ========================================================================= */}
        {activeTab === "TIMELINE" && (
          <div className="space-y-4">
            {/* Date Selector & Daily Summary Card */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-sky-600" />
                  <span className="text-xs font-black text-slate-900">Rozana Delivery Hisaab</span>
                </div>
                <input
                  type="date"
                  value={timelineDate}
                  onChange={(e) => setTimelineDate(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 font-bold text-slate-700"
                />
              </div>

              {/* Day Metrics Grid */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                <div className="p-2.5 bg-sky-50 rounded-xl border border-sky-100">
                  <span className="text-[10px] text-sky-700 font-bold block">Deliveries</span>
                  <span className="text-base font-black text-sky-950">
                    {timelineData?.totalDeliveries || 0}
                  </span>
                </div>
                <div className="p-2.5 bg-purple-50 rounded-xl border border-purple-100">
                  <span className="text-[10px] text-purple-700 font-bold block">Jars Diye</span>
                  <span className="text-base font-black text-purple-950">
                    {timelineData?.totalJars || 0}
                  </span>
                </div>
                <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
                  <span className="text-[10px] text-emerald-700 font-bold block">Cash Jama</span>
                  <span className="text-base font-black text-emerald-950">
                    {formatINR(timelineData?.totalCashCollectedPaise || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Timeline Stream */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                Day Timeline ({timelineDate})
              </h3>

              {timelineLoading ? (
                <div className="text-center py-10 text-xs text-slate-400">Loading timeline data...</div>
              ) : !timelineData || timelineData.timeline?.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200">
                  <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  Is din abhi tak koi delivery record nahi hui.
                </div>
              ) : (
                timelineData.timeline.map((item: any, idx: number) => (
                  <div
                    key={item.orderId || idx}
                    className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-mono text-[10px] font-black">
                          {item.timestamp ? formatTimeIST(item.timestamp) : item.time}
                        </span>
                        <div>
                          <h4 className="font-black text-slate-900 text-sm leading-tight">
                            {item.customerName}
                          </h4>
                          <span className="text-[10px] text-slate-400">({item.customerCode})</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        {item.quantityJars} Jars
                      </span>
                    </div>

                    {item.address && (
                      <p className="text-[11px] text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        {item.address}
                      </p>
                    )}

                    {/* Jars Serial Tokens */}
                    {item.jarCodes && item.jarCodes.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {item.jarCodes.map((j: string, jIdx: number) => (
                          <span
                            key={jIdx}
                            className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-mono font-bold text-slate-700"
                          >
                            {j}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        Bill: <strong>{formatINR(item.totalAmountPaise)}</strong>
                      </span>
                      <span className="text-emerald-700 font-black">
                        Cash Mila: {formatINR(item.cashCollectedPaise)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* CAMERA SCANNER MODAL */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* PHONEPE-STYLE FULL PAGE CAMERA SCANNER */}
      {/* ========================================================================= */}
      {cameraModalOpen && (
        <QrCameraScanner
          title={scanTarget === "CUSTOMER" ? "Scan Customer Station QR" : "Scan 20L Jar QR"}
          subtitle={
            scanTarget === "CUSTOMER"
              ? "Customer QR sticker ko square frame mein align karein"
              : "20L Jar sticker ko square frame mein align karein"
          }
          placeholderText={
            scanTarget === "CUSTOMER"
              ? "Enter Customer Code (e.g. CUST-001)..."
              : "Enter Jar Code (e.g. JAR-20L-0012)..."
          }
          helperText={
            scanTarget === "CUSTOMER"
              ? "Point camera at Customer Station QR"
              : "Point camera at 20L Jar QR sticker"
          }
          onClose={() => setCameraModalOpen(false)}
          onScanSuccess={(code) => {
            if (scanTarget === "CUSTOMER") {
              handleResolveCustomer(code);
            } else {
              const added = handleAddJar(code);
              if (added) {
                setCameraModalOpen(false);
              }
            }
          }}
          onManualSubmit={(code) => {
            if (scanTarget === "CUSTOMER") {
              handleResolveCustomer(code);
            } else {
              const added = handleAddJar(code);
              if (added) {
                setCameraModalOpen(false);
              }
            }
          }}
        />
      )}
    </div>
  );
}
