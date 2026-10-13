# SAI WATERS ERP — Water Jar Distribution, QR Tracking & Double-Entry Accounting System

A production-grade, offline-capable, installable Progressive Web Application (PWA) built specifically for **Sai Waters** (India).

---

## 🚀 Key Highlights & Architectural Decisions

1. **Embedded Zero-Config Database:**
   - Powered by `@electric-sql/pglite` (WebAssembly embedded PostgreSQL) storing data in `data/pglite/`.
   - Zero external PostgreSQL installation required for local development and offline field operations.
   - Fully compatible with remote PostgreSQL (Neon, Supabase, Railway) by providing `DATABASE_URL` in `.env.local`.

2. **Individually Tracked 20L Water Jars (11-State Finite State Machine):**
   - Every 20L jar has a permanent alphanumeric code (e.g., `JAR-20L-0001`) and an opaque cryptographic QR token (`urn:sw:j:q8x9f2m1-0001`).
   - Decoupled re-labeling: Jars can be re-labeled without losing usage cycle history or custody records.
   - Enforced FSM transitions prevent illegal state jumps (e.g., delivered jar cannot jump back to `AVAILABLE` without passing through washing and inspection).
   - Owner-authorized loss workflow with custom replacement fee resolution.

3. **Complete Double-Entry Accounting General Ledger:**
   - Strict invariant firewall: Every transaction requires $\sum \text{Debits} == \sum \text{Credits}$ down to the exact paisa (integers).
   - Real-time Trial Balance, Profit & Loss Statement, and Balance Sheet derived on demand directly from the General Ledger.
   - Fixed asset capitalization (Account 1210: Reusable 20L Water Jars) with 24-month straight-line depreciation engine.

4. **Cash Quarantine & Handover Protocol:**
   - Field cash collected by drivers is quarantined into **Account 1120 (Driver Clearing / In-Hand Cash)**.
   - Central vault balance (**Account 1110**) remains untouched until physical cash is reconciled and confirmed by the cashier/owner.

5. **Indian Commercial Compliance & Zero-Cost Integrations:**
   - GST-unregistered "Bill of Supply" generation compliant with Section 31(3)(c) of the CGST Act.
   - Dynamic NPCI UPI QR code generation (`upi://pay?pa=...`) for instant camera scanning.
   - Zero-cost 1-Click WhatsApp invoice sharing (`wa.me`) with pre-filled billing breakdown.

6. **Offline-First Driver PWA:**
   - Mobile-first interface with camera barcode/QR scanner (`@zxing/browser`).
   - Client-side IndexedDB outbox queue with idempotency protection (`client_event_id`) against duplicate network submissions.

---

## 🛠️ Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Seed Database (Pre-loaded with Chart of Accounts, Jars, Customers & Opening Balances)
```bash
npm run db:seed
```

### 3. Run Acceptance Invariant Test Suite (23/23 Tests)
```bash
npm test
```

### 4. Start Localhost Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 5. Launch Driver Remote Scanning Tunnel (for Driver Phones in the Field)
```bash
npm run tunnel
```
This generates an instant, secure public HTTPS URL and a terminal QR code. Drivers scan it on their smartphones to open the Driver PWA from anywhere on the road, with scans live-updating directly to your localhost PC!

### 5. Build for Production
```bash
npm run build
npm start
```

---

## 👥 Seeded User Accounts & Roles

The database is pre-seeded with 5 role-based accounts for testing:

| Role | Username / ID | Full Name | Access Scope |
| :--- | :--- | :--- | :--- |
| **Owner / Super Admin** | `usr_owner_01` | Ramesh Sai | Full dashboard, accounting ledgers, jar loss approvals, period closing |
| **Operations Manager** | `usr_ops_01` | Suresh Verma | Dispatch, customer orders, trip sheets, jar allocations |
| **Accountant** | `usr_acct_01` | Priya Sharma | Invoices, cashier vault verification, journal entries, P&L, Balance Sheet |
| **Delivery Driver #1** | `usr_driver_01` | Vikram Singh | Mobile delivery stop sheet, camera QR scanner, field cash collection, shift handover |
| **Delivery Driver #2** | `usr_driver_02` | Rajesh Kumar | Mobile delivery stop sheet, camera QR scanner, field cash collection |

*Note: Use the top navigation role switcher to toggle between roles during development and testing.*

---

## 📂 Project Architecture

```
src/
├── app/
│   ├── api/                     # 15 App Router REST APIs
│   │   ├── accounting/          # Trial balance, P&L, balance sheet, journals, depreciation
│   │   ├── auth/                # Current user session context
│   │   ├── cash/                # Field cash collections & vault handovers
│   │   ├── customers/           # Directory, pricing agreements, custody
│   │   ├── dashboard/           # Executive KPI aggregations
│   │   ├── invoices/            # Bill of Supply generation & payments
│   │   ├── jars/                # Scan, FSM transition, relabeling, loss approval
│   │   ├── orders/              # Recurring schedules & bulk event bookings
│   │   ├── sync/                # Offline sync outbox batch processor
│   │   └── trips/               # Trip sheets & delivery routing
│   ├── accounting/page.tsx      # Double-entry ledger, Trial Balance, P&L, Balance Sheet
│   ├── customers/page.tsx       # Customer directory & pricing agreements
│   ├── driver/page.tsx          # Mobile PWA delivery terminal with camera scanner
│   ├── invoices/page.tsx        # Commercial Billing Hub with printable Bill of Supply & UPI QR
│   ├── jars/page.tsx            # QR Jar Asset Center with camera scanner & FSM lifecycle
│   ├── orders/page.tsx          # Order management & bulk event reservations
│   ├── trips/page.tsx           # Trip routing & logistics dispatch
│   ├── layout.tsx               # Root layout with responsive navigation & PWA meta
│   └── page.tsx                 # Executive Dashboard with live ledger sanity check
├── components/
│   └── Navbar.tsx               # Role-aware responsive navigation bar
├── db/
│   ├── index.ts                 # Dual-mode database client (PGlite WASM / remote Postgres)
│   ├── schema.ts                # 43 relational tables defined with Drizzle ORM
│   ├── init.ts                  # DDL table initializer
│   └── seed-sample-data.ts      # Comprehensive seed data script
├── lib/
│   ├── accounting.ts            # Core double-entry ledger & financial statement generator
│   ├── billing.ts               # Invoicing, UPI intent generator, WhatsApp deep links
│   ├── cash.ts                  # Cash quarantine & cashier vault verification
│   ├── jars.ts                  # Jar FSM engine, QR lookup, relabeling, loss resolution
│   └── offline-sync.ts          # Offline batch sync & idempotency processor
└── tests/
    └── acceptance-invariants.ts # 23 automated business acceptance tests
```

---

## 🧪 Acceptance Test Suite Summary

The automated invariant test suite (`npm test`) verifies 23 core business invariants:
- **T01:** Trial Balance Invariant ($\sum \text{Dr} == \sum \text{Cr}$).
- **T02:** Core Accounting Firewall blocks unbalanced journal entries.
- **T03-T07:** Jar FSM legality rules (e.g. `DELIVERED_CUSTOMER` cannot skip inspection).
- **T08-T10:** QR and barcode lookup resolution & decoupled re-labeling.
- **T11-T12:** Commercial invoice generation & AR journal posting balance.
- **T13-T15:** Field cash collection quarantined to Driver Clearing (Account 1120).
- **T16-T17:** Cashier vault verification transfer from Driver Clearing to Vault (Account 1110).
- **T18-T19:** Offline queue sync with `client_event_id` idempotency protection.
- **T20:** Owner-authorized custom loss fee posting to Recovery Income.
- **T21-T23:** Final Trial Balance, Balance Sheet ($A = L + E$), and P&L derivation.
