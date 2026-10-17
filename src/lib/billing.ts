import { getDb } from "@/db";
import {
  invoices,
  invoiceLines,
  orders,
  customers,
  customerAddresses,
  customerPriceAgreements,
  cashCollectionSubmissions,
  receipts,
} from "@/db/schema";
import { eq, sql, and, desc, inArray } from "drizzle-orm";
import { postJournalEntry } from "./accounting";
import { getTodayIST } from "./date-utils";

export interface CreateInvoiceParams {
  customerId: string;
  orderId?: string;
  billingType: "MONTHLY_CONSOLIDATED" | "SPOT_DELIVERY" | "EVENT_SETTLEMENT";
  lines: { description: string; quantity: number; unitPricePaise: number }[];
  postedBy: string;
  notes?: string;
  paidAmountPaise?: number;
  status?: string;
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

  const todayStr = getTodayIST();
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]; // +7 days
  const yearSuffix = new Date().getFullYear().toString().slice(-2);
  const nextYearSuffix = (new Date().getFullYear() + 1).toString().slice(-2);

  // Serial sequential invoice number: SW/26-27/INV-00001
  const countRes = await db.select({ count: sql<number>`count(*)` }).from(invoices);
  const allInvoices = await db.select({ num: invoices.invoiceNumber }).from(invoices);
  const existingSet = new Set(allInvoices.map((i: any) => i.num));
  let nextNum = (countRes[0]?.count || 0) + 1;
  let invoiceNumber = `SW/${yearSuffix}-${nextYearSuffix}/INV-${String(nextNum).padStart(5, "0")}`;
  while (existingSet.has(invoiceNumber)) {
    nextNum++;
    invoiceNumber = `SW/${yearSuffix}-${nextYearSuffix}/INV-${String(nextNum).padStart(5, "0")}`;
  }
  const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const totalPaise = params.lines.reduce((s, l) => s + l.quantity * l.unitPricePaise, 0);
  const initialPaid = Math.min(totalPaise, Math.max(0, params.paidAmountPaise || 0));
  const initialStatus =
    params.status ||
    (initialPaid >= totalPaise ? "PAID" : initialPaid > 0 ? "PARTIALLY_PAID" : "ISSUED");

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
    paidAmountPaise: initialPaid,
    status: initialStatus,
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

  // 4. Update Customer Current Balance: Only add the remaining un-settled balance
  const netDuePaise = Math.max(0, totalPaise - initialPaid);
  if (netDuePaise > 0) {
    await db.execute(sql`
      UPDATE customers SET current_balance_paise = current_balance_paise + ${netDuePaise} WHERE id = ${params.customerId};
    `);
  }

  return {
    invoiceId,
    invoiceNumber,
    totalAmountPaise: totalPaise,
    paidAmountPaise: initialPaid,
    status: initialStatus,
    customer,
  };
}

/**
 * Scans regular customers for unbilled deliveries in a given month.
 */
export async function getUnbilledMonthlySummary(billingMonth?: string) {
  const db = getDb();
  const now = new Date();
  const targetMonth = billingMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const regularCustomers = await db
    .select()
    .from(customers)
    .where(eq(customers.billingFrequency, "MONTHLY"));

  const pendingSummary: any[] = [];
  const allCashSubs = await db.select().from(cashCollectionSubmissions);
  const allReceipts = await db.select().from(receipts);

  for (const cust of regularCustomers) {
    // Check if already billed for targetMonth with MONTHLY_CONSOLIDATED
    const existingInvoices = await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.customerId, cust.id),
          eq(invoices.billingType, "MONTHLY_CONSOLIDATED")
        )
      );

    const alreadyBilled = existingInvoices.some((inv: any) =>
      inv.invoiceDate.startsWith(targetMonth) ||
      (inv.notes && inv.notes.includes(targetMonth))
    );

    // Get delivered orders for this customer in targetMonth
    const deliveredOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.customerId, cust.id),
          eq(orders.status, "DELIVERED"),
          sql`${orders.scheduledDate} LIKE ${targetMonth + '%'}`
        )
      );

    const totalJars = deliveredOrders.reduce((s: number, o: any) => s + (o.quantityJars || 1), 0);

    const [priceRow] = await db
      .select()
      .from(customerPriceAgreements)
      .where(eq(customerPriceAgreements.customerId, cust.id))
      .orderBy(desc(customerPriceAgreements.effectiveFrom))
      .limit(1);

    const unitPricePaise = priceRow?.pricePerJarPaise || deliveredOrders[0]?.unitPricePaise || 3500;
    const estimatedTotalPaise = totalJars * unitPricePaise;

    // Find cash collected by drivers for this customer in targetMonth
    const orderIdList = deliveredOrders.map((o: any) => o.id);
    const orderIdSet = new Set(orderIdList);
    const custCashSubs = allCashSubs.filter((s: any) => {
      if (s.orderId && orderIdSet.has(s.orderId)) return !s.invoiceId;
      return false;
    });

    const subCashPaise = custCashSubs.reduce((sum: number, s: any) => sum + (s.amountCollectedPaise || 0), 0);
    const directReceipts = allReceipts.filter((r: any) => {
      return (
        r.customerId === cust.id &&
        !r.invoiceId &&
        !r.transactionReference?.includes("Driver Collection Slip") &&
        r.receiptDate?.startsWith(targetMonth)
      );
    });
    const directPaidPaise = directReceipts.reduce((sum: number, r: any) => sum + (r.amountPaise || 0), 0);
    const alreadyPaidPaise = Math.min(estimatedTotalPaise, subCashPaise + directPaidPaise);
    const estimatedNetDuePaise = Math.max(0, estimatedTotalPaise - alreadyPaidPaise);

    pendingSummary.push({
      customerId: cust.id,
      customerName: cust.fullName,
      customerCode: cust.customerCode,
      phone: cust.phone,
      totalJars,
      deliveryTrips: deliveredOrders.length,
      unitPricePaise,
      estimatedAmountPaise: estimatedTotalPaise,
      alreadyPaidPaise,
      estimatedNetDuePaise,
      isBilled: alreadyBilled,
      existingInvoiceNumber: alreadyBilled ? existingInvoices[0]?.invoiceNumber : null,
    });
  }

  return {
    targetMonth,
    summary: pendingSummary,
    unbilledCount: pendingSummary.filter((p) => !p.isBilled && p.totalJars > 0).length,
    billedCount: pendingSummary.filter((p) => p.isBilled).length,
  };
}

/**
 * Automates Month-End Consolidated Invoice Generation for all Regular Customers
 * Adjusts driver doorstep field cash collections and accurately posts net due amounts.
 */
export async function generateMonthlyConsolidatedInvoices(options?: {
  billingMonth?: string;
  postedBy?: string;
  customerId?: string;
  forceAll?: boolean;
}) {
  const db = getDb();
  const postedBy = options?.postedBy || "usr_owner_01";
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const targetMonth = options?.billingMonth || currentMonthStr;

  const [year, month] = targetMonth.split("-");
  const monthDate = new Date(Number(year), Number(month) - 1, 1);
  const monthName = monthDate.toLocaleString("en-IN", { month: "long", year: "numeric" });

  const regularCustomers = await db
    .select()
    .from(customers)
    .where(eq(customers.billingFrequency, "MONTHLY"));

  const filteredCustomers = options?.customerId
    ? regularCustomers.filter((c: any) => c.id === options.customerId)
    : regularCustomers;

  const generatedInvoices: any[] = [];
  const allCashSubs = await db.select().from(cashCollectionSubmissions);
  const allReceipts = await db.select().from(receipts);

  for (const cust of filteredCustomers) {
    // Check if already billed
    const existingInvoices = await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.customerId, cust.id),
          eq(invoices.billingType, "MONTHLY_CONSOLIDATED")
        )
      );

    const alreadyBilled = existingInvoices.some((inv: any) =>
      inv.invoiceDate.startsWith(targetMonth) ||
      (inv.notes && inv.notes.includes(targetMonth))
    );

    if (alreadyBilled && !options?.forceAll) {
      continue;
    }

    // Get delivered recurring orders in targetMonth
    const deliveredOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.customerId, cust.id),
          eq(orders.status, "DELIVERED"),
          sql`${orders.scheduledDate} LIKE ${targetMonth + '%'}`
        )
      );

    const totalJars = deliveredOrders.reduce((s: number, o: any) => s + (o.quantityJars || 1), 0);
    if (totalJars <= 0) {
      continue; // No jars delivered, skip
    }

    const [priceRow] = await db
      .select()
      .from(customerPriceAgreements)
      .where(eq(customerPriceAgreements.customerId, cust.id))
      .orderBy(desc(customerPriceAgreements.effectiveFrom))
      .limit(1);

    const unitPricePaise = priceRow?.pricePerJarPaise || deliveredOrders[0]?.unitPricePaise || 3500;
    const totalAmountPaise = totalJars * unitPricePaise;

    // Find driver cash collections strictly collected for these delivered orders
    const orderIdList = deliveredOrders.map((o: any) => o.id);
    const orderIdSet = new Set(orderIdList);
    const matchingSubs = allCashSubs.filter((s: any) => {
      if (s.orderId && orderIdSet.has(s.orderId)) {
        return !s.invoiceId;
      }
      return false;
    });

    const subSlipCodes = new Set(matchingSubs.map((s: any) => s.id?.slice(-6)));
    const matchingReceipts = allReceipts.filter((r: any) => {
      if (r.customerId !== cust.id) return false;
      if (r.invoiceId) return false;
      if (subSlipCodes.size > 0 && Array.from(subSlipCodes).some((code) => r.transactionReference?.includes(code))) {
        return true;
      }
      return false;
    });

    const directReceipts = allReceipts.filter((r: any) => {
      if (r.customerId !== cust.id) return false;
      if (r.invoiceId) return false;
      if (r.transactionReference?.includes("Driver Collection Slip")) return false;
      if (r.receiptDate && r.receiptDate.startsWith(targetMonth)) return true;
      return false;
    });

    const driverCashPaise = matchingSubs.reduce((sum: number, s: any) => sum + (s.amountCollectedPaise || 0), 0);
    const directAdvancePaise = directReceipts.reduce((sum: number, r: any) => sum + (r.amountPaise || 0), 0);
    const alreadyPaidPaise = Math.min(totalAmountPaise, driverCashPaise + directAdvancePaise);
    const netDuePaise = Math.max(0, totalAmountPaise - alreadyPaidPaise);
    const invStatus = netDuePaise === 0 && alreadyPaidPaise > 0 ? "PAID" : alreadyPaidPaise > 0 ? "PARTIALLY_PAID" : "ISSUED";

    const inv = await createAndPostInvoice({
      customerId: cust.id,
      billingType: "MONTHLY_CONSOLIDATED",
      lines: [
        {
          description: `Monthly Drinking Water Supply — ${monthName} (${totalJars} Jars @ ₹${(unitPricePaise / 100).toFixed(2)})`,
          quantity: totalJars,
          unitPricePaise,
        },
      ],
      postedBy,
      paidAmountPaise: alreadyPaidPaise,
      status: invStatus,
      notes: `Consolidated Monthly Invoice for ${monthName} (${targetMonth}). Total ${deliveredOrders.length} doorstep deliveries (${totalJars} Jars). Total Billed: ₹${(totalAmountPaise / 100).toFixed(2)}. Driver Doorstep Cash Paid: ₹${(alreadyPaidPaise / 100).toFixed(2)}. Net Amount Due: ₹${(netDuePaise / 100).toFixed(2)}.`,
    });

    // Link matched submissions and receipts to this newly created invoice
    if (matchingSubs.length > 0) {
      const subIds = matchingSubs.map((s: any) => s.id);
      await db
        .update(cashCollectionSubmissions)
        .set({ invoiceId: inv.invoiceId })
        .where(inArray(cashCollectionSubmissions.id, subIds));
    }
    const receiptsToLink = [...matchingReceipts, ...directReceipts];
    if (receiptsToLink.length > 0) {
      const recIds = receiptsToLink.map((r: any) => r.id);
      await db
        .update(receipts)
        .set({ invoiceId: inv.invoiceId })
        .where(inArray(receipts.id, recIds));
    }

    const upiLink = generateUpiLink({
      amountPaise: netDuePaise,
      invoiceNumber: inv.invoiceNumber,
    });

    const waText = generateWhatsAppMessageText({
      customerName: cust.fullName,
      invoiceNumber: inv.invoiceNumber,
      amountPaise: netDuePaise,
      totalBilledPaise: totalAmountPaise,
      paidPaise: alreadyPaidPaise,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      upiLink,
    });

    const waLink = generateWhatsAppShareLink({
      customerPhone: cust.phone,
      customerName: cust.fullName,
      invoiceNumber: inv.invoiceNumber,
      amountPaise: netDuePaise,
      totalBilledPaise: totalAmountPaise,
      paidPaise: alreadyPaidPaise,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      upiLink,
    });

    const waWebLink = generateWhatsAppWebLink({
      customerPhone: cust.phone,
      customerName: cust.fullName,
      invoiceNumber: inv.invoiceNumber,
      amountPaise: netDuePaise,
      totalBilledPaise: totalAmountPaise,
      paidPaise: alreadyPaidPaise,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      upiLink,
    });

    generatedInvoices.push({
      customerId: cust.id,
      customerName: cust.fullName,
      customerCode: cust.customerCode,
      phone: cust.phone,
      invoiceId: inv.invoiceId,
      invoiceNumber: inv.invoiceNumber,
      totalJars,
      deliveryTrips: deliveredOrders.length,
      unitPricePaise,
      totalAmountPaise,
      alreadyPaidPaise,
      netDuePaise,
      status: invStatus,
      billingMonth: targetMonth,
      monthName,
      upiLink,
      whatsAppText: waText,
      whatsAppShareUrl: waLink,
      whatsAppWebUrl: waWebLink,
    });
  }

  return {
    success: true,
    targetMonth,
    monthName,
    generatedCount: generatedInvoices.length,
    invoices: generatedInvoices,
  };
}

/**
 * Generates UPI payment intent link for zero-friction mobile payments
 * Uses sanitized name & note so URLs do not break in chat apps
 */
export function generateUpiLink(params: {
  upiId?: string;
  businessName?: string;
  amountPaise: number;
  invoiceNumber: string;
}) {
  const upi = params.upiId || "saiwaters@upi";
  const cleanName = encodeURIComponent((params.businessName || "Sai Waters").trim().replace(/\s+/g, "_"));
  const amount = (params.amountPaise / 100).toFixed(2);
  const cleanInvNo = params.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `upi://pay?pa=${upi}&pn=${cleanName}&am=${amount}&cu=INR&tn=Bill_${cleanInvNo}`;
}

/**
 * Generates structured, professional plain text for WhatsApp billing dispatch
 * Explicitly breaks down Total Deliveries Billed, Doorstep Cash Paid, and Net Due Amount with emojis
 */
export function generateWhatsAppMessageText(params: {
  customerName: string;
  invoiceNumber: string;
  amountPaise: number; // Net amount due
  totalBilledPaise?: number;
  paidPaise?: number;
  dueDate: string;
  upiLink: string;
}): string {
  const netDueRupees = (params.amountPaise / 100).toFixed(2);
  const totalBilledRupees = params.totalBilledPaise ? (params.totalBilledPaise / 100).toFixed(2) : null;
  const paidRupees = params.paidPaise ? (params.paidPaise / 100).toFixed(2) : null;

  let detailsText = "";
  if (totalBilledRupees && paidRupees && Number(paidRupees) > 0) {
    detailsText =
      `💧 *Total Month Deliveries:* ₹${totalBilledRupees}\n` +
      `💵 *Paid to Driver / Advance:* ₹${paidRupees}\n` +
      `💰 *Net Balance Due:* ₹${netDueRupees}\n`;
  } else {
    detailsText = `💰 *Total Amount Due:* ₹${netDueRupees}\n`;
  }

  const paymentText =
    params.amountPaise > 0
      ? `📅 *Due Date:* ${params.dueDate}\n\n` +
        `Click below to pay balance via UPI (GPay/PhonePe/Paytm):\n` +
        `${params.upiLink}\n\n`
      : `✅ *Status:* Fully Paid (Zero Balance Due)\n\n`;

  return (
    `Namaste ${params.customerName}! 🙏\n\n` +
    `Your water delivery bill from *Sai Waters* is ready:\n` +
    `📄 *Invoice No:* ${params.invoiceNumber}\n` +
    detailsText +
    paymentText +
    `Thank you for choosing Sai Waters! 💧`
  );
}

/**
 * Generates direct pre-filled WhatsApp share link (Universal / Mobile)
 * Uses direct api.whatsapp.com to prevent Meta's wa.me 302-redirect emoji corruption (%EF%BF%BD)
 */
export function generateWhatsAppShareLink(params: {
  customerPhone: string;
  customerName: string;
  invoiceNumber: string;
  amountPaise: number; // Net amount due
  totalBilledPaise?: number;
  paidPaise?: number;
  dueDate: string;
  upiLink: string;
}) {
  const cleanPhone = (params.customerPhone || "").replace(/[^0-9]/g, "").slice(-10);
  const text = generateWhatsAppMessageText(params);
  return `https://api.whatsapp.com/send/?phone=91${cleanPhone}&text=${encodeURIComponent(text)}`;
}

/**
 * Generates direct WhatsApp Web link (Desktop browser)
 * Opens web.whatsapp.com directly where JavaScript decodes UTF-8 without proxy header corruption
 */
export function generateWhatsAppWebLink(params: {
  customerPhone: string;
  customerName: string;
  invoiceNumber: string;
  amountPaise: number; // Net amount due
  totalBilledPaise?: number;
  paidPaise?: number;
  dueDate: string;
  upiLink: string;
}) {
  const cleanPhone = (params.customerPhone || "").replace(/[^0-9]/g, "").slice(-10);
  const text = generateWhatsAppMessageText(params);
  return `https://web.whatsapp.com/send?phone=91${cleanPhone}&text=${encodeURIComponent(text)}`;
}
