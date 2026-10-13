import { NextResponse } from "next/server";
import { authorizeJarLoss } from "@/lib/jars";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { caseId, jarId, customerId, agreedChargePaise, authorizedBy, notes } = body;

    if (!jarId || !customerId) {
      return NextResponse.json({ error: "Missing required jarId or customerId" }, { status: 400 });
    }

    const result = await authorizeJarLoss({
      caseId: caseId || `case_${Date.now()}`,
      jarId,
      customerId,
      agreedChargePaise: Number(agreedChargePaise || 0),
      authorizedBy: authorizedBy || "usr_owner_01",
      notes: notes || "Unreturned container confirmed lost by Owner",
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to authorize jar loss" }, { status: 400 });
  }
}
