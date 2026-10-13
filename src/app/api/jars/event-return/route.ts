import { NextResponse } from "next/server";
import { getDb, ensureDatabaseReady } from "@/db";
import { orders, eventOrders, customers, jarMasters, jarCustodies, jarMovementEvents } from "@/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { transitionJarState } from "@/lib/jars";

export async function GET(req: Request) {
  try {
    await ensureDatabaseReady();
    const db = getDb();

    // Query all event orders
    const eventRows = await db
      .select({
        orderId: orders.id,
        orderNumber: orders.orderNumber,
        scheduledDate: orders.scheduledDate,
        quantityJars: orders.quantityJars,
        unitPricePaise: orders.unitPricePaise,
        totalAmountPaise: orders.totalAmountPaise,
        orderStatus: orders.status,
        deliveryNotes: orders.deliveryNotes,
        customerId: customers.id,
        customerName: customers.fullName,
        customerPhone: customers.phone,
        customerCode: customers.customerCode,
        heldJarsCount: customers.heldJarsCount,
        eventName: eventOrders.eventName,
        venueContactPerson: eventOrders.venueContactPerson,
        venueContactPhone: eventOrders.venueContactPhone,
      })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .leftJoin(eventOrders, eq(orders.id, eventOrders.orderId))
      .where(eq(orders.orderType, "ONE_TIME_EVENT"))
      .orderBy(desc(orders.createdAt));

    // For each event order, check how many jars are currently held or linked to this order
    const pendingEvents = [];

    for (const ev of eventRows) {
      // Find serialized jars delivered for this specific order that are still in DELIVERED_CUSTOMER state
      const deliveredEvents = await db
        .select({
          jarId: jarMovementEvents.jarId,
        })
        .from(jarMovementEvents)
        .where(
          and(
            eq(jarMovementEvents.orderId, ev.orderId),
            eq(jarMovementEvents.toStatus, "DELIVERED_CUSTOMER")
          )
        );

      const jarIds = Array.from(new Set(deliveredEvents.map((e: any) => e.jarId)));

      let activeDeliveredJars: any[] = [];
      if (jarIds.length > 0) {
        activeDeliveredJars = await db
          .select({
            id: jarMasters.id,
            permanentJarCode: jarMasters.permanentJarCode,
            currentStatus: jarMasters.currentStatus,
          })
          .from(jarMasters)
          .where(
            and(
              sql`${jarMasters.id} IN ${jarIds}`,
              eq(jarMasters.currentStatus, "DELIVERED_CUSTOMER")
            )
          );
      }

      // Check if order has delivered jars pending return
      // An event is pending return if either:
      // 1. It has serialized jars in DELIVERED_CUSTOMER, OR
      // 2. The order is delivered and customer still has held_jars_count > 0, OR
      // 3. The order delivery notes don't have eventJarsReturned = true
      let meta: any = {};
      try {
        if (ev.deliveryNotes) meta = JSON.parse(ev.deliveryNotes);
      } catch (e) {}

      const isAlreadyReturned = meta.eventJarsReturned === true;
      const unreturnedJarsCount = activeDeliveredJars.length > 0 
        ? activeDeliveredJars.length 
        : (isAlreadyReturned ? 0 : Math.min(ev.quantityJars, ev.heldJarsCount || ev.quantityJars));

      if (!isAlreadyReturned && unreturnedJarsCount > 0) {
        pendingEvents.push({
          ...ev,
          unreturnedJarsCount,
          activeJars: activeDeliveredJars.map((j) => j.permanentJarCode),
          isAlreadyReturned,
        });
      }
    }

    return NextResponse.json({
      success: true,
      pendingEvents,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load event jar returns" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureDatabaseReady();
    const db = getDb();
    const body = await req.json();

    const { orderId, undertakingText, notes, actorUserId = "usr_owner_01" } = body;

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    // Undertaking verification
    const undertaking = (undertakingText || "").trim().toUpperCase();
    if (undertaking !== "RECEIVED" && undertaking !== "ALL RECEIVED") {
      return NextResponse.json(
        { error: 'Kripya undertaking box mein "RECEIVED" type karke confirm karein.' },
        { status: 400 }
      );
    }

    // 1. Fetch Order and Customer
    const [orderRow] = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        customerId: orders.customerId,
        quantityJars: orders.quantityJars,
        deliveryNotes: orders.deliveryNotes,
      })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!orderRow) {
      return NextResponse.json({ error: "Event order nahi mila" }, { status: 404 });
    }

    const [customerRow] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, orderRow.customerId))
      .limit(1);

    // 2. Find all jars that were delivered for this order
    const deliveredEvents = await db
      .select({
        jarId: jarMovementEvents.jarId,
      })
      .from(jarMovementEvents)
      .where(
        and(
          eq(jarMovementEvents.orderId, orderRow.id),
          eq(jarMovementEvents.toStatus, "DELIVERED_CUSTOMER")
        )
      );

    const jarIds = Array.from(new Set(deliveredEvents.map((e: any) => e.jarId)));

    let serializedReturnedCount = 0;
    if (jarIds.length > 0) {
      const activeJars = await db
        .select()
        .from(jarMasters)
        .where(
          and(
            sql`${jarMasters.id} IN ${jarIds}`,
            eq(jarMasters.currentStatus, "DELIVERED_CUSTOMER")
          )
        );

      for (const jar of activeJars) {
        await transitionJarState({
          jarId: jar.id,
          toStatus: "AVAILABLE",
          actorUserId,
          orderId: orderRow.id,
          notes: `Event return undertaking confirmed (${orderRow.orderNumber}): All empty jars received at plant reception. ${notes || ""}`,
        });
        serializedReturnedCount++;
      }
    }

    // 3. If untracked jars exist or customer still holds jars for this event:
    const totalToRelieve = Math.max(serializedReturnedCount, orderRow.quantityJars);
    const untrackedCount = Math.max(0, totalToRelieve - serializedReturnedCount);

    if (untrackedCount > 0 && customerRow) {
      await db.execute(sql`
        UPDATE customers SET held_jars_count = GREATEST(0, held_jars_count - ${untrackedCount}) WHERE id = ${customerRow.id};
      `);
    }

    // 4. Update order deliveryNotes metadata to record event return undertaking
    let existingMeta: any = {};
    try {
      if (orderRow.deliveryNotes) existingMeta = JSON.parse(orderRow.deliveryNotes);
    } catch (e) {}

    const updatedMeta = {
      ...existingMeta,
      eventJarsReturned: true,
      eventJarsReturnedAt: new Date().toISOString(),
      eventJarsReturnedCount: totalToRelieve,
      eventJarsReturnedBy: actorUserId,
      undertakingConfirmation: undertaking,
    };

    await db
      .update(orders)
      .set({
        deliveryNotes: JSON.stringify(updatedMeta),
      })
      .where(eq(orders.id, orderRow.id));

    // Fetch updated customer
    const [updatedCust] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, orderRow.customerId))
      .limit(1);

    return NextResponse.json({
      success: true,
      orderNumber: orderRow.orderNumber,
      totalJarsReturned: totalToRelieve,
      serializedJarsReturned: serializedReturnedCount,
      untrackedJarsReturned: untrackedCount,
      customerHeldJarsRemaining: updatedCust?.heldJarsCount || 0,
      message: `Safaltapoorvak sabhi ${totalToRelieve} jars plant par stock mein receive ho gaye hain. Customer liability khatam!`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process event jar return" }, { status: 500 });
  }
}
