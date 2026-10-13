import { NextResponse } from "next/server";
import { getDb, ensureDatabaseReady } from "@/db";
import { users, cashCollectionSubmissions } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    await ensureDatabaseReady();
    const db = getDb();
    const url = new URL(req.url);
    const activeOnly = url.searchParams.get("activeOnly") === "true";

    const allDrivers = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        phone: users.phone,
        email: users.email,
        passwordHash: users.passwordHash,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.role, "DELIVERY_STAFF"))
      .orderBy(desc(users.createdAt));

    // Fetch cash submissions to compute un-cleared cash balance in transit (A/C 1120)
    const allSubs = await db
      .select({
        driverId: cashCollectionSubmissions.driverId,
        amountCollectedPaise: cashCollectionSubmissions.amountCollectedPaise,
        isHandedOver: cashCollectionSubmissions.isHandedOver,
      })
      .from(cashCollectionSubmissions);

    const enriched = allDrivers.map((driver: any) => {
      const driverSubs = allSubs.filter((s: any) => s.driverId === driver.id);
      const unclearedCashPaise = driverSubs
        .filter((s: any) => !s.isHandedOver)
        .reduce((sum: number, s: any) => sum + s.amountCollectedPaise, 0);
      const totalCollectionsCount = driverSubs.length;

      return {
        ...driver,
        pin: driver.passwordHash || "1234",
        unclearedCashPaise,
        totalCollectionsCount,
      };
    });

    const filtered = activeOnly ? enriched.filter((d: any) => d.isActive) : enriched;

    return NextResponse.json({
      success: true,
      drivers: filtered,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load drivers" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureDatabaseReady();
    const db = getDb();
    const body = await req.json();

    const { fullName, phone, pin, password } = body;

    if (!fullName || !fullName.trim()) {
      return NextResponse.json({ error: "Driver ka pura naam anivarya hai" }, { status: 400 });
    }

    if (!phone || !phone.trim()) {
      return NextResponse.json({ error: "Driver ka mobile number anivarya hai" }, { status: 400 });
    }

    const cleanPhone = phone.trim().replace(/\D/g, "").slice(-10);
    const existing = await db.select().from(users).where(eq(users.phone, cleanPhone)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: "Yeh mobile number pehle se kisi user ke sath registered hai" }, { status: 400 });
    }

    const driverId = `usr_driver_${Date.now()}`;
    const driverPin = (pin || password || "1234").trim();

    await db.insert(users).values({
      id: driverId,
      fullName: fullName.trim(),
      phone: cleanPhone,
      email: `${cleanPhone}@saiwaters.in`,
      passwordHash: driverPin,
      role: "DELIVERY_STAFF",
      isActive: true,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      driver: {
        id: driverId,
        fullName: fullName.trim(),
        phone: cleanPhone,
        pin: driverPin,
        role: "DELIVERY_STAFF",
        isActive: true,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create driver" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await ensureDatabaseReady();
    const db = getDb();
    const body = await req.json();

    const { id, fullName, phone, pin, password, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "Driver ID is required" }, { status: 400 });
    }

    const updates: any = {};
    if (fullName !== undefined) updates.fullName = fullName.trim();
    if (phone !== undefined) updates.phone = phone.trim().replace(/\D/g, "").slice(-10);
    if (pin !== undefined || password !== undefined) updates.passwordHash = (pin || password).trim();
    if (isActive !== undefined) updates.isActive = Boolean(isActive);

    await db.update(users).set(updates).where(eq(users.id, id));

    return NextResponse.json({
      success: true,
      message: "Driver details successfully updated",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update driver" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await ensureDatabaseReady();
    const db = getDb();
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Driver ID is required" }, { status: 400 });
    }

    // Soft delete (Archive) to preserve all historical ledger and delivery records
    await db.update(users).set({ isActive: false }).where(eq(users.id, id));

    return NextResponse.json({
      success: true,
      message: "Driver ko safaltapoorvak archive kar diya gaya hai. Sabhi purane delivery records surakshit hain.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to archive driver" }, { status: 500 });
  }
}
