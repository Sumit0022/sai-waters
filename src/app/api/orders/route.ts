import { NextResponse } from "next/server";
import { getDb, ensureDatabaseReady } from "@/db";
import {
  orders,
  customers,
  customerAddresses,
  orderItems,
  eventOrders,
  customerPriceAgreements,
  invoices,
  invoiceLines,
  dispatchRecords,
  journalEntries,
  journalLines,
  jarMovementEvents,
  damageLossCases,
} from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { createAndPostInvoice } from "@/lib/billing";
import { postJournalEntry } from "@/lib/accounting";
import { getTodayIST } from "@/lib/date-utils";
import { lookupJar, transitionJarState } from "@/lib/jars";

export async function GET(request: Request) {
  const db = getDb();
  const url = new URL(request.url);
  const dateFilter = url.searchParams.get("date");
  const typeFilter = url.searchParams.get("type"); // e.g. "ONE_TIME_EVENT"
  const onlyBulk = url.searchParams.get("bulk") === "true";

  const query = db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      orderType: orders.orderType,
      scheduledDate: orders.scheduledDate,
      quantityJars: orders.quantityJars,
      unitPricePaise: orders.unitPricePaise,
      totalAmountPaise: orders.totalAmountPaise,
      status: orders.status,
      deliveryNotes: orders.deliveryNotes,
      createdAt: orders.createdAt,
      customerId: customers.id,
      customerName: customers.fullName,
      customerPhone: customers.phone,
      customerCode: customers.customerCode,
      streetAddress: customerAddresses.streetAddress,
      locality: customerAddresses.locality,
      city: customerAddresses.city,
      eventName: eventOrders.eventName,
      venueContactPerson: eventOrders.venueContactPerson,
      venueContactPhone: eventOrders.venueContactPhone,
      depositAmountPaise: eventOrders.depositAmountPaise,
      depositStatus: eventOrders.depositStatus,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .innerJoin(customerAddresses, eq(orders.addressId, customerAddresses.id))
    .leftJoin(eventOrders, eq(orders.id, eventOrders.orderId))
    .orderBy(desc(orders.scheduledDate), desc(orders.createdAt));

  const allOrders = await query;
  let filtered = allOrders;

  if (dateFilter) {
    filtered = filtered.filter((o: any) => o.scheduledDate === dateFilter);
  }

  if (typeFilter) {
    filtered = filtered.filter((o: any) => o.orderType === typeFilter);
  } else if (onlyBulk) {
    filtered = filtered.filter((o: any) => o.orderType !== "RECURRING");
  }

  const enriched = filtered.map((o: any) => {
    let meta: any = null;
    if (o.deliveryNotes) {
      try {
        meta = JSON.parse(o.deliveryNotes);
      } catch (e) {}
    }
    return {
      ...o,
      dispatchedJars: meta?.dispatchedJars || [],
      assignedDriverId: meta?.driverId || null,
      assignedDriverName: meta?.driverName || null,
      vehicleNumber: meta?.vehicleNumber || null,
      undeliveredJars: meta?.undeliveredJars || [],
      deliveredCount: meta?.deliveredCount ?? o.quantityJars,
      settledAt: meta?.settledAt || null,
    };
  });

  return NextResponse.json({ orders: enriched });
}

export async function POST(request: Request) {
  const db = getDb();
  const body = await request.json();

  let customerId = body.customerId;
  let addressId = body.addressId;

  // By Default: Custom Customer (Ad-hoc Event / Bulk Customer)
  if (!customerId && body.customCustomerName) {
    customerId = `cust_evt_${Date.now()}`;
    const custCount = await db.select().from(customers);
    const custCode = `EVT-${String(custCount.length + 1).padStart(3, "0")}`;

    await db.insert(customers).values({
      id: customerId,
      customerCode: custCode,
      fullName: body.customCustomerName,
      phone: body.customCustomerPhone || "9876543210",
      customerType: "EVENT",
      billingFrequency: "PER_DELIVERY",
      heldJarsCount: 0,
      currentBalancePaise: 0,
      isActive: true,
    });

    addressId = `addr_evt_${Date.now()}`;
    await db.insert(customerAddresses).values({
      id: addressId,
      customerId,
      label: "Event Venue",
      streetAddress: body.venueAddress || "Event Venue Address",
      locality: body.locality || "Bareilly",
      city: "Bareilly",
      pincode: "243001",
      isDefault: true,
    });
  }

  const countRes = await db.select().from(orders);
  const nextNum = countRes.length + 1;
  const todayCompact = getTodayIST().replace(/-/g, "");
  const orderNumber = body.orderNumber || `ORD-${todayCompact}-${String(nextNum).padStart(2, "0")}`;
  const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const agreements = await db
    .select()
    .from(customerPriceAgreements)
    .where(eq(customerPriceAgreements.customerId, customerId))
    .orderBy(desc(customerPriceAgreements.effectiveFrom))
    .limit(1);

  const unitPricePaise = body.unitPricePaise || agreements[0]?.pricePerJarPaise || 3500;
  const quantityJars = Number(body.quantityJars || 1);
  const totalAmountPaise = quantityJars * unitPricePaise;

  // 1. Insert Order Record
  await db.insert(orders).values({
    id: orderId,
    orderNumber,
    customerId,
    addressId: addressId || "addr_default",
    orderType: body.orderType || "ONE_TIME_EVENT",
    scheduledDate: body.scheduledDate || getTodayIST(),
    quantityJars,
    unitPricePaise,
    totalAmountPaise,
    status: "CONFIRMED",
    deliveryNotes: body.deliveryNotes || null,
  });

  // 2. Insert Order Item
  await db.insert(orderItems).values({
    id: `oit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    orderId,
    itemDescription: `20L Drinking Water Jars (${quantityJars} Units)`,
    quantity: quantityJars,
    unitPricePaise,
    lineTotalPaise: totalAmountPaise,
  });

  // 3. If Event Order, insert Event Details
  const depositAmountPaise = Number(body.depositAmountPaise || 0);
  if (body.orderType === "ONE_TIME_EVENT" || body.eventName) {
    await db.insert(eventOrders).values({
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      orderId,
      eventName: body.eventName || "Bulk Function / Gathering",
      venueContactPerson: body.venueContactPerson || body.customCustomerName || "Contact Person",
      venueContactPhone: body.venueContactPhone || body.customCustomerPhone || "0000000000",
      eventDate: body.scheduledDate || getTodayIST(),
      depositAmountPaise,
      depositStatus: depositAmountPaise > 0 ? "PAID" : "PENDING",
    });
  }

  // 4. AUTO JOURNAL ENTRY: Generate Commercial Invoice & Record Sales Revenue in General Ledger
  let invoiceData = null;
  try {
    invoiceData = await createAndPostInvoice({
      customerId,
      orderId,
      billingType: body.orderType === "ONE_TIME_EVENT" ? "EVENT_SETTLEMENT" : "SPOT_DELIVERY",
      lines: [
        {
          description: `20L Drinking Water Jars (${quantityJars} Units)`,
          quantity: quantityJars,
          unitPricePaise,
        },
      ],
      postedBy: body.postedBy || "usr_owner_01",
      notes: `Auto-posted invoice for order ${orderNumber}`,
    });

    // If advance security deposit collected
    if (depositAmountPaise > 0) {
      await postJournalEntry({
        sourceDocumentType: "RECEIPT",
        sourceDocumentId: orderId,
        narration: `Security Deposit for ${quantityJars} jars against ${orderNumber}`,
        postedBy: body.postedBy || "usr_owner_01",
        lines: [
          {
            accountId: 1110, // Vault Cash
            debitPaise: depositAmountPaise,
            creditPaise: 0,
          },
          {
            accountId: 2110, // Customer Jar Deposits
            debitPaise: 0,
            creditPaise: depositAmountPaise,
            subLedgerType: "CUSTOMER",
            subLedgerId: customerId,
          },
        ],
      });
    }
  } catch (err: any) {
    console.error("Auto journal entry for order failed:", err);
  }

  return NextResponse.json({
    success: true,
    orderId,
    orderNumber,
    totalAmountPaise,
    invoiceNumber: (invoiceData as any)?.invoiceNumber,
  });
}

// PUT: Edit order (quantity, rate per jar, event name, address, date, notes)
export async function PUT(request: Request) {
  try {
    await ensureDatabaseReady();
    const db = getDb();
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: "Missing required field: orderId" }, { status: 400 });
    }

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) {
      return NextResponse.json({ error: `Order '${orderId}' not found` }, { status: 404 });
    }

    const newQty = body.quantityJars !== undefined ? Number(body.quantityJars) : order.quantityJars;
    const newUnitPricePaise = body.unitPricePaise !== undefined ? Number(body.unitPricePaise) : order.unitPricePaise;
    const newTotalPaise = newQty * newUnitPricePaise;

    // 1. Update order record
    await db
      .update(orders)
      .set({
        quantityJars: newQty,
        unitPricePaise: newUnitPricePaise,
        totalAmountPaise: newTotalPaise,
        scheduledDate: body.scheduledDate || order.scheduledDate,
        status: body.status || order.status,
        deliveryNotes: body.deliveryNotes !== undefined ? body.deliveryNotes : order.deliveryNotes,
      })
      .where(eq(orders.id, orderId));

    // 2. Update orderItems
    await db
      .update(orderItems)
      .set({
        quantity: newQty,
        unitPricePaise: newUnitPricePaise,
        lineTotalPaise: newTotalPaise,
        itemDescription: `20L Drinking Water Jars (${newQty} Units)`,
      })
      .where(eq(orderItems.orderId, orderId));

    // 3. Update eventOrders if present
    const [evt] = await db.select().from(eventOrders).where(eq(eventOrders.orderId, orderId)).limit(1);
    if (evt) {
      await db
        .update(eventOrders)
        .set({
          eventName: body.eventName || evt.eventName,
          venueContactPerson: body.venueContactPerson || evt.venueContactPerson,
          venueContactPhone: body.venueContactPhone || evt.venueContactPhone,
          eventDate: body.scheduledDate || evt.eventDate,
        })
        .where(eq(eventOrders.orderId, orderId));
    }

    // 4. Update address if provided
    if (body.streetAddress && order.addressId) {
      await db
        .update(customerAddresses)
        .set({
          streetAddress: body.streetAddress,
          locality: body.locality || "Bareilly",
        })
        .where(eq(customerAddresses.id, order.addressId));
    }

    // 5. Update linked invoices & lines if present
    const linkedInvoices = await db.select().from(invoices).where(eq(invoices.orderId, orderId));
    for (const inv of linkedInvoices) {
      await db.update(invoices).set({ totalAmountPaise: newTotalPaise }).where(eq(invoices.id, inv.id));
      await db
        .update(invoiceLines)
        .set({
          quantity: newQty,
          unitPricePaise: newUnitPricePaise,
          lineTotalPaise: newTotalPaise,
        })
        .where(eq(invoiceLines.invoiceId, inv.id));
    }

    return NextResponse.json({
      success: true,
      message: "Order successfully updated",
      orderId,
      quantityJars: newQty,
      unitPricePaise: newUnitPricePaise,
      totalAmountPaise: newTotalPaise,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update order" }, { status: 500 });
  }
}

// DELETE: Delete order with cascading cleanup & jar release
export async function DELETE(request: Request) {
  try {
    await ensureDatabaseReady();
    const db = getDb();
    const url = new URL(request.url);
    const orderId = url.searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json({ error: "Missing required parameter: orderId" }, { status: 400 });
    }

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) {
      return NextResponse.json({ error: `Order '${orderId}' not found` }, { status: 404 });
    }

    // 1. Release any allocated or in-transit jars safely back to AVAILABLE plant stock
    if (order.deliveryNotes) {
      try {
        const meta = JSON.parse(order.deliveryNotes);
        const dispatched: string[] = meta.dispatchedJars || [];
        for (const code of dispatched) {
          const jar = await lookupJar(code);
          if (jar && (jar.currentStatus === "ALLOCATED" || jar.currentStatus === "IN_TRANSIT")) {
            await transitionJarState({
              jarId: jar.id,
              toStatus: "AVAILABLE",
              actorUserId: "usr_owner_01",
              notes: `Auto-released back to plant stock due to order deletion (${order.orderNumber})`,
            });
          }
        }
      } catch (e) {}
    }

    // 2. Clean up foreign key references
    await db.update(jarMovementEvents).set({ orderId: null }).where(eq(jarMovementEvents.orderId, orderId));
    await db.update(damageLossCases).set({ orderId: null }).where(eq(damageLossCases.orderId, orderId));
    await db.delete(dispatchRecords).where(eq(dispatchRecords.orderId, orderId));

    // 3. Clean up linked invoices and lines
    const linkedInvoices = await db.select().from(invoices).where(eq(invoices.orderId, orderId));
    for (const inv of linkedInvoices) {
      await db.delete(invoiceLines).where(eq(invoiceLines.invoiceId, inv.id));
      await db.delete(invoices).where(eq(invoices.id, inv.id));
    }

    // 4. Clean up journal entries linked to this order
    const linkedEntries = await db.select().from(journalEntries).where(eq(journalEntries.sourceDocumentId, orderId));
    for (const entry of linkedEntries) {
      await db.delete(journalLines).where(eq(journalLines.journalEntryId, entry.id));
      await db.delete(journalEntries).where(eq(journalEntries.id, entry.id));
    }

    // 5. Clean up event details & order items
    await db.delete(eventOrders).where(eq(eventOrders.orderId, orderId));
    await db.delete(orderItems).where(eq(orderItems.orderId, orderId));

    // 6. Delete order record itself
    await db.delete(orders).where(eq(orders.id, orderId));

    return NextResponse.json({
      success: true,
      message: `Order ${order.orderNumber} and all associated records permanently deleted`,
      deletedOrderId: orderId,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete order" }, { status: 500 });
  }
}
