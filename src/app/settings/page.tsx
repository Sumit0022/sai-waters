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
} from "lucide-react";
import { formatINR } from "@/lib/utils";

export default function SettingsPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<"ALL" | "ACTIVE" | "ARCHIVED">("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [activeDriver, setActiveDriver] = useState<any>(null);

  // Form State - Add Driver
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPin, setNewPin] = useState("1234");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State - Edit Driver
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPin, setEditPin] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);

  // Success Notification
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 5000);
  };

  const loadDrivers = () => {
    setLoading(true);
    fetch("/api/drivers")
      .then((r) => r.json())
      .then((data) => {
        setDrivers(data.drivers || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load drivers:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadDrivers();
  }, []);

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: newName.trim(),
          phone: newPhone.trim(),
          pin: newPin.trim() || "1234",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAddModalOpen(false);
        setNewName("");
        setNewPhone("");
        setNewPin("1234");
        showToast("Naya driver safaltapoorvak add ho gaya hai!");
        loadDrivers();
      } else {
        alert(data.error || "Driver add nahi ho saka");
      }
    } catch (err: any) {
      alert(err.message || "Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (driver: any) => {
    setActiveDriver(driver);
    setEditName(driver.fullName);
    setEditPhone(driver.phone);
    setEditPin(driver.pin || "1234");
    setEditIsActive(driver.isActive);
    setEditModalOpen(true);
  };

  const handleUpdateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDriver) return;

    setIsSubmitting(true);
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
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setEditModalOpen(false);
        showToast("Driver details aur password update ho gaye hain!");
        loadDrivers();
      } else {
        alert(data.error || "Driver update nahi ho saka");
      }
    } catch (err: any) {
      alert(err.message || "Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleArchive = async (driver: any) => {
    const newActiveState = !driver.isActive;
    const actionText = newActiveState ? "restore" : "archive";
    if (
      !confirm(
        `Kya aap sach mein ${driver.fullName} ko ${actionText} karna chahte hain? Purana sabhi record surakshit rahega.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch("/api/drivers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: driver.id,
          isActive: newActiveState,
        }),
      });
      if (res.ok) {
        showToast(
          newActiveState
            ? `${driver.fullName} ko active kar diya gaya hai.`
            : `${driver.fullName} ko archive kar diya gaya hai. Historical records preserved.`
        );
        loadDrivers();
      }
    } catch (e) {
      alert("Status update fail hua");
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-sky-100 text-sky-800 border border-sky-200 uppercase">
              Admin Control Panel
            </span>
            <span className="text-xs text-slate-400">Owner Only</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-sky-600" />
            <span>Settings & Delivery Driver Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage route drivers, login PINs/passwords, active delivery staff, and operational defaults.
          </p>
        </div>

        <button
          onClick={() => setAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add New Driver</span>
        </button>
      </div>

      {/* Search & Status Filters */}
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

        <div className="flex items-center gap-1.5 text-xs font-bold w-full md:w-auto">
          {[
            { id: "ALL", label: `All Drivers (${drivers.length})` },
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
      </div>

      {/* Drivers List */}
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

        {loading ? (
          <div className="py-16 text-center text-xs font-bold text-slate-400">
            Loading drivers list...
          </div>
        ) : filteredDrivers.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Truck className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No drivers found</p>
            <p className="text-xs text-slate-400">
              Create a driver profile above to allow delivery staff to log in to the field app.
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
                        <KeyRound className="w-3 h-3 text-amber-500" /> PIN: <strong>{driver.pin || "1234"}</strong>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[11px] font-mono text-slate-400">ID: {driver.id}</span>
                    </div>

                    {/* Accounting & Clearing status */}
                    <div className="flex items-center gap-3 pt-1 text-xs">
                      <span className="text-slate-600">
                        Total Collections: <strong>{driver.totalCollectionsCount}</strong>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-600">
                        Cash with Driver (A/C 1120):{" "}
                        <strong className={driver.unclearedCashPaise > 0 ? "text-amber-700" : "text-emerald-700"}>
                          {formatINR(driver.unclearedCashPaise)}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
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
                      onClick={() => handleToggleArchive(driver)}
                      title="Archive this driver (Preserves all historical logs)"
                      className="px-3 py-2 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Archive className="w-3.5 h-3.5 text-rose-600" />
                      <span>Archive</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggleArchive(driver)}
                      title="Restore and reactivate this driver"
                      className="px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Reactivate</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Audit Safety Card */}
      <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-950 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <strong className="block text-indigo-950 font-bold">Accounting & Route Ledger Safety</strong>
          <p className="text-indigo-800/80 leading-relaxed text-[11px]">
            Archiving a driver will prevent them from appearing on dispatch dropdowns and logging into the driver app. All previous trips, doorstep cash collections, handover entries, and journal vouchers remain 100% preserved in the General Ledger.
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD NEW DRIVER */}
      {/* ========================================================================= */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider block">
                  Staff Registration
                </span>
                <h3 className="text-base font-black text-slate-900">Add New Delivery Driver</h3>
              </div>
              <button onClick={() => setAddModalOpen(false)} className="text-slate-400 hover:text-slate-700">
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
                <label className="text-xs font-bold text-slate-700 block mb-1">Driver Login PIN / Password *</label>
                <input
                  type="text"
                  placeholder="Default: 1234"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-black tracking-widest text-slate-900"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Driver will enter this PIN when logging into the mobile delivery portal.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  {isSubmitting ? "Adding..." : "Save Driver"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT DRIVER DETAILS & PIN */}
      {/* ========================================================================= */}
      {editModalOpen && activeDriver && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider block">
                  Staff Profile Edit
                </span>
                <h3 className="text-base font-black text-slate-900">Edit Driver & Credentials</h3>
              </div>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-slate-700">
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
                <label className="text-xs font-bold text-slate-700 block mb-1">Login PIN / Password *</label>
                <input
                  type="text"
                  value={editPin}
                  onChange={(e) => setEditPin(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-black tracking-widest text-slate-900"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Change the driver's PIN if they forgot their password.
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

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  {isSubmitting ? "Saving..." : "Update Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
