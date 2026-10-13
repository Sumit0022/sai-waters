import { pgTable, text, integer, timestamp, boolean, varchar, bigint, uniqueIndex, index } from "drizzle-orm/pg-core";

// ==========================================
// 1. SECURITY, USERS & ROLES
// ==========================================
export const users = pgTable("users", {
  id: text("id").primaryKey(), // UUID
  fullName: text("full_name").notNull(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  email: varchar("email", { length: 100 }),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 30 }).notNull().default("DELIVERY_STAFF"), // OWNER, OPERATIONS_MANAGER, ACCOUNTANT, DELIVERY_STAFF, ORDER_ENTRY, CUSTOMER
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("idx_users_phone").on(table.phone),
  index("idx_users_role").on(table.role),
]);

export const roles = pgTable("roles", {
  id: varchar("id", { length: 30 }).primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
});

export const permissions = pgTable("permissions", {
  id: varchar("id", { length: 60 }).primaryKey(),
  module: varchar("module", { length: 40 }).notNull(),
  action: varchar("action", { length: 40 }).notNull(),
  description: text("description"),
});

export const userRoles = pgTable("user_roles", {
  userId: text("user_id").notNull().references(() => users.id),
  roleId: varchar("role_id", { length: 30 }).notNull().references(() => roles.id),
});

// ==========================================
// 2. CUSTOMERS & PRICING
// ==========================================
export const customers = pgTable("customers", {
  id: text("id").primaryKey(),
  customerCode: varchar("customer_code", { length: 30 }).notNull().unique(), // e.g. CUST-001
  fullName: text("full_name").notNull(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  email: varchar("email", { length: 100 }),
  customerType: varchar("customer_type", { length: 30 }).notNull().default("RESIDENTIAL"), // RESIDENTIAL, COMMERCIAL, EVENT
  billingFrequency: varchar("billing_frequency", { length: 30 }).notNull().default("MONTHLY"), // MONTHLY, PER_DELIVERY, WEEKLY
  heldJarsCount: integer("held_jars_count").notNull().default(0), // Active custody count
  currentBalancePaise: bigint("current_balance_paise", { mode: "number" }).notNull().default(0), // +ve means customer owes money
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("idx_customers_code").on(table.customerCode),
  index("idx_customers_phone").on(table.phone),
]);

export const customerAddresses = pgTable("customer_addresses", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").notNull().references(() => customers.id),
  label: varchar("label", { length: 40 }).notNull().default("Main Address"), // Home, Office, Event Venue
  streetAddress: text("street_address").notNull(),
  locality: text("locality").notNull(),
  city: varchar("city", { length: 50 }).notNull().default("Bareilly"),
  pincode: varchar("pincode", { length: 10 }).notNull(),
  latitude: text("latitude"),
  longitude: text("longitude"),
  deliveryInstructions: text("delivery_instructions"),
  isDefault: boolean("is_default").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const customerPriceAgreements = pgTable("customer_price_agreements", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").notNull().references(() => customers.id),
  pricePerJarPaise: integer("price_per_jar_paise").notNull(), // e.g. 3500 = ₹35.00
  effectiveFrom: timestamp("effective_from").notNull().defaultNow(),
  effectiveTo: timestamp("effective_to"),
  notes: text("notes"),
});

// ==========================================
// 3. RECURRING SCHEDULES & ORDERS
// ==========================================
export const recurringSchedules = pgTable("recurring_schedules", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").notNull().references(() => customers.id),
  addressId: text("address_id").notNull().references(() => customerAddresses.id),
  daysOfWeek: text("days_of_week").notNull().default("1,2,3,4,5,6,7"), // comma-separated 1=Mon .. 7=Sun
  quantityJars: integer("quantity_jars").notNull().default(1),
  isPaused: boolean("is_paused").notNull().default(false),
  pauseStartDate: timestamp("pause_start_date"),
  pauseEndDate: timestamp("pause_end_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  orderNumber: varchar("order_number", { length: 40 }).notNull().unique(), // e.g. ORD-2026-0001
  customerId: text("customer_id").notNull().references(() => customers.id),
  addressId: text("address_id").notNull().references(() => customerAddresses.id),
  scheduleId: text("schedule_id").references(() => recurringSchedules.id),
  orderType: varchar("order_type", { length: 30 }).notNull().default("RECURRING"), // RECURRING, ONE_TIME_EVENT
  scheduledDate: varchar("scheduled_date", { length: 12 }).notNull(), // YYYY-MM-DD
  quantityJars: integer("quantity_jars").notNull().default(1),
  unitPricePaise: integer("unit_price_paise").notNull(),
  totalAmountPaise: integer("total_amount_paise").notNull(),
  status: varchar("status", { length: 30 }).notNull().default("CONFIRMED"), // DRAFT, CONFIRMED, DISPATCHED, DELIVERED, CANCELLED
  deliveryNotes: text("delivery_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("idx_orders_number").on(table.orderNumber),
  index("idx_orders_scheduled_date").on(table.scheduledDate),
]);

export const orderItems = pgTable("order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id),
  itemDescription: text("item_description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPricePaise: integer("unit_price_paise").notNull(),
  lineTotalPaise: integer("line_total_paise").notNull(),
});

export const eventOrders = pgTable("event_orders", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id),
  eventName: text("event_name").notNull(),
  venueContactPerson: text("venue_contact_person").notNull(),
  venueContactPhone: varchar("venue_contact_phone", { length: 20 }).notNull(),
  eventDate: varchar("event_date", { length: 12 }).notNull(),
  pickupDeadline: timestamp("pickup_deadline"),
  depositAmountPaise: integer("deposit_amount_paise").notNull().default(0),
  depositStatus: varchar("deposit_status", { length: 30 }).notNull().default("PENDING"), // PENDING, PAID, REFUNDED, ADJUSTED
});

// ==========================================
// 4. LOGISTICS & DISPATCH
// ==========================================
export const deliveryAssignments = pgTable("delivery_assignments", {
  id: text("id").primaryKey(),
  tripSheetNumber: varchar("trip_sheet_number", { length: 40 }).notNull().unique(), // e.g. TRIP-20261013-01
  driverId: text("driver_id").notNull().references(() => users.id),
  vehicleNumber: varchar("vehicle_number", { length: 30 }),
  routeDate: varchar("route_date", { length: 12 }).notNull(), // YYYY-MM-DD
  status: varchar("status", { length: 30 }).notNull().default("ASSIGNED"), // ASSIGNED, IN_PROGRESS, COMPLETED
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

export const dispatchRecords = pgTable("dispatch_records", {
  id: text("id").primaryKey(),
  assignmentId: text("assignment_id").notNull().references(() => deliveryAssignments.id),
  orderId: text("order_id").notNull().references(() => orders.id),
  sequenceOrder: integer("sequence_order").notNull().default(1),
  status: varchar("status", { length: 30 }).notNull().default("PENDING"), // PENDING, DELIVERED, EXCEPTION, CANCELLED
  fullJarsDelivered: integer("full_jars_delivered").notNull().default(0),
  emptyJarsReturned: integer("empty_jars_returned").notNull().default(0),
  notes: text("notes"),
});

// ==========================================
// 5. JAR ASSET & QR TRACKING
// ==========================================
export const jarMasters = pgTable("jar_masters", {
  id: text("id").primaryKey(),
  permanentJarCode: varchar("permanent_jar_code", { length: 40 }).notNull().unique(), // e.g. JAR-20L-0001
  acquisitionDate: varchar("acquisition_date", { length: 12 }).notNull(),
  acquisitionCostPaise: integer("acquisition_cost_paise").notNull().default(18000), // e.g. ₹180.00
  currentStatus: varchar("current_status", { length: 40 }).notNull().default("AVAILABLE"),
  // AVAILABLE, RESERVED, ALLOCATED, IN_TRANSIT, DELIVERED_CUSTOMER, RETURNED_INSPECT, UNDER_REPAIR, MISSING_INVESTIG, CONFIRMED_LOST, RETIRED
  totalUsageCycles: integer("total_usage_cycles").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
}, (table) => [
  uniqueIndex("idx_jar_code").on(table.permanentJarCode),
  index("idx_jar_status").on(table.currentStatus),
]);

export const qrIdentifiers = pgTable("qr_identifiers", {
  id: text("id").primaryKey(),
  jarId: text("jar_id").notNull().references(() => jarMasters.id),
  qrToken: varchar("qr_token", { length: 100 }).notNull().unique(), // opaque UUID lookup token
  isActive: boolean("is_active").notNull().default(true),
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
  retiredAt: timestamp("retired_at"),
  retirementReason: text("retirement_reason"),
});

export const jarMovementEvents = pgTable("jar_movement_events", {
  id: text("id").primaryKey(),
  jarId: text("jar_id").notNull().references(() => jarMasters.id),
  actorUserId: text("actor_user_id").notNull().references(() => users.id),
  orderId: text("order_id").references(() => orders.id),
  assignmentId: text("assignment_id").references(() => deliveryAssignments.id),
  fromStatus: varchar("from_status", { length: 40 }).notNull(),
  toStatus: varchar("to_status", { length: 40 }).notNull(),
  geoLat: text("geo_lat"),
  geoLng: text("geo_lng"),
  clientEventId: text("client_event_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const jarCustodies = pgTable("jar_custodies", {
  jarId: text("jar_id").primaryKey().references(() => jarMasters.id),
  custodyType: varchar("custody_type", { length: 30 }).notNull().default("PLANT"), // PLANT, IN_VEHICLE, WITH_CUSTOMER
  customerId: text("customer_id").references(() => customers.id),
  holderUserId: text("holder_user_id").references(() => users.id),
  transferredAt: timestamp("transferred_at").notNull().defaultNow(),
});

export const returnInspections = pgTable("return_inspections", {
  id: text("id").primaryKey(),
  jarId: text("jar_id").notNull().references(() => jarMasters.id),
  inspectedBy: text("inspected_by").notNull().references(() => users.id),
  inspectionResult: varchar("inspection_result", { length: 30 }).notNull(), // PASS, NECK_CRACK, BASE_LEAK, CONTAMINATED
  actionTaken: varchar("action_taken", { length: 30 }).notNull(), // RETURN_TO_SERVICE, SEND_FOR_REPAIR, CONDEMN_SCRAP
  notes: text("notes"),
  inspectedAt: timestamp("inspected_at").notNull().defaultNow(),
});

export const damageLossCases = pgTable("damage_loss_cases", {
  id: text("id").primaryKey(),
  jarId: text("jar_id").notNull().references(() => jarMasters.id),
  customerId: text("customer_id").references(() => customers.id),
  orderId: text("order_id").references(() => orders.id),
  caseStatus: varchar("case_status", { length: 30 }).notNull().default("OPEN_INVESTIGATION"), // OPEN_INVESTIGATION, RESOLVED_RECOVERED, APPROVED_LOSS_CHARGED, APPROVED_SCRAP
  agreedChargePaise: integer("agreed_charge_paise").default(0),
  authorizedBy: text("authorized_by").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

// ==========================================
// 6. BILLING, INVOICES & PAYMENTS
// ==========================================
export const invoices = pgTable("invoices", {
  id: text("id").primaryKey(),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull().unique(), // e.g. SW/26-27/INV-0001
  customerId: text("customer_id").notNull().references(() => customers.id),
  orderId: text("order_id").references(() => orders.id), // for spot event invoices
  invoiceDate: varchar("invoice_date", { length: 12 }).notNull(), // YYYY-MM-DD
  dueDate: varchar("due_date", { length: 12 }).notNull(),
  subtotalPaise: integer("subtotal_paise").notNull(),
  taxPaise: integer("tax_paise").notNull().default(0), // Currently 0 (GST Unregistered)
  totalAmountPaise: integer("total_amount_paise").notNull(),
  paidAmountPaise: integer("paid_amount_paise").notNull().default(0),
  status: varchar("status", { length: 30 }).notNull().default("ISSUED"), // DRAFT, ISSUED, PARTIALLY_PAID, PAID, CANCELLED
  billingType: varchar("billing_type", { length: 30 }).notNull().default("MONTHLY_CONSOLIDATED"), // MONTHLY_CONSOLIDATED, SPOT_DELIVERY, EVENT_SETTLEMENT
  pdfUrl: text("pdf_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("idx_invoice_number").on(table.invoiceNumber),
  index("idx_invoice_customer").on(table.customerId),
]);

export const invoiceLines = pgTable("invoice_lines", {
  id: text("id").primaryKey(),
  invoiceId: text("invoice_id").notNull().references(() => invoices.id),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPricePaise: integer("unit_price_paise").notNull(),
  lineTotalPaise: integer("line_total_paise").notNull(),
});

export const paymentLinks = pgTable("payment_links", {
  id: text("id").primaryKey(),
  invoiceId: text("invoice_id").notNull().references(() => invoices.id),
  gatewayProvider: varchar("gateway_provider", { length: 30 }).notNull().default("MANUAL_UPI"), // MANUAL_UPI, RAZORPAY, CASHFREE
  linkUrl: text("link_url").notNull(),
  amountPaise: integer("amount_paise").notNull(),
  expiresAt: timestamp("expires_at"),
  status: varchar("status", { length: 30 }).notNull().default("ACTIVE"), // ACTIVE, PAID, EXPIRED
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const paymentAttempts = pgTable("payment_attempts", {
  id: text("id").primaryKey(),
  paymentLinkId: text("payment_link_id").notNull().references(() => paymentLinks.id),
  gatewayPaymentId: text("gateway_payment_id"),
  amountPaise: integer("amount_paise").notNull(),
  paymentMethod: varchar("payment_method", { length: 30 }).default("UPI"),
  status: varchar("status", { length: 30 }).notNull().default("INITIATED"), // INITIATED, SUCCESS, FAILED
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const paymentWebhookEvents = pgTable("payment_webhook_events", {
  id: text("id").primaryKey(),
  provider: varchar("provider", { length: 30 }).notNull(),
  providerEventId: varchar("provider_event_id", { length: 100 }).notNull().unique(),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  payloadJson: text("payload_json").notNull(),
  signatureVerified: boolean("signature_verified").notNull().default(false),
  isProcessed: boolean("is_processed").notNull().default(false),
  processedAt: timestamp("processed_at"),
});

export const receipts = pgTable("receipts", {
  id: text("id").primaryKey(),
  receiptNumber: varchar("receipt_number", { length: 50 }).notNull().unique(), // e.g. REC-2026-0001
  customerId: text("customer_id").notNull().references(() => customers.id),
  invoiceId: text("invoice_id").references(() => invoices.id),
  amountPaise: integer("amount_paise").notNull(),
  paymentMode: varchar("payment_mode", { length: 30 }).notNull().default("CASH"), // CASH, UPI_MANUAL, BANK_NEFT, GATEWAY_ONLINE
  transactionReference: varchar("transaction_reference", { length: 100 }), // UTR or receipt slip
  recordedBy: text("recorded_by").notNull().references(() => users.id),
  receiptDate: varchar("receipt_date", { length: 12 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const refundsAdjustments = pgTable("refunds_adjustments", {
  id: text("id").primaryKey(),
  adjustmentNumber: varchar("adjustment_number", { length: 50 }).notNull().unique(), // e.g. CRN-2026-0001
  customerId: text("customer_id").notNull().references(() => customers.id),
  invoiceId: text("invoice_id").references(() => invoices.id),
  adjustmentType: varchar("adjustment_type", { length: 30 }).notNull(), // CREDIT_NOTE, DEPOSIT_REFUND, DISPUTE_WAIVER
  amountPaise: integer("amount_paise").notNull(),
  reason: text("reason").notNull(),
  authorizedBy: text("authorized_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ==========================================
// 7. CASH HANDOVER & DRIVER CLEARING
// ==========================================
export const cashCollectionSubmissions = pgTable("cash_collection_submissions", {
  id: text("id").primaryKey(),
  driverId: text("driver_id").notNull().references(() => users.id),
  orderId: text("order_id").references(() => orders.id),
  invoiceId: text("invoice_id").references(() => invoices.id),
  amountCollectedPaise: integer("amount_collected_paise").notNull(),
  clientEventId: text("client_event_id"),
  collectedAt: timestamp("collected_at").notNull().defaultNow(),
  handoverId: text("handover_id"),
  isHandedOver: boolean("is_handed_over").notNull().default(false),
});

export const cashHandovers = pgTable("cash_handovers", {
  id: text("id").primaryKey(),
  driverId: text("driver_id").notNull().references(() => users.id),
  receivedBy: text("received_by").notNull().references(() => users.id),
  totalDeclaredPaise: integer("total_declared_paise").notNull(),
  totalVerifiedPaise: integer("total_verified_paise").notNull(),
  variancePaise: integer("variance_paise").notNull().default(0),
  status: varchar("status", { length: 30 }).notNull().default("VERIFIED"), // VERIFIED, DISPUTED
  handoverTimestamp: timestamp("handover_timestamp").notNull().defaultNow(),
  notes: text("notes"),
});

// ==========================================
// 8. DOUBLE-ENTRY ACCOUNTING CORE
// ==========================================
export const chartOfAccounts = pgTable("chart_of_accounts", {
  id: integer("id").primaryKey(), // e.g. 1110, 1120, 1130, 1150, 1210, 2110, 3110, 4110, etc.
  accountCode: varchar("account_code", { length: 20 }).notNull().unique(),
  accountName: text("account_name").notNull(),
  accountType: varchar("account_type", { length: 30 }).notNull(), // ASSET, LIABILITY, EQUITY, REVENUE, COGS, EXPENSE
  isReconcilable: boolean("is_reconcilable").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
});

export const journalEntries = pgTable("journal_entries", {
  id: text("id").primaryKey(),
  entryNumber: varchar("entry_number", { length: 50 }).notNull().unique(), // e.g. JV-2026-0001
  entryDate: varchar("entry_date", { length: 12 }).notNull(),
  sourceDocumentType: varchar("source_document_type", { length: 40 }).notNull(), // INVOICE, RECEIPT, HANDOVER, DEPRECIATION, MANUAL, LOSS_CHARGE
  sourceDocumentId: text("source_document_id"),
  narration: text("narration").notNull(),
  isPosted: boolean("is_posted").notNull().default(true),
  postedBy: text("posted_by").notNull().references(() => users.id),
  postedAt: timestamp("posted_at").notNull().defaultNow(),
});

export const journalLines = pgTable("journal_lines", {
  id: text("id").primaryKey(),
  journalEntryId: text("journal_entry_id").notNull().references(() => journalEntries.id),
  accountId: integer("account_id").notNull().references(() => chartOfAccounts.id),
  debitPaise: integer("debit_paise").notNull().default(0),
  creditPaise: integer("credit_paise").notNull().default(0),
  subLedgerType: varchar("sub_ledger_type", { length: 30 }).default("NONE"), // CUSTOMER, SUPPLIER, DRIVER, NONE
  subLedgerId: text("sub_ledger_id"),
});

export const accountingPeriods = pgTable("accounting_periods", {
  id: varchar("id", { length: 10 }).primaryKey(), // e.g. 2026-10
  periodCode: varchar("period_code", { length: 20 }).notNull(),
  startDate: varchar("start_date", { length: 12 }).notNull(),
  endDate: varchar("end_date", { length: 12 }).notNull(),
  isClosed: boolean("is_closed").notNull().default(false),
  closedAt: timestamp("closed_at"),
  closedBy: text("closed_by").references(() => users.id),
});

// ==========================================
// 9. RECONCILIATION & SUPPLIERS
// ==========================================
export const bankStatementImports = pgTable("bank_statement_imports", {
  id: text("id").primaryKey(),
  bankAccountId: integer("bank_account_id").notNull().references(() => chartOfAccounts.id),
  filename: text("filename").notNull(),
  totalRows: integer("total_rows").notNull().default(0),
  importedAt: timestamp("imported_at").notNull().defaultNow(),
  importedBy: text("imported_by").notNull().references(() => users.id),
});

export const reconciliationSessions = pgTable("reconciliation_sessions", {
  id: text("id").primaryKey(),
  reconciliationType: varchar("reconciliation_type", { length: 30 }).notNull(), // BANK, GATEWAY, DRIVER_CASH, JAR_PHYSICAL
  sessionDate: varchar("session_date", { length: 12 }).notNull(),
  reconciledBy: text("reconciled_by").notNull().references(() => users.id),
  closingVariancePaise: integer("closing_variance_paise").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const reconciliationMatches = pgTable("reconciliation_matches", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => reconciliationSessions.id),
  journalLineId: text("journal_line_id").notNull().references(() => journalLines.id),
  externalReference: text("external_reference"),
  matchedAmountPaise: integer("matched_amount_paise").notNull(),
  matchedAt: timestamp("matched_at").notNull().defaultNow(),
});

export const suppliers = pgTable("suppliers", {
  id: text("id").primaryKey(),
  supplierCode: varchar("supplier_code", { length: 30 }).notNull().unique(), // e.g. SUP-001
  name: text("name").notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 100 }),
  currentPayablePaise: integer("current_payable_paise").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export const purchaseRecords = pgTable("purchase_records", {
  id: text("id").primaryKey(),
  supplierId: text("supplier_id").notNull().references(() => suppliers.id),
  billNumber: varchar("bill_number", { length: 50 }).notNull(),
  billDate: varchar("bill_date", { length: 12 }).notNull(),
  totalAmountPaise: integer("total_amount_paise").notNull(),
  paymentStatus: varchar("payment_status", { length: 30 }).notNull().default("UNPAID"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const expenseRecords = pgTable("expense_records", {
  id: text("id").primaryKey(),
  expenseDate: varchar("expense_date", { length: 12 }).notNull(),
  accountId: integer("account_id").notNull().references(() => chartOfAccounts.id),
  amountPaise: integer("amount_paise").notNull(),
  paidViaAccountId: integer("paid_via_account_id").notNull().references(() => chartOfAccounts.id),
  receiptImageUrl: text("receipt_image_url"),
  notes: text("notes"),
  recordedBy: text("recorded_by").notNull().references(() => users.id),
});

export const assetRecords = pgTable("asset_records", {
  id: text("id").primaryKey(),
  assetName: text("asset_name").notNull(),
  accountId: integer("account_id").notNull().references(() => chartOfAccounts.id),
  purchaseDate: varchar("purchase_date", { length: 12 }).notNull(),
  costPaise: integer("cost_paise").notNull(),
  salvageValuePaise: integer("salvage_value_paise").notNull().default(0),
  usefulLifeMonths: integer("useful_life_months").notNull().default(24),
  accumulatedDepreciationPaise: integer("accumulated_depreciation_paise").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

// ==========================================
// 10. AUDIT, SYNC & CONFIG
// ==========================================
export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  tableName: varchar("table_name", { length: 50 }).notNull(),
  recordId: text("record_id").notNull(),
  action: varchar("action", { length: 20 }).notNull(), // INSERT, UPDATE, DELETE
  oldValuesJson: text("old_values_json"),
  newValuesJson: text("new_values_json"),
  userId: text("user_id").references(() => users.id),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const notificationLogs = pgTable("notification_logs", {
  id: text("id").primaryKey(),
  recipientPhone: varchar("recipient_phone", { length: 20 }).notNull(),
  channel: varchar("channel", { length: 20 }).notNull().default("WHATSAPP"), // WHATSAPP, SMS
  templateName: varchar("template_name", { length: 50 }).notNull(),
  messageBody: text("message_body").notNull(),
  providerStatus: varchar("provider_status", { length: 30 }).notNull().default("SENT"), // SENT, DELIVERED, FAILED
  providerMessageId: text("provider_message_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const offlineSyncEvents = pgTable("offline_sync_events", {
  id: text("id").primaryKey(),
  clientEventId: varchar("client_event_id", { length: 100 }).notNull().unique(),
  deviceId: varchar("device_id", { length: 50 }),
  userId: text("user_id").notNull().references(() => users.id),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  payloadJson: text("payload_json").notNull(),
  syncStatus: varchar("sync_status", { length: 30 }).notNull().default("PROCESSED"), // PROCESSED, CONFLICT_REJECTED
  errorLog: text("error_log"),
  processedAt: timestamp("processed_at").notNull().defaultNow(),
});

export const systemConfigurations = pgTable("system_configurations", {
  configKey: varchar("config_key", { length: 60 }).primaryKey(),
  configValueJson: text("config_value_json").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: text("updated_by").references(() => users.id),
});
