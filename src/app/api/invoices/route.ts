import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { invoices, invoiceLines, customers, orders, customerPriceAgreements } from "@/db/schema";
import { createAndPostInvoice, generateUpiLink, generateWhatsAppShareLink } from "@/lib/billing";
import { eq, desc } from "drizzle-orm";

export async function GET(request: Request) {
  const db = getDb();
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
    })
    .from(invoices)
    .innerJoin(customers, eq(invoices.customerId, customers.id))
    .orderBy(desc(invoices.createdAt));

  const allInvoices = await query;
  const filtered = customerId ? allInvoices.filter((i: any) => i.customerId === customerId) : allInvoices;

  const enriched = filtered.map((inv: any) => {
    const upiLink = generateUpiLink({
      amountPaise: inv.totalAmountPaise - inv.paidAmountPaise,
      invoiceNumber: inv.invoiceNumber,
    });
    const waLink = generateWhatsAppShareLink({
      customerPhone: inv.customerPhone,
      customerName: inv.customerName,
      invoiceNumber: inv.invoiceNumber,
      amountPaise: inv.totalAmountPaise - inv.paidAmountPaise,
      dueDate: inv.dueDate,
      upiLink,
    });

    return {
      ...inv,
      outstandingPaise: Math.max(0, inv.totalAmountPaise - inv.paidAmountPaise),
      upiLink,
      whatsAppShareUrl: waLink,
    };
  });

  return NextResponse.json({ invoices: enriched });
}

export async function POST(request: Request) {
  try {
    const db = getDb();
    const body = await request.json();

    let defaultUnitPricePaise = body.unitPricePaise ? Number(body.unitPricePaise) : null;
    if (!defaultUnitPricePaise && body.customerId) {
      const [priceRow] = await db
        .select()
        .from(customerPriceAgreements)
        .where(eq(customerPriceAgreements.customerId, body.customerId))
        .orderBy(desc(customerPriceAgreements.effectiveFrom))
        .limit(1);
      if (priceRow) {
        defaultUnitPricePaise = priceRow.pricePerJarPaise;
      }
    }
    const finalUnitPricePaise = defaultUnitPricePaise || 3500;

    const result = await createAndPostInvoice({
      customerId: body.customerId,
      orderId: body.orderId,
      billingType: body.billingType || "SPOT_DELIVERY",
      lines: body.lines || [
        {
          description: body.description || "20-Litre Water Jar Delivery",
          quantity: Number(body.quantity || 1),
          unitPricePaise: finalUnitPricePaise,
        },
      ],
      postedBy: body.postedBy || "usr_owner_01",
      notes: body.notes,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to create invoice" }, { status: 400 });
  }
}
