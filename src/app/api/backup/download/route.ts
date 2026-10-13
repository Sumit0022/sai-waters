import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const filename = url.searchParams.get("filename");

    if (!filename || !filename.endsWith(".json")) {
      return NextResponse.json({ error: "Invalid backup filename" }, { status: 400 });
    }

    // Prevent directory traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(process.cwd(), "data", "backups", safeFilename);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Backup file not found" }, { status: 404 });
    }

    const fileContent = fs.readFileSync(filePath, "utf8");

    return new NextResponse(fileContent, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
