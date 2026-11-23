"use client";

import { useEffect, useState } from "react";
import {
  Database,
  Download,
  RotateCcw,
  Plus,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  HardDrive,
  Clock,
  FileText,
  Upload,
  RefreshCw,
} from "lucide-react";
import { formatDateTimeIST, formatDateIST } from "@/lib/date-utils";

export default function BackupPage() {
  const [stats, setStats] = useState<any>(null);
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Restore Modal State
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [selectedBackupFile, setSelectedBackupFile] = useState("");
  const [uploadedJson, setUploadedJson] = useState<any>(null);

  const loadData = () => {
    setLoading(true);
    fetch("/api/backup")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStats(data.stats);
          setBackups(data.backups || []);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load backups:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateBackup = async () => {
    setCreating(true);
    setMessage(null);
    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: "Manual Admin Snapshot" }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: `✅ Backup snapshot '${data.backup.filename}' created & downloaded successfully!` });
        if (data.backupData) {
          const blob = new Blob([JSON.stringify(data.backupData, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = data.backup.filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
        loadData();
      } else {
        setMessage({ type: "error", text: `❌ Backup creation failed: ${data.error}` });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: `❌ Error: ${err.message}` });
    } finally {
      setCreating(false);
    }
  };

  const handleExecuteRestore = async () => {
    if (!selectedBackupFile && !uploadedJson) return;
    setRestoring(true);
    setMessage(null);
    try {
      const res = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          uploadedJson
            ? { rawJson: uploadedJson }
            : { filename: selectedBackupFile }
        ),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({
          type: "success",
          text: `✅ ${data.message} (Safety snapshot saved as: ${data.preRestoreSafetyBackup})`,
        });
        setRestoreModalOpen(false);
        setUploadedJson(null);
        loadData();
      } else {
        setMessage({ type: "error", text: `❌ Restore failed: ${data.error}` });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: `❌ Error: ${err.message}` });
    } finally {
      setRestoring(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.data) {
          alert("Invalid backup JSON format: Missing data field.");
          return;
        }
        setUploadedJson(parsed);
        setSelectedBackupFile(`Uploaded file: ${file.name}`);
      } catch (err) {
        alert("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/70">
              Data integrity
            </span>
            <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-200/60">
              PGlite local engine
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
            Database backup & recovery
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Local storage snapshots, restore points, and database inventory monitoring.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCreateBackup}
            disabled={creating}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {creating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{creating ? "Creating..." : "Create backup"}</span>
          </button>

          <button
            onClick={() => {
              setSelectedBackupFile(backups[0]?.filename || "");
              setUploadedJson(null);
              setRestoreModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Restore backup</span>
          </button>
        </div>
      </div>

      {/* Alert Notification */}
      {message && (
        <div
          className={`p-3 rounded-lg border text-xs font-medium flex items-center justify-between shadow-2xs ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-xs underline font-medium cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Storage Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium text-slate-500">Database storage</span>
            <HardDrive className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
            {stats?.totalStorageFormatted || "0 KB"}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-normal">Local storage in data/pglite</p>
        </div>

        <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium text-slate-500">Backup snapshots</span>
            <Database className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">{stats?.totalBackupsCount || 0}</div>
          <p className="text-[11px] text-slate-500 mt-1 font-normal">JSON snapshot points</p>
        </div>

        <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium text-slate-500">Recorded jars</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">{stats?.counts?.jars || 0}</div>
          <p className="text-[11px] text-slate-500 mt-1 font-normal">Serialized with QR tokens</p>
        </div>

        <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium text-slate-500">Ledger integrity</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
            {stats?.doubleEntryStatus?.isBalanced ? "Balanced" : "Review"}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-normal tabular-nums">Σ Dr ₹{stats?.doubleEntryStatus?.totalDebitsRupees || 0} = Σ Cr</p>
        </div>
      </div>

      {/* Table Records Breakdown */}
      <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-2xs">
        <h3 className="text-xs font-medium text-slate-500 mb-2.5">
          Table record counts
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center tabular-nums">
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/60">
            <span className="text-[11px] text-slate-500 font-normal block">Users</span>
            <span className="text-base font-semibold text-slate-900">{stats?.counts?.users || 0}</span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/60">
            <span className="text-[11px] text-slate-500 font-normal block">Customers</span>
            <span className="text-base font-semibold text-slate-900">{stats?.counts?.customers || 0}</span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/60">
            <span className="text-[11px] text-slate-500 font-normal block">20L Jars</span>
            <span className="text-base font-semibold text-slate-900">{stats?.counts?.jars || 0}</span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/60">
            <span className="text-[11px] text-slate-500 font-normal block">Orders</span>
            <span className="text-base font-semibold text-slate-900">{stats?.counts?.orders || 0}</span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/60">
            <span className="text-[11px] text-slate-500 font-normal block">Invoices</span>
            <span className="text-base font-semibold text-slate-900">{stats?.counts?.invoices || 0}</span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/60">
            <span className="text-[11px] text-slate-500 font-normal block">Journal</span>
            <span className="text-base font-semibold text-slate-900">{stats?.counts?.journalEntries || 0}</span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/60">
            <span className="text-[11px] text-slate-500 font-normal block">Movements</span>
            <span className="text-base font-semibold text-slate-900">{stats?.counts?.jarMovementEvents || 0}</span>
          </div>
        </div>
      </div>

      {/* Backup Snapshots History Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Backup snapshots</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Download backup JSON files or restore previous state.
            </p>
          </div>
          <button
            onClick={loadData}
            title="Refresh backups"
            className="h-8 w-8 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-500 font-medium">
                <th className="py-2.5 px-4">Backup file</th>
                <th className="py-2.5 px-4">Created date</th>
                <th className="py-2.5 px-4">Records</th>
                <th className="py-2.5 px-4">Size</th>
                <th className="py-2.5 px-4">Checksum</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {backups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    No backup snapshots created yet.
                  </td>
                </tr>
              ) : (
                backups.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 flex items-center gap-2">
                        <Database className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{b.filename}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500 tabular-nums">
                      {formatDateTimeIST(b.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700 tabular-nums">
                      {b.totalRecords} records ({b.tablesCount} tables)
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-600 tabular-nums">
                      {(b.sizeBytes / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-400 truncate max-w-[120px]">
                      {b.checksum?.substring(0, 16)}...
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={`/api/backup/download?filename=${encodeURIComponent(b.filename)}`}
                          download={b.filename}
                          className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors"
                        >
                          <Download className="w-3 h-3 text-slate-400" />
                          <span>Download</span>
                        </a>

                        <button
                          onClick={() => {
                            setSelectedBackupFile(b.filename);
                            setUploadedJson(null);
                            setRestoreModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3 text-slate-400" />
                          <span>Restore</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RESTORE BACKUP CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {restoreModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Restore Database Snapshot</h3>
                <p className="text-xs text-slate-500">
                  Restore all business records, accounts, and jar tracking state
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                <p className="font-bold">⚠️ Automatic Safety Guard:</p>
                <p className="text-[11px] text-amber-800">
                  Before applying this snapshot, the system will take an automatic pre-restore safety backup of
                  your current database, ensuring no data is ever lost.
                </p>
              </div>

              {/* Source Option 1: Select from existing backups */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Select Backup from Local Storage:
                </label>
                <select
                  aria-label="Select Backup Snapshot"
                  value={selectedBackupFile}
                  onChange={(e) => {
                    setSelectedBackupFile(e.target.value);
                    setUploadedJson(null);
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  {backups.map((b) => (
                    <option key={b.id} value={b.filename}>
                      {b.filename} ({formatDateIST(b.createdAt)}, {b.totalRecords} records)
                    </option>
                  ))}
                </select>
              </div>

              {/* Source Option 2: Upload external JSON */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Or Upload JSON Backup File from Computer / Pendrive:
                </label>
                <label className="flex flex-col items-center justify-center w-full p-3 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                  <Upload className="w-5 h-5 text-slate-400 mb-1" />
                  <span className="text-xs font-bold text-slate-600">
                    {uploadedJson ? "File Selected & Verified" : "Click to Browse .json backup"}
                  </span>
                  <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRestoreModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteRestore}
                  disabled={restoring}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {restoring ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                  <span>{restoring ? "Restoring Records..." : "Confirm & Restore"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
