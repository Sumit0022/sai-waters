import { NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  customers,
  jarMasters,
  orders,
  customerPriceAgreements,
  customerAddresses,
  jarCustodies,
  jarMovementEvents,
  cashCollectionSubmissions,
  users,
} from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { transitionJarState } from "@/lib/jars";
import { recordFieldCashCollection } from "@/lib/cash";
import { createAndPostInvoice } from "@/lib/billing";

export async function POST(req: Request) {
  try {
    const db = getDb();
    const body = await req.json();

    const { driverId, customerIdentifier, jarCodes, cashCollectedPaise } = body;

    if (!driverId || !customerIdentifier || !jarCodes || !Array.isArray(jarCodes) || jarCodes.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: driverId, customerIdentifier, jarCodes" },
        { status: 400 }
      );
    }

    // 1. Resolve Customer (by code, id, or QR token)
    const cleanCustomerCode = customerIdentifier.replace("urn:sw:c:", "").trim();
    const [cust] = await db
      .select()
      .from(customers)
      .where(or(eq(customers.id, cleanCustomerCode), eq(customers.customerCode, cleanCustomerCode)));

    if (!cust) {
      return NextResponse.json(
        { error: `Customer '${customerIdentifier}' not found in recurring records.` },
        { status: 404 }
      );
    }

    // 2. Fetch Customer Price Agreement (default ₹35/jar)
    const [priceRow] = await db
      .select()
      .from(customerPriceAgreements)
      .where(eq(customerPriceAgreements.customerId, cust.id))
      .limit(1);
    const unitPricePaise = priceRow ? priceRow.pricePerJarPaise : 3500;
    const totalAmountPaise = unitPricePaise * jarCodes.length;

    // 3. Fetch Customer Address
    const [addrRow] = await db
      .select()
      .from(customerAddresses)
      .where(eq(customerAddresses.customerId, cust.id))
      .limit(1);

    const todayStr = new Date().toISOString().split("T")[0];
    const orderNumber = `ORD-REC-${Date.now().toString().slice(-6)}`;
    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // 4. Record Delivery Order
    await db.insert(orders).values({
      id: orderId,
      orderNumber,
      customerId: cust.id,
      addressId: addrRow ? addrRow.id : "addr_default",
      orderType: "RECURRING",
      scheduledDate: todayStr,
      quantityJars: jarCodes.length,
      unitPricePaise,
      totalAmountPaise,
      status: "DELIVERED",
      deliveryNotes: `Doorstep scan delivery by driver ${driverId}`,
    });

    // 5. Transition each delivered jar to DELIVERED_CUSTOMER
    const transitionedJars: string[] = [];
    for (const jarCode of jarCodes) {
      const cleanJarCode = jarCode.replace("urn:sw:j:", "").trim();
      // Lookup jar
      const [jar] = await db
        .select()
        .from(jarMasters)
        .where(eq(jarMasters.permanentJarCode, cleanJarCode));

      if (jar) {
        // Step to DELIVERED_CUSTOMER
        await db
          .update(jarMasters)
          .set({
            currentStatus: "DELIVERED_CUSTOMER",
            totalUsageCycles: (jar.totalUsageCycles || 0) + 1,
          })
          .where(eq(jarMasters.id, jar.id));

        // Update jar custody
        await db
          .insert(jarCustodies)
          .values({
            jarId: jar.id,
            custodyType: "WITH_CUSTOMER",
            customerId: cust.id,
            holderUserId: null,
          })
          .onConflictDoUpdate({
            target: jarCustodies.jarId,
            set: {
              custodyType: "WITH_CUSTOMER",
              customerId: cust.id,
              holderUserId: null,
            },
          });

        // Log movement event
        await db.insert(jarMovementEvents).values({
          id: `jme_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          jarId: jar.id,
          actorUserId: driverId,
          orderId,
          fromStatus: jar.currentStatus,
          toStatus: "DELIVERED_CUSTOMER",
          notes: `Doorstep scan to ${cust.fullName}`,
        });

        transitionedJars.push(jar.permanentJarCode);
      }
    }

    // 6. Update Customer Held Jars Count
    await db
      .update(customers)
      .set({
        heldJarsCount: (cust.heldJarsCount || 0) + jarCodes.length,
      })
      .where(eq(customers.id, cust.id));

    // 7. Auto-issue Commercial Bill of Supply & Post Sales Revenue to General Ledger
    try {
      await createAndPostInvoice({
        customerId: cust.id,
        orderId,
        billingType: "SPOT_DELIVERY",
        lines: [
          {
            description: `20L Drinking Water Jars (${jarCodes.length} Units)`,
            quantity: jarCodes.length,
            unitPricePaise,
          },
        ],
        postedBy: driverId,
        notes: `Doorstep delivery completed by driver ${driverId} for order ${orderNumber}`,
      });
    } catch (e) {
      console.error("Auto-invoice posting in driver delivery failed:", e);
    }

    // 8. If cash was collected, log field collection into Driver Clearing (1120) and credit customer
    let receiptNumber = "";
    if (cashCollectedPaise && cashCollectedPaise > 0) {
      const rec = await recordFieldCashCollection({
        driverId,
        customerId: cust.id,
        amountCollectedPaise: cashCollectedPaise,
        clientEventId: `cash_${Date.now()}`,
      });
      receiptNumber = rec.receiptNumber;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully delivered ${jarCodes.length} jars to ${cust.fullName}`,
      customer: {
        id: cust.id,
        name: cust.fullName,
        code: cust.customerCode,
      },
      orderNumber,
      jarsCount: jarCodes.length,
      unitPricePaise,
      totalAmountPaise,
      cashCollectedPaise: cashCollectedPaise || 0,
      receiptNumber,
    });
  } catch (error: any) {
    console.error("Driver delivery execution failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
