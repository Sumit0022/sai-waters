import { NextResponse } from "next/server";
import { cleanAllDemoData } from "@/lib/clean-demo-data";
import { verifyAdminPassword } from "@/lib/settings";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const secret = url.searchParams.get("secret");
    const pwd = url.searchParams.get("password");

    const isAuthorized = secret === "sai-clean-2026" || (pwd && await verifyAdminPassword(pwd));
    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized. Pass ?secret=sai-clean-2026 or ?password=..." },
        { status: 401 }
      );
    }

    const result = await cleanAllDemoData();
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const secret = body.secret;
    const pwd = body.password || body.currentPassword;

    const isAuthorized = secret === "sai-clean-2026" || (pwd && await verifyAdminPassword(pwd));
    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized. Provide secret 'sai-clean-2026' or admin password." },
        { status: 401 }
      );
    }

    const result = await cleanAllDemoData();
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
