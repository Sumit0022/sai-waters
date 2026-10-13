import { getRawClient } from "./index";

export async function executeMultiSql(sqlString: string) {
  const raw = getRawClient();
  if (raw.exec) {
    await raw.exec(sqlString);
  } else {
    await raw.query(sqlString);
  }
}

export async function initializeDatabase() {
  // Create tables DDL
  await executeMultiSql(`
    -- 1. Security & RBAC
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      phone VARCHAR(20) NOT NULL UNIQUE,
      email VARCHAR(100),
      password_hash TEXT NOT NULL,
      role VARCHAR(30) NOT NULL DEFAULT 'DELIVERY_STAFF',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS roles (
      id VARCHAR(30) PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS permissions (
      id VARCHAR(60) PRIMARY KEY,
      module VARCHAR(40) NOT NULL,
      action VARCHAR(40) NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS user_roles (
      user_id TEXT NOT NULL REFERENCES users(id),
      role_id VARCHAR(30) NOT NULL REFERENCES roles(id),
      PRIMARY KEY (user_id, role_id)
    );

    -- 2. Customers & Pricing
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      customer_code VARCHAR(30) NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      phone VARCHAR(20) NOT NULL UNIQUE,
      email VARCHAR(100),
      customer_type VARCHAR(30) NOT NULL DEFAULT 'RESIDENTIAL',
      billing_frequency VARCHAR(30) NOT NULL DEFAULT 'MONTHLY',
      held_jars_count INTEGER NOT NULL DEFAULT 0,
      current_balance_paise BIGINT NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS customer_addresses (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      label VARCHAR(40) NOT NULL DEFAULT 'Main Address',
      street_address TEXT NOT NULL,
      locality TEXT NOT NULL,
      city VARCHAR(50) NOT NULL DEFAULT 'Bareilly',
      pincode VARCHAR(10) NOT NULL,
      latitude TEXT,
      longitude TEXT,
      delivery_instructions TEXT,
      is_default BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS customer_price_agreements (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      price_per_jar_paise INTEGER NOT NULL,
      effective_from TIMESTAMP NOT NULL DEFAULT NOW(),
      effective_to TIMESTAMP,
      notes TEXT
    );

    -- 3. Recurring Schedules & Orders
    CREATE TABLE IF NOT EXISTS recurring_schedules (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      address_id TEXT NOT NULL REFERENCES customer_addresses(id),
      days_of_week TEXT NOT NULL DEFAULT '1,2,3,4,5,6,7',
      quantity_jars INTEGER NOT NULL DEFAULT 1,
      is_paused BOOLEAN NOT NULL DEFAULT FALSE,
      pause_start_date TIMESTAMP,
      pause_end_date TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number VARCHAR(40) NOT NULL UNIQUE,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      address_id TEXT NOT NULL REFERENCES customer_addresses(id),
      schedule_id TEXT REFERENCES recurring_schedules(id),
      order_type VARCHAR(30) NOT NULL DEFAULT 'RECURRING',
      scheduled_date VARCHAR(12) NOT NULL,
      quantity_jars INTEGER NOT NULL DEFAULT 1,
      unit_price_paise INTEGER NOT NULL,
      total_amount_paise INTEGER NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'CONFIRMED',
      delivery_notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      item_description TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price_paise INTEGER NOT NULL,
      line_total_paise INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS event_orders (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      event_name TEXT NOT NULL,
      venue_contact_person TEXT NOT NULL,
      venue_contact_phone VARCHAR(20) NOT NULL,
      event_date VARCHAR(12) NOT NULL,
      pickup_deadline TIMESTAMP,
      deposit_amount_paise INTEGER NOT NULL DEFAULT 0,
      deposit_status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
    );

    -- 4. Logistics & Dispatch
    CREATE TABLE IF NOT EXISTS delivery_assignments (
      id TEXT PRIMARY KEY,
      trip_sheet_number VARCHAR(40) NOT NULL UNIQUE,
      driver_id TEXT NOT NULL REFERENCES users(id),
      vehicle_number VARCHAR(30),
      route_date VARCHAR(12) NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'ASSIGNED',
      started_at TIMESTAMP,
      completed_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS dispatch_records (
      id TEXT PRIMARY KEY,
      assignment_id TEXT NOT NULL REFERENCES delivery_assignments(id),
      order_id TEXT NOT NULL REFERENCES orders(id),
      sequence_order INTEGER NOT NULL DEFAULT 1,
      status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
      full_jars_delivered INTEGER NOT NULL DEFAULT 0,
      empty_jars_returned INTEGER NOT NULL DEFAULT 0,
      notes TEXT
    );

    -- 5. Jar Master & QR Tracking
    CREATE TABLE IF NOT EXISTS jar_masters (
      id TEXT PRIMARY KEY,
      permanent_jar_code VARCHAR(40) NOT NULL UNIQUE,
      acquisition_date VARCHAR(12) NOT NULL,
      acquisition_cost_paise INTEGER NOT NULL DEFAULT 18000,
      current_status VARCHAR(40) NOT NULL DEFAULT 'AVAILABLE',
      total_usage_cycles INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS qr_identifiers (
      id TEXT PRIMARY KEY,
      jar_id TEXT NOT NULL REFERENCES jar_masters(id),
      qr_token VARCHAR(100) NOT NULL UNIQUE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      issued_at TIMESTAMP NOT NULL DEFAULT NOW(),
      retired_at TIMESTAMP,
      retirement_reason TEXT
    );

    CREATE TABLE IF NOT EXISTS jar_movement_events (
      id TEXT PRIMARY KEY,
      jar_id TEXT NOT NULL REFERENCES jar_masters(id),
      actor_user_id TEXT NOT NULL REFERENCES users(id),
      order_id TEXT REFERENCES orders(id),
      assignment_id TEXT REFERENCES delivery_assignments(id),
      from_status VARCHAR(40) NOT NULL,
      to_status VARCHAR(40) NOT NULL,
      geo_lat TEXT,
      geo_lng TEXT,
      client_event_id TEXT,
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS jar_custodies (
      jar_id TEXT PRIMARY KEY REFERENCES jar_masters(id),
      custody_type VARCHAR(30) NOT NULL DEFAULT 'PLANT',
      customer_id TEXT REFERENCES customers(id),
      holder_user_id TEXT REFERENCES users(id),
      transferred_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS return_inspections (
      id TEXT PRIMARY KEY,
      jar_id TEXT NOT NULL REFERENCES jar_masters(id),
      inspected_by TEXT NOT NULL REFERENCES users(id),
      inspection_result VARCHAR(30) NOT NULL,
      action_taken VARCHAR(30) NOT NULL,
      notes TEXT,
      inspected_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS damage_loss_cases (
      id TEXT PRIMARY KEY,
      jar_id TEXT NOT NULL REFERENCES jar_masters(id),
      customer_id TEXT REFERENCES customers(id),
      order_id TEXT REFERENCES orders(id),
      case_status VARCHAR(30) NOT NULL DEFAULT 'OPEN_INVESTIGATION',
      agreed_charge_paise INTEGER DEFAULT 0,
      authorized_by TEXT REFERENCES users(id),
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      resolved_at TIMESTAMP
    );

    -- 6. Invoices, Payments & Cash Collection
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      invoice_number VARCHAR(50) NOT NULL UNIQUE,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      order_id TEXT REFERENCES orders(id),
      invoice_date VARCHAR(12) NOT NULL,
      due_date VARCHAR(12) NOT NULL,
      subtotal_paise INTEGER NOT NULL,
      tax_paise INTEGER NOT NULL DEFAULT 0,
      total_amount_paise INTEGER NOT NULL,
      paid_amount_paise INTEGER NOT NULL DEFAULT 0,
      status VARCHAR(30) NOT NULL DEFAULT 'ISSUED',
      billing_type VARCHAR(30) NOT NULL DEFAULT 'MONTHLY_CONSOLIDATED',
      pdf_url TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS invoice_lines (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL REFERENCES invoices(id),
      description TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price_paise INTEGER NOT NULL,
      line_total_paise INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payment_links (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL REFERENCES invoices(id),
      gateway_provider VARCHAR(30) NOT NULL DEFAULT 'MANUAL_UPI',
      link_url TEXT NOT NULL,
      amount_paise INTEGER NOT NULL,
      expires_at TIMESTAMP,
      status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS payment_attempts (
      id TEXT PRIMARY KEY,
      payment_link_id TEXT NOT NULL REFERENCES payment_links(id),
      gateway_payment_id TEXT,
      amount_paise INTEGER NOT NULL,
      payment_method VARCHAR(30) DEFAULT 'UPI',
      status VARCHAR(30) NOT NULL DEFAULT 'INITIATED',
      error_message TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS payment_webhook_events (
      id TEXT PRIMARY KEY,
      provider VARCHAR(30) NOT NULL,
      provider_event_id VARCHAR(100) NOT NULL UNIQUE,
      event_type VARCHAR(50) NOT NULL,
      payload_json TEXT NOT NULL,
      signature_verified BOOLEAN NOT NULL DEFAULT FALSE,
      is_processed BOOLEAN NOT NULL DEFAULT FALSE,
      processed_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS receipts (
      id TEXT PRIMARY KEY,
      receipt_number VARCHAR(50) NOT NULL UNIQUE,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      invoice_id TEXT REFERENCES invoices(id),
      amount_paise INTEGER NOT NULL,
      payment_mode VARCHAR(30) NOT NULL DEFAULT 'CASH',
      transaction_reference VARCHAR(100),
      recorded_by TEXT NOT NULL REFERENCES users(id),
      receipt_date VARCHAR(12) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS refunds_adjustments (
      id TEXT PRIMARY KEY,
      adjustment_number VARCHAR(50) NOT NULL UNIQUE,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      invoice_id TEXT REFERENCES invoices(id),
      adjustment_type VARCHAR(30) NOT NULL,
      amount_paise INTEGER NOT NULL,
      reason TEXT NOT NULL,
      authorized_by TEXT NOT NULL REFERENCES users(id),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS cash_collection_submissions (
      id TEXT PRIMARY KEY,
      driver_id TEXT NOT NULL REFERENCES users(id),
      order_id TEXT REFERENCES orders(id),
      invoice_id TEXT REFERENCES invoices(id),
      amount_collected_paise INTEGER NOT NULL,
      client_event_id TEXT,
      collected_at TIMESTAMP NOT NULL DEFAULT NOW(),
      handover_id TEXT,
      is_handed_over BOOLEAN NOT NULL DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS cash_handovers (
      id TEXT PRIMARY KEY,
      driver_id TEXT NOT NULL REFERENCES users(id),
      received_by TEXT NOT NULL REFERENCES users(id),
      total_declared_paise INTEGER NOT NULL,
      total_verified_paise INTEGER NOT NULL,
      variance_paise INTEGER NOT NULL DEFAULT 0,
      status VARCHAR(30) NOT NULL DEFAULT 'VERIFIED',
      handover_timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
      notes TEXT
    );

    -- 7. Accounting Core
    CREATE TABLE IF NOT EXISTS chart_of_accounts (
      id INTEGER PRIMARY KEY,
      account_code VARCHAR(20) NOT NULL UNIQUE,
      account_name TEXT NOT NULL,
      account_type VARCHAR(30) NOT NULL,
      is_reconcilable BOOLEAN NOT NULL DEFAULT FALSE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE
    );

    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      entry_number VARCHAR(50) NOT NULL UNIQUE,
      entry_date VARCHAR(12) NOT NULL,
      source_document_type VARCHAR(40) NOT NULL,
      source_document_id TEXT,
      narration TEXT NOT NULL,
      is_posted BOOLEAN NOT NULL DEFAULT TRUE,
      posted_by TEXT NOT NULL REFERENCES users(id),
      posted_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS journal_lines (
      id TEXT PRIMARY KEY,
      journal_entry_id TEXT NOT NULL REFERENCES journal_entries(id),
      account_id INTEGER NOT NULL REFERENCES chart_of_accounts(id),
      debit_paise INTEGER NOT NULL DEFAULT 0,
      credit_paise INTEGER NOT NULL DEFAULT 0,
      sub_ledger_type VARCHAR(30) DEFAULT 'NONE',
      sub_ledger_id TEXT
    );

    CREATE TABLE IF NOT EXISTS accounting_periods (
      id VARCHAR(10) PRIMARY KEY,
      period_code VARCHAR(20) NOT NULL,
      start_date VARCHAR(12) NOT NULL,
      end_date VARCHAR(12) NOT NULL,
      is_closed BOOLEAN NOT NULL DEFAULT FALSE,
      closed_at TIMESTAMP,
      closed_by TEXT REFERENCES users(id)
    );

    -- 8. Reconciliation, Suppliers & Assets
    CREATE TABLE IF NOT EXISTS bank_statement_imports (
      id TEXT PRIMARY KEY,
      bank_account_id INTEGER NOT NULL REFERENCES chart_of_accounts(id),
      filename TEXT NOT NULL,
      total_rows INTEGER NOT NULL DEFAULT 0,
      imported_at TIMESTAMP NOT NULL DEFAULT NOW(),
      imported_by TEXT NOT NULL REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS reconciliation_sessions (
      id TEXT PRIMARY KEY,
      reconciliation_type VARCHAR(30) NOT NULL,
      session_date VARCHAR(12) NOT NULL,
      reconciled_by TEXT NOT NULL REFERENCES users(id),
      closing_variance_paise INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS reconciliation_matches (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES reconciliation_sessions(id),
      journal_line_id TEXT NOT NULL REFERENCES journal_lines(id),
      external_reference TEXT,
      matched_amount_paise INTEGER NOT NULL,
      matched_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      supplier_code VARCHAR(30) NOT NULL UNIQUE,
      name TEXT NOT NULL,
      phone VARCHAR(20),
      email VARCHAR(100),
      current_payable_paise INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE
    );

    CREATE TABLE IF NOT EXISTS purchase_records (
      id TEXT PRIMARY KEY,
      supplier_id TEXT NOT NULL REFERENCES suppliers(id),
      bill_number VARCHAR(50) NOT NULL,
      bill_date VARCHAR(12) NOT NULL,
      total_amount_paise INTEGER NOT NULL,
      payment_status VARCHAR(30) NOT NULL DEFAULT 'UNPAID',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS expense_records (
      id TEXT PRIMARY KEY,
      expense_date VARCHAR(12) NOT NULL,
      account_id INTEGER NOT NULL REFERENCES chart_of_accounts(id),
      amount_paise INTEGER NOT NULL,
      paid_via_account_id INTEGER NOT NULL REFERENCES chart_of_accounts(id),
      receipt_image_url TEXT,
      notes TEXT,
      recorded_by TEXT NOT NULL REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS asset_records (
      id TEXT PRIMARY KEY,
      asset_name TEXT NOT NULL,
      account_id INTEGER NOT NULL REFERENCES chart_of_accounts(id),
      purchase_date VARCHAR(12) NOT NULL,
      cost_paise INTEGER NOT NULL,
      salvage_value_paise INTEGER NOT NULL DEFAULT 0,
      useful_life_months INTEGER NOT NULL DEFAULT 24,
      accumulated_depreciation_paise INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE
    );

    -- 9. Audit, Notifications & System Config
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      table_name VARCHAR(50) NOT NULL,
      record_id TEXT NOT NULL,
      action VARCHAR(20) NOT NULL,
      old_values_json TEXT,
      new_values_json TEXT,
      user_id TEXT REFERENCES users(id),
      ip_address TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS notification_logs (
      id TEXT PRIMARY KEY,
      recipient_phone VARCHAR(20) NOT NULL,
      channel VARCHAR(20) NOT NULL DEFAULT 'WHATSAPP',
      template_name VARCHAR(50) NOT NULL,
      message_body TEXT NOT NULL,
      provider_status VARCHAR(30) NOT NULL DEFAULT 'SENT',
      provider_message_id TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS offline_sync_events (
      id TEXT PRIMARY KEY,
      client_event_id VARCHAR(100) NOT NULL UNIQUE,
      device_id VARCHAR(50),
      user_id TEXT NOT NULL REFERENCES users(id),
      event_type VARCHAR(50) NOT NULL,
      payload_json TEXT NOT NULL,
      sync_status VARCHAR(30) NOT NULL DEFAULT 'PROCESSED',
      error_log TEXT,
      processed_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS system_configurations (
      config_key VARCHAR(60) PRIMARY KEY,
      config_value_json TEXT NOT NULL,
      description TEXT,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_by TEXT REFERENCES users(id)
    );
  `);

  // Seed Chart of Accounts & Master data
  await executeMultiSql(`
    INSERT INTO chart_of_accounts (id, account_code, account_name, account_type, is_reconcilable) VALUES
      (1110, '1110', 'Cash-in-Hand (Central Vault)', 'ASSET', TRUE),
      (1120, '1120', 'Driver Collection Clearing', 'ASSET', TRUE),
      (1130, '1130', 'Bank Current Account (Operating)', 'ASSET', TRUE),
      (1140, '1140', 'Payment Gateway Clearing (Escrow)', 'ASSET', TRUE),
      (1150, '1150', 'Accounts Receivable (Trade Debtors)', 'ASSET', TRUE),
      (1210, '1210', 'Reusable 20L Water Jars (At Cost)', 'ASSET', FALSE),
      (1220, '1220', 'Accumulated Depreciation — Jars', 'ASSET', FALSE),
      (2110, '2110', 'Accounts Payable (Trade Creditors)', 'LIABILITY', TRUE),
      (2120, '2120', 'Customer Refundable Jar Deposits', 'LIABILITY', TRUE),
      (2130, '2130', 'Customer Advance Payments', 'LIABILITY', TRUE),
      (3110, '3110', 'Owner Capital Account', 'EQUITY', FALSE),
      (4110, '4110', 'Water Jar Sales Revenue (20L Regular)', 'REVENUE', FALSE),
      (4120, '4120', 'Bulk Event Water Revenue', 'REVENUE', FALSE),
      (4210, '4210', 'Jar Loss Recovery Income', 'REVENUE', FALSE),
      (5110, '5110', 'Raw Water & RO Pumping Costs', 'COGS', FALSE),
      (5120, '5120', 'Jar Consumables (Caps, Seals)', 'COGS', FALSE),
      (6110, '6110', 'Staff Salaries & Driver Wages', 'EXPENSE', FALSE),
      (6410, '6410', 'Payment Gateway MDR Fees', 'EXPENSE', FALSE),
      (6510, '6510', 'Depreciation Expense — Jars', 'EXPENSE', FALSE),
      (6520, '6520', 'Confirmed Jar Loss & Scrappage', 'EXPENSE', FALSE)
    ON CONFLICT (id) DO NOTHING;

    -- Seed Roles
    INSERT INTO roles (id, name, description) VALUES
      ('OWNER', 'Owner / Super Admin', 'Full control over operations, finance, and system configuration'),
      ('OPERATIONS_MANAGER', 'Operations Manager', 'Manages logistics, jar tracking, dispatch and route assignments'),
      ('ACCOUNTANT', 'Accountant', 'Manages journals, ledgers, reconciliations, invoices, and reports'),
      ('DELIVERY_STAFF', 'Delivery Staff / Driver', 'Mobile interface for QR scanning, deliveries, returns, and cash collection'),
      ('ORDER_ENTRY', 'Order Entry Staff', 'Customer onboarding and schedule management'),
      ('CUSTOMER', 'Customer', 'Self-service ordering and statement viewing')
    ON CONFLICT (id) DO NOTHING;

    -- Seed Initial Users (Default credentials for immediate access)
    INSERT INTO users (id, full_name, phone, email, password_hash, role) VALUES
      ('usr_owner_01', 'Sai Waters Owner', '9876543210', 'owner@saiwaters.in', 'hashed_pass_admin_123', 'OWNER'),
      ('usr_ops_01', 'Vikas Sharma (Ops Mgr)', '9876543212', 'vikas@saiwaters.in', 'hashed_pass_ops_123', 'OPERATIONS_MANAGER'),
      ('usr_acc_01', 'Anita Agarwal (Accountant)', '9876543213', 'anita@saiwaters.in', 'hashed_pass_acc_123', 'ACCOUNTANT'),
      ('usr_driver_01', 'Ramesh Kumar (Driver 1)', '9876543211', 'ramesh@saiwaters.in', 'hashed_pass_driver_123', 'DELIVERY_STAFF'),
      ('usr_driver_02', 'Suresh Patel (Driver 2)', '9876543214', 'suresh@saiwaters.in', 'hashed_pass_driver_123', 'DELIVERY_STAFF')
    ON CONFLICT (id) DO NOTHING;

    -- Seed System Configurations
    INSERT INTO system_configurations (config_key, config_value_json, description) VALUES
      ('business_info', '{"name":"Sai Waters","phone":"+91 98765 43210","address":"Civil Lines, Bareilly, UP, India","upi_id":"saiwaters@upi","gst_status":"UNREGISTERED","default_jar_price_paise":3500}', 'Business contact and payment config'),
      ('jar_policy', '{"event_grace_days":7,"regular_grace_days":14,"asset_useful_months":24,"depreciation_method":"SLM"}', 'Policy for jar exchange, grace period and asset depreciation')
    ON CONFLICT (config_key) DO NOTHING;
  `);

  console.log("Database initialized and master records seeded successfully.");
}
