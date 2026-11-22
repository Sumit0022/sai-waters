import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getBackupDir, generateLiveBackupPayload } from "@/lib/backup";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const filename = url.searchParams.get("filename");

    const backupDir = getBackupDir();
    let fileContent: string | null = null;
    let downloadFilename = filename || `sai-waters-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;

    if (filename && filename.endsWith(".json")) {
      const safeFilename = path.basename(filename);
      const filePath = path.join(backupDir, safeFilename);

      if (fs.existsSync(filePath)) {
        fileContent = fs.readFileSync(filePath, "utf8");
        downloadFilename = safeFilename;
      }
    }

    // Serverless Fallback: If file is not present on disk, generate a fresh live snapshot instantly!
    if (!fileContent) {
      const payload = await generateLiveBackupPayload("Live Snapshot Download");
      fileContent = JSON.stringify(payload, null, 2);
      downloadFilename = `sai-waters-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    }

    return new NextResponse(fileContent, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${downloadFilename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("GET /api/backup/download error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
