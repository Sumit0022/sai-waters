import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getDb, getRawClient } from "@/db";
import {
  users,
  roles,
  customers,
  customerAddresses,
  customerPriceAgreements,
  recurringSchedules,
  orders,
  orderItems,
  eventOrders,
  deliveryAssignments,
  dispatchRecords,
  jarMasters,
  qrIdentifiers,
  jarMovementEvents,
  jarCustodies,
  returnInspections,
  damageLossCases,
  invoices,
  invoiceLines,
  paymentLinks,
  paymentAttempts,
  receipts,
  cashCollectionSubmissions,
  cashHandovers,
  chartOfAccounts,
  accountingPeriods,
  journalEntries,
  journalLines,
  auditLogs,
  notificationLogs,
  offlineSyncEvents,
  systemConfigurations,
} from "@/db/schema";
import { getTrialBalance } from "./accounting";

const BACKUP_DIR = path.join(process.cwd(), "data", "backups");

export function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

export interface BackupMetadata {
  id: string;
  filename: string;
  createdAt: string;
  sizeBytes: number;
  totalRecords: number;
  tablesCount: number;
  tableBreakdown: Record<string, number>;
  checksum: string;
}

/**
 * Creates a full JSON snapshot of all application tables
 */
export async function createDatabaseBackup(notes: string = "Manual Backup"): Promise<BackupMetadata> {
  ensureBackupDir();
  const db = await getDb();

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `sai-waters-backup-${timestamp}.json`;
  const filePath = path.join(BACKUP_DIR, filename);

  const dumpData: Record<string, any[]> = {
    users: await db.select().from(users),
    roles: await db.select().from(roles),
    customers: await db.select().from(customers),
    customerAddresses: await db.select().from(customerAddresses),
    customerPriceAgreements: await db.select().from(customerPriceAgreements),
    recurringSchedules: await db.select().from(recurringSchedules),
    orders: await db.select().from(orders),
    orderItems: await db.select().from(orderItems),
    eventOrders: await db.select().from(eventOrders),
    deliveryAssignments: await db.select().from(deliveryAssignments),
    dispatchRecords: await db.select().from(dispatchRecords),
    jarMasters: await db.select().from(jarMasters),
    qrIdentifiers: await db.select().from(qrIdentifiers),
    jarMovementEvents: await db.select().from(jarMovementEvents),
    jarCustodies: await db.select().from(jarCustodies),
    returnInspections: await db.select().from(returnInspections),
    damageLossCases: await db.select().from(damageLossCases),
    invoices: await db.select().from(invoices),
    invoiceLines: await db.select().from(invoiceLines),
    paymentLinks: await db.select().from(paymentLinks),
    paymentAttempts: await db.select().from(paymentAttempts),
    receipts: await db.select().from(receipts),
    cashCollectionSubmissions: await db.select().from(cashCollectionSubmissions),
    cashHandovers: await db.select().from(cashHandovers),
    chartOfAccounts: await db.select().from(chartOfAccounts),
    accountingPeriods: await db.select().from(accountingPeriods),
    journalEntries: await db.select().from(journalEntries),
    journalLines: await db.select().from(journalLines),
    auditLogs: await db.select().from(auditLogs),
    notificationLogs: await db.select().from(notificationLogs),
    offlineSyncEvents: await db.select().from(offlineSyncEvents),
    systemConfigurations: await db.select().from(systemConfigurations),
  };

  const tableBreakdown: Record<string, number> = {};
  let totalRecords = 0;

  for (const [tbl, records] of Object.entries(dumpData)) {
    tableBreakdown[tbl] = records.length;
    totalRecords += records.length;
  }

  const payload = {
    app: "Sai Waters ERP",
    version: "2.0.0",
    schemaVersion: "2026.1",
    createdAt: new Date().toISOString(),
    notes,
    totalRecords,
    tableBreakdown,
    data: dumpData,
  };

  const jsonString = JSON.stringify(payload, null, 2);
  const checksum = crypto.createHash("sha256").update(jsonString).digest("hex");

  fs.writeFileSync(filePath, jsonString, "utf8");
  const stats = fs.statSync(filePath);

  return {
    id: filename,
    filename,
    createdAt: payload.createdAt,
    sizeBytes: stats.size,
    totalRecords,
    tablesCount: Object.keys(dumpData).length,
    tableBreakdown,
    checksum,
  };
}

/**
 * Lists all existing backup snapshots in the data/backups directory
 */
export async function listBackups(): Promise<BackupMetadata[]> {
  ensureBackupDir();
  const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith(".json"));

  const backups: BackupMetadata[] = [];

  for (const file of files) {
    try {
      const filePath = path.join(BACKUP_DIR, file);
      const stat = fs.statSync(filePath);
      const rawContent = fs.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(rawContent);
      const checksum = crypto.createHash("sha256").update(rawContent).digest("hex");

      backups.push({
        id: file,
        filename: file,
        createdAt: parsed.createdAt || stat.birthtime.toISOString(),
        sizeBytes: stat.size,
        totalRecords: parsed.totalRecords || 0,
        tablesCount: Object.keys(parsed.tableBreakdown || {}).length || 0,
        tableBreakdown: parsed.tableBreakdown || {},
        checksum,
      });
    } catch (e) {
      console.error(`Error reading backup file ${file}:`, e);
    }
  }

  return backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Restores a database snapshot from a file or uploaded payload
 */
export async function restoreDatabaseBackup(filenameOrContent: string, isRawJson: boolean = false): Promise<{
  success: boolean;
  restoredRecords: number;
  preRestoreSafetyBackup: string;
  message: string;
}> {
  ensureBackupDir();

  const safetyBackup = await createDatabaseBackup("Pre-Restore Safety Snapshot");

  let parsed: any;
  if (isRawJson) {
    parsed = JSON.parse(filenameOrContent);
  } else {
    const filePath = path.join(BACKUP_DIR, filenameOrContent);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Backup file '${filenameOrContent}' not found.`);
    }
    parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  }

  if (!parsed.data || typeof parsed.data !== "object") {
    throw new Error("Invalid backup format: missing 'data' object.");
  }

  const db = await getDb();
  const rawClient = getRawClient();
  let totalRestored = 0;

  const tablesInOrder = [
    { name: "system_configurations", schema: systemConfigurations, key: "systemConfigurations" },
    { name: "offline_sync_events", schema: offlineSyncEvents, key: "offlineSyncEvents" },
    { name: "notification_logs", schema: notificationLogs, key: "notificationLogs" },
    { name: "audit_logs", schema: auditLogs, key: "auditLogs" },
    { name: "journal_lines", schema: journalLines, key: "journalLines" },
    { name: "journal_entries", schema: journalEntries, key: "journalEntries" },
    { name: "accounting_periods", schema: accountingPeriods, key: "accountingPeriods" },
    { name: "chart_of_accounts", schema: chartOfAccounts, key: "chartOfAccounts" },
    { name: "cash_handovers", schema: cashHandovers, key: "cashHandovers" },
    { name: "cash_collection_submissions", schema: cashCollectionSubmissions, key: "cashCollectionSubmissions" },
    { name: "receipts", schema: receipts, key: "receipts" },
    { name: "payment_attempts", schema: paymentAttempts, key: "paymentAttempts" },
    { name: "payment_links", schema: paymentLinks, key: "paymentLinks" },
    { name: "invoice_lines", schema: invoiceLines, key: "invoiceLines" },
    { name: "invoices", schema: invoices, key: "invoices" },
    { name: "damage_loss_cases", schema: damageLossCases, key: "damageLossCases" },
    { name: "return_inspections", schema: returnInspections, key: "returnInspections" },
    { name: "jar_custodies", schema: jarCustodies, key: "jarCustodies" },
    { name: "jar_movement_events", schema: jarMovementEvents, key: "jarMovementEvents" },
    { name: "qr_identifiers", schema: qrIdentifiers, key: "qrIdentifiers" },
    { name: "jar_masters", schema: jarMasters, key: "jarMasters" },
    { name: "dispatch_records", schema: dispatchRecords, key: "dispatchRecords" },
    { name: "delivery_assignments", schema: deliveryAssignments, key: "deliveryAssignments" },
    { name: "event_orders", schema: eventOrders, key: "eventOrders" },
    { name: "order_items", schema: orderItems, key: "orderItems" },
    { name: "orders", schema: orders, key: "orders" },
    { name: "recurring_schedules", schema: recurringSchedules, key: "recurringSchedules" },
    { name: "customer_price_agreements", schema: customerPriceAgreements, key: "customerPriceAgreements" },
    { name: "customer_addresses", schema: customerAddresses, key: "customerAddresses" },
    { name: "customers", schema: customers, key: "customers" },
    { name: "users", schema: users, key: "users" },
    { name: "roles", schema: roles, key: "roles" },
  ];

  for (const t of tablesInOrder) {
    try {
      await rawClient.exec(`DELETE FROM "${t.name}";`);
    } catch (e) {
      console.warn(`Could not clear table ${t.name}:`, e);
    }
  }

  const insertOrder = [...tablesInOrder].reverse();

  for (const t of insertOrder) {
    const records = parsed.data[t.key] || [];
    if (records.length > 0) {
      try {
        const chunkSize = 50;
        for (let i = 0; i < records.length; i += chunkSize) {
          const chunk = records.slice(i, i + chunkSize);
          await db.insert(t.schema).values(chunk);
        }
        totalRestored += records.length;
      } catch (err) {
        console.error(`Error inserting into ${t.name}:`, err);
      }
    }
  }

  return {
    success: true,
    restoredRecords: totalRestored,
    preRestoreSafetyBackup: safetyBackup.filename,
    message: `Restored ${totalRestored} records across ${tablesInOrder.length} tables successfully.`,
  };
}

/**
 * Returns comprehensive storage and data store statistics
 */
export async function getDataStoreStats() {
  const db = await getDb();
  ensureBackupDir();

  const dataDir = path.join(process.cwd(), "data");
  let dataSizeBytes = 0;

  function calculateDirSize(dir: string) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        calculateDirSize(fullPath);
      } else {
        dataSizeBytes += stat.size;
      }
    }
  }

  calculateDirSize(dataDir);

  const [
    userCount,
    custCount,
    jarCount,
    orderCount,
    invCount,
    jvCount,
    eventCount,
  ] = await Promise.all([
    db.select().from(users),
    db.select().from(customers),
    db.select().from(jarMasters),
    db.select().from(orders),
    db.select().from(invoices),
    db.select().from(journalEntries),
    db.select().from(jarMovementEvents),
  ]);

  const backups = await listBackups();
  const tb = await getTrialBalance();

  return {
    storagePath: dataDir,
    totalStorageSizeBytes: dataSizeBytes,
    totalStorageFormatted: `${(dataSizeBytes / (1024 * 1024)).toFixed(2)} MB`,
    databaseEngine: "PGlite WASM Embedded PostgreSQL (v16 Compatible)",
    lastBackup: backups.length > 0 ? backups[0] : null,
    totalBackupsCount: backups.length,
    counts: {
      users: userCount.length,
      customers: custCount.length,
      jars: jarCount.length,
      orders: orderCount.length,
      invoices: invCount.length,
      journalEntries: jvCount.length,
      jarMovementEvents: eventCount.length,
    },
    doubleEntryStatus: {
      isBalanced: tb.isBalanced,
      totalDebitsRupees: (tb.grandTotalDebitPaise / 100).toFixed(2),
      totalCreditsRupees: (tb.grandTotalCreditPaise / 100).toFixed(2),
    },
  };
}
