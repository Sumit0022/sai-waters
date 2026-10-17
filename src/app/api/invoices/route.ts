import { NextResponse } from "next/server";
import { getDb, ensureDatabaseReady } from "@/db";
import { invoices, invoiceLines, customers, orders, eventOrders, receipts, cashCollectionSubmissions, users, customerPriceAgreements } from "@/db/schema";
import { createAndPostInvoice, generateUpiLink, generateWhatsAppShareLink } from "@/lib/billing";
import { eq, desc } from "drizzle-orm";
import { formatTimeIST, formatDateTimeIST } from "@/lib/date-utils";
import { getBusinessInfo } from "@/lib/settings";

export async function GET(request: Request) {
  await ensureDatabaseReady();
  const db = getDb();
  const businessInfo = await getBusinessInfo();
  const url = new URL(request.url);
  const customerId = url.searchParams.get("customerId");

  const query = db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      customerId: invoices.customerId,
      customerName: customers.fullName,
      customerPhone: customers.phone,
      customerCode: customers.customerCode,
      orderId: invoices.orderId,
      invoiceDate: invoices.invoiceDate,
      dueDate: invoices.dueDate,
      subtotalPaise: invoices.subtotalPaise,
      taxPaise: invoices.taxPaise,
      totalAmountPaise: invoices.totalAmountPaise,
      paidAmountPaise: invoices.paidAmountPaise,
      status: invoices.status,
      billingType: invoices.billingType,
      pdfUrl: invoices.pdfUrl,
      createdAt: invoices.createdAt,
      // Joined order details
      orderNumber: orders.orderNumber,
      orderType: orders.orderType,
      orderScheduledDate: orders.scheduledDate,
      orderQuantityJars: orders.quantityJars,
      orderUnitPricePaise: orders.unitPricePaise,
      orderTotalAmountPaise: orders.totalAmountPaise,
      orderDeliveryNotes: orders.deliveryNotes,
      orderStatus: orders.status,
    })
    .from(invoices)
    .innerJoin(customers, eq(invoices.customerId, customers.id))
    .leftJoin(orders, eq(invoices.orderId, orders.id))
    .orderBy(desc(invoices.createdAt));

  const allInvoices = await query;
  const filtered = customerId ? allInvoices.filter((i: any) => i.customerId === customerId) : allInvoices;

  // Fetch receipts and cash submissions for all invoices
  const allReceipts = await db.select().from(receipts);
  const allCashSubs = await db
    .select({
      id: cashCollectionSubmissions.id,
      driverId: cashCollectionSubmissions.driverId,
      driverName: users.fullName,
      orderId: cashCollectionSubmissions.orderId,
      invoiceId: cashCollectionSubmissions.invoiceId,
      amountCollectedPaise: cashCollectionSubmissions.amountCollectedPaise,
      collectedAt: cashCollectionSubmissions.collectedAt,
      isHandedOver: cashCollectionSubmissions.isHandedOver,
    })
    .from(cashCollectionSubmissions)
    .leftJoin(users, eq(cashCollectionSubmissions.driverId, users.id));

  // Fetch event orders
  const allEvents = await db.select().from(eventOrders);
  const eventMap = new Map<string, any>(allEvents.map((e: any) => [e.orderId, e]));

  const enriched = filtered.map((inv: any) => {
    // Receipts linked to this invoice or matching order reference
    const invReceipts = allReceipts.filter(
      (r: any) => r.invoiceId === inv.id || (inv.orderNumber && r.transactionReference?.includes(inv.orderNumber))
    );

    // Driver field cash collections linked to this invoice or order
    const invCashSubs = allCashSubs
      .filter((s: any) => {
        if (s.invoiceId === inv.id) return true;
        if (inv.orderId && s.orderId === inv.orderId) return true;
        if (inv.billingType === "MONTHLY_CONSOLIDATED") {
          const invMonth = inv.invoiceDate ? inv.invoiceDate.slice(0, 7) : "";
          const targetMonth = inv.notes?.match(/\d{4}-\d{2}/)?.[0] || invMonth;
          const subDate = s.collectedAt ? new Date(s.collectedAt).toISOString().slice(0, 7) : "";
          const matchedRec = allReceipts.find(
            (r: any) => r.customerId === inv.customerId && (r.transactionReference?.includes(s.id?.slice(-6)) || (r.invoiceId === inv.id))
          );
          if (matchedRec && subDate === targetMonth) return true;
        }
        return false;
      })
      .map((s: any) => ({
        ...s,
        collectedTimeIST: formatTimeIST(s.collectedAt),
        collectedDateTimeIST: formatDateTimeIST(s.collectedAt),
      }));

    // Parse order metadata if available
    let advancePaise = 0;
    let paymentType = "PAY_ON_DELIVERY";
    if (inv.orderDeliveryNotes) {
      try {
        const meta = JSON.parse(inv.orderDeliveryNotes);
        if (meta.advanceReceivedPaise) advancePaise = Number(meta.advanceReceivedPaise);
        if (meta.paymentType) paymentType = meta.paymentType;
      } catch (e) {}
    }

    // Driver collected cash total
    const driverCollectedPaise = invCashSubs.reduce((sum: number, s: any) => sum + (s.amountCollectedPaise || 0), 0);

    // Compute verified paid amount and outstanding balance
    const totalReceiptsPaise = invReceipts.reduce((sum: number, r: any) => sum + (r.amountPaise || 0), 0);
    const verifiedPaymentsPaise = Math.max(advancePaise + driverCollectedPaise, totalReceiptsPaise, inv.paidAmountPaise || 0);

    // Use verified payments if DB was corrupted by previous double-count, otherwise recorded paidAmountPaise
    const actualPaid = verifiedPaymentsPaise > 0 
      ? Math.min(inv.totalAmountPaise, Math.max(verifiedPaymentsPaise, Math.min(inv.paidAmountPaise || 0, verifiedPaymentsPaise)))
      : Math.min(inv.totalAmountPaise, inv.paidAmountPaise || 0);

    const outstandingPaise = Math.max(0, inv.totalAmountPaise - actualPaid);
    const computedStatus =
      outstandingPaise === 0 && actualPaid > 0
        ? "PAID"
        : actualPaid > 0
        ? "PARTIALLY_PAID"
        : "ISSUED";

    const evt = inv.orderId ? eventMap.get(inv.orderId) : null;

    const upiLink = generateUpiLink({
      upiId: businessInfo.upi_id,
      businessName: businessInfo.payee_name,
      amountPaise: outstandingPaise,
      invoiceNumber: inv.invoiceNumber,
    });

    const waLink = generateWhatsAppShareLink({
      customerPhone: inv.customerPhone,
      customerName: inv.customerName,
      invoiceNumber: inv.invoiceNumber,
      amountPaise: outstandingPaise,
      totalBilledPaise: inv.totalAmountPaise,
      paidPaise: actualPaid,
      dueDate: inv.dueDate,
      upiLink,
    });

    return {
      ...inv,
      paidAmountPaise: actualPaid,
      outstandingPaise,
      status: computedStatus,
      advanceReceivedPaise: advancePaise,
      driverCollectedPaise,
      paymentType,
      receipts: invReceipts,
      cashCollections: invCashSubs,
      eventName: evt?.eventName || null,
      venueContactPerson: evt?.venueContactPerson || null,
      venueContactPhone: evt?.venueContactPhone || null,
      businessUpiId: businessInfo.upi_id,
      businessPayeeName: businessInfo.payee_name,
      upiLink,
      whatsAppShareUrl: waLink,
    };
  });

  return NextResponse.json({ invoices: enriched, businessInfo });
}

export async function POST(request: Request) {
  try {
    await ensureDatabaseReady();
    const db = getDb();
    const body = await request.json();

    let defaultUnitPricePaise = body.unitPricePaise ? Number(body.unitPricePaise) : null;
    if (!defaultUnitPricePaise && body.customerId) {
      const priceRow = await db
        .select()
        .from(customerPriceAgreements)
        .where(eq(customerPriceAgreements.customerId, body.customerId))
        .orderBy(desc(customerPriceAgreements.effectiveFrom))
        .limit(1);
      if (priceRow.length > 0) {
        defaultUnitPricePaise = priceRow[0].pricePerJarPaise;
      }
    }
    const unitPrice = defaultUnitPricePaise || 3500;

    const result = await createAndPostInvoice({
      customerId: body.customerId,
      orderId: body.orderId,
      billingType: body.billingType || "SPOT_DELIVERY",
      lines: [
        {
          description: body.description || "20L Drinking Water Jars",
          quantity: Number(body.quantity || 1),
          unitPricePaise: unitPrice,
        },
      ],
      postedBy: body.postedBy || "usr_owner_01",
      notes: body.notes,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to generate invoice" }, { status: 500 });
  }
}
