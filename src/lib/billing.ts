import { getDb } from "@/db";
import { invoices, invoiceLines, orders, customers, customerAddresses, customerPriceAgreements } from "@/db/schema";
import { eq, sql, and, desc } from "drizzle-orm";
import { postJournalEntry } from "./accounting";
import { getTodayIST } from "./date-utils";

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

    pendingSummary.push({
      customerId: cust.id,
      customerName: cust.fullName,
      customerCode: cust.customerCode,
      phone: cust.phone,
      totalJars,
      deliveryTrips: deliveredOrders.length,
      unitPricePaise,
      estimatedAmountPaise: totalJars * unitPricePaise,
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
 * Idempotent: Skips customers who have already been billed for the target month.
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

    // Get delivered recurring orders
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
    if (totalJars === 0 && !options?.forceAll) {
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
      notes: `Consolidated Monthly Invoice for ${monthName} (${targetMonth}). Total ${deliveredOrders.length} doorstep deliveries.`,
    });

    const upiLink = generateUpiLink({
      amountPaise: totalAmountPaise,
      invoiceNumber: inv.invoiceNumber,
    });

    const waLink = generateWhatsAppShareLink({
      customerPhone: cust.phone,
      customerName: cust.fullName,
      invoiceNumber: inv.invoiceNumber,
      amountPaise: totalAmountPaise,
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
      billingMonth: targetMonth,
      monthName,
      upiLink,
      whatsAppShareUrl: waLink,
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
