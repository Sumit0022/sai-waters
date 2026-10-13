import { executeMultiSql } from "./init";

export async function seedSampleOperationalData() {
  // 1. Seed Sample Customers, Addresses, Price Agreements, and Schedules
  await executeMultiSql(`
    INSERT INTO customers (id, customer_code, full_name, phone, email, customer_type, billing_frequency, held_jars_count, current_balance_paise) VALUES
      ('cust_001', 'CUST-001', 'Sharma Niwas (Residential)', '9811223344', 'sharma@gmail.com', 'RESIDENTIAL', 'MONTHLY', 2, 0),
      ('cust_002', 'CUST-002', 'Gupta Medical Store', '9822334455', 'guptamed@gmail.com', 'COMMERCIAL', 'MONTHLY', 4, 14000), -- ₹140.00 balance
      ('cust_003', 'CUST-003', 'Dr. Verma Dental Clinic', '9833445566', 'drverma@gmail.com', 'COMMERCIAL', 'MONTHLY', 3, 0),
      ('cust_004', 'CUST-004', 'Royal Palace Banquet (Event)', '9844556677', 'royalpalace@gmail.com', 'EVENT', 'PER_DELIVERY', 0, 0)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO customer_addresses (id, customer_id, label, street_address, locality, city, pincode, is_default) VALUES
      ('addr_001', 'cust_001', 'Home', 'Flat 302, Green Park Apts', 'Civil Lines', 'Bareilly', '243001', TRUE),
      ('addr_002', 'cust_002', 'Shop', 'Shop #14, Main Market', 'Station Road', 'Bareilly', '243001', TRUE),
      ('addr_003', 'cust_003', 'Clinic', 'Ground Floor, City Plaza', 'Rampur Garden', 'Bareilly', '243001', TRUE),
      ('addr_004', 'cust_004', 'Banquet Hall', 'NH-24 Near Airport Road', 'Izzatnagar', 'Bareilly', '243122', TRUE)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO customer_price_agreements (id, customer_id, price_per_jar_paise, notes) VALUES
      ('cpa_001', 'cust_001', 3500, 'Standard residential rate ₹35/jar'),
      ('cpa_002', 'cust_002', 3200, 'Negotiated commercial bulk daily rate ₹32/jar'),
      ('cpa_003', 'cust_003', 3500, 'Commercial clinic rate ₹35/jar'),
      ('cpa_004', 'cust_004', 3000, 'Event banquet bulk rate ₹30/jar')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO recurring_schedules (id, customer_id, address_id, days_of_week, quantity_jars, is_paused) VALUES
      ('sch_001', 'cust_001', 'addr_001', '1,2,3,4,5,6,7', 1, FALSE),
      ('sch_002', 'cust_002', 'addr_002', '1,2,3,4,5,6', 2, FALSE),
      ('sch_003', 'cust_003', 'addr_003', '1,3,5', 2, FALSE)
    ON CONFLICT (id) DO NOTHING;
  `);

  // 2. Seed 30 Reusable 20L Jars with Cryptographic QR Tokens
  let jarSql = "";
  for (let i = 1; i <= 30; i++) {
    const jarCode = `JAR-20L-${String(i).padStart(4, "0")}`;
    const jarId = `jar_${String(i).padStart(4, "0")}`;
    const qrToken = `urn:sw:j:q8x9f2m1-${String(i).padStart(4, "0")}`;
    
    let status = "AVAILABLE";
    if (i <= 2) status = "DELIVERED_CUSTOMER";
    else if (i <= 6) status = "DELIVERED_CUSTOMER";
    else if (i === 27 || i === 28) status = "RETURNED_INSPECT";
    else if (i === 29 || i === 30) status = "UNDER_REPAIR";

    jarSql += `
      INSERT INTO jar_masters (id, permanent_jar_code, acquisition_date, acquisition_cost_paise, current_status, total_usage_cycles)
      VALUES ('${jarId}', '${jarCode}', '2026-10-01', 18000, '${status}', ${i * 3})
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO qr_identifiers (id, jar_id, qr_token, is_active)
      VALUES ('qr_${String(i).padStart(4, "0")}', '${jarId}', '${qrToken}', TRUE)
      ON CONFLICT (id) DO NOTHING;
    `;

    if (status === "DELIVERED_CUSTOMER") {
      const custId = i <= 2 ? "cust_001" : "cust_002";
      jarSql += `
        INSERT INTO jar_custodies (jar_id, custody_type, customer_id)
        VALUES ('${jarId}', 'WITH_CUSTOMER', '${custId}')
        ON CONFLICT (jar_id) DO UPDATE SET custody_type = 'WITH_CUSTOMER', customer_id = '${custId}';
      `;
    } else {
      jarSql += `
        INSERT INTO jar_custodies (jar_id, custody_type)
        VALUES ('${jarId}', 'PLANT')
        ON CONFLICT (jar_id) DO UPDATE SET custody_type = 'PLANT';
      `;
    }
  }
  await executeMultiSql(jarSql);

  // 3. Seed Accounting Opening Balances:
  await executeMultiSql(`
    INSERT INTO journal_entries (id, entry_number, entry_date, source_document_type, narration, is_posted, posted_by) VALUES
      ('jv_001', 'JV-2026-0001', '2026-10-01', 'MANUAL', 'Initial capital introduced by owner into operating bank account', TRUE, 'usr_owner_01'),
      ('jv_002', 'JV-2026-0002', '2026-10-01', 'PURCHASE', 'Capitalization of initial lot of 30 reusable 20L jars purchased via bank', TRUE, 'usr_owner_01')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO journal_lines (id, journal_entry_id, account_id, debit_paise, credit_paise) VALUES
      ('jl_001', 'jv_001', 1130, 10000000, 0),        -- Dr. Bank ₹1,00,000.00
      ('jl_002', 'jv_001', 3110, 0, 10000000),        -- Cr. Owner Capital ₹1,00,000.00
      ('jl_003', 'jv_002', 1210, 540000, 0),          -- Dr. Reusable Jars Asset ₹5,400.00
      ('jl_004', 'jv_002', 1130, 0, 540000)           -- Cr. Bank ₹5,400.00
    ON CONFLICT (id) DO NOTHING;
  `);

  // 4. Seed Today's Active Trip Sheet & Assigned Orders for Delivery Staff
  const todayStr = new Date().toISOString().split("T")[0];
  await executeMultiSql(`
    INSERT INTO orders (id, order_number, customer_id, address_id, schedule_id, order_type, scheduled_date, quantity_jars, unit_price_paise, total_amount_paise, status) VALUES
      ('ord_001', 'ORD-20261013-01', 'cust_001', 'addr_001', 'sch_001', 'RECURRING', '${todayStr}', 1, 3500, 3500, 'DISPATCHED'),
      ('ord_002', 'ORD-20261013-02', 'cust_002', 'addr_002', 'sch_002', 'RECURRING', '${todayStr}', 2, 3200, 6400, 'DISPATCHED'),
      ('ord_003', 'ORD-20261013-03', 'cust_003', 'addr_003', 'sch_003', 'RECURRING', '${todayStr}', 2, 3500, 7000, 'CONFIRMED')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO delivery_assignments (id, trip_sheet_number, driver_id, vehicle_number, route_date, status) VALUES
      ('trip_001', 'TRIP-20261013-01', 'usr_driver_01', 'UP 25 AB 4590', '${todayStr}', 'IN_PROGRESS')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO dispatch_records (id, assignment_id, order_id, sequence_order, status, full_jars_delivered, empty_jars_returned) VALUES
      ('disp_001', 'trip_001', 'ord_001', 1, 'PENDING', 0, 0),
      ('disp_002', 'trip_001', 'ord_002', 2, 'PENDING', 0, 0),
      ('disp_003', 'trip_001', 'ord_003', 3, 'PENDING', 0, 0)
    ON CONFLICT (id) DO NOTHING;
  `);

  console.log("Sample operational and accounting data seeded successfully.");
}
