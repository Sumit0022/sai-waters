import { NextResponse } from "next/server";
import { getDb, ensureDatabaseReady } from "@/db";
import { invoices, invoiceLines, customers, orders, eventOrders, receipts, cashCollectionSubmissions, users, customerPriceAgreements } from "@/db/schema";
import {
  createAndPostInvoice,
  generateUpiLink,
  generateWhatsAppShareLink,
  generateWhatsAppWebLink,
  generateWhatsAppMessageText,
} from "@/lib/billing";
import { eq, desc, inArray } from "drizzle-orm";
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

  // Fetch all orders to match orders against monthly statements
  const allOrders = await db.select().from(orders);

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
    // 1. Resolve which orders belong to this invoice
    const invMonth = inv.invoiceDate ? inv.invoiceDate.slice(0, 7) : "";
    const targetMonth = inv.notes?.match(/\d{4}-\d{2}/)?.[0] || invMonth;

    const linkedOrderIds = new Set<string>();
    if (inv.orderId) linkedOrderIds.add(inv.orderId);
    if (inv.billingType === "MONTHLY_CONSOLIDATED") {
      for (const o of allOrders) {
        if (o.customerId === inv.customerId && o.scheduledDate?.startsWith(targetMonth)) {
          linkedOrderIds.add(o.id);
        }
      }
    }

    // 2. Driver field cash collections linked to this invoice or linked orders
    const invCashSubs = allCashSubs
      .filter((s: any) => {
        if (s.invoiceId === inv.id) return true;
        if (s.orderId && linkedOrderIds.has(s.orderId)) {
          return !s.invoiceId || s.invoiceId === inv.id;
        }
        return false;
      })
      .map((s: any) => ({
        ...s,
        collectedTimeIST: formatTimeIST(s.collectedAt),
        collectedDateTimeIST: formatDateTimeIST(s.collectedAt),
      }));

    const cashSubSlipCodes = new Set(invCashSubs.map((s: any) => s.id?.slice(-6)));

    // 3. Official Receipts linked to this invoice or matching linked collection slips
    const invReceipts = allReceipts.filter((r: any) => {
      if (r.invoiceId === inv.id) return true;
      if (r.customerId !== inv.customerId) return false;
      if (r.invoiceId && r.invoiceId !== inv.id) return false;

      if (cashSubSlipCodes.size > 0 && Array.from(cashSubSlipCodes).some((code) => r.transactionReference?.includes(code))) {
        return true;
      }
      if (inv.orderNumber && r.transactionReference?.includes(inv.orderNumber)) {
        return true;
      }
      return false;
    });

    // 4. Parse order metadata if available (Advance payment)
    let advancePaise = 0;
    let paymentType = "PAY_ON_DELIVERY";
    if (inv.orderDeliveryNotes) {
      try {
        const meta = JSON.parse(inv.orderDeliveryNotes);
        if (meta.advanceReceivedPaise) advancePaise = Number(meta.advanceReceivedPaise);
        if (meta.paymentType) paymentType = meta.paymentType;
      } catch (e) {}
    }

    // 5. Driver collected cash total
    const driverCollectedPaise = invCashSubs.reduce((sum: number, s: any) => sum + (s.amountCollectedPaise || 0), 0);

    // 6. Direct / Subsequent Settlements (receipts linked that are not doorstep driver slips)
    const directSettlementPaise = invReceipts
      .filter((r: any) => !r.transactionReference?.includes("Driver Collection Slip"))
      .reduce((sum: number, r: any) => sum + (r.amountPaise || 0), 0);

    // Total verified payments received: Doorstep Cash + Advance + Direct Settlements
    const totalPaymentsReceived = driverCollectedPaise + advancePaise + directSettlementPaise;

    // Use verified payments if payments were recorded, otherwise recorded paidAmountPaise
    const actualPaid = totalPaymentsReceived > 0
      ? Math.min(inv.totalAmountPaise, totalPaymentsReceived)
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

    const waText = generateWhatsAppMessageText({
      customerName: inv.customerName,
      invoiceNumber: inv.invoiceNumber,
      amountPaise: outstandingPaise,
      totalBilledPaise: inv.totalAmountPaise,
      paidPaise: actualPaid,
      dueDate: inv.dueDate,
      upiLink,
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

    const waWebLink = generateWhatsAppWebLink({
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
      whatsAppText: waText,
      whatsAppShareUrl: waLink,
      whatsAppWebUrl: waWebLink,
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

    let initialPaid = 0;
    let initialStatus: string | undefined = undefined;
    const isMonthly = (body.billingType || "SPOT_DELIVERY") === "MONTHLY_CONSOLIDATED";
    const currentMonth = new Date().toISOString().slice(0, 7);
    let matchedSubsToLink: any[] = [];

    if (isMonthly && body.customerId) {
      const custOrders = await db.select().from(orders).where(eq(orders.customerId, body.customerId));
      const orderIds = new Set(custOrders.map((o: any) => o.id));

      const allSubs = await db.select().from(cashCollectionSubmissions);
      matchedSubsToLink = allSubs.filter((s: any) => {
        if (s.orderId && orderIds.has(s.orderId)) {
          return !s.invoiceId;
        }
        return false;
      });

      const driverCash = matchedSubsToLink.reduce((sum: number, s: any) => sum + (s.amountCollectedPaise || 0), 0);
      if (driverCash > 0) {
        const totalPaise = Number(body.quantity || 1) * unitPrice;
        initialPaid = Math.min(totalPaise, driverCash);
        initialStatus = initialPaid >= totalPaise ? "PAID" : "PARTIALLY_PAID";
      }
    }

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
      paidAmountPaise: initialPaid,
      status: initialStatus,
      notes: body.notes,
    });

    if (matchedSubsToLink.length > 0) {
      const subIdList = matchedSubsToLink.map((s: any) => s.id);
      await db
        .update(cashCollectionSubmissions)
        .set({ invoiceId: result.invoiceId })
        .where(inArray(cashCollectionSubmissions.id, subIdList));

      const subSlipCodes = new Set(matchedSubsToLink.map((s: any) => s.id?.slice(-6)));
      const allRecs = await db.select().from(receipts).where(eq(receipts.customerId, body.customerId));
      const matchingRecs = allRecs.filter(
        (r: any) => !r.invoiceId && subSlipCodes.size > 0 && Array.from(subSlipCodes).some((code) => r.transactionReference?.includes(code))
      );
      if (matchingRecs.length > 0) {
        const recIdList = matchingRecs.map((r: any) => r.id);
        await db
          .update(receipts)
          .set({ invoiceId: result.invoiceId })
          .where(inArray(receipts.id, recIdList));
      }
    }

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to generate invoice" }, { status: 500 });
  }
}
