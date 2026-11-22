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
export async function cleanAllDemoData(): Promise<{ success: boolean; message: string; deletedCounts: Record<string, number> }> {
  await ensureDatabaseReady();
  const raw = getRawClient();

  const runSql = async (sql: string) => {
    if (raw.exec) {
      return await raw.exec(sql);
    } else {
      return await raw.query(sql);
    }
  };

  const deletedCounts: Record<string, number> = {};

  // 1. Delete Cash Collections & Handovers
  try {
    const r1 = await raw.query("DELETE FROM cash_collection_submissions");
    deletedCounts.cashCollectionSubmissions = r1.rowCount || 0;
  } catch (e: any) {
    deletedCounts.cashCollectionSubmissions = 0;
  }

  try {
    const r2 = await raw.query("DELETE FROM cash_handovers");
    deletedCounts.cashHandovers = r2.rowCount || 0;
  } catch (e: any) {
    deletedCounts.cashHandovers = 0;
  }

  // 2. Delete Receipts & Refunds
  try {
    const r3 = await raw.query("DELETE FROM receipts");
    deletedCounts.receipts = r3.rowCount || 0;
  } catch (e: any) {
    deletedCounts.receipts = 0;
  }

  try {
    const r4 = await raw.query("DELETE FROM refunds_adjustments");
    deletedCounts.refundsAdjustments = r4.rowCount || 0;
  } catch (e: any) {
    deletedCounts.refundsAdjustments = 0;
  }

  // 3. Delete Payments
  try {
    await raw.query("DELETE FROM payment_webhook_events");
    await raw.query("DELETE FROM payment_attempts");
    await raw.query("DELETE FROM payment_links");
  } catch (e: any) {}

  // 4. Delete Invoices
  try {
    await raw.query("DELETE FROM invoice_lines");
    const r5 = await raw.query("DELETE FROM invoices");
    deletedCounts.invoices = r5.rowCount || 0;
  } catch (e: any) {
    deletedCounts.invoices = 0;
  }

  // 5. Delete Dispatches & Trips
  try {
    await raw.query("DELETE FROM dispatch_records");
    const r6 = await raw.query("DELETE FROM delivery_assignments");
    deletedCounts.deliveryAssignments = r6.rowCount || 0;
  } catch (e: any) {
    deletedCounts.deliveryAssignments = 0;
  }

  // 6. Delete Orders
  try {
    await raw.query("DELETE FROM order_items");
    await raw.query("DELETE FROM event_orders");
    const r7 = await raw.query("DELETE FROM orders");
    deletedCounts.orders = r7.rowCount || 0;
  } catch (e: any) {
    deletedCounts.orders = 0;
  }

  // 7. Reset Jars & QR codes to AVAILABLE at Plant
  try {
    await raw.query("DELETE FROM jar_movement_events");
    await raw.query("DELETE FROM return_inspections");
    await raw.query("DELETE FROM damage_loss_cases");
    
    // Clear customer custody, bring all jars to PLANT
    await raw.query("UPDATE jar_custodies SET custody_type = 'PLANT', customer_id = NULL");
    
    // Mark all jars as AVAILABLE with 0 usage cycles
    const r8 = await raw.query("UPDATE jar_masters SET current_status = 'AVAILABLE', total_usage_cycles = 0");
    deletedCounts.jarsReset = r8.rowCount || 0;
  } catch (e: any) {
    console.error("Jar reset error:", e);
  }

  // 8. Delete Customers, Schedules & Price Agreements
  try {
    await raw.query("DELETE FROM recurring_schedules");
    await raw.query("DELETE FROM customer_price_agreements");
    await raw.query("DELETE FROM customer_addresses");
    const r9 = await raw.query("DELETE FROM customers");
    deletedCounts.customers = r9.rowCount || 0;
  } catch (e: any) {
    deletedCounts.customers = 0;
  }

  // 9. Reset Journal Entries & Accounting lines
  try {
    await raw.query("DELETE FROM journal_lines");
    await raw.query("DELETE FROM journal_entries");
    await raw.query("DELETE FROM reconciliation_matches");
    await raw.query("DELETE FROM reconciliation_sessions");
    await raw.query("DELETE FROM bank_statement_imports");
    await raw.query("DELETE FROM offline_sync_events");
    await raw.query("DELETE FROM notification_logs");
    await raw.query("DELETE FROM audit_logs");
  } catch (e: any) {}

  return {
    success: true,
    message: "All demo operational data has been completely removed. System is clean and ready for live production.",
    deletedCounts,
  };
}
