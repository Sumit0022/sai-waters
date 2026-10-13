import { NextResponse } from "next/server";
import { getDb, ensureDatabaseReady } from "@/db";
import {
  customers,
  customerAddresses,
  customerPriceAgreements,
  recurringSchedules,
  orders,
  invoices,
  receipts,
  jarMovementEvents,
  jarMasters,
} from "@/db/schema";
import { eq, desc, and, or, sql } from "drizzle-orm";

export async function GET(request: Request) {
  await ensureDatabaseReady();
  const db = getDb();
  const url = new URL(request.url);
  const rawQuery = url.searchParams.get("customerId") || url.searchParams.get("code") || url.searchParams.get("q");

  // If a specific customer is requested (by id, code like CUST-001, urn token, or phone)
  if (rawQuery) {
    const clean = rawQuery.replace("urn:sw:c:", "").trim();
    const [cust] = await db
      .select()
      .from(customers)
      .where(
        or(
          eq(customers.id, clean),
          eq(customers.customerCode, clean),
          eq(customers.phone, clean),
          sql`LOWER(${customers.customerCode}) = LOWER(${clean})`,
          sql`LOWER(${customers.id}) = LOWER(${clean})`
        )
      );

    if (!cust) {
      return NextResponse.json(
        { error: `Customer '${clean}' not found in recurring records` },
        { status: 404 }
      );
    }

    const addresses = await db
      .select()
      .from(customerAddresses)
      .where(eq(customerAddresses.customerId, cust.id));
    const priceAgreement = await db
      .select()
      .from(customerPriceAgreements)
      .where(eq(customerPriceAgreements.customerId, cust.id))
      .limit(1);
    const schedule = await db
      .select()
      .from(recurringSchedules)
      .where(eq(recurringSchedules.customerId, cust.id))
      .limit(1);

    // Fetch delivery history (from orders)
    const deliveryOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.customerId, cust.id))
      .orderBy(desc(orders.scheduledDate), desc(orders.createdAt));

    // Fetch customer invoices
    const customerInvoices = await db
      .select()
      .from(invoices)
      .where(eq(invoices.customerId, cust.id))
      .orderBy(desc(invoices.invoiceDate));

    // Fetch receipts
    const customerReceipts = await db
      .select()
      .from(receipts)
      .where(eq(receipts.customerId, cust.id))
      .orderBy(desc(receipts.receiptDate));

    // QR Token for this customer
    const qrToken = `urn:sw:c:${cust.customerCode}`;

    return NextResponse.json({
      success: true,
      customer: {
        ...cust,
        qrToken,
        address: addresses[0] || null,
        customPrice: priceAgreement[0] || null,
        schedule: schedule[0] || null,
      },
      deliveries: deliveryOrders,
      invoices: customerInvoices,
      receipts: customerReceipts,
    });
  }

  // Otherwise return all recurring customers list
  const allCustomers = await db.select().from(customers).orderBy(desc(customers.createdAt));
  const allAddresses = await db.select().from(customerAddresses);
  const allPrices = await db.select().from(customerPriceAgreements);
  const allSchedules = await db.select().from(recurringSchedules);

  const enriched = allCustomers.map((c: any) => ({
    ...c,
    qrToken: `urn:sw:c:${c.customerCode}`,
    address: allAddresses.find((a: any) => a.customerId === c.id) || null,
    addresses: allAddresses.filter((a: any) => a.customerId === c.id),
    customPrice: allPrices.find((p: any) => p.customerId === c.id),
    schedule: allSchedules.find((s: any) => s.customerId === c.id),
  }));

  return NextResponse.json({ customers: enriched });
}

export async function POST(request: Request) {
  await ensureDatabaseReady();
  const db = getDb();
  const body = await request.json();

  const countRes = await db.select().from(customers);
  const nextNum = countRes.length + 1;
  const customerCode = body.customerCode || `CUST-${String(nextNum).padStart(3, "0")}`;
  const customerId = `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  // 1. Insert Customer Master
  await db.insert(customers).values({
    id: customerId,
    customerCode,
    fullName: body.fullName,
    phone: body.phone,
    email: body.email || null,
    customerType: "RESIDENTIAL", // All recurring customers
    billingFrequency: "MONTHLY",
    heldJarsCount: 0,
    currentBalancePaise: 0,
    isActive: true,
  });

  // 2. Insert Default Address
  const addressId = `addr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  await db.insert(customerAddresses).values({
    id: addressId,
    customerId,
    label: body.addressLabel || "Main Address",
    streetAddress: body.streetAddress || "Street Address",
    locality: body.locality || "Civil Lines",
    city: body.city || "Bareilly",
    pincode: body.pincode || "243001",
    deliveryInstructions: body.deliveryInstructions || null,
    isDefault: true,
  });

  // 3. Optional Special Price Agreement (defaults to ₹35/jar if omitted)
  const pricePaise = body.specialPricePerJarPaise ? Number(body.specialPricePerJarPaise) : 3500;
  await db.insert(customerPriceAgreements).values({
    id: `cpa_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    customerId,
    pricePerJarPaise: pricePaise,
    notes: body.priceNotes || "Allotted jar delivery rate",
  });

  // 4. Daily Recurring Schedule
  const recurringQty = Number(body.recurringQuantity || 1);
  await db.insert(recurringSchedules).values({
    id: `sch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    customerId,
    addressId,
    daysOfWeek: body.recurringDays || "1,2,3,4,5,6,7",
    quantityJars: recurringQty,
    isPaused: false,
  });

  return NextResponse.json({
    success: true,
    customerId,
    customerCode,
    qrToken: `urn:sw:c:${customerCode}`,
  });
}

export async function PUT(request: Request) {
  const db = getDb();
  const body = await request.json();
  const { customerId } = body;

  if (!customerId) {
    return NextResponse.json({ error: "Missing customerId" }, { status: 400 });
  }

  // 1. Update Customer Master
  await db
    .update(customers)
    .set({
      fullName: body.fullName,
      phone: body.phone,
      email: body.email || null,
    })
    .where(eq(customers.id, customerId));

  // 2. Update Address if provided
  if (body.streetAddress || body.locality) {
    const existingAddr = await db.select().from(customerAddresses).where(eq(customerAddresses.customerId, customerId));
    if (existingAddr.length > 0) {
      await db
        .update(customerAddresses)
        .set({
          streetAddress: body.streetAddress || existingAddr[0].streetAddress,
          locality: body.locality || existingAddr[0].locality,
        })
        .where(eq(customerAddresses.id, existingAddr[0].id));
    }
  }

  // 3. Update Price Agreement
  if (body.specialPricePerJarPaise !== undefined) {
    const existingPrice = await db.select().from(customerPriceAgreements).where(eq(customerPriceAgreements.customerId, customerId));
    const pricePaise = Number(body.specialPricePerJarPaise);
    if (existingPrice.length > 0) {
      await db
        .update(customerPriceAgreements)
        .set({ pricePerJarPaise: pricePaise })
        .where(eq(customerPriceAgreements.id, existingPrice[0].id));
    } else {
      await db.insert(customerPriceAgreements).values({
        id: `cpa_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        customerId,
        pricePerJarPaise: pricePaise,
        notes: "Updated price rate",
      });
    }
  }

  // 4. Update Recurring Daily Quantity
  if (body.recurringQuantity !== undefined) {
    const existingSch = await db.select().from(recurringSchedules).where(eq(recurringSchedules.customerId, customerId));
    if (existingSch.length > 0) {
      await db
        .update(recurringSchedules)
        .set({ quantityJars: Number(body.recurringQuantity) })
        .where(eq(recurringSchedules.id, existingSch[0].id));
    }
  }

  return NextResponse.json({ success: true, message: "Customer updated successfully" });
}
