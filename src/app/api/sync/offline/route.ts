import { NextResponse } from "next/server";
import { processOfflineSyncBatch } from "@/lib/offline-sync";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const events = body.events;

    if (!events || !Array.isArray(events)) {
      return NextResponse.json({ error: "Missing events array in request body" }, { status: 400 });
    }

    const result = await processOfflineSyncBatch(events);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to process offline sync" }, { status: 500 });
  }
}
