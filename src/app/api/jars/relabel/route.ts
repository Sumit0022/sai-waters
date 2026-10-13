import { NextResponse } from "next/server";
import { relabelJar } from "@/lib/jars";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { jarId, newQrToken, reason } = body;

    if (!jarId || !newQrToken) {
      return NextResponse.json({ error: "Missing jarId or newQrToken" }, { status: 400 });
    }

    const result = await relabelJar(jarId, newQrToken, reason);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to relabel jar" }, { status: 400 });
  }
}
