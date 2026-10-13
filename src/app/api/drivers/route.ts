import { NextResponse } from "next/server";
import { getDb, ensureDatabaseReady } from "@/db";
import { users, cashCollectionSubmissions, deliveryAssignments } from "@/db/schema";
import { eq, desc, and, ne } from "drizzle-orm";
import { verifyAdminPassword } from "@/lib/settings";

export async function GET(req: Request) {
  try {
    await ensureDatabaseReady();
    const db = getDb();
    const url = new URL(req.url);
    const activeOnly = url.searchParams.get("activeOnly") === "true";

    // Strictly exclude any legacy usr_driver_02
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
      .where(and(eq(users.role, "DELIVERY_STAFF"), ne(users.id, "usr_driver_02")))
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

    const { fullName, phone, pin, password, adminPassword } = body;

    // Requirement 2: Admin Password required to add driver
    if (!adminPassword || !adminPassword.trim()) {
      return NextResponse.json(
        { error: "Naya driver add karne ke liye Admin Password anivarya hai." },
        { status: 400 }
      );
    }
    const isValid = await verifyAdminPassword(adminPassword);
    if (!isValid) {
      return NextResponse.json(
        { error: "Galat Admin Password! Driver add nahi kiya ja sakta." },
        { status: 401 }
      );
    }

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

    const { id, fullName, phone, pin, password, isActive, adminPassword } = body;

    if (!id) {
      return NextResponse.json({ error: "Driver ID is required" }, { status: 400 });
    }

    // Requirement 2: Admin Password required to edit or change status of driver
    if (!adminPassword || !adminPassword.trim()) {
      return NextResponse.json(
        { error: "Driver details update karne ke liye Admin Password anivarya hai." },
        { status: 400 }
      );
    }
    const isValid = await verifyAdminPassword(adminPassword);
    if (!isValid) {
      return NextResponse.json(
        { error: "Galat Admin Password! Driver update nahi kiya ja sakta." },
        { status: 401 }
      );
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
    const permanent = url.searchParams.get("permanent") === "true";
    const adminPassword = url.searchParams.get("adminPassword");

    if (!id) {
      return NextResponse.json({ error: "Driver ID is required" }, { status: 400 });
    }

    if (!adminPassword || !adminPassword.trim()) {
      return NextResponse.json(
        { error: "Driver delete / archive karne ke liye Admin Password anivarya hai." },
        { status: 400 }
      );
    }
    const isValid = await verifyAdminPassword(adminPassword);
    if (!isValid) {
      return NextResponse.json(
        { error: "Galat Admin Password! Action unauthorized." },
        { status: 401 }
      );
    }

    if (permanent) {
      // Reassign any foreign keys before hard deletion
      await db.update(deliveryAssignments).set({ driverId: "usr_driver_01" }).where(eq(deliveryAssignments.driverId, id));
      await db.update(cashCollectionSubmissions).set({ driverId: "usr_driver_01" }).where(eq(cashCollectionSubmissions.driverId, id));
      await db.delete(users).where(eq(users.id, id));

      return NextResponse.json({
        success: true,
        message: "Driver ko system se permanently delete kar diya gaya hai.",
      });
    }

    // Soft delete (Archive)
    await db.update(users).set({ isActive: false }).where(eq(users.id, id));

    return NextResponse.json({
      success: true,
      message: "Driver ko safaltapoorvak archive kar diya gaya hai. Sabhi purane delivery records surakshit hain.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to remove driver" }, { status: 500 });
  }
}
