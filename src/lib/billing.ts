import { getDb } from "@/db";
import { invoices, invoiceLines, orders, customers, customerAddresses } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { postJournalEntry } from "./accounting";

export interface CreateInvoiceParams {
  customerId: string;
  orderId?: string;
  billingType: "MONTHLY_CONSOLIDATED" | "SPOT_DELIVERY" | "EVENT_SETTLEMENT";
  lines: { description: string; quantity: number; unitPricePaise: number }[];
  postedBy: string;
  notes?: string;
}

/**
 * Creates and posts an official commercial Bill of Supply / Invoice
 * Implements GST-unregistered compliant formatting (0% tax, no GST charge)
 * Posts double-entry journal voucher to General Ledger automatically.
 */
export async function createAndPostInvoice(params: CreateInvoiceParams) {
  const db = getDb();

  const customer = (await db.select().from(customers).where(eq(customers.id, params.customerId)).limit(1))[0];
  if (!customer) {
    throw new Error(`Customer not found with ID ${params.customerId}`);
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]; // +7 days
  const yearSuffix = new Date().getFullYear().toString().slice(-2);
  const nextYearSuffix = (new Date().getFullYear() + 1).toString().slice(-2);

  // Serial sequential invoice number: SW/26-27/INV-00001
  const countRes = await db.select({ count: sql<number>`count(*)` }).from(invoices);
  const nextNum = (countRes[0]?.count || 0) + 1;
  const invoiceNumber = `SW/${yearSuffix}-${nextYearSuffix}/INV-${String(nextNum).padStart(5, "0")}`;
  const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const totalPaise = params.lines.reduce((s, l) => s + l.quantity * l.unitPricePaise, 0);

  // 1. Insert Invoice Record
  await db.insert(invoices).values({
    id: invoiceId,
    invoiceNumber,
    customerId: params.customerId,
    orderId: params.orderId || null,
    invoiceDate: todayStr,
    dueDate,
    subtotalPaise: totalPaise,
    taxPaise: 0, // GST Unregistered
    totalAmountPaise: totalPaise,
    paidAmountPaise: 0,
    status: "ISSUED",
    billingType: params.billingType,
    pdfUrl: `/api/invoices/${invoiceId}/pdf`,
    createdAt: new Date(),
  });

  // 2. Insert Invoice Lines
  for (const line of params.lines) {
    const lineId = `inl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await db.insert(invoiceLines).values({
      id: lineId,
      invoiceId,
      description: line.description,
      quantity: line.quantity,
      unitPricePaise: line.unitPricePaise,
      lineTotalPaise: line.quantity * line.unitPricePaise,
    });
  }

  // 3. Post Double-Entry Journal Entry:
  // Dr. 1150 Accounts Receivable (Customer Sub-Ledger)
  // Cr. 4110 Water Sales Revenue (or 4120 Bulk Event Revenue)
  const revenueAccountId = params.billingType === "EVENT_SETTLEMENT" ? 4120 : 4110;

  await postJournalEntry({
    sourceDocumentType: "INVOICE",
    sourceDocumentId: invoiceId,
    narration: `Commercial Invoice ${invoiceNumber} issued to ${customer.fullName}`,
    postedBy: params.postedBy,
    lines: [
      {
        accountId: 1150, // Accounts Receivable
        debitPaise: totalPaise,
        creditPaise: 0,
        subLedgerType: "CUSTOMER",
        subLedgerId: params.customerId,
      },
      {
        accountId: revenueAccountId, // Sales Revenue
        debitPaise: 0,
        creditPaise: totalPaise,
      },
    ],
  });

  // 4. Update Customer Current Balance
  await db.execute(sql`
    UPDATE customers SET current_balance_paise = current_balance_paise + ${totalPaise} WHERE id = ${params.customerId};
  `);

  return {
    invoiceId,
    invoiceNumber,
    totalAmountPaise: totalPaise,
    customer,
  };
}

/**
 * Generates UPI payment intent link for zero-friction mobile payments
 */
export function generateUpiLink(params: {
  upiId?: string;
  businessName?: string;
  amountPaise: number;
  invoiceNumber: string;
}) {
  const upi = params.upiId || "saiwaters@upi";
  const name = encodeURIComponent(params.businessName || "Sai Waters");
  const amount = (params.amountPaise / 100).toFixed(2);
  const note = encodeURIComponent(`Bill ${params.invoiceNumber}`);
  return `upi://pay?pa=${upi}&pn=${name}&am=${amount}&cu=INR&tn=${note}`;
}

/**
 * Generates 1-Click pre-filled WhatsApp share link (wa.me)
 */
export function generateWhatsAppShareLink(params: {
  customerPhone: string;
  customerName: string;
  invoiceNumber: string;
  amountPaise: number;
  dueDate: string;
  upiLink: string;
}) {
  const cleanPhone = params.customerPhone.replace(/[^0-9]/g, "").slice(-10);
  const amountRupees = (params.amountPaise / 100).toFixed(2);

  const text =
    `Namaste ${params.customerName}! 🙏\n\n` +
    `Your water delivery bill from *Sai Waters* is ready:\n` +
    `📄 *Invoice No:* ${params.invoiceNumber}\n` +
    `💰 *Total Amount:* ₹${amountRupees}\n` +
    `📅 *Due Date:* ${params.dueDate}\n\n` +
    `Click below to pay via UPI (GPay/PhonePe/Paytm):\n` +
    `${params.upiLink}\n\n` +
    `Thank you for choosing Sai Waters! 💧`;

  return `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(text)}`;
}
