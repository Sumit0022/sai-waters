import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { jarMasters, qrIdentifiers, jarCustodies, customers, jarMovementEvents } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getTodayIST } from "@/lib/date-utils";

function calculateJarLifecycleMetrics(jar: any) {
  const acqDate = jar.acquisitionDate ? new Date(jar.acquisitionDate) : new Date();
  const now = new Date();
  
  // Calculate elapsed months
  const elapsedMonths = Math.max(
    0,
    (now.getFullYear() - acqDate.getFullYear()) * 12 + (now.getMonth() - acqDate.getMonth())
  );
  
  const standardLifespanMonths = 24; // 2 years standard commercial polycarbonate lifespan
  const acquisitionCostPaise = jar.acquisitionCostPaise || 18000;
  const monthlyDepreciationPaise = Math.round(acquisitionCostPaise / standardLifespanMonths);
  
  const accumulatedDepreciationPaise = Math.min(
    acquisitionCostPaise,
    monthlyDepreciationPaise * elapsedMonths
  );
  
  const netBookValuePaise = Math.max(0, acquisitionCostPaise - accumulatedDepreciationPaise);
  const lifespanProgressPercent = Math.min(
    100,
    Math.round((elapsedMonths / standardLifespanMonths) * 100)
  );

  return {
    elapsedMonths,
    standardLifespanMonths,
    monthlyDepreciationPaise,
    accumulatedDepreciationPaise,
    netBookValuePaise,
    lifespanProgressPercent,
  };
}

export async function GET(request: Request) {
  const db = getDb();
  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status");

  const query = db
    .select({
      id: jarMasters.id,
      permanentJarCode: jarMasters.permanentJarCode,
      acquisitionDate: jarMasters.acquisitionDate,
      acquisitionCostPaise: jarMasters.acquisitionCostPaise,
      currentStatus: jarMasters.currentStatus,
      totalUsageCycles: jarMasters.totalUsageCycles,
      notes: jarMasters.notes,
      isActive: jarMasters.isActive,
      qrToken: qrIdentifiers.qrToken,
      custodyType: jarCustodies.custodyType,
      customerName: customers.fullName,
      customerCode: customers.customerCode,
    })
    .from(jarMasters)
    .leftJoin(qrIdentifiers, and(eq(qrIdentifiers.jarId, jarMasters.id), eq(qrIdentifiers.isActive, true)))
    .leftJoin(jarCustodies, eq(jarCustodies.jarId, jarMasters.id))
    .leftJoin(customers, eq(jarCustodies.customerId, customers.id))
    .orderBy(desc(jarMasters.permanentJarCode));

  const allJars = await query;
  // Deduplicate by jar id to guarantee unique records
  const jarMap = new Map();
  for (const j of allJars) {
    if (!jarMap.has(j.id)) {
      const metrics = calculateJarLifecycleMetrics(j);
      jarMap.set(j.id, { ...j, lifecycle: metrics });
    }
  }
  const uniqueJars = Array.from(jarMap.values());
  const filtered = statusFilter ? uniqueJars.filter((j: any) => j.currentStatus === statusFilter) : uniqueJars;

  return NextResponse.json({ jars: filtered });
}

export async function POST(request: Request) {
  try {
    const db = getDb();
    const body = await request.json();

    const quantity = Math.max(1, Math.min(500, Number(body.quantity || body.numberOfJars) || 1));
    const todayStr = body.acquisitionDate || getTodayIST();
    const costPaise = body.acquisitionCostPaise || 18000;

    // Determine starting numeric index from existing jars
    const allJars = await db.select({ permanentJarCode: jarMasters.permanentJarCode }).from(jarMasters);
    let maxSuffix = 0;
    for (const j of allJars) {
      const match = j.permanentJarCode.match(/(\d+)$/);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxSuffix) maxSuffix = n;
      }
    }

    const startNum = body.startingNumber ? Number(body.startingNumber) : (maxSuffix + 1);
    const prefix = body.codePrefix || (quantity === 1 && body.permanentJarCode ? null : "JAR-20L-");

    const createdJars: any[] = [];

    for (let i = 0; i < quantity; i++) {
      const currentNum = startNum + i;
      const permanentJarCode = (quantity === 1 && body.permanentJarCode?.trim())
        ? body.permanentJarCode.trim()
        : `${prefix || "JAR-20L-"}${String(currentNum).padStart(4, "0")}`;

      const jarId = `jar_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`;
      const qrToken = `urn:sw:j:q8x9f2m1-${String(currentNum).padStart(4, "0")}`;

      // 1. Insert Master Jar
      await db.insert(jarMasters).values({
        id: jarId,
        permanentJarCode,
        acquisitionDate: todayStr,
        acquisitionCostPaise: costPaise,
        currentStatus: "AVAILABLE",
        totalUsageCycles: 0,
        isActive: true,
        notes: body.notes || (quantity > 1 ? `Batch of ${quantity} jars registered` : null),
      });

      // 2. Insert QR Identifier
      await db.insert(qrIdentifiers).values({
        id: `qr_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
        jarId,
        qrToken,
        isActive: true,
        issuedAt: new Date(),
      });

      // 3. Set Initial Custody at Plant
      await db.insert(jarCustodies).values({
        jarId,
        custodyType: "PLANT",
        customerId: null,
        holderUserId: null,
        transferredAt: new Date(),
      });

      createdJars.push({ id: jarId, permanentJarCode, qrToken, currentStatus: "AVAILABLE" });
    }

    return NextResponse.json({
      success: true,
      count: quantity,
      jar: createdJars[0],
      firstJar: createdJars[0],
      lastJar: createdJars[createdJars.length - 1],
      jars: createdJars,
      message: `Successfully registered ${quantity} 20L Water Jars (${createdJars[0].permanentJarCode} to ${createdJars[createdJars.length - 1].permanentJarCode})`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to add jars" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const db = getDb();
    const body = await request.json();
    const { id, permanentJarCode, acquisitionCostPaise, acquisitionDate, notes, currentStatus } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing jar id" }, { status: 400 });
    }

    const updates: any = {};
    if (permanentJarCode) updates.permanentJarCode = permanentJarCode;
    if (acquisitionCostPaise !== undefined) updates.acquisitionCostPaise = acquisitionCostPaise;
    if (acquisitionDate) updates.acquisitionDate = acquisitionDate;
    if (notes !== undefined) updates.notes = notes;
    if (currentStatus) updates.currentStatus = currentStatus;

    await db.update(jarMasters).set(updates).where(eq(jarMasters.id, id));

    return NextResponse.json({ success: true, message: "Jar details updated successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to update jar" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const db = getDb();
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing jar id" }, { status: 400 });
    }

    // Mark as retired
    await db
      .update(jarMasters)
      .set({
        currentStatus: "RETIRED",
        isActive: false,
        notes: "Retired and removed from active pool by Administrator",
      })
      .where(eq(jarMasters.id, id));

    return NextResponse.json({ success: true, message: "Jar retired and removed from active pool" });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to remove jar" }, { status: 500 });
  }
}
