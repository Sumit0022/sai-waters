import { getRawClient, ensureDatabaseReady } from "@/db";

/**
 * Removes all demo operational data (customers, orders, invoices, cash collections, handovers, trips)
 * and resets all jars to AVAILABLE in plant custody with zero usage cycles.
 * 
 * Preserves:
 * - Admin and driver users (users, roles, permissions, user_roles)
 * - Chart of Accounts (1110, 1120, 1130, etc.)
 * - System configurations (business info, jar policy)
 * - Jar assets & QR codes (reset to PLANT / AVAILABLE)
 */
export async function cleanAllDemoData(): Promise<{ success: boolean; message: string; deletedCounts: Record<string, number>; errors?: string[] }> {
  await ensureDatabaseReady();
  const raw = getRawClient();
  const deletedCounts: Record<string, number> = {};
  const errors: string[] = [];

  const exec = async (sql: string, key?: string) => {
    try {
      const res = await raw.query(sql);
      if (key) {
        deletedCounts[key] = (deletedCounts[key] || 0) + (res.rowCount || 0);
      }
      return res;
    } catch (e: any) {
      errors.push(`Error executing: ${sql} -> ${e.message}`);
      return null;
    }
  };

  // 1. Reset Jar Custodies & Movement Events first (drops foreign keys pointing to orders & customers)
  await exec("UPDATE jar_custodies SET customer_id = NULL, custody_type = 'PLANT'", "jarCustodiesReset");
  await exec("DELETE FROM jar_movement_events", "jarMovementEvents");
  await exec("DELETE FROM return_inspections", "returnInspections");
  await exec("DELETE FROM damage_loss_cases", "damageLossCases");
  await exec("UPDATE jar_masters SET current_status = 'AVAILABLE', total_usage_cycles = 0", "jarsReset");

  // 2. Delete Field Cash Submissions, Handovers & Receipts (drops references to orders, invoices, customers)
  await exec("DELETE FROM cash_collection_submissions", "cashCollectionSubmissions");
  await exec("DELETE FROM cash_handovers", "cashHandovers");
  await exec("DELETE FROM receipts", "receipts");
  await exec("DELETE FROM refunds_adjustments", "refundsAdjustments");

  // 3. Delete Invoices & Payments (drops references to orders & customers)
  await exec("DELETE FROM payment_webhook_events", "paymentWebhookEvents");
  await exec("DELETE FROM payment_attempts", "paymentAttempts");
  await exec("DELETE FROM payment_links", "paymentLinks");
  await exec("DELETE FROM invoice_lines", "invoiceLines");
  await exec("DELETE FROM invoices", "invoices");

  // 4. Delete Dispatch Records & Delivery Trips (drops references to orders)
  await exec("DELETE FROM dispatch_records", "dispatchRecords");
  await exec("DELETE FROM delivery_assignments", "deliveryAssignments");

  // 5. Delete Orders (now zero child tables reference orders)
  await exec("DELETE FROM order_items", "orderItems");
  await exec("DELETE FROM event_orders", "eventOrders");
  await exec("DELETE FROM orders", "orders");

  // 6. Delete Customer Relations & Customers (now zero tables reference customers)
  await exec("DELETE FROM recurring_schedules", "recurringSchedules");
  await exec("DELETE FROM customer_price_agreements", "customerPriceAgreements");
  await exec("DELETE FROM customer_addresses", "customerAddresses");
  await exec("DELETE FROM customers", "customers");

  // 7. Reset Accounting Journal Entries & Reconciliations
  await exec("DELETE FROM journal_lines", "journalLines");
  await exec("DELETE FROM journal_entries", "journalEntries");
  await exec("DELETE FROM reconciliation_matches", "reconciliationMatches");
  await exec("DELETE FROM reconciliation_sessions", "reconciliationSessions");
  await exec("DELETE FROM bank_statement_imports", "bankStatementImports");
  await exec("DELETE FROM offline_sync_events", "offlineSyncEvents");
  await exec("DELETE FROM notification_logs", "notificationLogs");
  await exec("DELETE FROM audit_logs", "auditLogs");

  return {
    success: errors.length === 0,
    message: errors.length === 0 
      ? "All demo operational data has been completely removed. System is clean and ready for live production."
      : `Completed with ${errors.length} warnings`,
    deletedCounts,
    ...(errors.length > 0 ? { errors } : {}),
  };
}
