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
        setMessage({ type: "success", text: `✅ Backup snapshot '${data.backup.filename}' created successfully!` });
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
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
              Data Store & Integrity
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              PGlite WASM Local Engine
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Database Backup & Storage Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Zero-risk local storage snapshots, 1-click restore points, and table-level records monitoring
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleCreateBackup}
            disabled={creating}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-xs transition-all cursor-pointer"
          >
            {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            <span>{creating ? "Creating Snapshot..." : "Create Backup Now"}</span>
          </button>

          <button
            onClick={() => {
              setSelectedBackupFile(backups[0]?.filename || "");
              setUploadedJson(null);
              setRestoreModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-sm shadow-xs transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            <span>Restore Backup</span>
          </button>
        </div>
      </div>

      {/* Alert Notification */}
      {message && (
        <div
          className={`p-4 rounded-xl border text-sm font-semibold flex items-center justify-between shadow-xs ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-xs underline font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Storage Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Database Storage</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats?.totalStorageFormatted || "Calculating..."}
          </div>
          <p className="text-xs text-slate-500 mt-1">Stored safely on local disk in data/pglite</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Available Backup Points</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{stats?.totalBackupsCount || 0}</div>
          <p className="text-xs text-slate-500 mt-1">Stored in data/backups JSON snapshots</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Recorded Jars</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{stats?.counts?.jars || 0}</div>
          <p className="text-xs text-slate-500 mt-1">Tracked individually with QR tokens</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Accounting Ledger Integrity</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {stats?.doubleEntryStatus?.isBalanced ? "100% Balanced" : "Discrepancy"}
          </div>
          <p className="text-xs text-slate-500 mt-1">Σ Dr ₹{stats?.doubleEntryStatus?.totalDebitsRupees} == Σ Cr</p>
        </div>
      </div>

      {/* Table Records Breakdown */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          Live Database Table Inventory
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-center">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[11px] text-slate-500 font-semibold block">Users</span>
            <span className="text-lg font-black text-slate-900">{stats?.counts?.users || 0}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[11px] text-slate-500 font-semibold block">Customers</span>
            <span className="text-lg font-black text-slate-900">{stats?.counts?.customers || 0}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[11px] text-slate-500 font-semibold block">20L Jars</span>
            <span className="text-lg font-black text-slate-900">{stats?.counts?.jars || 0}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[11px] text-slate-500 font-semibold block">Orders</span>
            <span className="text-lg font-black text-slate-900">{stats?.counts?.orders || 0}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[11px] text-slate-500 font-semibold block">Invoices</span>
            <span className="text-lg font-black text-slate-900">{stats?.counts?.invoices || 0}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[11px] text-slate-500 font-semibold block">Journal Entries</span>
            <span className="text-lg font-black text-slate-900">{stats?.counts?.journalEntries || 0}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[11px] text-slate-500 font-semibold block">Jar Movements</span>
            <span className="text-lg font-black text-slate-900">{stats?.counts?.jarMovementEvents || 0}</span>
          </div>
        </div>
      </div>

      {/* Backup Snapshots History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">Historical Backup Snapshots</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Download backup JSON files to external flash drives or restore any previous state
            </p>
          </div>
          <button
            onClick={loadData}
            title="Refresh Backups List"
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Backup Snapshot File</th>
                <th className="py-3 px-4">Created Date & Time</th>
                <th className="py-3 px-4">Total Records</th>
                <th className="py-3 px-4">File Size</th>
                <th className="py-3 px-4">SHA-256 Checksum</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {backups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-sm font-medium">
                    No backup snapshots created yet. Click &quot;Create Backup Now&quot; above.
                  </td>
                </tr>
              ) : (
                backups.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <Database className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>{b.filename}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {formatDateTimeIST(b.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold text-slate-700">
                      {b.totalRecords} records ({b.tablesCount} tables)
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-600">
                      {(b.sizeBytes / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-400 truncate max-w-[120px]">
                      {b.checksum?.substring(0, 16)}...
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/api/backup/download?filename=${encodeURIComponent(b.filename)}`}
                          download={b.filename}
                          className="inline-flex items-center gap-1 py-1 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </a>

                        <button
                          onClick={() => {
                            setSelectedBackupFile(b.filename);
                            setUploadedJson(null);
                            setRestoreModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 py-1 px-2.5 rounded-lg bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
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
