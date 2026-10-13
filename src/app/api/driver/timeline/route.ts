import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { orders, customers, customerAddresses, jarMovementEvents, jarMasters, cashCollectionSubmissions } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const db = getDb();
    const url = new URL(request.url);
    const driverId = url.searchParams.get("driverId") || "usr_driver_01";
    const dateParam = url.searchParams.get("date") || new Date().toISOString().split("T")[0];

    // 1. Fetch Orders for the day
    const dayOrders = await db
      .select({
        orderId: orders.id,
        orderNumber: orders.orderNumber,
        scheduledDate: orders.scheduledDate,
        quantityJars: orders.quantityJars,
        totalAmountPaise: orders.totalAmountPaise,
        status: orders.status,
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
      .where(eq(orders.scheduledDate, dateParam))
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

    // 3. Fetch Cash collections for the day
    const cashEvents = await db
      .select()
      .from(cashCollectionSubmissions)
      .where(eq(cashCollectionSubmissions.driverId, driverId));

    const customerCashMap: Record<string, number> = {};
    for (const c of cashEvents) {
      customerCashMap[c.customerId] = (customerCashMap[c.customerId] || 0) + c.amountCollectedPaise;
    }

    // 4. Construct Timeline items
    let totalJars = 0;
    let totalCashCollectedPaise = 0;

    const timeline = dayOrders.map((o: any) => {
      const deliveredJars = orderJarsMap[o.orderId] || [];
      const jarsCount = o.quantityJars || deliveredJars.length;
      totalJars += jarsCount;

      const cashCollected = customerCashMap[o.customerId] || 0;
      totalCashCollectedPaise += cashCollected;

      const dateObj = new Date(o.createdAt);
      const formattedTime = dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

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

    return NextResponse.json({
      success: true,
      driverId,
      date: dateParam,
      totalDeliveries: dayOrders.length,
      totalJars,
      totalCashCollectedPaise,
      timeline,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
