"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Truck,
  Plus,
  Edit2,
  Archive,
  RotateCcw,
  KeyRound,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  Building2,
  Lock,
  Wallet,
  Settings as SettingsIcon,
  QrCode,
  Trash2,
  Check,
  Eye,
  EyeOff,
  User,
} from "lucide-react";
import { formatINR } from "@/lib/utils";

export default function SettingsPage() {
  // Navigation Tabs: DRIVERS | UPI | ADMIN_SECURITY
  const [activeSection, setActiveSection] = useState<"DRIVERS" | "UPI" | "ADMIN_SECURITY">("DRIVERS");

  // Drivers Management State
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(true);
  const [filterTab, setFilterTab] = useState<"ALL" | "ACTIVE" | "ARCHIVED">("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Business Info & UPI State
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [businessName, setBusinessName] = useState("Sai Waters");
  const [businessUpiId, setBusinessUpiId] = useState("");
  const [payeeName, setPayeeName] = useState("Sai Waters");
  const [businessPhone, setBusinessPhone] = useState("+91 98765 43210");
  const [businessAddress, setBusinessAddress] = useState("Bareilly, UP");
  const [upiAdminPassword, setUpiAdminPassword] = useState("");
  const [isSavingUpi, setIsSavingUpi] = useState(false);

  // Admin Credentials State
  const [currentAdminUsername, setCurrentAdminUsername] = useState("sai");
  const [newAdminUsername, setNewAdminUsername] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [credAdminPassword, setCredAdminPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [isSavingCreds, setIsSavingCreds] = useState(false);

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [activeDriver, setActiveDriver] = useState<any>(null);

  // Form State - Add Driver
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPin, setNewPin] = useState("");
  const [addAdminPassword, setAddAdminPassword] = useState("");
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  // Form State - Edit Driver
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPin, setEditPin] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editAdminPassword, setEditAdminPassword] = useState("");
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Form State - Authorize Action Modal (Archive / Delete)
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authActionType, setAuthActionType] = useState<"ARCHIVE" | "RESTORE" | "PERMANENT_DELETE">("ARCHIVE");
  const [targetDriver, setTargetDriver] = useState<any>(null);
  const [actionAdminPassword, setActionAdminPassword] = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Success Notification
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 5000);
  };

  const loadDrivers = () => {
    setLoadingDrivers(true);
    fetch("/api/drivers")
      .then((r) => r.json())
      .then((data) => {
        setDrivers(data.drivers || []);
        setLoadingDrivers(false);
      })
      .catch((err) => {
        console.error("Failed to load drivers:", err);
        setLoadingDrivers(false);
      });
  };

  const loadSystemSettings = () => {
    setLoadingSettings(true);
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.businessInfo) {
          setBusinessName(data.businessInfo.name || "Sai Waters");
          setBusinessUpiId(data.businessInfo.upi_id || "");
          setPayeeName(data.businessInfo.payee_name || data.businessInfo.name || "Sai Waters");
          setBusinessPhone(data.businessInfo.phone || "");
          setBusinessAddress(data.businessInfo.address || "");
        }
        if (data.adminUsername) {
          setCurrentAdminUsername(data.adminUsername);
          setNewAdminUsername(data.adminUsername);
        }
        setLoadingSettings(false);
      })
      .catch((err) => {
        console.error("Failed to load settings:", err);
        setLoadingSettings(false);
      });
  };

  useEffect(() => {
    loadDrivers();
    loadSystemSettings();
  }, []);

  // 1. Handle Save Custom UPI & Business Info
  const handleSaveUpiSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upiAdminPassword) {
      alert("Suraksha hetu Current Admin Password enter karein.");
      return;
    }
    if (!businessUpiId.trim() || !businessUpiId.includes("@")) {
      alert("Kripya valid UPI ID darj karein (e.g. 9876543210@upi, name@okaxis).");
      return;
    }

    setIsSavingUpi(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_BUSINESS_UPI",
          currentPassword: upiAdminPassword.trim(),
          upi_id: businessUpiId.trim(),
          payee_name: payeeName.trim(),
          name: businessName.trim(),
          phone: businessPhone.trim(),
          address: businessAddress.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Business UPI ID aur details safaltapoorvak update ho gaye!");
        setUpiAdminPassword("");
        loadSystemSettings();
      } else {
        alert(data.error || "UPI settings save nahi ho saki.");
      }
    } catch (err: any) {
      alert(err.message || "Network error");
    } finally {
      setIsSavingUpi(false);
    }
  };

  // 2. Handle Update Admin Credentials
  const handleUpdateAdminCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credAdminPassword) {
      alert("Current Admin Password anivarya hai.");
      return;
    }
    if (!newAdminUsername.trim()) {
      alert("Naya admin username khali nahi ho sakta.");
      return;
    }
    if (!newAdminPassword.trim() || newAdminPassword.trim().length < 4) {
      alert("Naya admin password kam se kam 4 characters ka hona chahiye.");
      return;
    }

    setIsSavingCreds(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_ADMIN_CREDENTIALS",
          currentPassword: credAdminPassword.trim(),
          newUsername: newAdminUsername.trim(),
          newPassword: newAdminPassword.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Admin Username aur Password safaltapoorvak update ho gaye!");
        setCurrentAdminUsername(data.adminUsername || newAdminUsername.trim());
        setNewAdminPassword("");
        setCredAdminPassword("");
      } else {
        alert(data.error || "Credentials update nahi ho sake.");
      }
    } catch (err: any) {
      alert(err.message || "Network error");
    } finally {
      setIsSavingCreds(false);
    }
  };

  // 3. Handle Add Driver (Requires Admin Password)
  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;
    if (!addAdminPassword.trim()) {
      alert("Driver add karne ke liye Current Admin Password enter karein.");
      return;
    }

    setIsSubmittingAdd(true);
    try {
      const res = await fetch("/api/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: newName.trim(),
          phone: newPhone.trim(),
          pin: newPin.trim() || "1234",
          adminPassword: addAdminPassword.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAddModalOpen(false);
        setNewName("");
        setNewPhone("");
        setNewPin("");
        setAddAdminPassword("");
        showToast("Naya driver safaltapoorvak add ho gaya hai!");
        loadDrivers();
      } else {
        alert(data.error || "Driver add nahi ho saka");
      }
    } catch (err: any) {
      alert(err.message || "Network error");
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // 4. Handle Open Edit Driver
  const handleOpenEdit = (driver: any) => {
    setActiveDriver(driver);
    setEditName(driver.fullName);
    setEditPhone(driver.phone);
    setEditPin(driver.pin || "");
    setEditIsActive(driver.isActive);
    setEditAdminPassword("");
    setEditModalOpen(true);
  };

  // 5. Handle Update Driver (Requires Admin Password)
  const handleUpdateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDriver) return;
    if (!editAdminPassword.trim()) {
      alert("Driver update karne ke liye Current Admin Password enter karein.");
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const res = await fetch("/api/drivers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeDriver.id,
          fullName: editName.trim(),
          phone: editPhone.trim(),
          pin: editPin.trim(),
          isActive: editIsActive,
          adminPassword: editAdminPassword.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setEditModalOpen(false);
        showToast("Driver details aur PIN update ho gaye hain!");
        loadDrivers();
      } else {
        alert(data.error || "Driver update nahi ho saka");
      }
    } catch (err: any) {
      alert(err.message || "Network error");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // 6. Handle Authorize Archive / Restore / Permanent Delete (Requires Admin Password)
  const handleOpenAuthAction = (driver: any, type: "ARCHIVE" | "RESTORE" | "PERMANENT_DELETE") => {
    setTargetDriver(driver);
    setAuthActionType(type);
    setActionAdminPassword("");
    setAuthModalOpen(true);
  };

  const handleExecuteAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDriver || !actionAdminPassword.trim()) {
      alert("Action authorize karne ke liye Admin Password anivarya hai.");
      return;
    }

    setIsSubmittingAction(true);
    try {
      if (authActionType === "PERMANENT_DELETE") {
        const res = await fetch(
          `/api/drivers?id=${encodeURIComponent(targetDriver.id)}&permanent=true&adminPassword=${encodeURIComponent(
            actionAdminPassword.trim()
          )}`,
          { method: "DELETE" }
        );
        const data = await res.json();
        if (res.ok) {
          setAuthModalOpen(false);
          showToast(`${targetDriver.fullName} ko permanently delete kar diya gaya hai.`);
          loadDrivers();
        } else {
          alert(data.error || "Driver delete nahi ho saka");
        }
      } else {
        const newActiveState = authActionType === "RESTORE";
        const res = await fetch("/api/drivers", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: targetDriver.id,
            isActive: newActiveState,
            adminPassword: actionAdminPassword.trim(),
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setAuthModalOpen(false);
          showToast(
            newActiveState
              ? `${targetDriver.fullName} ko restore aur active kar diya gaya hai.`
              : `${targetDriver.fullName} ko archive kar diya gaya hai.`
          );
          loadDrivers();
        } else {
          alert(data.error || "Status update fail hua");
        }
      }
    } catch (err: any) {
      alert(err.message || "Network error");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const filteredDrivers = drivers.filter((d) => {
    if (filterTab === "ACTIVE" && !d.isActive) return false;
    if (filterTab === "ARCHIVED" && d.isActive) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        d.fullName.toLowerCase().includes(term) ||
        d.phone.includes(term) ||
        d.id.toLowerCase().includes(term)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold">{successToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-sky-100 text-sky-800 border border-sky-200 uppercase">
              Admin & Security Control Panel
            </span>
            <span className="text-xs text-slate-400 font-semibold">Owner Authenticated</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-sky-600" />
            <span>ERP Settings & Control Center</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage delivery staff logins, system-wide custom UPI payment links, and owner access credentials.
          </p>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-xs font-black">
          <button
            onClick={() => setActiveSection("DRIVERS")}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSection === "DRIVERS"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Truck className="w-4 h-4 text-sky-600" />
            <span>Delivery Drivers ({drivers.length})</span>
          </button>

          <button
            onClick={() => setActiveSection("UPI")}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSection === "UPI"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <QrCode className="w-4 h-4 text-emerald-600" />
            <span>UPI & Payments</span>
          </button>

          <button
            onClick={() => setActiveSection("ADMIN_SECURITY")}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSection === "ADMIN_SECURITY"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Lock className="w-4 h-4 text-indigo-600" />
            <span>Admin Credentials</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: DELIVERY DRIVER & STAFF MANAGEMENT */}
      {/* ========================================================================= */}
      {activeSection === "DRIVERS" && (
        <div className="space-y-6">
          {/* Driver Actions Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search Driver Name, Mobile, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
              <div className="flex items-center gap-1.5 text-xs font-bold">
                {[
                  { id: "ALL", label: `All (${drivers.length})` },
                  { id: "ACTIVE", label: `Active (${drivers.filter((d) => d.isActive).length})` },
                  { id: "ARCHIVED", label: `Archived (${drivers.filter((d) => !d.isActive).length})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                      filterTab === tab.id
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  setNewName("");
                  setNewPhone("");
                  setNewPin("");
                  setAddAdminPassword("");
                  setAddModalOpen(true);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Driver</span>
              </button>
            </div>
          </div>

          {/* Drivers List Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-sky-600" />
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Registered Delivery Staff
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-semibold">
                Showing {filteredDrivers.length} of {drivers.length} Drivers
              </span>
            </div>

            {loadingDrivers ? (
              <div className="py-16 text-center text-xs font-bold text-slate-400">
                Loading drivers list...
              </div>
            ) : filteredDrivers.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <Truck className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">No drivers found</p>
                <p className="text-xs text-slate-400">
                  Click "+ Add Driver" above to register delivery staff with their allotted PIN.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredDrivers.map((driver) => (
                  <div
                    key={driver.id}
                    className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0 ${
                          driver.isActive
                            ? "bg-gradient-to-tr from-sky-600 to-cyan-500 shadow-md shadow-sky-500/20"
                            : "bg-slate-300 text-slate-600"
                        }`}
                      >
                        <Truck className="w-5 h-5" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 text-base">{driver.fullName}</span>
                          {driver.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active Staff
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
                              <Archive className="w-3 h-3 text-slate-400" /> Archived
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-slate-400" /> {driver.phone}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="flex items-center gap-1 font-mono">
                            <KeyRound className="w-3 h-3 text-amber-500" /> PIN: <strong>{driver.pin}</strong>
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-[11px] font-mono text-slate-400">ID: {driver.id}</span>
                        </div>

                        <div className="flex items-center gap-3 pt-1 text-xs">
                          <span className="text-slate-600">
                            Collections: <strong>{driver.totalCollectionsCount || 0}</strong>
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-600">
                            Cash with Driver:{" "}
                            <strong className={driver.unclearedCashPaise > 0 ? "text-amber-700" : "text-emerald-700"}>
                              {formatINR(driver.unclearedCashPaise || 0)}
                            </strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Driver Actions */}
                    <div className="flex items-center gap-2 self-end md:self-center">
                      <button
                        onClick={() => handleOpenEdit(driver)}
                        className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Edit Name & PIN</span>
                      </button>

                      {driver.isActive ? (
                        <button
                          onClick={() => handleOpenAuthAction(driver, "ARCHIVE")}
                          title="Archive driver (Preserves all historical logs)"
                          className="px-3 py-2 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100 text-amber-800 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Archive className="w-3.5 h-3.5 text-amber-600" />
                          <span>Archive</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenAuthAction(driver, "RESTORE")}
                          title="Restore and reactivate driver"
                          className="px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Reactivate</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenAuthAction(driver, "PERMANENT_DELETE")}
                        title="Completely remove driver from database"
                        className="p-2 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: SYSTEM-WIDE BUSINESS UPI ID & PAYMENTS */}
      {/* ========================================================================= */}
      {activeSection === "UPI" && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs max-w-3xl space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Payment Gateway & Dynamic QR Configuration
            </span>
            <h2 className="text-xl font-black text-slate-900 mt-2">
              Business UPI ID & Payment Links
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Yahan aap jo UPI ID darj karenge, wohi poore system mein automatically use hogi — dynamic bills, invoice QR codes, WhatsApp payment links, aur printable cash receipts par. Koi bhi demo UPI nahi rahegi.
            </p>
          </div>

          <form onSubmit={handleSaveUpiSettings} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Receiving UPI ID (e.g. GPay / PhonePe / Paytm / BHIM) *
                </label>
                <div className="relative">
                  <QrCode className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    placeholder="e.g. 9876543210@upi or saiwaters@okaxis"
                    value={businessUpiId}
                    onChange={(e) => setBusinessUpiId(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-black text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Customers scan this UPI QR to pay directly to your bank account.
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Payee Display Name (Bank Registered Name) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sai Waters"
                  value={payeeName}
                  onChange={(e) => setPayeeName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-800"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Business Legal Name
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Official Business Phone
                </label>
                <input
                  type="text"
                  value={businessPhone}
                  onChange={(e) => setBusinessPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800"
                />
              </div>
            </div>

            {/* Security Guard: Admin Password Required */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2 mt-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <label className="text-xs font-black text-amber-900">
                  Current Admin Password (Security Verification) *
                </label>
              </div>
              <p className="text-[11px] text-amber-800">
                Payment details ko badalne ke liye apna current admin password darj karein.
              </p>
              <input
                type="password"
                placeholder="Enter Current Admin Password"
                value={upiAdminPassword}
                onChange={(e) => setUpiAdminPassword(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-amber-300 bg-white text-xs font-bold text-slate-900"
                required
              />
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                disabled={isSavingUpi}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isSavingUpi ? "Saving Settings..." : "Save UPI & Business Settings"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: ADMIN CREDENTIALS & SECURITY */}
      {/* ========================================================================= */}
      {activeSection === "ADMIN_SECURITY" && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs max-w-2xl space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
              Access Control & Credentials
            </span>
            <h2 className="text-xl font-black text-slate-900 mt-2">
              Update Admin Login Credentials
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Admin / Owner portal ka login ID aur password badalne ke liye niche diye form ko fill karein. Kisi bhi badlaav ke liye current password verification anivarya hai.
            </p>
          </div>

          <form onSubmit={handleUpdateAdminCredentials} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Current Admin Username:
              </label>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-black text-slate-800 font-mono">
                {currentAdminUsername}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                New Admin Username *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="Enter new admin username"
                  value={newAdminUsername}
                  onChange={(e) => setNewAdminUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                New Admin Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type={showNewPass ? "text" : "password"}
                  placeholder="Enter new strong password"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Security Guard: Current Password */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-2 mt-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-700" />
                <label className="text-xs font-black text-indigo-900">
                  Current Admin Password (Required for Authentication) *
                </label>
              </div>
              <div className="relative">
                <input
                  type={showCurrentPass ? "text" : "password"}
                  placeholder="Enter your existing current password"
                  value={credAdminPassword}
                  onChange={(e) => setCredAdminPassword(e.target.value)}
                  className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-indigo-300 bg-white text-xs font-bold text-slate-900"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                disabled={isSavingCreds}
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-black text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isSavingCreds ? "Updating Credentials..." : "Update Admin Credentials"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD NEW DRIVER (SECURED WITH ADMIN PASSWORD) */}
      {/* ========================================================================= */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider block">
                  Staff Registration
                </span>
                <h3 className="text-base font-black text-slate-900">Add New Delivery Driver</h3>
              </div>
              <button onClick={() => setAddModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddDriver} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Driver Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Vikram Singh"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Mobile Number (Login ID) *</label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono font-semibold"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Driver Login PIN (4 Digits) *</label>
                <input
                  type="text"
                  placeholder="e.g. 4321"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-black tracking-widest text-slate-900"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Driver field delivery app mein sirf issi PIN se login kar sakega.
                </span>
              </div>

              {/* Security Guard */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-1">
                <label className="text-xs font-black text-amber-900 block">
                  Current Admin Password (Required) *
                </label>
                <input
                  type="password"
                  placeholder="Enter Admin Password"
                  value={addAdminPassword}
                  onChange={(e) => setAddAdminPassword(e.target.value)}
                  className="w-full p-2 rounded-lg border border-amber-300 bg-white text-xs font-bold text-slate-900"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdd}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingAdd ? "Adding Driver..." : "Save Driver"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT DRIVER DETAILS & PIN (SECURED WITH ADMIN PASSWORD) */}
      {/* ========================================================================= */}
      {editModalOpen && activeDriver && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider block">
                  Staff Profile Edit
                </span>
                <h3 className="text-base font-black text-slate-900">Edit Driver & Allocated PIN</h3>
              </div>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateDriver} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Driver Full Name *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Mobile Number *</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono font-semibold"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Allocated Login PIN *</label>
                <input
                  type="text"
                  maxLength={4}
                  value={editPin}
                  onChange={(e) => setEditPin(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-black tracking-widest text-slate-900"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Driver iss PIN se login karega.
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="font-bold text-slate-800 block">Account Status:</span>
                  <span className="text-[11px] text-slate-500">
                    {editIsActive ? "Active (Can log in & deliver)" : "Archived (Disabled)"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditIsActive(!editIsActive)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                    editIsActive
                      ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                      : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                  }`}
                >
                  {editIsActive ? "🟢 Active" : "⚪ Archived"}
                </button>
              </div>

              {/* Security Guard */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-1">
                <label className="text-xs font-black text-amber-900 block">
                  Current Admin Password (Required) *
                </label>
                <input
                  type="password"
                  placeholder="Enter Admin Password"
                  value={editAdminPassword}
                  onChange={(e) => setEditAdminPassword(e.target.value)}
                  className="w-full p-2 rounded-lg border border-amber-300 bg-white text-xs font-bold text-slate-900"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-5 py-2 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingEdit ? "Updating..." : "Update Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: AUTHORIZE SENSITIVE ACTION (ARCHIVE / RESTORE / DELETE) */}
      {/* ========================================================================= */}
      {authModalOpen && targetDriver && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-black text-slate-900">
                  {authActionType === "PERMANENT_DELETE"
                    ? "Permanent Delete Driver"
                    : authActionType === "ARCHIVE"
                    ? "Archive Driver Account"
                    : "Reactivate Driver"}
                </h3>
              </div>
              <button onClick={() => setAuthModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 space-y-1">
              <strong className="block font-black">
                Target: {targetDriver.fullName} ({targetDriver.phone})
              </strong>
              {authActionType === "PERMANENT_DELETE" ? (
                <p className="text-[11px] text-rose-800">
                  ⚠️ Yeh driver system se permanently delete ho jayega. Koi bhi open route reassign ho jayega.
                </p>
              ) : authActionType === "ARCHIVE" ? (
                <p className="text-[11px] text-rose-800">
                  Driver app login aur dispatch dropdown se hide ho jayega. Historical records surakshit rahenge.
                </p>
              ) : (
                <p className="text-[11px] text-emerald-800">
                  Driver reactivate ho jayega aur route deliveries ke liye available hoga.
                </p>
              )}
            </div>

            <form onSubmit={handleExecuteAuthAction} className="space-y-3.5">
              <div>
                <label className="text-xs font-black text-slate-800 block mb-1">
                  Authorize with Current Admin Password *
                </label>
                <input
                  type="password"
                  placeholder="Enter Admin Password"
                  value={actionAdminPassword}
                  onChange={(e) => setActionAdminPassword(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900"
                  required
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAuthModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAction}
                  className={`px-5 py-2 font-black text-xs rounded-xl text-white shadow-xs cursor-pointer disabled:opacity-50 ${
                    authActionType === "PERMANENT_DELETE"
                      ? "bg-rose-600 hover:bg-rose-700"
                      : authActionType === "ARCHIVE"
                      ? "bg-amber-600 hover:bg-amber-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {isSubmittingAction
                    ? "Authorizing..."
                    : authActionType === "PERMANENT_DELETE"
                    ? "Confirm Permanent Delete"
                    : authActionType === "ARCHIVE"
                    ? "Confirm Archive"
                    : "Confirm Reactivate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
