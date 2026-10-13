import { NextResponse } from "next/server";
import { getDb, ensureDatabaseReady } from "@/db";
import {
  customers,
  customerAddresses,
  customerPriceAgreements,
  recurringSchedules,
  orders,
  invoices,
  invoiceLines,
  orderItems,
  eventOrders,
  dispatchRecords,
  receipts,
  cashCollectionSubmissions,
  damageLossCases,
  jarCustodies,
  jarMovementEvents,
  jarMasters,
  journalLines,
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
      .orderBy(desc(customerPriceAgreements.effectiveFrom))
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
    const pricePerJarPaise = priceAgreement[0]?.pricePerJarPaise ?? deliveryOrders[0]?.unitPricePaise ?? 2000;

    return NextResponse.json({
      success: true,
      customer: {
        ...cust,
        qrToken,
        address: addresses[0] || null,
        customPrice: priceAgreement[0] || null,
        priceAgreements: priceAgreement,
        pricePerJarPaise,
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
  const allPrices = await db
    .select()
    .from(customerPriceAgreements)
    .orderBy(desc(customerPriceAgreements.effectiveFrom));
  const allSchedules = await db.select().from(recurringSchedules);
  const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));

  const enriched = allCustomers.map((c: any) => {
    const custPrice = allPrices.find((p: any) => p.customerId === c.id);
    const custAgreements = allPrices.filter((p: any) => p.customerId === c.id);
    const custOrders = allOrders.filter((o: any) => o.customerId === c.id);
    const latestOrder = custOrders[0];
    const pricePerJarPaise = custPrice?.pricePerJarPaise ?? latestOrder?.unitPricePaise ?? 2000;

    return {
      ...c,
      qrToken: `urn:sw:c:${c.customerCode}`,
      address: allAddresses.find((a: any) => a.customerId === c.id) || null,
      addresses: allAddresses.filter((a: any) => a.customerId === c.id),
      customPrice: custPrice || null,
      priceAgreements: custAgreements,
      pricePerJarPaise,
      schedule: allSchedules.find((s: any) => s.customerId === c.id),
    };
  });

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

  // 3. Customer Price Agreement (allotted jar delivery rate)
  const pricePaise =
    body.specialPricePerJarPaise !== undefined &&
    body.specialPricePerJarPaise !== null &&
    !isNaN(Number(body.specialPricePerJarPaise))
      ? Number(body.specialPricePerJarPaise)
      : 3500;
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

  // 0. Handle Archive / Unarchive Action
  if (body.action === "ARCHIVE" || body.isActive === false) {
    await db.update(customers).set({ isActive: false }).where(eq(customers.id, customerId));
    return NextResponse.json({ success: true, message: "Customer archived successfully" });
  }
  if (body.action === "UNARCHIVE" || body.isActive === true) {
    await db.update(customers).set({ isActive: true }).where(eq(customers.id, customerId));
    return NextResponse.json({ success: true, message: "Customer restored successfully" });
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
    const existingPrice = await db
      .select()
      .from(customerPriceAgreements)
      .where(eq(customerPriceAgreements.customerId, customerId))
      .orderBy(desc(customerPriceAgreements.effectiveFrom));
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

export async function DELETE(request: Request) {
  try {
    await ensureDatabaseReady();
    const db = getDb();
    const url = new URL(request.url);
    let customerId = url.searchParams.get("customerId") || url.searchParams.get("id");
    if (!customerId) {
      try {
        const body = await request.json();
        customerId = body.customerId || body.id;
      } catch (e) {}
    }

    if (!customerId) {
      return NextResponse.json({ error: "Missing customerId parameter" }, { status: 400 });
    }

    const [cust] = await db.select().from(customers).where(eq(customers.id, customerId));
    if (!cust) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // 1. Relieve jars held in custody by this customer back to PLANT stock as AVAILABLE
    // First, find jar IDs held by customer to update their status in jarMasters
    const heldCustodies = await db
      .select({ jarId: jarCustodies.jarId })
      .from(jarCustodies)
      .where(eq(jarCustodies.customerId, customerId));

    if (heldCustodies.length > 0) {
      const jarIds = heldCustodies.map((c: { jarId: string }) => c.jarId);
      await db.execute(sql`
        UPDATE jar_masters 
        SET current_status = 'AVAILABLE' 
        WHERE id IN (${sql.join(jarIds, sql`, `)});
      `);
    }

    await db
      .update(jarCustodies)
      .set({
        custodyType: "PLANT",
        customerId: null,
        holderUserId: null,
        transferredAt: new Date(),
      })
      .where(eq(jarCustodies.customerId, customerId));

    // 2. Fetch customer's orders & invoices
    const customerOrders = await db.select({ id: orders.id }).from(orders).where(eq(orders.customerId, customerId));
    const orderIds = customerOrders.map((o: { id: string }) => o.id);

    const customerInvoices = await db.select({ id: invoices.id }).from(invoices).where(eq(invoices.customerId, customerId));
    const invoiceIds = customerInvoices.map((i: { id: string }) => i.id);

    // 3. Clean up order dependencies & cash collections linked to orders
    if (orderIds.length > 0) {
      await db.execute(sql`
        DELETE FROM cash_collection_submissions WHERE order_id IN (${sql.join(orderIds, sql`, `)});
      `);
      await db.execute(sql`
        UPDATE jar_movement_events SET order_id = NULL WHERE order_id IN (${sql.join(orderIds, sql`, `)});
      `);
      await db.execute(sql`
        DELETE FROM dispatch_records WHERE order_id IN (${sql.join(orderIds, sql`, `)});
      `);
      await db.execute(sql`
        DELETE FROM event_orders WHERE order_id IN (${sql.join(orderIds, sql`, `)});
      `);
      await db.execute(sql`
        DELETE FROM order_items WHERE order_id IN (${sql.join(orderIds, sql`, `)});
      `);
    }

    // 4. Delete invoice lines, invoice cash collections & invoices
    if (invoiceIds.length > 0) {
      await db.execute(sql`
        DELETE FROM cash_collection_submissions WHERE invoice_id IN (${sql.join(invoiceIds, sql`, `)});
      `);
      await db.execute(sql`
        DELETE FROM invoice_lines WHERE invoice_id IN (${sql.join(invoiceIds, sql`, `)});
      `);
    }
    await db.delete(invoices).where(eq(invoices.customerId, customerId));

    // 5. Delete receipts
    await db.delete(receipts).where(eq(receipts.customerId, customerId));

    // 6. Delete orders
    await db.delete(orders).where(eq(orders.customerId, customerId));

    // 7. Delete damage cases, schedules, price agreements, addresses
    await db.delete(damageLossCases).where(eq(damageLossCases.customerId, customerId));
    await db.delete(recurringSchedules).where(eq(recurringSchedules.customerId, customerId));
    await db.delete(customerPriceAgreements).where(eq(customerPriceAgreements.customerId, customerId));
    await db.delete(customerAddresses).where(eq(customerAddresses.customerId, customerId));

    // 8. Delete customer subledger journal lines
    await db.execute(sql`
      DELETE FROM journal_lines WHERE sub_ledger_type = 'CUSTOMER' AND sub_ledger_id = ${customerId};
    `);

    // 9. Delete customer master record
    await db.delete(customers).where(eq(customers.id, customerId));

    return NextResponse.json({
      success: true,
      message: `Customer ${cust.fullName} (${cust.customerCode}) and all associated records permanently deleted.`,
    });
  } catch (err: any) {
    console.error("Failed to delete customer:", err);
    return NextResponse.json({ error: err?.message || "Failed to delete customer" }, { status: 500 });
  }
}
