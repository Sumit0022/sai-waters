import { NextResponse } from "next/server";
import { getDb, ensureDatabaseReady } from "@/db";
import { invoices, customers, receipts, cashCollectionSubmissions, orders } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { postJournalEntry } from "@/lib/accounting";
import { getTodayIST } from "@/lib/date-utils";

export async function POST(req: Request) {
  try {
    await ensureDatabaseReady();
    const db = getDb();
    const body = await req.json();

    const { invoiceId, amountPaise, paymentMode, reference, receiptDate, settledBy } = body;

    if (!invoiceId) {
      return NextResponse.json({ error: "Invoice ID anivarya hai." }, { status: 400 });
    }

    const [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
    if (!inv) {
      return NextResponse.json({ error: "Invoice nahi mila." }, { status: 404 });
    }

    const [customer] = await db.select().from(customers).where(eq(customers.id, inv.customerId)).limit(1);
    if (!customer) {
      return NextResponse.json({ error: "Customer record nahi mila." }, { status: 404 });
    }

    // Fetch verified receipts for this invoice
    const allReceipts = await db.select().from(receipts);
    const invReceipts = allReceipts.filter(
      (r: any) => r.invoiceId === inv.id || (inv.orderId && r.transactionReference?.includes(inv.orderId))
    );

    // Fetch field cash collections
    const allCashSubs = await db.select().from(cashCollectionSubmissions);
    const invCashSubs = allCashSubs.filter(
      (s: any) => s.invoiceId === inv.id || (inv.orderId && s.orderId === inv.orderId)
    );

    // Fetch order advance payment if linked
    let advancePaise = 0;
    if (inv.orderId) {
      const [ord] = await db.select().from(orders).where(eq(orders.id, inv.orderId)).limit(1);
      if (ord?.deliveryNotes) {
        try {
          const meta = JSON.parse(ord.deliveryNotes);
          if (meta.advanceReceivedPaise) advancePaise = Number(meta.advanceReceivedPaise);
        } catch (e) {}
      }
    }

    const driverCollectedPaise = invCashSubs.reduce((sum: number, s: any) => sum + (s.amountCollectedPaise || 0), 0);
    const totalReceiptsPaise = invReceipts.reduce((sum: number, r: any) => sum + (r.amountPaise || 0), 0);
    const verifiedPaymentsPaise = Math.max(advancePaise + driverCollectedPaise, totalReceiptsPaise);

    // Use verified payments if DB was corrupted by previous delivery double-count, otherwise recorded paidAmountPaise
    const currentPaid = verifiedPaymentsPaise > 0 
      ? Math.min(inv.totalAmountPaise, Math.max(verifiedPaymentsPaise, Math.min(inv.paidAmountPaise || 0, verifiedPaymentsPaise)))
      : Math.min(inv.totalAmountPaise, inv.paidAmountPaise || 0);

    const currentOutstanding = Math.max(0, inv.totalAmountPaise - currentPaid);

    if (currentOutstanding <= 0) {
      return NextResponse.json(
        { error: "Yeh invoice pehle se hi fully paid hai. Koi balance baaki nahi hai." },
        { status: 400 }
      );
    }

    const settlePaise = Math.round(Number(amountPaise || 0));
    if (settlePaise <= 0) {
      return NextResponse.json(
        { error: "Settle amount 0 se adhik hona chahiye." },
        { status: 400 }
      );
    }

    if (settlePaise > currentOutstanding) {
      return NextResponse.json(
        {
          error: `Settle amount ₹${(settlePaise / 100).toFixed(2)} baaki balance ₹${(currentOutstanding / 100).toFixed(2)} se adhik nahi ho sakta.`,
        },
        { status: 400 }
      );
    }

    const mode = (paymentMode || "CASH").toUpperCase();
    const todayStr = receiptDate || getTodayIST();
    const recordedUser = settledBy || "usr_owner_01";
    const receiptId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const receiptNumber = `REC-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;
    const cleanRef = reference?.trim() || `Invoice ${inv.invoiceNumber} Settlement (${mode})`;

    // 1. Insert official receipt record
    await db.insert(receipts).values({
      id: receiptId,
      receiptNumber,
      customerId: inv.customerId,
      invoiceId: inv.id,
      amountPaise: settlePaise,
      paymentMode: mode === "CASH" ? "CASH" : mode === "UPI" ? "UPI_MANUAL" : "BANK_NEFT",
      transactionReference: cleanRef,
      recordedBy: recordedUser,
      receiptDate: todayStr,
      createdAt: new Date(),
    });

    // 2. Post balanced Double-Entry Journal Voucher
    // Cash: Dr. 1110 (Cash-in-Hand Vault Cash), Cr. 1150 (Accounts Receivable Customer)
    // Bank / UPI: Dr. 1130 (Bank Account), Cr. 1150 (Accounts Receivable Customer)
    const debitAccount = mode === "CASH" ? 1110 : 1130;
    const debitAccountName = mode === "CASH" ? "Central Cash Vault (1110)" : "Commercial Bank A/C (1130)";

    const jv = await postJournalEntry({
      entryDate: todayStr,
      sourceDocumentType: "RECEIPT",
      sourceDocumentId: receiptId,
      narration: `Invoice ${inv.invoiceNumber} due settlement received via ${mode} (${cleanRef}) into ${debitAccountName}`,
      postedBy: recordedUser,
      lines: [
        {
          accountId: debitAccount,
          debitPaise: settlePaise,
          creditPaise: 0,
        },
        {
          accountId: 1150, // Accounts Receivable
          debitPaise: 0,
          creditPaise: settlePaise,
          subLedgerType: "CUSTOMER",
          subLedgerId: inv.customerId,
        },
      ],
    });

    // 3. Update Invoice Status & Paid Amount
    const newPaidTotal = Math.min(inv.totalAmountPaise, currentPaid + settlePaise);
    const newStatus = newPaidTotal >= inv.totalAmountPaise ? "PAID" : "PARTIALLY_PAID";

    await db
      .update(invoices)
      .set({
        paidAmountPaise: newPaidTotal,
        status: newStatus,
      })
      .where(eq(invoices.id, inv.id));

    // 4. Update Customer Ledger Balance
    await db.execute(sql`
      UPDATE customers 
      SET current_balance_paise = GREATEST(0, current_balance_paise - ${settlePaise}) 
      WHERE id = ${inv.customerId};
    `);

    return NextResponse.json({
      success: true,
      message: `Invoice ${inv.invoiceNumber} ka ₹${(settlePaise / 100).toFixed(2)} balance safaltapoorvak clear kar diya gaya hai! Mode: ${mode}.`,
      receiptNumber,
      journalEntryNumber: jv.entryNumber,
      paidAmountPaise: newPaidTotal,
      outstandingPaise: Math.max(0, inv.totalAmountPaise - newPaidTotal),
      status: newStatus,
    });
  } catch (err: any) {
    console.error("Invoice settlement error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to settle invoice due balance" },
      { status: 500 }
    );
  }
}
