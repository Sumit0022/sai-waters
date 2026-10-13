import { NextResponse } from "next/server";
import { ensureDatabaseReady } from "@/db";
import { seedSampleOperationalData } from "@/db/seed-sample-data";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const withSeed = searchParams.get("seed") === "true";

    await ensureDatabaseReady();

    if (withSeed) {
      await seedSampleOperationalData();
    }

    return NextResponse.json({
      success: true,
      message: "Database initialized successfully" + (withSeed ? " with sample operational records" : ""),
      provider: process.env.DATABASE_URL ? "Cloud Postgres" : "Local PGlite",
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message, stack: err.stack },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
