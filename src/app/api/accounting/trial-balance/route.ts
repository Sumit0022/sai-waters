import { NextResponse } from "next/server";
import { getTrialBalance } from "@/lib/accounting";

export async function GET() {
  try {
    const tb = await getTrialBalance();
    return NextResponse.json(tb);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to load trial balance" }, { status: 500 });
  }
}
