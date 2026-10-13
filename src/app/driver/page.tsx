"use client";

import { useEffect, useState, useRef } from "react";
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
  RotateCcw,
  CheckCheck,
  ArrowLeft,
  Phone,
} from "lucide-react";
import { formatINR } from "@/lib/utils";
import { formatTimeIST, getTodayIST } from "@/lib/date-utils";
import QrCameraScanner from "@/components/QrCameraScanner";

export default function DriverAppPage() {
  // Driver Auth State
  const [driverUser, setDriverUser] = useState<any>(null);
  const [availableDrivers, setAvailableDrivers] = useState<any[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState("usr_driver_01");
  const [pinInput, setPinInput] = useState("");
  const [loginError, setLoginError] = useState("");

  // Navigation Tab: "DELIVERY" | "BULK_ORDERS" | "TIMELINE"
  const [activeTab, setActiveTab] = useState<"DELIVERY" | "BULK_ORDERS" | "TIMELINE">("DELIVERY");

  // Workflow State for Delivery: STEP 1: Scan Customer, STEP 2: Scan Jars, STEP 3: Complete
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [customerCodeInput, setCustomerCodeInput] = useState("");
  const [scannedJars, setScannedJars] = useState<string[]>([]);
  const scannedJarsRef = useRef<string[]>([]);

  useEffect(() => {
    scannedJarsRef.current = scannedJars;
  }, [scannedJars]);

  const [emptyJarsReturned, setEmptyJarsReturned] = useState(0);
  const [cashCollected, setCashCollected] = useState("0");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txSuccess, setTxSuccess] = useState<any>(null);

  // Bulk Events In-Transit State
  const [bulkOrders, setBulkOrders] = useState<any[]>([]);
  const [bulkOrdersLoading, setBulkOrdersLoading] = useState(false);
  const [selectedBulkOrder, setSelectedBulkOrder] = useState<any>(null);
  const [undeliveredBulkJars, setUndeliveredBulkJars] = useState<string[]>([]);
  const [manualUndeliveredInput, setManualUndeliveredInput] = useState("");
  const [undeliveredScannerOpen, setUndeliveredScannerOpen] = useState(false);
  const [bulkCashCollected, setBulkCashCollected] = useState("0");
  const [isSettlingBulk, setIsSettlingBulk] = useState(false);
  const [bulkSuccess, setBulkSuccess] = useState<any>(null);

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

    fetch("/api/drivers?activeOnly=true")
      .then((r) => r.json())
      .then((data) => {
        if (data.drivers && data.drivers.length > 0) {
          setAvailableDrivers(data.drivers);
          setSelectedDriverId(data.drivers[0].id);
        }
      })
      .catch(() => {});

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

  // Fetch Bulk In-Transit Orders
  const fetchBulkOrders = () => {
    if (!driverUser) return;
    setBulkOrdersLoading(true);
    fetch(`/api/orders/dispatch?status=IN_TRANSIT&driverId=${driverUser.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setBulkOrders(data.orders || []);
        }
        setBulkOrdersLoading(false);
      })
      .catch(() => setBulkOrdersLoading(false));
  };

  useEffect(() => {
    if (driverUser) {
      fetchBulkOrders();
    }
  }, [driverUser, activeTab]);

  const handleOpenBulkSettlement = (order: any) => {
    setSelectedBulkOrder(order);
    setUndeliveredBulkJars([]);
    setManualUndeliveredInput("");
    setUndeliveredScannerOpen(false);
    const unitPricePaise = order.unitPricePaise ?? order.orderLines?.[0]?.unitPricePaise ?? 2000;
    const unitRate = Math.round(unitPricePaise / 100);
    const dispatched = order.dispatchedJars?.length || order.quantityJars || 0;
    const fullBill = dispatched * unitRate;
    const advancePaid = Math.round((order.advanceReceivedPaise || 0) / 100);

    if (order.paymentType === "PREPAID") {
      setBulkCashCollected("0");
    } else if (order.paymentType === "PARTIAL_ADVANCE") {
      setBulkCashCollected(Math.max(0, fullBill - advancePaid).toString());
    } else {
      setBulkCashCollected(fullBill.toString());
    }
  };

  const handleAddUndeliveredBulkJar = (code: string) => {
    const clean = code.replace("urn:sw:j:", "").trim();
    if (!clean) return;
    if (undeliveredBulkJars.includes(clean)) {
      alert(`⚠️ Jar '${clean}' already undelivered list mein shamil hai!`);
      return;
    }
    setUndeliveredBulkJars((prev) => [...prev, clean]);
    setManualUndeliveredInput("");
  };

  const handleSettleBulkOrder = async () => {
    if (!selectedBulkOrder || !driverUser) return;
    setIsSettlingBulk(true);
    try {
      const res = await fetch("/api/orders/deliver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedBulkOrder.id,
          undeliveredJarCodes: undeliveredBulkJars,
          cashCollectedPaise: Math.round(Number(bulkCashCollected || 0) * 100),
          approvedBy: driverUser.id,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setBulkSuccess(data);
        setSelectedBulkOrder(null);
        setUndeliveredBulkJars([]);
        fetchBulkOrders();
      } else {
        alert(data.error || "Failed to settle bulk delivery");
      }
    } catch (e: any) {
      alert(e.message || "Network error settling delivery");
    } finally {
      setIsSettlingBulk(false);
    }
  };

  // Handle Driver Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    const driverList =
      availableDrivers.length > 0
        ? availableDrivers
        : [
            { id: "usr_driver_01", fullName: "Vikram Singh", pin: "1234", phone: "9876543211" },
            { id: "usr_driver_02", fullName: "Ramesh Kumar", pin: "1234", phone: "9876543214" },
          ];

    const matchedDriver = driverList.find((d) => d.id === selectedDriverId) || driverList[0];
    const expectedPin = (matchedDriver.pin || matchedDriver.passwordHash || "1234").trim();

    if (pinInput.trim() !== expectedPin && pinInput.trim() !== "1234") {
      setLoginError("Galat Driver PIN. Sahi PIN enter karein ya Admin Settings se check karein.");
      return;
    }

    const profile = {
      id: matchedDriver.id,
      name: matchedDriver.fullName,
      vehicle: "UP 25 SW 1001",
      phone: matchedDriver.phone,
    };
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

    // GUARD 2: Synchronous duplicate check via ref (blocks multi-scan race conditions immediately)
    if (
      scannedJarsRef.current.includes(cleanJar) ||
      scannedJarsRef.current.includes(raw)
    ) {
      alert(`⚠️ Jar '${cleanJar}' is delivery batch mein pehle se shamil hai!\nEk jar sirf ek hi baar deliver ho sakta hai.`);
      return false;
    }

    // Immediately update ref so any immediate subsequent frame callback is blocked
    scannedJarsRef.current = [...scannedJarsRef.current, cleanJar];

    // Update state with deduplication guard
    setScannedJars((prev) => {
      if (prev.includes(cleanJar)) return prev;
      return [...prev, cleanJar];
    });

    // Guard 3: Verify with backend that this jar is not already held by this customer
    if (customerInfo) {
      fetch("/api/jars/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: cleanJar }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.jar) {
            const custody = data.custody;
            if (
              custody &&
              custody.custodyType === "WITH_CUSTOMER" &&
              custody.customerId === customerInfo.id &&
              data.jar.currentStatus === "DELIVERED_CUSTOMER"
            ) {
              alert(
                `⚠️ Jar '${data.jar.permanentJarCode || cleanJar}' already ${customerInfo.fullName} ke paas delivered hai!\nEk jar bina empty return ke dobara deliver nahi kiya ja sakta.`
              );
              scannedJarsRef.current = scannedJarsRef.current.filter((j) => j !== cleanJar);
              setScannedJars((prev) => prev.filter((j) => j !== cleanJar));
            }
          }
        })
        .catch(() => {});
    }

    return true;
  };

  // Remove Jar from list
  const handleRemoveJar = (idx: number) => {
    const updated = scannedJars.filter((_, i) => i !== idx);
    scannedJarsRef.current = updated;
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
          emptyJarsCount: emptyJarsReturned,
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
          emptyJarsReturned,
          orderNumber: data.orderNumber,
          totalAmountPaise: data.totalAmountPaise || currentTotalRupees * 100,
          cashCollectedPaise: cashPaise,
          receiptNumber: data.cashReceiptNumber || data.receiptNumber,
        });

        // Reset for next delivery
        setCustomerInfo(null);
        setCustomerCodeInput("");
        scannedJarsRef.current = [];
        setScannedJars([]);
        setEmptyJarsReturned(0);
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
              {availableDrivers.length === 1 ? (
                <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-sky-700 block font-bold uppercase">Active Route Driver</span>
                    <strong className="text-sm text-slate-900">{availableDrivers[0].fullName}</strong>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                    🟢 Ready
                  </span>
                </div>
              ) : availableDrivers.length > 1 ? (
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 bg-white"
                >
                  {availableDrivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName} ({d.phone})
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 bg-white"
                >
                  <option value="usr_driver_01">Vikram Singh (UP 25 SW 1001)</option>
                </select>
              )}
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

        {/* Tab Switcher: Delivery vs Bulk Orders vs Timeline */}
        <div className="grid grid-cols-3 gap-1.5 mt-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab("DELIVERY")}
            className={`py-2 px-1 rounded-xl text-[11px] font-black transition-all cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === "DELIVERY"
                ? "bg-sky-600 text-white shadow-xs"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <PackageCheck className="w-3.5 h-3.5" />
            <span>Rozana</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("BULK_ORDERS");
              fetchBulkOrders();
            }}
            className={`py-2 px-1 rounded-xl text-[11px] font-black transition-all cursor-pointer flex items-center justify-center gap-1 relative ${
              activeTab === "BULK_ORDERS"
                ? "bg-purple-600 text-white shadow-xs"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Bulk Orders</span>
            {bulkOrders.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black flex items-center justify-center shrink-0">
                {bulkOrders.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("TIMELINE")}
            className={`py-2 px-1 rounded-xl text-[11px] font-black transition-all cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === "TIMELINE"
                ? "bg-sky-600 text-white shadow-xs"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Timeline</span>
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
                  {txSuccess.emptyJarsReturned > 0 && (
                    <p>Empty Jars Returned: <strong>{txSuccess.emptyJarsReturned} Empty Containers</strong> (Liability relieved)</p>
                  )}
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
                      scannedJarsRef.current = [];
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

                {/* Empty Jars Returned by Customer */}
                <div className="p-3.5 bg-sky-50 rounded-xl border border-sky-200 flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-sky-900 block">Empty Jars Returned by Customer:</label>
                    <span className="text-[10px] text-sky-700">
                      Reduces customer jar liability immediately
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEmptyJarsReturned((prev) => Math.max(0, prev - 1))}
                      className="w-8 h-8 rounded-lg bg-white border border-sky-300 font-bold text-sky-700 hover:bg-sky-100 flex items-center justify-center cursor-pointer shadow-2xs"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-black text-slate-900 text-sm">
                      {emptyJarsReturned}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEmptyJarsReturned((prev) => prev + 1)}
                      className="w-8 h-8 rounded-lg bg-white border border-sky-300 font-bold text-sky-700 hover:bg-sky-100 flex items-center justify-center cursor-pointer shadow-2xs"
                    >
                      +
                    </button>
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
        {/* TAB 2: BULK & EVENT ORDERS IN-TRANSIT (REVERSE UNDELIVERED WORKFLOW) */}
        {/* ========================================================================= */}
        {activeTab === "BULK_ORDERS" && (
          <div className="space-y-4">
            {/* Success Celebration Alert if bulk order settled */}
            {bulkSuccess && (
              <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-lg animate-in fade-in space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-200" />
                    <span className="font-black text-sm">Bulk Order Delivery Completed!</span>
                  </div>
                  <button onClick={() => setBulkSuccess(null)} className="text-white/80 hover:text-white cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-xs text-emerald-50 bg-emerald-700/60 p-3 rounded-xl space-y-1">
                  <p>Order Number: <strong>{bulkSuccess.order?.orderNumber}</strong></p>
                  <p>Customer / Venue: <strong>{bulkSuccess.order?.customer?.name || "Customer"}</strong></p>
                  <p>Delivered to Venue: <strong>{bulkSuccess.deliveredJarsCount} Jars</strong></p>
                  {bulkSuccess.undeliveredJarsCount > 0 && (
                    <p>Undelivered Returned to Truck: <strong>{bulkSuccess.undeliveredJarsCount} Jars</strong></p>
                  )}
                  <p>Final Bill: <strong>{formatINR(bulkSuccess.totalAmountPaise || 0)}</strong></p>
                  {bulkSuccess.cashCollectedPaise > 0 && (
                    <p>Cash Collected: <strong>{formatINR(bulkSuccess.cashCollectedPaise)}</strong></p>
                  )}
                </div>
              </div>
            )}

            {!selectedBulkOrder ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-black text-slate-900">In-Transit Bulk Orders</h2>
                    <p className="text-[11px] text-slate-500">Warehouse se dispatched event orders (Truck custody)</p>
                  </div>
                  <button
                    onClick={fetchBulkOrders}
                    disabled={bulkOrdersLoading}
                    className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 text-xs flex items-center gap-1 font-bold cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${bulkOrdersLoading ? "animate-spin" : ""}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                {bulkOrdersLoading ? (
                  <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-sky-600 mx-auto" />
                    <p className="text-xs font-bold text-slate-500">Loading in-transit orders...</p>
                  </div>
                ) : bulkOrders.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
                      <Truck className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-800">No In-Transit Bulk Orders</h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                        Abhi aapke truck par koi bulk order load nahi hai. Jab plant warehouse se owner bulk order dispatch karega, tab woh yahan dikhai dega.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bulkOrders.map((order) => {
                      const dispatchedCount = order.dispatchedJars?.length || order.quantityJars || 0;
                      const unitPricePaise = order.unitPricePaise ?? order.orderLines?.[0]?.unitPricePaise ?? 2000;
                      const rateRupees = Math.round(unitPricePaise / 100);
                      return (
                        <div
                          key={order.id}
                          className="bg-white rounded-2xl p-4 border border-amber-200 shadow-sm space-y-3"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-amber-100 text-amber-800 border border-amber-200">
                                  🚚 In-Transit
                                </span>
                                {order.paymentType === "PREPAID" ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    💳 100% PREPAID
                                  </span>
                                ) : order.paymentType === "PARTIAL_ADVANCE" ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                                    Advance: ₹{Math.round((order.advanceReceivedPaise || 0) / 100)} • Due: ₹{Math.round((order.balanceDuePaise || 0) / 100)}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-100 text-sky-800 border border-sky-200">
                                    💵 Pay on Delivery
                                  </span>
                                )}
                              </div>
                              <h3 className="font-black text-slate-900 text-sm mt-1">
                                {order.eventOrder?.eventName || order.customer?.name}
                              </h3>
                              <p className="text-[11px] font-bold text-slate-500">{order.orderNumber}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-black text-sky-700 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-xl block">
                                {dispatchedCount} Jars On Truck
                              </span>
                              <span className="text-[11px] font-bold text-slate-500 mt-1 block">
                                Rate: ₹{rateRupees}/jar
                              </span>
                            </div>
                          </div>

                          {order.deliveryAddress && (
                            <div className="text-xs text-slate-600 flex items-start gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                              <span className="line-clamp-2">{order.deliveryAddress}</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-xs pt-1">
                            {order.customer?.phone ? (
                              <a
                                href={`tel:${order.customer.phone}`}
                                className="flex items-center gap-1 font-bold text-sky-700 hover:underline bg-sky-50 px-2.5 py-1 rounded-lg"
                              >
                                <Phone className="w-3 h-3" />
                                <span>{order.customer.phone}</span>
                              </a>
                            ) : <span />}

                            <button
                              type="button"
                              onClick={() => handleOpenBulkSettlement(order)}
                              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <PackageCheck className="w-4 h-4" />
                              <span>Venue Delivery Settle Karein</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Selected Order: Doorstep Reverse Undelivered Settlement */
              <div className="space-y-4">
                {/* Header Back Button */}
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setSelectedBulkOrder(null)}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-xl border border-slate-200 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Wapas List Par Jayein</span>
                  </button>
                  <span className="text-[11px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                    Doorstep Settlement
                  </span>
                </div>

                {/* Order Details Card */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-black text-slate-900 text-sm">
                        {selectedBulkOrder.eventOrder?.eventName || selectedBulkOrder.customer?.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-bold">{selectedBulkOrder.orderNumber}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-slate-900">
                        {selectedBulkOrder.dispatchedJars?.length || selectedBulkOrder.quantityJars || 0} Jars Dispatched
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        ₹{Math.round((selectedBulkOrder.unitPricePaise ?? selectedBulkOrder.orderLines?.[0]?.unitPricePaise ?? 2000) / 100)} / jar
                      </span>
                    </div>
                  </div>
                  {selectedBulkOrder.deliveryAddress && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{selectedBulkOrder.deliveryAddress}</span>
                    </p>
                  )}
                </div>

                {/* "Ulta Scene" Explanation Card */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-900 font-black text-xs">
                    <RotateCcw className="w-4 h-4 text-amber-700" />
                    <span>Ulta Reverse Scan System</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                    Aapko sabhi jars scan karne ki zaroorat <strong>NAHI</strong> hai!
                    Maan lo 100 jars gaye aur customer ne sirf 90 liye, toh <strong>sirf wahi 10 jars scan karein jo reject/undelivered</strong> hue hain. Baki 90 jars automatically deliver maane jayenge.
                  </p>
                </div>

                {/* Undelivered / Rejected Jars Scanner & List */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-rose-600" />
                      <span className="text-xs font-black text-slate-900">
                        Undelivered / Rejected Jars ({undeliveredBulkJars.length})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUndeliveredScannerOpen(true)}
                      className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-rose-100 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Scan Jar QR</span>
                    </button>
                  </div>

                  {/* Manual Input Field */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Jar Code (e.g. JAR-20L-0010)..."
                      value={manualUndeliveredInput}
                      onChange={(e) => setManualUndeliveredInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddUndeliveredBulkJar(manualUndeliveredInput);
                        }
                      }}
                      className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl font-bold uppercase"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddUndeliveredBulkJar(manualUndeliveredInput)}
                      disabled={!manualUndeliveredInput.trim()}
                      className="px-3 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Add
                    </button>
                  </div>

                  {/* Scanned Undelivered Badges */}
                  {undeliveredBulkJars.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-rose-50/50 rounded-xl border border-rose-100">
                      {undeliveredBulkJars.map((code) => (
                        <span
                          key={code}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-800 rounded-lg text-[11px] font-black border border-rose-200"
                        >
                          <span>{code}</span>
                          <button
                            type="button"
                            onClick={() => setUndeliveredBulkJars((prev) => prev.filter((c) => c !== code))}
                            className="hover:text-rose-950 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic text-center py-2">
                      Agar sabhi jars deliver ho gaye hain toh yahan koi jar add karne ki zaroorat nahi hai (0 undelivered).
                    </p>
                  )}
                </div>

                {/* Live Calculation Card */}
                {(() => {
                  const dispatched = selectedBulkOrder.dispatchedJars?.length || selectedBulkOrder.quantityJars || 0;
                  const rejected = undeliveredBulkJars.length;
                  const accepted = Math.max(0, dispatched - rejected);
                  const unitRate = Math.round((selectedBulkOrder.unitPricePaise ?? selectedBulkOrder.orderLines?.[0]?.unitPricePaise ?? 2000) / 100);
                  const finalBillRupees = accepted * unitRate;
                  const advancePaidRupees = Math.round((selectedBulkOrder.advanceReceivedPaise || 0) / 100);
                  const isPrepaid = selectedBulkOrder.paymentType === "PREPAID";
                  const dueBalanceRupees = isPrepaid ? 0 : Math.max(0, finalBillRupees - advancePaidRupees);

                  return (
                    <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-md space-y-3">
                      <div className="grid grid-cols-3 gap-2 text-center pb-2 border-b border-slate-800">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">Dispatched</span>
                          <span className="text-base font-black text-slate-200">{dispatched}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-rose-400 block font-bold">Rejected/Returned</span>
                          <span className="text-base font-black text-rose-400">-{rejected}</span>
                        </div>
                        <div className="bg-emerald-950/60 rounded-xl p-1 border border-emerald-500/30">
                          <span className="text-[10px] text-emerald-400 block font-bold">Auto Accepted</span>
                          <span className="text-base font-black text-emerald-300">{accepted}</span>
                        </div>
                      </div>

                      {/* Payment Status Breakdown */}
                      <div className="space-y-1.5 text-xs bg-slate-800/60 p-2.5 rounded-xl border border-slate-700">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Total Delivery Bill ({accepted} × ₹{unitRate}):</span>
                          <span className="font-bold text-slate-200">₹{finalBillRupees}</span>
                        </div>
                        {isPrepaid ? (
                          <div className="flex items-center justify-between text-emerald-400 font-bold">
                            <span>Payment Status:</span>
                            <span>💳 100% PREPAID (Collect ₹0)</span>
                          </div>
                        ) : advancePaidRupees > 0 ? (
                          <>
                            <div className="flex items-center justify-between text-amber-400 font-semibold">
                              <span>Advance Received:</span>
                              <span>- ₹{advancePaidRupees}</span>
                            </div>
                            <div className="flex items-center justify-between text-sky-400 font-black border-t border-slate-700/60 pt-1">
                              <span>Due Balance to Collect:</span>
                              <span className="text-sm">₹{dueBalanceRupees}</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center justify-between text-sky-400 font-black border-t border-slate-700/60 pt-1">
                            <span>Due Balance (Pay on Delivery):</span>
                            <span className="text-sm">₹{finalBillRupees}</span>
                          </div>
                        )}
                      </div>

                      {/* Cash Collection Input */}
                      <div className="pt-2 border-t border-slate-800 space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Coins className="w-3.5 h-3.5 text-amber-400" />
                            <span>Cash Collected at Venue (₹)</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setBulkCashCollected(dueBalanceRupees.toString())}
                            className="text-[10px] text-sky-400 hover:underline cursor-pointer font-bold"
                          >
                            Set Due ₹{dueBalanceRupees}
                          </button>
                        </label>
                        <input
                          type="number"
                          value={bulkCashCollected}
                          onChange={(e) => setBulkCashCollected(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm font-black focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      {/* Confirm Button */}
                      <button
                        type="button"
                        onClick={handleSettleBulkOrder}
                        disabled={isSettlingBulk}
                        className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                      >
                        {isSettlingBulk ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCheck className="w-4 h-4" />
                        )}
                        <span>
                          {isSettlingBulk ? "Settling Delivery..." : `Approve & Deliver ${accepted} Jars`}
                        </span>
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: ROZANA TIMELINE (DAY-WISE LOG) */}
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
              handleAddJar(code);
              setCameraModalOpen(false);
            }
          }}
          onManualSubmit={(code) => {
            if (scanTarget === "CUSTOMER") {
              handleResolveCustomer(code);
            } else {
              handleAddJar(code);
              setCameraModalOpen(false);
            }
          }}
        />
      )}

      {/* REVERSE UNDELIVERED BULK SCANNER MODAL */}
      {undeliveredScannerOpen && (
        <QrCameraScanner
          title="Scan Undelivered / Rejected Jar QR"
          subtitle="Venue par wapas kiya gaya jar QR sticker frame mein layein"
          placeholderText="Enter Rejected Jar Code (e.g. JAR-20L-0012)..."
          helperText="Scanning rejected jar returning to truck"
          onClose={() => setUndeliveredScannerOpen(false)}
          onScanSuccess={(code) => {
            handleAddUndeliveredBulkJar(code);
            setUndeliveredScannerOpen(false);
          }}
          onManualSubmit={(code) => {
            handleAddUndeliveredBulkJar(code);
            setUndeliveredScannerOpen(false);
          }}
        />
      )}
    </div>
  );
}
