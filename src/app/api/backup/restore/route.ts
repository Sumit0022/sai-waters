import { NextResponse } from "next/server";
import { restoreDatabaseBackup } from "@/lib/backup";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.filename && !body.rawJson) {
      return NextResponse.json({ success: false, error: "Missing filename or rawJson payload" }, { status: 400 });
    }

    const result = body.rawJson
      ? await restoreDatabaseBackup(JSON.stringify(body.rawJson), true)
      : await restoreDatabaseBackup(body.filename, false);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Restore failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
