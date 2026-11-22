import { NextResponse } from "next/server";
import { getDb, ensureDatabaseReady } from "@/db";
import { users } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    await ensureDatabaseReady();
    const db = getDb();
    const body = await request.json();

    const { identifier, phone, pin, password } = body;
    const inputId = (identifier || phone || "").trim();
    const inputPin = (pin || password || "").trim();

    if (!inputId) {
      return NextResponse.json({ error: "Driver Phone or ID is required" }, { status: 400 });
    }
    if (!inputPin) {
      return NextResponse.json({ error: "Driver PIN is required" }, { status: 400 });
    }

    const cleanPhone = inputId.replace(/\D/g, "").slice(-10);

    // Query active delivery staff by ID or Phone
    const drivers = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        phone: users.phone,
        passwordHash: users.passwordHash,
        role: users.role,
        isActive: users.isActive,
      })
      .from(users)
      .where(
        and(
          eq(users.role, "DELIVERY_STAFF"),
          eq(users.isActive, true),
          or(
            eq(users.id, inputId),
            cleanPhone ? eq(users.phone, cleanPhone) : eq(users.id, inputId)
          )
        )
      )
      .limit(1);

    if (drivers.length === 0) {
      return NextResponse.json(
        { error: "Driver not found or account is deactivated. Please check with Admin." },
        { status: 404 }
      );
    }

    const driver = drivers[0];
    const expectedPin = (driver.passwordHash || "1234").trim();

    if (inputPin !== expectedPin) {
      return NextResponse.json(
        { error: "Invalid Driver PIN. Please enter the PIN allotted by Admin." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      driver: {
        id: driver.id,
        fullName: driver.fullName,
        phone: driver.phone,
        vehicleNumber: "UP-25-AT-4821",
        vehicleType: "Bolero Maxi Truck",
        role: driver.role,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Login failed" }, { status: 500 });
  }
}
