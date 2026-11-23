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

  // Event Bulk Returns State
  const [eventReturnModalOpen, setEventReturnModalOpen] = useState(false);
  const [pendingEvents, setPendingEvents] = useState<any[]>([]);
  const [pendingEventsLoading, setPendingEventsLoading] = useState(false);
  const [selectedEventForReturn, setSelectedEventForReturn] = useState<any>(null);
  const [undertakingModalOpen, setUndertakingModalOpen] = useState(false);
  const [undertakingInput, setUndertakingInput] = useState("");
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const [eventReturnSuccessMessage, setEventReturnSuccessMessage] = useState<string | null>(null);

  // Scanner state
  const [scannedJarResult, setScannedJarResult] = useState<any>(null);
  const [scanError, setScanError] = useState("");

  // Form states - Register
  const [newJarQuantity, setNewJarQuantity] = useState("1");
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

  const loadPendingEvents = () => {
    setPendingEventsLoading(true);
    fetch("/api/jars/event-return")
      .then((res) => res.json())
      .then((data) => {
        setPendingEvents(data.pendingEvents || []);
        setPendingEventsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load pending event returns:", err);
        setPendingEventsLoading(false);
      });
  };

  useEffect(() => {
    loadJars();
    loadPendingEvents();
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

  // Plant Unload Notification Toast
  const [plantScanNotification, setPlantScanNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

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
        setPlantScanNotification({
          type: "success",
          message: `✓ Scanned ${data.jar.permanentJarCode} — Marked AVAILABLE in stock & customer liability relieved!`,
        });
        setTimeout(() => setPlantScanNotification(null), 4000);
        loadJars();
      } else {
        setPlantScanNotification({
          type: "error",
          message: `❌ ${data.error || "Failed to receive jar"}`,
        });
        setTimeout(() => setPlantScanNotification(null), 4000);
      }
    } catch (e: any) {
      setPlantScanNotification({
        type: "error",
        message: `❌ ${e.message}`,
      });
      setTimeout(() => setPlantScanNotification(null), 4000);
    }
    setPlantScanInput("");
  };

  const handleRemoveFromPlantUnloadList = (idx: number) => {
    setPlantUnloadList((prev) => prev.filter((_, i) => i !== idx));
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

  // Register New Jar (Supports single or bulk batch)
  const handleRegisterJar = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const qty = Math.max(1, Math.min(500, parseInt(newJarQuantity, 10) || 1));
      const res = await fetch("/api/jars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: qty,
          permanentJarCode: qty === 1 && newJarCode.trim() ? newJarCode.trim() : undefined,
          acquisitionDate: newJarDate,
          acquisitionCostPaise: Math.round(Number(newJarCost) * 100),
          notes: newJarNotes,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setRegisterOpen(false);
        setNewJarQuantity("1");
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
        return "bg-emerald-50 text-emerald-800 border-emerald-200/70";
      case "DELIVERED_CUSTOMER":
        return "bg-sky-50 text-sky-800 border-sky-200/70";
      case "IN_TRANSIT":
      case "ALLOCATED":
        return "bg-slate-100 text-slate-700 border-slate-200/70";
      case "RETURNED_INSPECT":
        return "bg-slate-100 text-slate-600 border-slate-200/70";
      case "UNDER_REPAIR":
        return "bg-amber-50 text-amber-800 border-amber-200/70";
      case "MISSING_INVESTIG":
        return "bg-rose-50 text-rose-800 border-rose-200/70";
      case "CONFIRMED_LOST":
      case "RETIRED":
        return "bg-slate-100 text-slate-500 border-slate-200/70";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200/70";
    }
  };

  const getFriendlyStatus = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return "Available in plant";
      case "DELIVERED_CUSTOMER":
        return "With customer";
      case "IN_TRANSIT":
        return "In transit";
      case "RETURNED_INSPECT":
        return "Inspection bay";
      case "UNDER_REPAIR":
        return "Under repair";
      case "MISSING_INVESTIG":
        return "Investigation";
      case "RETIRED":
        return "Retired asset";
      default:
        return status;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/70">
              Fleet & assets
            </span>
            <span className="text-xs text-slate-500 tabular-nums">Total {jars.length} jars registered</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
            20L Jar fleet & lifecycle
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Individual serialized containers, QR scanning, and straight-line depreciation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Event Jars Bulk Return Button */}
          <button
            onClick={() => {
              setEventReturnModalOpen(true);
              loadPendingEvents();
            }}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors cursor-pointer"
          >
            <span>Event returns</span>
            {pendingEvents.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200/70 tabular-nums">
                {pendingEvents.length}
              </span>
            )}
          </button>

          {/* Unload Empties at Plant Button */}
          <button
            onClick={() => {
              setPlantUnloadOpen(true);
              setPlantScanMode("CAMERA");
            }}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors cursor-pointer"
          >
            <Truck className="w-3.5 h-3.5 text-slate-400" />
            <span>Unload empties</span>
          </button>

          {/* Scan Jar QR Button */}
          <button
            onClick={() => {
              setScannerOpen(true);
              setScannedJarResult(null);
            }}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 text-slate-400" />
            <span>Scan QR</span>
          </button>

          {/* Register New Jar Button */}
          <button
            onClick={() => setRegisterOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register jar</span>
          </button>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row gap-3 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search code, QR token, customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs sm:text-sm font-normal focus:outline-hidden focus:ring-1 focus:ring-sky-500"
          />
        </div>

        {/* State Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto p-0.5 bg-slate-100 rounded-lg text-xs font-normal">
          {[
            { id: "ALL", label: "All jars" },
            { id: "AVAILABLE", label: "In plant" },
            { id: "DELIVERED_CUSTOMER", label: "With customer" },
            { id: "RETURNED_INSPECT", label: "Inspection" },
            { id: "UNDER_REPAIR", label: "Repair" },
            { id: "MISSING_INVESTIG", label: "Missing" },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setStatusFilter(pill.id)}
              className={`px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === pill.id
                  ? "bg-white text-slate-900 shadow-2xs font-medium"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Jars Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-500 font-medium">
                <th className="py-2.5 px-4">Jar code & QR token</th>
                <th className="py-2.5 px-4">Current status</th>
                <th className="py-2.5 px-4">Physical custody</th>
                <th className="py-2.5 px-4">Lifecycle & age</th>
                <th className="py-2.5 px-4">Net book value</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredJars.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                    No jars match the search filter.
                  </td>
                </tr>
              ) : (
                filteredJars.map((jar, idx) => {
                  const lc = jar.lifecycle || {};
                  return (
                    <tr key={`${jar.id}-${jar.qrToken || idx}`} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleOpenQrView(jar)}
                          className="text-left group cursor-pointer block"
                          title="View QR sticker"
                        >
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5 group-hover:text-sky-600 transition-colors">
                            <QrCode className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-600 shrink-0" />
                            <span>{jar.permanentJarCode}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate max-w-xs">
                            {jar.qrToken || "No QR token"}
                          </div>
                        </button>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-medium border ${getStatusBadge(
                            jar.currentStatus
                          )}`}
                        >
                          {getFriendlyStatus(jar.currentStatus)}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-xs">
                        {jar.customerName ? (
                          <div>
                            <span className="font-medium text-slate-800 block">{jar.customerName}</span>
                            <span className="text-[11px] text-slate-400 font-mono">{jar.customerCode}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 font-normal">
                            {jar.custodyType === "IN_VEHICLE" ? "Delivery vehicle" : "Plant / stock"}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-xs">
                        <div className="flex items-center gap-1 font-medium text-slate-800 tabular-nums">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{lc.elapsedMonths !== undefined ? `${lc.elapsedMonths} mos` : "N/A"}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 tabular-nums">
                          {jar.totalUsageCycles || 0} cycles • Acquired {jar.acquisitionDate || "Legacy"}
                        </div>
                        <div className="w-20 bg-slate-100 rounded-full h-1 mt-1 overflow-hidden">
                          <div
                            className="bg-sky-500 h-1 rounded-full"
                            style={{ width: `${lc.lifespanProgressPercent || 0}%` }}
                          ></div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-xs tabular-nums">
                        <div className="font-semibold text-slate-900">
                          {formatINR(lc.netBookValuePaise || jar.acquisitionCostPaise || 18000)}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Cost: {formatINR(jar.acquisitionCostPaise || 18000)} • Dep: {formatINR(lc.accumulatedDepreciationPaise || 0)}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* View QR Code */}
                          <button
                            type="button"
                            onClick={() => handleOpenQrView(jar)}
                            title="View QR code"
                            className="h-7 px-2 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors text-xs font-medium flex items-center gap-1 cursor-pointer"
                          >
                            <QrCode className="w-3 h-3 text-slate-400" />
                            <span>QR</span>
                          </button>

                          {/* Edit Jar */}
                          <button
                            type="button"
                            onClick={() => openEditModal(jar)}
                            title="Edit jar"
                            className="h-7 px-2 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors text-xs font-medium flex items-center gap-1 cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3 text-slate-400" />
                            <span>Edit</span>
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
                            title="Re-label QR"
                            className="h-7 px-2 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors text-xs font-medium flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCw className="w-3 h-3 text-slate-400" />
                            <span>Re-QR</span>
                          </button>

                          {/* Retire / Delete Jar */}
                          <button
                            type="button"
                            onClick={() => handleDeleteJar(jar)}
                            title="Retire jar"
                            className="h-7 w-7 rounded-md border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 hover:border-rose-200 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>

                          {jar.currentStatus === "MISSING_INVESTIG" && (
                            <button
                              onClick={() => {
                                setActiveJar(jar);
                                setLossOpen(true);
                              }}
                              className="h-7 px-2 rounded-md bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-xs font-medium cursor-pointer"
                            >
                              Loss bill
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
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">+ Naye 20L Water Jars Jodein</h3>
                <p className="text-xs text-slate-500 mt-0.5">Single ya Bulk batch ek saath register karein</p>
              </div>
              <button onClick={() => setRegisterOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterJar} className="space-y-4">
              {/* QUANTITY FIELD WITH PRESETS */}
              <div className="bg-sky-50/70 border border-sky-100 rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-sky-600" />
                    Kitne Jars Add Karne Hain? (Quantity)
                  </label>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-200/80 text-sky-800">
                    {newJarQuantity || "1"} Jars
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={newJarQuantity}
                    onChange={(e) => setNewJarQuantity(e.target.value)}
                    className="w-28 px-3 py-2 bg-white border border-sky-200 rounded-lg text-sm font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                    placeholder="1"
                    required
                  />
                  <div className="flex flex-wrap gap-1">
                    {[1, 5, 10, 25, 50, 100].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setNewJarQuantity(preset.toString())}
                        className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                          newJarQuantity === preset.toString()
                            ? "bg-sky-600 text-white shadow-xs"
                            : "bg-white text-sky-700 hover:bg-sky-100 border border-sky-200"
                        }`}
                      >
                        +{preset}
                      </button>
                    ))}
                  </div>
                </div>

                {parseInt(newJarQuantity, 10) > 1 && (
                  <div className="text-[11px] text-sky-800 mt-2 pt-2 border-t border-sky-200/60 flex items-center justify-between">
                    <span>
                      Batch sequential codes auto-assign honge (e.g. <code>JAR-20L-XXXX</code> to <code>JAR-20L-YYYY</code>).
                    </span>
                    <span className="font-bold text-sky-900">
                      Total Cost: ₹{(parseInt(newJarQuantity, 10) || 1) * (Number(newJarCost) || 0)}
                    </span>
                  </div>
                )}
              </div>

              {parseInt(newJarQuantity, 10) <= 1 && (
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
              )}

              <div className="grid grid-cols-2 gap-3">
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
                  <label className="text-xs font-bold text-slate-700 block mb-1">Cost Per Jar (₹)</label>
                  <input
                    type="number"
                    value={newJarCost}
                    onChange={(e) => setNewJarCost(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Batch / Description Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Nayee batch, blue cap neck, vendor XYZ"
                  value={newJarNotes}
                  onChange={(e) => setNewJarNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-500 font-medium">
                  {parseInt(newJarQuantity, 10) > 1
                    ? `${newJarQuantity} Jars will be added at Plant`
                    : "1 Jar will be added at Plant"}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRegisterOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                  >
                    {parseInt(newJarQuantity, 10) > 1
                      ? `Register ${newJarQuantity} Jars in Bulk`
                      : "Save & Print QR"}
                  </button>
                </div>
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

            {/* Real-time Scan Notification Toast */}
            {plantScanNotification && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between mb-3 animate-in fade-in slide-in-from-top-1 ${
                  plantScanNotification.type === "success"
                    ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                    : "bg-rose-100 text-rose-900 border border-rose-300"
                }`}
              >
                <span>{plantScanNotification.message}</span>
                <button
                  type="button"
                  onClick={() => setPlantScanNotification(null)}
                  className="text-slate-500 hover:text-slate-700 ml-2 cursor-pointer p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Camera Scanner View */}
            {plantScanMode === "CAMERA" ? (
              <div className="mb-3">
                <QrCameraScanner
                  embedded={true}
                  onScanSuccess={(code) => handlePlantUnloadScan(code)}
                  onManualSubmit={(code) => handlePlantUnloadScan(code)}
                  onClose={() => setPlantScanMode("MANUAL")}
                  title="Empty Jar Live Scanner"
                  placeholderText="Or enter jar code manually..."
                  helperText="Hold empty jar QR sticker inside frame"
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
              <span>Scanned in this Session ({plantUnloadList.length} Jars)</span>
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
                  No jars scanned in this session yet. Scan a jar above.
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
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[10px]">
                        AVAILABLE (In Stock)
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromPlantUnloadList(idx)}
                        title="Remove from batch list"
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setPlantUnloadOpen(false);
                  setPlantScanMode("MANUAL");
                  setPlantScanNotification(null);
                }}
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

      {/* ========================================================================= */}
      {/* SUCCESS BANNER TOAST FOR EVENT JAR RETURNS */}
      {/* ========================================================================= */}
      {eventReturnSuccessMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in slide-in-from-bottom duration-200 max-w-md">
          <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold leading-relaxed">{eventReturnSuccessMessage}</p>
          <button
            onClick={() => setEventReturnSuccessMessage(null)}
            className="text-slate-400 hover:text-white ml-auto"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: EVENT JAR BULK RETURNS LIST */}
      {/* ========================================================================= */}
      {eventReturnModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
                  Bulk Custody Clearance
                </span>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>🎉 Event Order Jar Returns</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                    {pendingEvents.length} Pending
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  One-click empty jar return for event bulk orders without 1-by-1 barcode scanning.
                </p>
              </div>
              <button
                onClick={() => setEventReturnModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {pendingEventsLoading ? (
              <div className="py-12 text-center text-xs font-bold text-slate-400">
                Loading pending event orders...
              </div>
            ) : pendingEvents.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">All Event Jars Received!</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  There are currently no delivered bulk events with outstanding empty jars in customer custody. All containers have safely returned to plant stock.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingEvents.map((ev) => (
                  <div
                    key={ev.orderId}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm">{ev.eventName || "Event Order"}</span>
                        <span className="text-[11px] font-mono text-purple-700 bg-purple-100 px-2 py-0.5 rounded font-bold">
                          {ev.orderNumber}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600">
                        <span>Host: <strong>{ev.customerName}</strong></span>
                        <span className="text-slate-400 mx-1.5">•</span>
                        <span>📞 {ev.customerPhone}</span>
                        <span className="text-slate-400 mx-1.5">•</span>
                        <span>Date: {ev.scheduledDate}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs pt-1">
                        <span className="text-slate-500">Delivered: {ev.quantityJars} Jars</span>
                        <span className="text-slate-300">|</span>
                        <span className="text-purple-700 font-black">
                          In Custody: {ev.unreturnedJarsCount} Jars Awaiting Return
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEventForReturn(ev);
                        setUndertakingInput("");
                        setUndertakingModalOpen(true);
                      }}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <span>Receive All {ev.unreturnedJarsCount} Jars</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setEventReturnModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 8: UNDERTAKING & CONFIRMATION FOR BULK EVENT RETURN */}
      {/* ========================================================================= */}
      {undertakingModalOpen && selectedEventForReturn && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-start pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-purple-700">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Bulk Return Undertaking
                </h3>
              </div>
              <button
                onClick={() => setUndertakingModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-purple-50/70 rounded-2xl border border-purple-200 text-xs space-y-1.5">
              <div className="flex justify-between font-bold text-purple-950">
                <span>Event: {selectedEventForReturn.eventName}</span>
                <span>{selectedEventForReturn.orderNumber}</span>
              </div>
              <div className="text-purple-800">
                Customer: <strong>{selectedEventForReturn.customerName}</strong> ({selectedEventForReturn.customerPhone})
              </div>
              <div className="text-sm font-black text-purple-900 pt-1 border-t border-purple-200/60">
                Total Jars to Return: {selectedEventForReturn.unreturnedJarsCount} Empty Jars
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <p className="font-semibold text-slate-800">
                📜 <strong>Undertaking Certification:</strong>
              </p>
              <p className="text-[11px] leading-relaxed text-slate-500">
                Main tasdeeq karta hoon ki is event ke sabhi <strong>{selectedEventForReturn.unreturnedJarsCount} empty jars</strong> Sai Waters plant par wapas praapt ho gaye hain, physical inspection kar liya gaya hai, aur inhein warehouse active stock mein return kiya ja raha hai. Customer ki jar liability khatam ho jayegi.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Type <span className="font-mono text-purple-700 font-black">"RECEIVED"</span> to confirm:
              </label>
              <input
                type="text"
                placeholder="RECEIVED"
                value={undertakingInput}
                onChange={(e) => setUndertakingInput(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-center font-black tracking-widest text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500 uppercase"
                autoFocus
              />
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUndertakingModalOpen(false)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingReturn || undertakingInput.trim().toUpperCase() !== "RECEIVED"}
                onClick={async () => {
                  if (undertakingInput.trim().toUpperCase() !== "RECEIVED") return;
                  setIsSubmittingReturn(true);
                  try {
                    const res = await fetch("/api/jars/event-return", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        orderId: selectedEventForReturn.orderId,
                        undertakingText: undertakingInput.trim(),
                        actorUserId: "usr_owner_01",
                      }),
                    });
                    const data = await res.json();
                    if (res.ok) {
                      setUndertakingModalOpen(false);
                      setUndertakingInput("");
                      setEventReturnModalOpen(false);
                      setSelectedEventForReturn(null);
                      setEventReturnSuccessMessage(data.message || "All event jars returned successfully!");
                      setTimeout(() => setEventReturnSuccessMessage(null), 6000);
                      loadJars();
                      loadPendingEvents();
                    } else {
                      alert(data.error || "Event jars return nahi ho sake.");
                    }
                  } catch (err: any) {
                    alert(err.message || "Network error");
                  } finally {
                    setIsSubmittingReturn(false);
                  }
                }}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                {isSubmittingReturn ? "Processing Return..." : "Confirm & Return All Jars"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
