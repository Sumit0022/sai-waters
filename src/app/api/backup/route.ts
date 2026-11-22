import { NextResponse } from "next/server";
import { createDatabaseBackup, listBackups, getDataStoreStats } from "@/lib/backup";

export async function GET() {
  try {
    const stats = await getDataStoreStats();
    const backups = await listBackups();
    return NextResponse.json({ success: true, stats, backups });
  } catch (error: any) {
    console.error("GET /api/backup error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { metadata, payload } = await createDatabaseBackup(body.notes || "Manual Admin Snapshot");
    return NextResponse.json({
      success: true,
      backup: metadata,
      backupData: payload,
      message: "Backup snapshot created successfully.",
    });
  } catch (error: any) {
    console.error("POST /api/backup error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
