import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { deliveryAssignments, dispatchRecords, orders, customers, customerAddresses, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: Request) {
  const db = getDb();
  const url = new URL(request.url);
  const driverId = url.searchParams.get("driverId");
  const dateFilter = url.searchParams.get("date") || new Date().toISOString().split("T")[0];

  const trips = await db
    .select({
      id: deliveryAssignments.id,
      tripSheetNumber: deliveryAssignments.tripSheetNumber,
      driverId: deliveryAssignments.driverId,
      driverName: users.fullName,
      driverPhone: users.phone,
      vehicleNumber: deliveryAssignments.vehicleNumber,
      routeDate: deliveryAssignments.routeDate,
      status: deliveryAssignments.status,
    })
    .from(deliveryAssignments)
    .innerJoin(users, eq(deliveryAssignments.driverId, users.id))
    .where(driverId ? eq(deliveryAssignments.driverId, driverId) : eq(deliveryAssignments.routeDate, dateFilter))
    .orderBy(desc(deliveryAssignments.routeDate));

  // Fetch stops for each trip
  const enrichedTrips = await Promise.all(
    trips.map(async (trip: any) => {
      const stops = await db
        .select({
          dispatchId: dispatchRecords.id,
          sequenceOrder: dispatchRecords.sequenceOrder,
          status: dispatchRecords.status,
          fullJarsDelivered: dispatchRecords.fullJarsDelivered,
          emptyJarsReturned: dispatchRecords.emptyJarsReturned,
          orderId: orders.id,
          orderNumber: orders.orderNumber,
          orderType: orders.orderType,
          quantityJars: orders.quantityJars,
          unitPricePaise: orders.unitPricePaise,
          totalAmountPaise: orders.totalAmountPaise,
          deliveryNotes: orders.deliveryNotes,
          customerId: customers.id,
          customerName: customers.fullName,
          customerPhone: customers.phone,
          customerCode: customers.customerCode,
          streetAddress: customerAddresses.streetAddress,
          locality: customerAddresses.locality,
          city: customerAddresses.city,
        })
        .from(dispatchRecords)
        .innerJoin(orders, eq(dispatchRecords.orderId, orders.id))
        .innerJoin(customers, eq(orders.customerId, customers.id))
        .innerJoin(customerAddresses, eq(orders.addressId, customerAddresses.id))
        .where(eq(dispatchRecords.assignmentId, trip.id))
        .orderBy(dispatchRecords.sequenceOrder);

      return {
        ...trip,
        stops,
        totalStops: stops.length,
        completedStops: stops.filter((s: any) => s.status === "DELIVERED").length,
      };
    })
  );

  return NextResponse.json({ trips: enrichedTrips });
}

export async function POST(request: Request) {
  const db = getDb();
  const body = await request.json();

  const countRes = await db.select().from(deliveryAssignments);
  const nextNum = countRes.length + 1;
  const todayCompact = new Date().toISOString().split("T")[0].replace(/-/g, "");
  const tripSheetNumber = body.tripSheetNumber || `TRIP-${todayCompact}-${String(nextNum).padStart(2, "0")}`;
  const tripId = `trip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const routeDate = body.routeDate || new Date().toISOString().split("T")[0];

  await db.insert(deliveryAssignments).values({
    id: tripId,
    tripSheetNumber,
    driverId: body.driverId || "usr_driver_01",
    vehicleNumber: body.vehicleNumber || "UP 25 AB 4590",
    routeDate,
    status: "IN_PROGRESS",
  });

  // Assign orders to trip
  if (body.orderIds && Array.isArray(body.orderIds)) {
    let seq = 1;
    for (const ordId of body.orderIds) {
      await db.insert(dispatchRecords).values({
        id: `disp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        assignmentId: tripId,
        orderId: ordId,
        sequenceOrder: seq++,
        status: "PENDING",
      });

      // Update order status to DISPATCHED
      await db.update(orders).set({ status: "DISPATCHED" }).where(eq(orders.id, ordId));
    }
  }

  return NextResponse.json({ success: true, tripId, tripSheetNumber });
}
