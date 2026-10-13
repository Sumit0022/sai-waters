import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { orders, customers, customerAddresses, orderItems, eventOrders, customerPriceAgreements } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { createAndPostInvoice } from "@/lib/billing";
import { postJournalEntry } from "@/lib/accounting";
import { getTodayIST } from "@/lib/date-utils";

export async function GET(request: Request) {
  const db = getDb();
  const url = new URL(request.url);
  const dateFilter = url.searchParams.get("date");

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
      customerId: customers.id,
      customerName: customers.fullName,
      customerPhone: customers.phone,
      customerCode: customers.customerCode,
      streetAddress: customerAddresses.streetAddress,
      locality: customerAddresses.locality,
      city: customerAddresses.city,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .innerJoin(customerAddresses, eq(orders.addressId, customerAddresses.id))
    .orderBy(desc(orders.scheduledDate), desc(orders.createdAt));

  const allOrders = await query;
  const filtered = dateFilter ? allOrders.filter((o: any) => o.scheduledDate === dateFilter) : allOrders;

  return NextResponse.json({ orders: filtered });
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
