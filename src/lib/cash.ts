import { getDb } from "@/db";
import { cashCollectionSubmissions, cashHandovers, invoices, receipts, customers } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { postJournalEntry } from "./accounting";
import { getTodayIST } from "./date-utils";

/**
 * Delivery Staff collects cash in the field against an order/invoice
 * Journal Entry:
 * Dr. 1120 Driver Collection Clearing (Sub-Ledger: Driver)
 * Cr. 1150 Accounts Receivable (Sub-Ledger: Customer)
 */
export async function recordFieldCashCollection(params: {
  driverId: string;
  orderId?: string;
  invoiceId?: string;
  customerId: string;
  amountCollectedPaise: number;
  clientEventId?: string;
}) {
  const db = getDb();

  const submissionId = `ccs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const receiptNumber = `REC-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;
  const todayStr = getTodayIST();

  // Resolve target invoice if invoiceId not directly passed but orderId is present
  let targetInvoiceId = params.invoiceId || null;
  if (!targetInvoiceId && params.orderId) {
    const [invByOrder] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.orderId, params.orderId))
      .limit(1);
    if (invByOrder) targetInvoiceId = invByOrder.id;
  }

  // 1. Record Cash Submission
  await db.insert(cashCollectionSubmissions).values({
    id: submissionId,
    driverId: params.driverId,
    orderId: params.orderId || null,
    invoiceId: targetInvoiceId,
    amountCollectedPaise: params.amountCollectedPaise,
    clientEventId: params.clientEventId || null,
    collectedAt: new Date(),
    isHandedOver: false,
  });

  // 2. Issue Receipt Record
  await db.insert(receipts).values({
    id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    receiptNumber,
    customerId: params.customerId,
    invoiceId: targetInvoiceId,
    amountPaise: params.amountCollectedPaise,
    paymentMode: "CASH",
    transactionReference: `Driver Collection Slip #${submissionId.slice(-6)}`,
    recordedBy: params.driverId,
    receiptDate: todayStr,
    createdAt: new Date(),
  });

  // 3. Post Double-Entry Journal Entry:
  // Dr. 1120 Driver Collection Clearing
  // Cr. 1150 Accounts Receivable (Customer)
  await postJournalEntry({
    sourceDocumentType: "RECEIPT",
    sourceDocumentId: submissionId,
    narration: `Field cash collected by driver against Order ${params.orderId || "N/A"}`,
    postedBy: params.driverId,
    lines: [
      {
        accountId: 1120, // Driver Collection Clearing
        debitPaise: params.amountCollectedPaise,
        creditPaise: 0,
        subLedgerType: "DRIVER",
        subLedgerId: params.driverId,
      },
      {
        accountId: 1150, // Accounts Receivable
        debitPaise: 0,
        creditPaise: params.amountCollectedPaise,
        subLedgerType: "CUSTOMER",
        subLedgerId: params.customerId,
      },
    ],
  });

  // 4. Update Invoice & Customer Balances
  if (targetInvoiceId) {
    const [inv] = await db.select().from(invoices).where(eq(invoices.id, targetInvoiceId)).limit(1);
    if (inv) {
      const newPaid = (inv.paidAmountPaise || 0) + params.amountCollectedPaise;
      const newStatus =
        newPaid >= inv.totalAmountPaise
          ? "PAID"
          : newPaid > 0
          ? "PARTIALLY_PAID"
          : "ISSUED";
      await db
        .update(invoices)
        .set({
          paidAmountPaise: newPaid,
          status: newStatus,
        })
        .where(eq(invoices.id, targetInvoiceId));
    }
  }

  // Reduce customer balance
  await db.execute(sql`
    UPDATE customers SET current_balance_paise = GREATEST(0, current_balance_paise - ${params.amountCollectedPaise}) WHERE id = ${params.customerId};
  `);

  return { submissionId, receiptNumber, amountCollectedPaise: params.amountCollectedPaise };
}

/**
 * Cashier/Accountant verifies cash handed over by delivery driver into central vault
 * Journal Entry:
 * Dr. 1110 Cash-in-Hand (Central Vault)
 * Cr. 1120 Driver Collection Clearing (Sub-Ledger: Driver)
 */
export async function verifyDriverCashHandover(params: {
  driverId: string;
  receivedBy: string;
  totalDeclaredPaise: number;
  totalVerifiedPaise: number;
  notes?: string;
  targetAccountId?: number;
  submissionIds?: string[];
}) {
  const db = getDb();

  const handoverId = `cho_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const variancePaise = params.totalVerifiedPaise - params.totalDeclaredPaise;
  const targetAccountId = params.targetAccountId === 1130 ? 1130 : 1110;
  const targetAccountLabel = targetAccountId === 1130 ? "Bank Current Account (1130)" : "Central Vault (1110)";

  // 1. Record Handover
  await db.insert(cashHandovers).values({
    id: handoverId,
    driverId: params.driverId,
    receivedBy: params.receivedBy,
    totalDeclaredPaise: params.totalDeclaredPaise,
    totalVerifiedPaise: params.totalVerifiedPaise,
    variancePaise,
    status: variancePaise === 0 ? "VERIFIED" : "DISPUTED",
    handoverTimestamp: new Date(),
    notes: params.notes || null,
  });

  // 2. Mark pending cash submissions as handed over
  if (params.submissionIds && params.submissionIds.length > 0) {
    await db.execute(sql`
      UPDATE cash_collection_submissions
      SET is_handed_over = TRUE, handover_id = ${handoverId}
      WHERE id IN (${sql.join(params.submissionIds.map((id) => sql`${id}`), sql`, `)});
    `);
  } else {
    await db.execute(sql`
      UPDATE cash_collection_submissions
      SET is_handed_over = TRUE, handover_id = ${handoverId}
      WHERE driver_id = ${params.driverId} AND is_handed_over = FALSE;
    `);
  }

  // 3. Post Double-Entry Journal Entry:
  // Dr. 1110 Cash-in-Hand (Central Vault) OR 1130 Bank Current Account
  // Cr. 1120 Driver Collection Clearing (Driver)
  await postJournalEntry({
    sourceDocumentType: "HANDOVER",
    sourceDocumentId: handoverId,
    narration: `Cash handover verified from driver into ${targetAccountLabel} (Verified: ₹${(params.totalVerifiedPaise / 100).toFixed(2)})`,
    postedBy: params.receivedBy,
    lines: [
      {
        accountId: targetAccountId,
        debitPaise: params.totalVerifiedPaise,
        creditPaise: 0,
      },
      {
        accountId: 1120, // Driver Collection Clearing
        debitPaise: 0,
        creditPaise: params.totalVerifiedPaise,
        subLedgerType: "DRIVER",
        subLedgerId: params.driverId,
      },
    ],
  });

  return { handoverId, totalVerifiedPaise: params.totalVerifiedPaise, variancePaise, targetAccountId };
}
