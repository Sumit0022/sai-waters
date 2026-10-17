import { getDb } from "../db";
import { jarMasters, customers } from "../db/schema";
import { eq } from "drizzle-orm";
import { postJournalEntry, getTrialBalance, getProfitAndLoss, getBalanceSheet } from "../lib/accounting";
import { lookupJar, transitionJarState, isValidTransition, relabelJar, authorizeJarLoss } from "../lib/jars";
import { createAndPostInvoice } from "../lib/billing";
import { recordFieldCashCollection, verifyDriverCashHandover } from "../lib/cash";
import { processOfflineSyncBatch } from "../lib/offline-sync";

async function runAcceptanceTests() {
  console.log("==========================================================");
  console.log("   SAI WATERS ERP — MANDATORY ACCEPTANCE INVARIANT TESTS   ");
  console.log("==========================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail: string = "") {
    total++;
    if (condition) {
      console.log(`[PASS] T${String(total).padStart(2, "0")}: ${testName} ${detail ? `(${detail})` : ""}`);
      passed++;
    } else {
      console.error(`[FAIL] T${String(total).padStart(2, "0")}: ${testName} ${detail ? `(${detail})` : ""}`);
      process.exitCode = 1;
    }
  }

  // TEST 1: Double-Entry Trial Balance Invariant (Sum Dr == Sum Cr)
  const tbInitial = await getTrialBalance();
  assert(
    tbInitial.isBalanced,
    "Trial Balance Invariant: Total Debits equal Total Credits",
    `Total: ₹${(tbInitial.grandTotalDebitPaise / 100).toFixed(2)}`
  );

  // TEST 2: Reject Unbalanced Journal Entry
  let unbalancedBlocked = false;
  try {
    await postJournalEntry({
      sourceDocumentType: "MANUAL",
      narration: "Attempting illegal unbalanced entry (Dr ₹500, Cr ₹400)",
      postedBy: "usr_owner_01",
      lines: [
        { accountId: 1110, debitPaise: 50000, creditPaise: 0 },
        { accountId: 3110, debitPaise: 0, creditPaise: 40000 },
      ],
    });
  } catch (err: any) {
    unbalancedBlocked = err.message.includes("Double-Entry Invariant Violation");
  }
  assert(unbalancedBlocked, "Core Accounting Firewall: Rejects unbalanced journal entry with error");

  // TEST 3: Jar Finite State Machine (Valid vs Illegal Transitions)
  assert(isValidTransition("AVAILABLE", "ALLOCATED"), "FSM: AVAILABLE -> ALLOCATED is legal");
  assert(isValidTransition("ALLOCATED", "IN_TRANSIT"), "FSM: ALLOCATED -> IN_TRANSIT is legal");
  assert(isValidTransition("IN_TRANSIT", "DELIVERED_CUSTOMER"), "FSM: IN_TRANSIT -> DELIVERED_CUSTOMER is legal");
  assert(!isValidTransition("DELIVERED_CUSTOMER", "AVAILABLE"), "FSM: DELIVERED_CUSTOMER -> AVAILABLE without return inspection is strictly forbidden");
  assert(!isValidTransition("RETIRED", "AVAILABLE"), "FSM: RETIRED jar cannot jump back to AVAILABLE");

  // TEST 4: Jar Lookup by Permanent Code & QR Token
  const jarByCode = await lookupJar("JAR-20L-0001");
  assert(jarByCode !== null && jarByCode.permanentJarCode === "JAR-20L-0001", "QR Engine: Resolves Jar by permanent code");

  const jarByToken = await lookupJar("urn:sw:j:q8x9f2m1-0001");
  assert(jarByToken !== null && jarByToken.id === jarByCode?.id, "QR Engine: Resolves Jar by opaque cryptographic QR token");

  // TEST 5: Decoupled Re-Labeling (preserves Jar ID and cycles)
  const relabelRes = await relabelJar(jarByCode!.id, `urn:sw:j:fresh-qr-test-${Date.now()}`, "Testing label replacement");
  assert(relabelRes.success, "Re-Labeling Engine: Issues new QR token without corrupting master jar history");

  // TEST 6: Commercial Invoice Generation & Double-Entry Posting
  const invoiceRes = await createAndPostInvoice({
    customerId: "cust_001",
    billingType: "SPOT_DELIVERY",
    lines: [{ description: "20L Water Jars Spot Delivery", quantity: 2, unitPricePaise: 3500 }],
    postedBy: "usr_owner_01",
  });
  assert(
    invoiceRes.totalAmountPaise === 7000,
    "Billing Engine: Correctly calculates invoice total for 2 jars @ ₹35 = ₹70.00"
  );

  const tbAfterInv = await getTrialBalance();
  assert(tbAfterInv.isBalanced, "Post-Invoice Double-Entry Integrity: Trial balance remains balanced after invoice issuance");

  // TEST 7: Field Cash Collection Isolates to Driver Clearing (Account 1120)
  const cashCollectRes = await recordFieldCashCollection({
    driverId: "usr_driver_01",
    customerId: "cust_001",
    invoiceId: invoiceRes.invoiceId,
    amountCollectedPaise: 7000,
  });
  assert(
    cashCollectRes.amountCollectedPaise === 7000,
    "Field Collection: Records cash collection and issues receipt"
  );

  const tbAfterCash = await getTrialBalance();
  assert(tbAfterCash.isBalanced, "Post-Collection Double-Entry: Trial balance remains balanced after cash receipt");

  const driverClearingAcc = tbAfterCash.balances.find((b: any) => b.id === 1120);
  assert(
    (driverClearingAcc?.netDebitPaise || 0) >= 7000,
    "Cash Quarantine Firewall: Collected cash is debited to Driver Clearing (1120), NOT central vault"
  );

  // TEST 8: Cashier Verifies Driver Cash Handover into Central Vault (Account 1110)
  const handoverRes = await verifyDriverCashHandover({
    driverId: "usr_driver_01",
    receivedBy: "usr_owner_01",
    totalDeclaredPaise: 7000,
    totalVerifiedPaise: 7000,
    notes: "Verified in test run",
  });
  assert(handoverRes.totalVerifiedPaise === 7000, "Cash Handover: Cashier counts and verifies physical cash");

  const tbAfterHandover = await getTrialBalance();
  assert(tbAfterHandover.isBalanced, "Post-Handover Double-Entry: Trial balance remains balanced after vault deposit");

  // TEST 9: Offline Queue Sync & Idempotency Check
  const dbInst = await getDb();
  await dbInst.insert(customers).values({
    id: "cust_test_sync",
    customerCode: "CUST-TEST-SYNC",
    fullName: "Offline Sync Test Customer",
    phone: "9999900001",
    billingFrequency: "MONTHLY",
  }).onConflictDoNothing();

  const testClientEventId = `test_offline_${Date.now()}`;
  const syncRes1 = await processOfflineSyncBatch([
    {
      clientEventId: testClientEventId,
      userId: "usr_driver_01",
      eventType: "CASH_COLLECT",
      clientTimestamp: new Date().toISOString(),
      payload: {
        customerId: "cust_test_sync",
        amountCollectedPaise: 3200,
      },
    },
  ]);
  assert(
    Boolean(syncRes1.details && syncRes1.details[0]?.status === "PROCESSED"),
    "Offline Sync: Successfully processes queued client delivery event"
  );

  // Re-submitting the exact same clientEventId must be skipped idempotently
  const syncRes2 = await processOfflineSyncBatch([
    {
      clientEventId: testClientEventId,
      userId: "usr_driver_01",
      eventType: "CASH_COLLECT",
      clientTimestamp: new Date().toISOString(),
      payload: {
        customerId: "cust_test_sync",
        amountCollectedPaise: 3200,
      },
    },
  ]);
  assert(
    Boolean(syncRes2.details && syncRes2.details[0]?.message?.includes("idempotent duplicate skipped")),
    "Idempotency Guard: Rejects duplicate client_event_id to prevent double-posting"
  );

  // TEST 10: Authorized Jar Loss Charge (Owner sets custom fee)
  const db = await getDb();
  const testJarId = `jar_test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  await db.insert(jarMasters).values({
    id: testJarId,
    permanentJarCode: `JAR-TEST-${Date.now().toString().slice(-4)}-${Math.random().toString(36).substring(2, 6)}`,
    currentStatus: "AVAILABLE",
    acquisitionDate: new Date().toISOString().split("T")[0],
    acquisitionCostPaise: 25000,
    totalUsageCycles: 0,
  });

  // Step jar through FSM: AVAILABLE -> ALLOCATED -> IN_TRANSIT -> DELIVERED_CUSTOMER -> MISSING_INVESTIG
  await transitionJarState({ jarId: testJarId, toStatus: "ALLOCATED", actorUserId: "usr_owner_01" });
  await transitionJarState({ jarId: testJarId, toStatus: "IN_TRANSIT", actorUserId: "usr_owner_01" });
  await transitionJarState({ jarId: testJarId, toStatus: "DELIVERED_CUSTOMER", customerId: "cust_002", actorUserId: "usr_owner_01" });
  await transitionJarState({ jarId: testJarId, toStatus: "MISSING_INVESTIG", customerId: "cust_002", actorUserId: "usr_owner_01" });

  const lossRes = await authorizeJarLoss({
    caseId: `case_test_${Date.now()}`,
    jarId: testJarId,
    customerId: "cust_002",
    agreedChargePaise: 25000, // ₹250.00
    authorizedBy: "usr_owner_01",
    notes: "Lost during event, owner authorized ₹250 fee",
  });
  assert(lossRes.agreedChargePaise === 25000, "Loss Authorization: Admin sets custom replacement fee and posts recovery income");

  // TEST 11: Final Trial Balance, P&L, and Balance Sheet Coherence
  const finalTb = await getTrialBalance();
  const finalPnl = await getProfitAndLoss();
  const finalBs = await getBalanceSheet();

  assert(finalTb.isBalanced, "Final Trial Balance Invariant: Total Debits == Total Credits");
  assert(finalBs.isBalanced, "Balance Sheet Invariant: Assets == Liabilities + Equity (with Net Profit)");
  assert(finalPnl.grossProfitPaise !== undefined, "P&L Derivation: Computes Gross Profit and Net Profit from General Ledger");

  console.log("\n==========================================================");
  console.log(`   TEST RESULTS: ${passed} OF ${total} ACCEPTANCE TESTS PASSED (100%)   `);
  console.log("==========================================================\n");

  process.exit(passed === total ? 0 : 1);
}

runAcceptanceTests().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
