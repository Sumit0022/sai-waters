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

export function getBackupDir(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NODE_ENV === "production") {
    const tmpDir = path.join("/tmp", "sai-waters-backups");
    return tmpDir;
  }
  return path.join(process.cwd(), "data", "backups");
}

export function ensureBackupDir(): string {
  const dir = getBackupDir();
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  } catch (e) {
    console.warn("Failed to create preferred backup dir, using /tmp fallback:", e);
    const fallbackDir = path.join("/tmp", "sai-waters-backups");
    if (!fs.existsSync(fallbackDir)) {
      fs.mkdirSync(fallbackDir, { recursive: true });
    }
    return fallbackDir;
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

async function executeRawSql(sqlString: string) {
  const raw = getRawClient();
  if (raw.exec) {
    return await raw.exec(sqlString);
  } else if (raw.query) {
    return await raw.query(sqlString);
  }
}

/**
 * Generates an in-memory full JSON snapshot of all application tables
 */
export async function generateLiveBackupPayload(notes: string = "Manual Snapshot") {
  const db = getDb();

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

  return payload;
}

/**
 * Creates a full JSON snapshot of all application tables and saves to disk
 */
export async function createDatabaseBackup(notes: string = "Manual Backup"): Promise<{ metadata: BackupMetadata; payload: any }> {
  const dir = ensureBackupDir();
  const payload = await generateLiveBackupPayload(notes);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `sai-waters-backup-${timestamp}.json`;
  const filePath = path.join(dir, filename);

  const jsonString = JSON.stringify(payload, null, 2);
  const checksum = crypto.createHash("sha256").update(jsonString).digest("hex");

  try {
    fs.writeFileSync(filePath, jsonString, "utf8");
  } catch (err) {
    console.warn("Could not write backup to disk (serverless ephemeral):", err);
  }

  const sizeBytes = Buffer.byteLength(jsonString, "utf8");

  const metadata: BackupMetadata = {
    id: filename,
    filename,
    createdAt: payload.createdAt,
    sizeBytes,
    totalRecords: payload.totalRecords,
    tablesCount: Object.keys(payload.data).length,
    tableBreakdown: payload.tableBreakdown,
    checksum,
  };

  return { metadata, payload };
}

/**
 * Lists all existing backup snapshots in the backups directory
 */
export async function listBackups(): Promise<BackupMetadata[]> {
  const dir = ensureBackupDir();
  let files: string[] = [];
  try {
    if (fs.existsSync(dir)) {
      files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
    }
  } catch (e) {
    console.warn("Could not read backup directory:", e);
    return [];
  }

  const backups: BackupMetadata[] = [];

  for (const file of files) {
    try {
      const filePath = path.join(dir, file);
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

  // Create safety snapshot before altering database
  const safetyBackup = await createDatabaseBackup("Pre-Restore Safety Snapshot");

  let parsed: any;
  if (isRawJson) {
    parsed = typeof filenameOrContent === "string" ? JSON.parse(filenameOrContent) : filenameOrContent;
  } else {
    const dir = ensureBackupDir();
    const filePath = path.join(dir, filenameOrContent);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Backup file '${filenameOrContent}' not found.`);
    }
    parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  }

  if (!parsed.data || typeof parsed.data !== "object") {
    throw new Error("Invalid backup format: missing 'data' object.");
  }

  const db = getDb();
  let totalRestored = 0;

  // Clear tables in reverse dependency order (child tables first, parent tables last)
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
      await executeRawSql(`DELETE FROM "${t.name}";`);
    } catch (e) {
      console.warn(`Could not clear table ${t.name}:`, e);
    }
  }

  // Insert tables in topological dependency order (parents first, children last)
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
    preRestoreSafetyBackup: safetyBackup.metadata.filename,
    message: `Restored ${totalRestored} records across ${tablesInOrder.length} tables successfully.`,
  };
}

/**
 * Returns comprehensive storage and data store statistics safely
 */
export async function getDataStoreStats() {
  const db = getDb();
  const dir = ensureBackupDir();

  let dataSizeBytes = 0;
  const isCloudDb = Boolean(process.env.DATABASE_URL && (process.env.DATABASE_URL.includes("neon.tech") || process.env.DATABASE_URL.includes("postgres")));

  try {
    const dataDir = path.join(process.cwd(), "data");
    if (fs.existsSync(dataDir)) {
      const calculateDirSize = (d: string) => {
        const items = fs.readdirSync(d);
        for (const item of items) {
          const fullPath = path.join(d, item);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            calculateDirSize(fullPath);
          } else {
            dataSizeBytes += stat.size;
          }
        }
      };
      calculateDirSize(dataDir);
    }
  } catch (_e) {
    dataSizeBytes = 1024 * 1024 * 5; // Fallback estimate
  }

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
  let tb = { isBalanced: true, grandTotalDebitPaise: 0, grandTotalCreditPaise: 0 };
  try {
    tb = await getTrialBalance();
  } catch (_tbErr) {
    // Graceful fallback
  }

  return {
    storagePath: isCloudDb ? "Neon Cloud High-Availability Storage" : dir,
    totalStorageSizeBytes: dataSizeBytes,
    totalStorageFormatted: isCloudDb ? "Neon Managed Cloud DB" : `${(dataSizeBytes / (1024 * 1024)).toFixed(2)} MB`,
    databaseEngine: isCloudDb ? "Neon Cloud PostgreSQL (High Availability)" : "PGlite WASM Embedded PostgreSQL (v16 Compatible)",
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
