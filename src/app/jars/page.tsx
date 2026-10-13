"use client";

import { useEffect, useState } from "react";
import {
  QrCode,
  Search,
  Plus,
  RotateCw,
  Camera,
  CheckCircle,
  AlertTriangle,
  X,
  ShieldAlert,
  Truck,
  Edit2,
  Trash2,
  Clock,
  Sparkles,
  TrendingDown,
  Layers,
  Download,
  Printer,
  Eye,
} from "lucide-react";
import QRCode from "qrcode";
import { formatINR } from "@/lib/utils";
import { getTodayIST } from "@/lib/date-utils";
import QrCameraScanner from "@/components/QrCameraScanner";

export default function JarsPage() {
  const [jars, setJars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Modals state
  const [scannerOpen, setScannerOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [relabelOpen, setRelabelOpen] = useState(false);
  const [lossOpen, setLossOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [plantUnloadOpen, setPlantUnloadOpen] = useState(false);
  const [qrViewModalOpen, setQrViewModalOpen] = useState(false);
  const [viewingJar, setViewingJar] = useState<any>(null);
  const [viewingJarQrUrl, setViewingJarQrUrl] = useState<string>("");
  const [plantScanMode, setPlantScanMode] = useState<"MANUAL" | "CAMERA">("CAMERA");
  const [plantUnloadList, setPlantUnloadList] = useState<any[]>([]);
  const [plantScanInput, setPlantScanInput] = useState("");
  const [activeJar, setActiveJar] = useState<any>(null);

  // Scanner state
  const [scannedJarResult, setScannedJarResult] = useState<any>(null);
  const [scanError, setScanError] = useState("");

  // Form states - Register
  const [newJarCode, setNewJarCode] = useState("");
  const [newJarDate, setNewJarDate] = useState(getTodayIST());
  const [newJarCost, setNewJarCost] = useState("180");
  const [newJarNotes, setNewJarNotes] = useState("");

  // Form states - Edit
  const [editJarCode, setEditJarCode] = useState("");
  const [editJarDate, setEditJarDate] = useState("");
  const [editJarCost, setEditJarCost] = useState("");
  const [editJarStatus, setEditJarStatus] = useState("");
  const [editJarNotes, setEditJarNotes] = useState("");

  // Form states - Re-label
  const [relabelNewToken, setRelabelNewToken] = useState("");
  const [relabelReason, setRelabelReason] = useState("Vinyl label scratched/worn");

  // Form states - Loss
  const [lossChargeRupees, setLossChargeRupees] = useState("200");
  const [lossNotes, setLossNotes] = useState("Unreturned container confirmed lost by Owner");

  const loadJars = () => {
    setLoading(true);
    fetch("/api/jars")
      .then((res) => res.json())
      .then((data) => {
        setJars(data.jars || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load jars:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadJars();
  }, []);

  const handleLookup = async (queryText: string) => {
    if (!queryText.trim()) return;
    setScanError("");
    try {
      const res = await fetch("/api/jars/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryText.trim(), action: "LOOKUP" }),
      });
      const data = await res.json();
      if (res.ok) {
        setScannedJarResult(data.jar);
      } else {
        setScanError(data.error || "Jar not found");
        setScannedJarResult(null);
      }
    } catch (err: any) {
      setScanError(err.message);
    }
  };

  const handleExecuteTransition = async (toStatus: string) => {
    if (!scannedJarResult) return;
    try {
      const res = await fetch("/api/jars/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: scannedJarResult.permanentJarCode,
          action: "TRANSITION",
          toStatus,
          notes: `Transitioned via Scanner Modal to ${toStatus}`,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setScannedJarResult(data.jar);
        loadJars();
      } else {
        setScanError(data.error || "Failed transition");
      }
    } catch (err: any) {
      setScanError(err.message);
    }
  };

  const handlePlantUnloadScan = async (code: string) => {
    if (!code.trim()) return;
    try {
      const res = await fetch("/api/jars/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: code.trim(),
          action: "TRANSITION",
          toStatus: "AVAILABLE",
          notes: "Unloaded empty jar at plant - sanitized and ready in stock",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPlantUnloadList((prev) => [data.jar, ...prev]);
        loadJars();
      } else {
        alert(data.error || "Failed to receive jar");
      }
    } catch (e: any) {
      alert(e.message);
    }
    setPlantScanInput("");
  };

  // Open QR Sticker View & Download Modal
  const handleOpenQrView = async (jar: any) => {
    setViewingJar(jar);
    setQrViewModalOpen(true);
    try {
      const token = jar.qrToken || `urn:sw:j:${jar.permanentJarCode}`;
      const url = await QRCode.toDataURL(token, {
        width: 380,
        margin: 2,
        color: { dark: "#0F172A", light: "#FFFFFF" },
      });
      setViewingJarQrUrl(url);
    } catch (e) {
      console.error("Failed to generate jar QR:", e);
    }
  };

  // Register New Jar
  const handleRegisterJar = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/jars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          permanentJarCode: newJarCode || undefined,
          acquisitionDate: newJarDate,
          acquisitionCostPaise: Math.round(Number(newJarCost) * 100),
          notes: newJarNotes,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setRegisterOpen(false);
        setNewJarCode("");
        setNewJarNotes("");
        loadJars();
        if (data?.jar) {
          handleOpenQrView(data.jar);
        }
      }
    } catch (err) {
      console.error("Register failed:", err);
    }
  };

  // Open Edit Modal
  const openEditModal = (jar: any) => {
    setActiveJar(jar);
    setEditJarCode(jar.permanentJarCode || "");
    setEditJarDate(jar.acquisitionDate || getTodayIST());
    setEditJarCost(String(Math.round((jar.acquisitionCostPaise || 18000) / 100)));
    setEditJarStatus(jar.currentStatus || "AVAILABLE");
    setEditJarNotes(jar.notes || "");
    setEditOpen(true);
  };

  // Submit Edit Jar
  const handleEditJar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJar) return;
    try {
      const res = await fetch("/api/jars", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeJar.id,
          permanentJarCode: editJarCode,
          acquisitionDate: editJarDate,
          acquisitionCostPaise: Math.round(Number(editJarCost) * 100),
          currentStatus: editJarStatus,
          notes: editJarNotes,
        }),
      });
      if (res.ok) {
        setEditOpen(false);
        loadJars();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update jar");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Delete / Retire Jar
  const handleDeleteJar = async (jar: any) => {
    if (
      !confirm(
        `Are you sure you want to retire jar ${jar.permanentJarCode}? It will be removed from active pool.`
      )
    )
      return;
    try {
      const res = await fetch(`/api/jars?id=${jar.id}`, { method: "DELETE" });
      if (res.ok) {
        loadJars();
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  // Re-label Jar
  const handleRelabelJar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJar || !relabelNewToken) return;
    const updatedJar = { ...activeJar, qrToken: relabelNewToken };
    try {
      const res = await fetch("/api/jars/relabel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jarId: activeJar.id,
          newQrToken: relabelNewToken,
          reason: relabelReason,
        }),
      });
      if (res.ok) {
        setRelabelOpen(false);
        setActiveJar(null);
        setRelabelNewToken("");
        loadJars();
        handleOpenQrView(updatedJar);
      }
    } catch (err) {
      console.error("Relabel failed:", err);
    }
  };

  // Authorize Loss
  const handleAuthorizeLoss = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJar) return;
    try {
      const res = await fetch("/api/jars/loss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jarId: activeJar.id,
          penaltyChargePaise: Math.round(Number(lossChargeRupees) * 100),
          notes: lossNotes,
        }),
      });
      if (res.ok) {
        setLossOpen(false);
        setActiveJar(null);
        loadJars();
      }
    } catch (err) {
      console.error("Loss authorization failed:", err);
    }
  };

  const filteredJars = jars.filter((jar) => {
    const matchesSearch =
      jar.permanentJarCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      jar.qrToken?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      jar.customerName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || jar.currentStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "DELIVERED_CUSTOMER":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "IN_TRANSIT":
      case "ALLOCATED":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "RETURNED_INSPECT":
        return "bg-cyan-100 text-cyan-800 border-cyan-300";
      case "UNDER_REPAIR":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "MISSING_INVESTIG":
        return "bg-rose-100 text-rose-800 border-rose-300";
      case "CONFIRMED_LOST":
      case "RETIRED":
        return "bg-slate-200 text-slate-800 border-slate-300";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getFriendlyStatus = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return "Available in Plant";
      case "DELIVERED_CUSTOMER":
        return "With Customer";
      case "IN_TRANSIT":
        return "In Transit / On Truck";
      case "RETURNED_INSPECT":
        return "Returned / Inspection";
      case "UNDER_REPAIR":
        return "Under Repair / Bay";
      case "MISSING_INVESTIG":
        return "Missing Investigation";
      case "RETIRED":
        return "Retired Asset";
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-sky-100 text-sky-800 border border-sky-200 uppercase">
              Assets & Lifecycle
            </span>
            <span className="text-xs text-slate-400">Total {jars.length} Jars Registered</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            20L Water Jars & Asset Lifecycle
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Individual serialized containers, camera QR barcode scanning, and straight-line depreciation
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Unload Empties at Plant Button */}
          <button
            onClick={() => {
              setPlantUnloadOpen(true);
              setPlantScanMode("CAMERA");
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition-all cursor-pointer"
          >
            <Truck className="w-4 h-4" />
            🚛 Unload Plant Empties
          </button>

          {/* Scan Jar QR Button */}
          <button
            onClick={() => {
              setScannerOpen(true);
              setScannedJarResult(null);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm shadow-sm transition-all cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            📷 Scan Jar QR
          </button>

          {/* Register New Jar Button */}
          <button
            onClick={() => setRegisterOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-sm shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            + Register New Jar
          </button>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search Jar Code, QR Token, Customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
          />
        </div>

        {/* State Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 text-xs font-bold">
          {[
            { id: "ALL", label: "All Jars" },
            { id: "AVAILABLE", label: "Available in Plant" },
            { id: "DELIVERED_CUSTOMER", label: "With Customer" },
            { id: "RETURNED_INSPECT", label: "Returned / Inspect" },
            { id: "UNDER_REPAIR", label: "Under Repair" },
            { id: "MISSING_INVESTIG", label: "Missing" },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setStatusFilter(pill.id)}
              className={`px-3 py-1.5 rounded-lg transition-all shrink-0 cursor-pointer ${
                statusFilter === pill.id
                  ? "bg-sky-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Jars Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Jar Code & QR Token</th>
                <th className="py-3.5 px-4">Current Status</th>
                <th className="py-3.5 px-4">Physical Custody</th>
                <th className="py-3.5 px-4">Lifecycle & Age</th>
                <th className="py-3.5 px-4">Net Book Value</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredJars.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                    No jars match the search filter. Register a new jar or clear search.
                  </td>
                </tr>
              ) : (
                filteredJars.map((jar, idx) => {
                  const lc = jar.lifecycle || {};
                  return (
                    <tr key={`${jar.id}-${jar.qrToken || idx}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleOpenQrView(jar)}
                          className="text-left group cursor-pointer block"
                          title="Click karein QR sticker dekhne aur download karne ke liye"
                        >
                          <div className="font-extrabold text-slate-900 flex items-center gap-2 group-hover:text-sky-600 transition-colors">
                            <QrCode className="w-4 h-4 text-sky-600 shrink-0" />
                            <span>{jar.permanentJarCode}</span>
                            <span className="text-[10px] font-bold text-sky-600 opacity-0 group-hover:opacity-100 transition-opacity bg-sky-50 px-1.5 py-0.5 rounded-md">
                              View QR
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate max-w-xs group-hover:text-slate-600">
                            {jar.qrToken || "No QR Token"}
                          </div>
                        </button>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadge(
                            jar.currentStatus
                          )}`}
                        >
                          {getFriendlyStatus(jar.currentStatus)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        {jar.customerName ? (
                          <div>
                            <span className="font-bold text-slate-800 block">{jar.customerName}</span>
                            <span className="text-[11px] text-slate-400">({jar.customerCode})</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 font-medium italic">
                            {jar.custodyType === "IN_VEHICLE" ? "🚚 Delivery Vehicle" : "🏭 Plant / Warehouse Stock"}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{lc.elapsedMonths !== undefined ? `${lc.elapsedMonths} Months Old` : "N/A"}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Acquired: {jar.acquisitionDate || "Legacy Stock"} • {jar.totalUsageCycles || 0} cycles
                        </div>
                        <div className="w-24 bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                          <div
                            className="bg-sky-500 h-1.5 rounded-full"
                            style={{ width: `${lc.lifespanProgressPercent || 0}%` }}
                          ></div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        <div className="font-extrabold text-emerald-800">
                          Net Value: {formatINR(lc.netBookValuePaise || jar.acquisitionCostPaise || 18000)}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Original Cost: {formatINR(jar.acquisitionCostPaise || 18000)} • Dep: {formatINR(lc.accumulatedDepreciationPaise || 0)}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View QR Code */}
                          <button
                            type="button"
                            onClick={() => handleOpenQrView(jar)}
                            title="Current QR sticker dekhein & download karein"
                            className="p-1.5 rounded-lg border border-sky-200 bg-sky-50/70 hover:bg-sky-100 text-sky-700 transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>QR</span>
                          </button>

                          {/* Edit Jar */}
                          <button
                            type="button"
                            onClick={() => openEditModal(jar)}
                            title="Jar details edit karein"
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Edit
                          </button>

                          {/* Re-Label QR */}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveJar(jar);
                              setRelabelOpen(true);
                              setRelabelNewToken(
                                `urn:sw:j:q8x9f2m1-${Math.random().toString(36).substring(2, 8)}`
                              );
                            }}
                            title="Naya QR sticker lagayein"
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                            Re-QR
                          </button>

                          {/* Retire / Delete Jar */}
                          <button
                            type="button"
                            onClick={() => handleDeleteJar(jar)}
                            title="Jar ko retire karein"
                            className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 transition-colors text-xs font-semibold cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          {jar.currentStatus === "MISSING_INVESTIG" && (
                            <button
                              onClick={() => {
                                setActiveJar(jar);
                                setLossOpen(true);
                              }}
                              className="p-1.5 rounded-lg bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 font-bold text-xs"
                            >
                              Loss Bill
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: LIVE CAMERA & QR CODE SCANNER (LOOKUP & STATE TRANSITION) */}
      {/* ========================================================================= */}
      {scannerOpen && (
        !scannedJarResult ? (
          <QrCameraScanner
            title="Scan 20L Jar QR Code"
            subtitle="Point camera at jar QR sticker to inspect"
            onClose={() => setScannerOpen(false)}
            onScanSuccess={(code) => handleLookup(code)}
            onManualSubmit={(code) => handleLookup(code)}
            placeholderText="Enter QR Token or JAR-20L-XXXX..."
            helperText="Align Jar QR inside frame"
          />
        ) : (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-sky-600" />
                  Jar Inspection Result
                </h3>
                <button
                  onClick={() => {
                    setScannerOpen(false);
                    setScannedJarResult(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {scanError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs font-semibold flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {scanError}
                </div>
              )}

              {/* Scanned Jar Information & Actions */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 mt-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-black text-slate-900 text-base">
                      {scannedJarResult.permanentJarCode}
                    </h4>
                    <p className="text-xs text-slate-500 font-mono">{scannedJarResult.id}</p>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadge(
                      scannedJarResult.currentStatus
                    )}`}
                  >
                    {getFriendlyStatus(scannedJarResult.currentStatus)}
                  </span>
                </div>

                <div className="text-xs text-slate-600 grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                  <div>
                    Total Cycles: <strong className="text-slate-900">{scannedJarResult.totalUsageCycles}</strong>
                  </div>
                  <div>
                    Original Cost:{" "}
                    <strong className="text-slate-900">
                      {formatINR(scannedJarResult.acquisitionCostPaise || 18000)}
                    </strong>
                  </div>
                </div>

                {/* State Transition Actions */}
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                    Action / Status Update Karein:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {scannedJarResult.currentStatus === "RETURNED_INSPECT" && (
                      <>
                        <button
                          onClick={() => handleExecuteTransition("AVAILABLE")}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                        >
                          Pass QA → Stock mein Ready Karein
                        </button>
                        <button
                          onClick={() => handleExecuteTransition("UNDER_REPAIR")}
                          className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 cursor-pointer"
                        >
                          Repair Bay Bhejein
                        </button>
                      </>
                    )}

                    {scannedJarResult.currentStatus === "UNDER_REPAIR" && (
                      <button
                        onClick={() => handleExecuteTransition("AVAILABLE")}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                      >
                        Repaired & Ready → Stock mein dalein
                      </button>
                    )}

                    {scannedJarResult.currentStatus === "AVAILABLE" && (
                      <button
                        onClick={() => handleExecuteTransition("ALLOCATED")}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 cursor-pointer"
                      >
                        Delivery Gadi mein dalein
                      </button>
                    )}

                    {scannedJarResult.currentStatus === "DELIVERED_CUSTOMER" && (
                      <button
                        onClick={() => handleExecuteTransition("AVAILABLE")}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                      >
                        Receive Empty Jar & Make Available in Stock
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: REGISTER NEW JAR */}
      {/* ========================================================================= */}
      {registerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">+ Naya 20L Water Jar Jodein</h3>
              <button onClick={() => setRegisterOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterJar} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Jar Code (Khaali chhodne par auto-generate hoga)
                </label>
                <input
                  type="text"
                  placeholder="e.g. JAR-20L-0031"
                  value={newJarCode}
                  onChange={(e) => setNewJarCode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Kharid Tariq (Purchase Date)</label>
                <input
                  type="date"
                  value={newJarDate}
                  onChange={(e) => setNewJarDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Acquisition Cost (₹)</label>
                <input
                  type="number"
                  value={newJarCost}
                  onChange={(e) => setNewJarCost(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Notes / Description</label>
                <input
                  type="text"
                  placeholder="e.g. Nayee batch, blue cap neck"
                  value={newJarNotes}
                  onChange={(e) => setNewJarNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRegisterOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Save & Print QR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT JAR DETAILS */}
      {/* ========================================================================= */}
      {editOpen && activeJar && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-sky-600" />
                Jar Details Edit Karein
              </h3>
              <button onClick={() => setEditOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditJar} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Permanent Jar Code</label>
                <input
                  type="text"
                  value={editJarCode}
                  onChange={(e) => setEditJarCode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Kharid Tariq (Purchase Date)</label>
                <input
                  type="date"
                  value={editJarDate}
                  onChange={(e) => setEditJarDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Isi date se jar ki 24-month lifecycle aur depreciation calculate hoti hai.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Kharid Mool (Cost in ₹)</label>
                <input
                  type="number"
                  value={editJarCost}
                  onChange={(e) => setEditJarCost(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Status / Current State</label>
                <select
                  value={editJarStatus}
                  onChange={(e) => setEditJarStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold"
                >
                  <option value="AVAILABLE">AVAILABLE - Plant mein Ready</option>
                  <option value="DELIVERED_CUSTOMER">DELIVERED_CUSTOMER - Grahak ke Paas</option>
                  <option value="RETURNED_INSPECT">RETURNED_INSPECT - Khali Wapas Aaya</option>
                  <option value="UNDER_REPAIR">UNDER_REPAIR - Repair Bay</option>
                  <option value="MISSING_INVESTIG">MISSING_INVESTIG - Missing</option>
                  <option value="RETIRED">RETIRED - Removed from Pool</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Notes</label>
                <input
                  type="text"
                  value={editJarNotes}
                  onChange={(e) => setEditJarNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Update Jar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: RE-LABEL QR CODE */}
      {/* ========================================================================= */}
      {relabelOpen && activeJar && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <RotateCw className="w-5 h-5 text-sky-600" />
                Re-Label Jar: {activeJar.permanentJarCode}
              </h3>
              <button onClick={() => setRelabelOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRelabelJar} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">New Opaque QR Token</label>
                <input
                  type="text"
                  value={relabelNewToken}
                  onChange={(e) => setRelabelNewToken(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono bg-slate-50"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Reason for Re-labeling</label>
                <select
                  value={relabelReason}
                  onChange={(e) => setRelabelReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  <option>Vinyl label scratched/worn</option>
                  <option>Label peeling off during wash</option>
                  <option>QR unreadable by mobile camera</option>
                  <option>Routine label refresh</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRelabelOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Save & Activate Label
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: AUTHORIZE LOSS */}
      {/* ========================================================================= */}
      {lossOpen && activeJar && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-rose-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                Authorize Loss: {activeJar.permanentJarCode}
              </h3>
              <button onClick={() => setLossOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-rose-800/80 mb-4 bg-rose-50 p-3 rounded-xl border border-rose-100">
              Per approved policy, no automated penalties are applied. You can manually enter the agreed replacement charge to bill this customer.
            </p>

            <form onSubmit={handleAuthorizeLoss} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Replacement Charge to Bill Customer (₹)
                </label>
                <input
                  type="number"
                  value={lossChargeRupees}
                  onChange={(e) => setLossChargeRupees(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-black text-rose-600"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Authorization Notes</label>
                <input
                  type="text"
                  value={lossNotes}
                  onChange={(e) => setLossNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setLossOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Confirm Loss & Post Charge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: WAREHOUSE PLANT INWARD EMPTY UNLOAD (CAMERA + MANUAL) */}
      {/* ========================================================================= */}
      {plantUnloadOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]">
            <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Unload Empties at Plant</h3>
                  <p className="text-xs text-slate-500">
                    Delivery truck se wapas aaye khali jars ko scan karke stock mein dalein
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPlantUnloadOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 text-xs text-emerald-900 mb-3">
              <strong>Plant Reception Policy:</strong> Empty jars scanned here are immediately returned to <strong>AVAILABLE</strong> stock and customer liability is relieved.
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center gap-2 mb-3">
              <button
                type="button"
                onClick={() => setPlantScanMode("CAMERA")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  plantScanMode === "CAMERA"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                📷 Live Camera Scanner
              </button>
              <button
                type="button"
                onClick={() => setPlantScanMode("MANUAL")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  plantScanMode === "MANUAL"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                ⌨️ Manual Code / Barcode Gun
              </button>
            </div>

            {/* Camera Scanner View */}
            {plantScanMode === "CAMERA" ? (
              <div className="mb-3">
                <QrCameraScanner
                  onScanSuccess={(code) => handlePlantUnloadScan(code)}
                  onManualSubmit={(code) => handlePlantUnloadScan(code)}
                  placeholderText="Or enter jar code manually..."
                  helperText="Khali jar ka QR code camera ke aage layein"
                />
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handlePlantUnloadScan(plantScanInput);
                }}
                className="flex gap-2 mb-3"
              >
                <div className="relative flex-1">
                  <QrCode className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Scan QR or Enter Jar Code (e.g. JAR-20L-0001)..."
                    value={plantScanInput}
                    onChange={(e) => setPlantScanInput(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-xs transition-all whitespace-nowrap cursor-pointer"
                >
                  Receive Jar
                </button>
              </form>
            )}

            <div className="flex items-center justify-between py-2 border-b border-slate-100 mb-2 text-xs font-bold text-slate-600">
              <span>Is Batch mein Aaye Khali Jars ({plantUnloadList.length})</span>
              {plantUnloadList.length > 0 && (
                <button
                  type="button"
                  onClick={() => setPlantUnloadList([])}
                  className="text-slate-400 hover:text-rose-600 cursor-pointer"
                >
                  Clear List
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 min-h-24 max-h-48 pr-1">
              {plantUnloadList.length === 0 ? (
                <div className="h-24 flex flex-col items-center justify-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-slate-300 mb-1" />
                  Khali jars scan hone ke liye ready hain
                </div>
              ) : (
                plantUnloadList.map((item, idx) => (
                  <div
                    key={`${item.id}-${idx}`}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-[10px]">
                        ✓
                      </span>
                      <div>
                        <span className="font-black text-slate-900">{item.permanentJarCode}</span>
                        <span className="text-slate-400 ml-2">({item.qrToken || "Scanned"})</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-800 border border-cyan-200 font-bold text-[10px]">
                      RETURNED_INSPECT
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setPlantUnloadOpen(false)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Done Receiving ({plantUnloadList.length} Jars)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: VIEW & DOWNLOAD / PRINT CURRENT JAR QR STICKER */}
      {/* ========================================================================= */}
      {qrViewModalOpen && viewingJar && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-left">
                <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Jar QR Sticker Label
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Permanent Code: {viewingJar.permanentJarCode}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setQrViewModalOpen(false);
                  setViewingJar(null);
                  setViewingJarQrUrl("");
                }}
                className="text-slate-400 hover:text-slate-700 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Physical Sticker Box */}
            <div className="p-4 bg-slate-50 border-2 border-dashed border-sky-300 rounded-2xl text-center space-y-2.5">
              <div className="flex items-center justify-between text-[10px] font-black tracking-wider text-slate-500 uppercase px-1">
                <span>SAI WATERS</span>
                <span className="text-sky-700 font-bold">20L WATER CONTAINER</span>
              </div>

              <div className="bg-slate-900 text-white py-1.5 px-3 rounded-lg font-black text-sm tracking-wider inline-block shadow-xs">
                {viewingJar.permanentJarCode}
              </div>

              {viewingJarQrUrl ? (
                <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs inline-block">
                  <img
                    src={viewingJarQrUrl}
                    alt={`QR Code for ${viewingJar.permanentJarCode}`}
                    className="w-48 h-48 mx-auto rounded-xl"
                  />
                </div>
              ) : (
                <div className="w-48 h-48 mx-auto flex items-center justify-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
                  Generating QR Code...
                </div>
              )}

              <div className="space-y-0.5">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Active QR Token
                </div>
                <div className="text-[11px] font-mono text-slate-700 bg-white px-2 py-1 rounded-md border border-slate-200 truncate select-all">
                  {viewingJar.qrToken || `urn:sw:j:${viewingJar.permanentJarCode}`}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] text-left">
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block font-semibold">Status:</span>
                  <span className="font-extrabold text-slate-800 truncate block">
                    {getFriendlyStatus(viewingJar.currentStatus)}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block font-semibold">Total Cycles:</span>
                  <span className="font-extrabold text-sky-700 block">
                    {viewingJar.totalUsageCycles || 0} Cycles
                  </span>
                </div>
              </div>

              <p className="text-[9.5px] text-slate-400 font-medium px-1 leading-tight">
                Sticker placement: Neck / shoulder of jar. Scan with driver camera on doorstep delivery & return.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <div className="flex gap-2">
                {viewingJarQrUrl && (
                  <a
                    href={viewingJarQrUrl}
                    download={`sai-waters-jar-${viewingJar.permanentJarCode}-qr.png`}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PNG</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Sticker</span>
                </button>
              </div>

              {/* Quick shortcut to Re-label if sticker is worn/damaged */}
              <button
                type="button"
                onClick={() => {
                  const j = viewingJar;
                  setQrViewModalOpen(false);
                  setActiveJar(j);
                  setRelabelNewToken(`urn:sw:j:q8x9f2m1-${Math.random().toString(36).substring(2, 8)}`);
                  setRelabelOpen(true);
                }}
                className="w-full py-2 text-[11px] font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <RotateCw className="w-3 h-3 text-slate-400" />
                <span>Damaged or unreadable sticker? Replace / Re-QR</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
