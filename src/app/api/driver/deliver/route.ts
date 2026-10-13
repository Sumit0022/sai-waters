import { NextResponse } from "next/server";
import { getDb, ensureDatabaseReady } from "@/db";
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
  invoices,
} from "@/db/schema";
import { eq, or, sql, desc } from "drizzle-orm";
import { lookupJar, transitionJarState } from "@/lib/jars";
import { recordFieldCashCollection } from "@/lib/cash";
import { createAndPostInvoice } from "@/lib/billing";
import { getTodayIST } from "@/lib/date-utils";

export async function POST(req: Request) {
  try {
    await ensureDatabaseReady();
    const db = getDb();
    const body = await req.json();

    const { driverId, customerIdentifier, jarCodes, cashCollectedPaise, emptyJarsCount, emptyJarCodes } = body;

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
      .where(
        or(
          eq(customers.id, cleanCustomerCode),
          eq(customers.customerCode, cleanCustomerCode),
          eq(customers.phone, cleanCustomerCode),
          sql`LOWER(${customers.customerCode}) = LOWER(${cleanCustomerCode})`
        )
      );

    if (!cust) {
      return NextResponse.json(
        { error: `Customer '${customerIdentifier}' not found in recurring records.` },
        { status: 404 }
      );
    }

    // 2. Validate jarCodes: Reject customer identifiers disguised as jars, and enforce strict deduplication
    const cleanJars: string[] = [];
    const seen = new Set<string>();

    for (const rawJar of jarCodes) {
      const cleanJar = String(rawJar).replace("urn:sw:j:", "").trim();
      if (
        cleanJar.toUpperCase().startsWith("CUST-") ||
        cleanJar.toLowerCase().startsWith("cust_") ||
        cleanJar === cust.customerCode ||
        cleanJar === cust.id ||
        cleanJar === cust.phone
      ) {
        return NextResponse.json(
          { error: `Validation Error: '${rawJar}' is a customer identifier and cannot be registered as a 20L Water Jar!` },
          { status: 400 }
        );
      }
      if (seen.has(cleanJar)) {
        return NextResponse.json(
          { error: `Duplicate Jar '${cleanJar}' detect hua! 1 jar sirf ek hi baar deliver ho sakta hai.` },
          { status: 400 }
        );
      }
      seen.add(cleanJar);
      cleanJars.push(cleanJar);
    }

    if (cleanJars.length === 0) {
      return NextResponse.json(
        { error: "No valid 20L Water Jar codes provided for delivery." },
        { status: 400 }
      );
    }

    // Verify each jar is not already in custody with this customer
    for (const cleanJar of cleanJars) {
      const jar = await lookupJar(cleanJar);
      if (jar) {
        const [custody] = await db
          .select()
          .from(jarCustodies)
          .where(eq(jarCustodies.jarId, jar.id))
          .limit(1);

        if (
          custody &&
          custody.custodyType === "WITH_CUSTOMER" &&
          custody.customerId === cust.id &&
          jar.currentStatus === "DELIVERED_CUSTOMER"
        ) {
          return NextResponse.json(
            {
              error: `Jar '${jar.permanentJarCode}' already ${cust.fullName} ke paas delivered hai! Ek hi jar bina empty return ke dobara deliver nahi ho sakta.`,
            },
            { status: 400 }
          );
        }
      }
    }

    // 3. Fetch Customer Price Agreement (allotted rate)
    const [priceRow] = await db
      .select()
      .from(customerPriceAgreements)
      .where(eq(customerPriceAgreements.customerId, cust.id))
      .orderBy(desc(customerPriceAgreements.effectiveFrom))
      .limit(1);
    const unitPricePaise = priceRow
      ? priceRow.pricePerJarPaise
      : (body.unitPricePaise ? Number(body.unitPricePaise) : 3500);
    const totalAmountPaise = unitPricePaise * cleanJars.length;

    // 4. Fetch Customer Address
    const [addrRow] = await db
      .select()
      .from(customerAddresses)
      .where(eq(customerAddresses.customerId, cust.id))
      .limit(1);

    const todayStr = getTodayIST();
    const orderNumber = `ORD-REC-${Date.now().toString().slice(-6)}`;
    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // 5. Record Delivery Order
    await db.insert(orders).values({
      id: orderId,
      orderNumber,
      customerId: cust.id,
      addressId: addrRow ? addrRow.id : "addr_default",
      orderType: "RECURRING",
      scheduledDate: todayStr,
      quantityJars: cleanJars.length,
      unitPricePaise,
      totalAmountPaise,
      status: "DELIVERED",
      deliveryNotes: `Doorstep scan delivery by driver ${driverId}`,
    });

    // 6. Transition each delivered jar to DELIVERED_CUSTOMER
    const transitionedJars: string[] = [];
    for (const rawOrCleanCode of cleanJars) {
      const jar = await lookupJar(rawOrCleanCode);
      if (jar) {
        await transitionJarState({
          jarId: jar.id,
          toStatus: "DELIVERED_CUSTOMER",
          actorUserId: driverId,
          orderId,
          customerId: cust.id,
          notes: `Doorstep scan delivery to ${cust.fullName}`,
        });
        transitionedJars.push(jar.permanentJarCode);
      }
    }

    // If any jar code was not registered in jar masters, increment customer held count by difference
    const untrackedCount = cleanJars.length - transitionedJars.length;
    if (untrackedCount > 0) {
      await db.execute(sql`
        UPDATE customers SET held_jars_count = held_jars_count + ${untrackedCount} WHERE id = ${cust.id};
      `);
    }

    // 7. Process Doorstep Empty Jar Returns (relieves customer liability on the spot)
    const returnedEmpties: string[] = [];
    if (Array.isArray(emptyJarCodes) && emptyJarCodes.length > 0) {
      for (const emptyCode of emptyJarCodes) {
        const emptyJar = await lookupJar(emptyCode);
        if (emptyJar) {
          await transitionJarState({
            jarId: emptyJar.id,
            toStatus: "RETURNED_INSPECT",
            actorUserId: driverId,
            orderId,
            notes: `Collected empty jar at doorstep from ${cust.fullName}`,
          });
          returnedEmpties.push(emptyJar.permanentJarCode);
        }
      }
    }

    // If driver entered numeric count of returned empty jars without scanning
    const totalNumericEmpties = Number(emptyJarsCount || 0);
    const unScannedEmptiesCount = Math.max(0, totalNumericEmpties - returnedEmpties.length);
    if (unScannedEmptiesCount > 0) {
      await db.execute(sql`
        UPDATE customers SET held_jars_count = GREATEST(0, held_jars_count - ${unScannedEmptiesCount}) WHERE id = ${cust.id};
      `);
    }

    // 7. Commercial Invoicing Policy:
    // If customer is on SPOT / PER_DELIVERY or EVENT, issue invoice immediately.
    // If customer is on MONTHLY, daily deliveries accumulate on their ledger and are billed via Month-End Consolidated Invoice!
    if (cust.billingFrequency === "PER_DELIVERY" || cust.customerType === "EVENT") {
      try {
        const [existingOrderInv] = await db
          .select()
          .from(invoices)
          .where(eq(invoices.orderId, orderId))
          .limit(1);

        if (!existingOrderInv) {
          await createAndPostInvoice({
            customerId: cust.id,
            orderId,
            billingType: cust.customerType === "EVENT" ? "EVENT_SETTLEMENT" : "SPOT_DELIVERY",
            lines: [
              {
                description: `20L Drinking Water Jars (${cleanJars.length} Units)`,
                quantity: cleanJars.length,
                unitPricePaise,
              },
            ],
            postedBy: driverId,
            notes: `Doorstep delivery completed by driver ${driverId} for order ${orderNumber}`,
          });
        }
      } catch (e) {
        console.error("Auto-invoice posting in driver delivery failed:", e);
      }
    }

    // 8. If cash was collected, log field collection into Driver Clearing (1120) and credit customer
    let receiptNumber = "";
    if (cashCollectedPaise && cashCollectedPaise > 0) {
      const rec = await recordFieldCashCollection({
        driverId,
        orderId,
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
