import { NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  orders,
  customers,
  customerAddresses,
  jarMovementEvents,
  jarMasters,
  cashCollectionSubmissions,
  receipts,
} from "@/db/schema";
import { eq, desc, and, or, sql } from "drizzle-orm";
import { formatTimeIST, getTodayIST } from "@/lib/date-utils";

export async function GET(request: Request) {
  try {
    const db = getDb();
    const url = new URL(request.url);
    const driverId = url.searchParams.get("driverId") || "usr_driver_01";
    const dateParam = url.searchParams.get("date") || getTodayIST();

    // 1. Fetch Orders for the day (both scheduled for today or created today)
    const dayOrders = await db
      .select({
        orderId: orders.id,
        orderNumber: orders.orderNumber,
        scheduledDate: orders.scheduledDate,
        quantityJars: orders.quantityJars,
        totalAmountPaise: orders.totalAmountPaise,
        status: orders.status,
        deliveryNotes: orders.deliveryNotes,
        createdAt: orders.createdAt,
        customerId: customers.id,
        customerName: customers.fullName,
        customerCode: customers.customerCode,
        streetAddress: customerAddresses.streetAddress,
        locality: customerAddresses.locality,
      })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .leftJoin(customerAddresses, eq(orders.addressId, customerAddresses.id))
      .where(
        or(
          eq(orders.scheduledDate, dateParam),
          sql`TO_CHAR(${orders.createdAt} AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') = ${dateParam}`
        )
      )
      .orderBy(desc(orders.createdAt));

    // 2. Fetch Jar Movements for these orders
    const movements = await db
      .select({
        orderId: jarMovementEvents.orderId,
        jarCode: jarMasters.permanentJarCode,
        time: jarMovementEvents.createdAt,
      })
      .from(jarMovementEvents)
      .innerJoin(jarMasters, eq(jarMovementEvents.jarId, jarMasters.id))
      .where(eq(jarMovementEvents.toStatus, "DELIVERED_CUSTOMER"));

    // Map jars to orders
    const orderJarsMap: Record<string, string[]> = {};
    for (const m of movements) {
      if (m.orderId) {
        if (!orderJarsMap[m.orderId]) orderJarsMap[m.orderId] = [];
        orderJarsMap[m.orderId].push(m.jarCode);
      }
    }

    // 3. Fetch Cash collections for the driver
    const cashEvents = await db
      .select()
      .from(cashCollectionSubmissions)
      .where(eq(cashCollectionSubmissions.driverId, driverId));

    const orderCashMap: Record<string, number> = {};
    for (const c of cashEvents) {
      if (c.orderId) {
        orderCashMap[c.orderId] = (orderCashMap[c.orderId] || 0) + c.amountCollectedPaise;
      }
    }

    // Also fetch receipts recorded by this driver on this date
    const driverReceipts = await db
      .select()
      .from(receipts)
      .where(and(eq(receipts.recordedBy, driverId), eq(receipts.receiptDate, dateParam)));

    const customerReceiptMap: Record<string, number> = {};
    for (const r of driverReceipts) {
      customerReceiptMap[r.customerId] = (customerReceiptMap[r.customerId] || 0) + r.amountPaise;
    }

    // 4. Construct Timeline items
    let totalJars = 0;
    let totalCashCollectedPaise = 0;

    const timeline = dayOrders.map((o: any) => {
      const deliveredJars = orderJarsMap[o.orderId] || [];
      const jarsCount = o.quantityJars || deliveredJars.length;
      totalJars += jarsCount;

      let meta: any = null;
      if (o.deliveryNotes) {
        try {
          meta = JSON.parse(o.deliveryNotes);
        } catch (e) {}
      }

      // Check cash collection:
      // Priority 1: cashCollectionSubmissions by orderId
      // Priority 2: cashCollectedPaise in order's deliveryNotes metadata
      // Priority 3: receipts recorded on dateParam for this customer
      let cashCollected = orderCashMap[o.orderId] || 0;
      if (cashCollected === 0 && meta?.cashCollectedPaise) {
        cashCollected = Number(meta.cashCollectedPaise);
      }
      if (cashCollected === 0 && customerReceiptMap[o.customerId]) {
        cashCollected = customerReceiptMap[o.customerId];
      }

      totalCashCollectedPaise += cashCollected;
      const formattedTime = formatTimeIST(o.createdAt);

      return {
        orderId: o.orderId,
        orderNumber: o.orderNumber,
        time: formattedTime,
        timestamp: o.createdAt,
        customerName: o.customerName,
        customerCode: o.customerCode,
        address: `${o.streetAddress || ""}, ${o.locality || ""}`.trim().replace(/^,|,$/g, ""),
        quantityJars: jarsCount,
        jarCodes: deliveredJars,
        totalAmountPaise: o.totalAmountPaise,
        cashCollectedPaise: cashCollected,
        status: o.status,
      };
    });

    // Check today's total from cash submissions
    const todaySubmissionsTotal = cashEvents
      .filter((c: any) => {
        if (!c.collectedAt) return false;
        try {
          return (
            new Intl.DateTimeFormat("en-CA", {
              timeZone: "Asia/Kolkata",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            }).format(new Date(c.collectedAt)) === dateParam
          );
        } catch (e) {
          return false;
        }
      })
      .reduce((s: number, c: any) => s + (c.amountCollectedPaise || 0), 0);

    const finalTotalCash = Math.max(totalCashCollectedPaise, todaySubmissionsTotal);

    return NextResponse.json({
      success: true,
      driverId,
      date: dateParam,
      totalDeliveries: dayOrders.length,
      totalJars,
      totalCashCollectedPaise: finalTotalCash,
      timeline,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
