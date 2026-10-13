import { NextResponse } from "next/server";
import { getDb, ensureDatabaseReady } from "@/db";
import {
  orders,
  customers,
  customerAddresses,
  eventOrders,
  jarMasters,
  jarCustodies,
  jarMovementEvents,
  users,
} from "@/db/schema";
import { eq, desc, or, and, sql } from "drizzle-orm";
import { lookupJar, transitionJarState } from "@/lib/jars";

// GET: Returns bulk orders that are pending dispatch or currently in-transit
export async function GET(request: Request) {
  try {
    await ensureDatabaseReady();
    const db = getDb();
    const url = new URL(request.url);
    const statusParam = url.searchParams.get("status"); // "CONFIRMED" | "IN_TRANSIT" | "ALL"
    const driverId = url.searchParams.get("driverId");

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
      .where(
        and(
          eq(orders.orderType, "ONE_TIME_EVENT"),
          statusParam === "CONFIRMED"
            ? eq(orders.status, "CONFIRMED")
            : statusParam === "IN_TRANSIT"
            ? eq(orders.status, "IN_TRANSIT")
            : or(eq(orders.status, "CONFIRMED"), eq(orders.status, "IN_TRANSIT"))
        )
      )
      .orderBy(desc(orders.scheduledDate), desc(orders.createdAt));

    const rows = await query;

    const enriched = rows.map((r: any) => {
      let dispatchMeta: any = null;
      if (r.deliveryNotes) {
        try {
          dispatchMeta = JSON.parse(r.deliveryNotes);
        } catch (e) {}
      }
      return {
        ...r,
        dispatchedJars: dispatchMeta?.dispatchedJars || [],
        assignedDriverId: dispatchMeta?.driverId || null,
        assignedDriverName: dispatchMeta?.driverName || null,
        vehicleNumber: dispatchMeta?.vehicleNumber || null,
        dispatchedAt: dispatchMeta?.dispatchedAt || null,
      };
    });

    // If driver filter is applied, only return orders assigned to this driver or in-transit
    const filtered = driverId
      ? enriched.filter((o: any) => !o.assignedDriverId || o.assignedDriverId === driverId)
      : enriched;

    return NextResponse.json({ success: true, orders: filtered });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch dispatch orders" }, { status: 500 });
  }
}

// POST: Owner dispatches order by scanning/allocating jars onto delivery vehicle
export async function POST(request: Request) {
  try {
    await ensureDatabaseReady();
    const db = getDb();
    const body = await request.json();

    const { orderId, driverId, vehicleNumber, jarCodes } = body;

    if (!orderId || !jarCodes || !Array.isArray(jarCodes) || jarCodes.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: orderId, jarCodes (array of scanned jars)" },
        { status: 400 }
      );
    }

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      return NextResponse.json({ error: `Order '${orderId}' not found` }, { status: 404 });
    }

    // Clean and deduplicate scanned jar codes
    const cleanJars: string[] = [];
    const seen = new Set<string>();
    for (const raw of jarCodes) {
      const clean = String(raw).replace("urn:sw:j:", "").trim();
      if (!clean) continue;
      if (seen.has(clean)) {
        return NextResponse.json(
          { error: `Duplicate jar '${clean}' detect hua! 1 jar sirf ek hi baar dispatch ho sakta hai.` },
          { status: 400 }
        );
      }
      seen.add(clean);
      cleanJars.push(clean);
    }

    if (cleanJars.length === 0) {
      return NextResponse.json({ error: "No valid jar codes provided for dispatch" }, { status: 400 });
    }

    const targetDriverId = driverId || "usr_driver_01";

    // Transition each jar to ALLOCATED -> IN_TRANSIT with vehicle custody
    const transitionedJars: string[] = [];
    for (const code of cleanJars) {
      const jar = await lookupJar(code);
      if (jar) {
        // Legal transition flow: AVAILABLE -> ALLOCATED -> IN_TRANSIT
        if (jar.currentStatus === "AVAILABLE") {
          await transitionJarState({
            jarId: jar.id,
            toStatus: "ALLOCATED",
            actorUserId: targetDriverId,
            orderId: order.id,
            notes: `Allocated to bulk order ${order.orderNumber}`,
          });
        }
        await transitionJarState({
          jarId: jar.id,
          toStatus: "IN_TRANSIT",
          actorUserId: targetDriverId,
          orderId: order.id,
          notes: `Loaded on truck for dispatch (${order.orderNumber})`,
        });

        // Set vehicle custody
        await db
          .insert(jarCustodies)
          .values({
            jarId: jar.id,
            custodyType: "IN_VEHICLE",
            customerId: null,
            holderUserId: targetDriverId,
            transferredAt: new Date(),
          })
          .onConflictDoUpdate({
            target: jarCustodies.jarId,
            set: {
              custodyType: "IN_VEHICLE",
              customerId: null,
              holderUserId: targetDriverId,
              transferredAt: new Date(),
            },
          });

        transitionedJars.push(jar.permanentJarCode);
      } else {
        transitionedJars.push(code);
      }
    }

    // Resolve driver name
    const [driverUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, targetDriverId))
      .limit(1);

    const dispatchMeta = {
      dispatchedJars: cleanJars,
      driverId: targetDriverId,
      driverName: driverUser?.fullName || "Vikram Singh",
      vehicleNumber: vehicleNumber || "UP 25 SW 1001",
      dispatchedAt: new Date().toISOString(),
      dispatchedCount: cleanJars.length,
    };

    // Update Order Status to IN_TRANSIT
    await db
      .update(orders)
      .set({
        status: "IN_TRANSIT",
        deliveryNotes: JSON.stringify(dispatchMeta),
      })
      .where(eq(orders.id, order.id));

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: "IN_TRANSIT",
      dispatchedCount: cleanJars.length,
      driverName: dispatchMeta.driverName,
      vehicleNumber: dispatchMeta.vehicleNumber,
    });
  } catch (err: any) {
    console.error("Bulk dispatch error:", err);
    return NextResponse.json({ error: err.message || "Failed to dispatch order" }, { status: 500 });
  }
}
