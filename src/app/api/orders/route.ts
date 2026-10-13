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
  receipts,
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
    const advanceReceivedPaise = meta?.advanceReceivedPaise || 0;
    const balanceDuePaise =
      meta?.balanceDuePaise !== undefined
        ? meta.balanceDuePaise
        : Math.max(0, o.totalAmountPaise - advanceReceivedPaise);

    return {
      ...o,
      dispatchedJars: meta?.dispatchedJars || [],
      assignedDriverId: meta?.driverId || null,
      assignedDriverName: meta?.driverName || null,
      vehicleNumber: meta?.vehicleNumber || null,
      undeliveredJars: meta?.undeliveredJars || [],
      deliveredCount: meta?.deliveredCount ?? o.quantityJars,
      settledAt: meta?.settledAt || null,
      paymentType: meta?.paymentType || "PAY_ON_DELIVERY",
      advanceReceivedPaise,
      balanceDuePaise,
      cashCollectedPaise: meta?.cashCollectedPaise || 0,
    };
  });

  return NextResponse.json({ orders: enriched });
}

export async function POST(request: Request) {
  try {
    await ensureDatabaseReady();
    const db = getDb();
    const body = await request.json();

    let customerId = body.customerId;
    let addressId = body.addressId;

    // Handle Custom Customer (Ad-hoc Event / Bulk Customer)
    if (!customerId && body.customCustomerName) {
      const cleanPhone = (body.customCustomerPhone || "").trim();
      let existingCust: any = null;

      if (cleanPhone) {
        const found = await db.select().from(customers).where(eq(customers.phone, cleanPhone)).limit(1);
        if (found.length > 0) {
          existingCust = found[0];
        }
      }

      if (existingCust) {
        customerId = existingCust.id;
        const addrs = await db.select().from(customerAddresses).where(eq(customerAddresses.customerId, customerId)).limit(1);
        if (addrs.length > 0) {
          addressId = addrs[0].id;
        }
      } else {
        customerId = `cust_evt_${Date.now()}`;
        const allCusts = await db.select({ code: customers.customerCode }).from(customers);
        const existingCodes = new Set(allCusts.map((c: any) => c.code));
        let seq = allCusts.length + 1;
        let custCode = `EVT-${String(seq).padStart(3, "0")}`;
        while (existingCodes.has(custCode)) {
          seq++;
          custCode = `EVT-${String(seq).padStart(3, "0")}`;
        }

        const validPhone = cleanPhone || `98${Date.now().toString().slice(-8)}`;

        await db.insert(customers).values({
          id: customerId,
          customerCode: custCode,
          fullName: body.customCustomerName,
          phone: validPhone,
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
    }

    // Generate unique collision-proof orderNumber
    const allOrders = await db.select({ num: orders.orderNumber }).from(orders);
    const existingOrderNums = new Set(allOrders.map((o: any) => o.num));
    const todayCompact = getTodayIST().replace(/-/g, "");
    let orderSeq = 1;
    let orderNumber = body.orderNumber || `ORD-${todayCompact}-${String(orderSeq).padStart(2, "0")}`;
    while (existingOrderNums.has(orderNumber)) {
      orderSeq++;
      orderNumber = `ORD-${todayCompact}-${String(orderSeq).padStart(2, "0")}`;
    }
    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const agreements = customerId
      ? await db
          .select()
          .from(customerPriceAgreements)
          .where(eq(customerPriceAgreements.customerId, customerId))
          .orderBy(desc(customerPriceAgreements.effectiveFrom))
          .limit(1)
      : [];

    const unitPricePaise = body.unitPricePaise || agreements[0]?.pricePerJarPaise || 2000;
    const quantityJars = Number(body.quantityJars || 1);
    const totalAmountPaise = quantityJars * unitPricePaise;

    // Ensure customer price agreement is saved so customer ledger reflects exact rate
    if (customerId && unitPricePaise) {
      const existingPrice = await db
        .select()
        .from(customerPriceAgreements)
        .where(eq(customerPriceAgreements.customerId, customerId))
        .limit(1);
      if (existingPrice.length === 0) {
        await db.insert(customerPriceAgreements).values({
          id: `cpa_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          customerId,
          pricePerJarPaise: unitPricePaise,
          effectiveFrom: new Date(),
        });
      }
    }

    // Payment Type & Advance Logic
    const paymentType = body.paymentType || "PAY_ON_DELIVERY"; // "PREPAID" | "PARTIAL_ADVANCE" | "PAY_ON_DELIVERY"
    const advancePaymentMode = body.advancePaymentMode === "BANK" || body.advancePaymentMode === "UPI" ? "BANK" : "CASH";
    let advanceReceivedPaise = 0;
    if (paymentType === "PREPAID") {
      advanceReceivedPaise = totalAmountPaise;
    } else if (paymentType === "PARTIAL_ADVANCE") {
      advanceReceivedPaise = Math.min(totalAmountPaise, Number(body.advanceReceivedPaise || 0));
    }
    const balanceDuePaise = Math.max(0, totalAmountPaise - advanceReceivedPaise);
    const depositAmountPaise = Number(body.depositAmountPaise || 0);

    const initialDeliveryMeta = {
      paymentType,
      advanceReceivedPaise,
      advancePaymentMode,
      balanceDuePaise,
      depositAmountPaise,
      bookedAt: new Date().toISOString(),
      notes: body.deliveryNotes || null,
    };

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
      deliveryNotes: JSON.stringify(initialDeliveryMeta),
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

    // 4. AUTO JOURNAL ENTRY: Generate Commercial Invoice & Record Sales Revenue
    let invoiceData: any = null;
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

      // If advance payment was made at booking
      if (advanceReceivedPaise > 0 && invoiceData?.invoiceId) {
        await db
          .update(invoices)
          .set({
            paidAmountPaise: advanceReceivedPaise,
            status: advanceReceivedPaise >= totalAmountPaise ? "PAID" : "PARTIALLY_PAID",
          })
          .where(eq(invoices.id, invoiceData.invoiceId));

        // Create official receipt for advance
        await db.insert(receipts).values({
          id: `rec_adv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          receiptNumber: `REC-ADV-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`,
          customerId,
          invoiceId: invoiceData.invoiceId,
          amountPaise: advanceReceivedPaise,
          paymentMode: advancePaymentMode === "BANK" ? "UPI_MANUAL" : "CASH",
          transactionReference: `Advance payment for order ${orderNumber} (${paymentType} via ${advancePaymentMode})`,
          recordedBy: body.postedBy || "usr_owner_01",
          receiptDate: body.scheduledDate || getTodayIST(),
        });

        // Double-entry journal entry for advance receipt:
        // Dr. 1110 Vault Cash OR 1130 Bank Account
        // Cr. 1150 Accounts Receivable (Customer Sub-ledger)
        await postJournalEntry({
          sourceDocumentType: "RECEIPT",
          sourceDocumentId: invoiceData.invoiceId,
          narration: `Advance payment received via ${advancePaymentMode} for order ${orderNumber}`,
          postedBy: body.postedBy || "usr_owner_01",
          lines: [
            {
              accountId: advancePaymentMode === "BANK" ? 1130 : 1110,
              debitPaise: advanceReceivedPaise,
              creditPaise: 0,
            },
            {
              accountId: 1150, // Accounts Receivable
              debitPaise: 0,
              creditPaise: advanceReceivedPaise,
              subLedgerType: "CUSTOMER",
              subLedgerId: customerId,
            },
          ],
        });

        // Reduce customer current balance by advance amount
        await db.execute(sql`
          UPDATE customers SET current_balance_paise = GREATEST(0, current_balance_paise - ${advanceReceivedPaise}) WHERE id = ${customerId};
        `);
      }

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
      paymentType,
      advanceReceivedPaise,
      balanceDuePaise,
      invoiceNumber: invoiceData?.invoiceNumber,
    });
  } catch (err: any) {
    console.error("Failed to create order:", err);
    return NextResponse.json({ error: err.message || "Failed to create order" }, { status: 500 });
  }
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

    let existingMeta: any = {};
    if (order.deliveryNotes) {
      try {
        existingMeta = JSON.parse(order.deliveryNotes);
      } catch (e) {
        existingMeta = { notes: order.deliveryNotes };
      }
    }

    const updatedPaymentType = body.paymentType || existingMeta.paymentType || "PAY_ON_DELIVERY";
    let updatedAdvancePaise = existingMeta.advanceReceivedPaise || 0;
    if (body.paymentType === "PREPAID") {
      updatedAdvancePaise = newTotalPaise;
    } else if (body.advanceReceivedPaise !== undefined) {
      updatedAdvancePaise = Math.min(newTotalPaise, Number(body.advanceReceivedPaise));
    } else if (updatedPaymentType === "PREPAID") {
      updatedAdvancePaise = newTotalPaise;
    }
    const updatedBalanceDuePaise = Math.max(0, newTotalPaise - updatedAdvancePaise);

    const updatedMeta = {
      ...existingMeta,
      paymentType: updatedPaymentType,
      advanceReceivedPaise: updatedAdvancePaise,
      balanceDuePaise: updatedBalanceDuePaise,
      notes: body.deliveryNotes !== undefined ? body.deliveryNotes : existingMeta.notes,
    };

    // 1. Update order record
    await db
      .update(orders)
      .set({
        quantityJars: newQty,
        unitPricePaise: newUnitPricePaise,
        totalAmountPaise: newTotalPaise,
        scheduledDate: body.scheduledDate || order.scheduledDate,
        status: body.status || order.status,
        deliveryNotes: JSON.stringify(updatedMeta),
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

    // Sync customerPriceAgreements so customer directory & ledger reflects updated rate
    if (order.customerId && newUnitPricePaise) {
      const existingAgreements = await db
        .select()
        .from(customerPriceAgreements)
        .where(eq(customerPriceAgreements.customerId, order.customerId))
        .limit(1);
      if (existingAgreements.length > 0) {
        await db
          .update(customerPriceAgreements)
          .set({ pricePerJarPaise: newUnitPricePaise })
          .where(eq(customerPriceAgreements.customerId, order.customerId));
      } else {
        await db.insert(customerPriceAgreements).values({
          id: `cpa_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          customerId: order.customerId,
          pricePerJarPaise: newUnitPricePaise,
          effectiveFrom: new Date(),
        });
      }
    }

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
      const invStatus =
        updatedAdvancePaise >= newTotalPaise ? "PAID" : updatedAdvancePaise > 0 ? "PARTIALLY_PAID" : "ISSUED";
      await db
        .update(invoices)
        .set({
          totalAmountPaise: newTotalPaise,
          subtotalPaise: newTotalPaise,
          paidAmountPaise: updatedAdvancePaise,
          status: invStatus,
        })
        .where(eq(invoices.id, inv.id));
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
