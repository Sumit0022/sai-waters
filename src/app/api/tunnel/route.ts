import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import QRCode from "qrcode";

export async function GET(req: Request) {
  try {
    const dataDir = path.join(process.cwd(), "data");
    const tunnelFile = path.join(dataDir, "active-tunnel.json");

    let tunnelInfo: any = { active: false };
    if (fs.existsSync(tunnelFile)) {
      try {
        tunnelInfo = JSON.parse(fs.readFileSync(tunnelFile, "utf8"));
      } catch (e) {}
    }

    const url = new URL(req.url);
    const customUrl = url.searchParams.get("customUrl");

    const targetUrl = customUrl || (tunnelInfo.active ? tunnelInfo.driverUrl : null);

    let qrCodeDataUrl = "";
    if (targetUrl) {
      qrCodeDataUrl = await QRCode.toDataURL(targetUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: "#0F172A",
          light: "#FFFFFF",
        },
      });
    }

    return NextResponse.json({
      success: true,
      tunnel: tunnelInfo,
      targetUrl,
      qrCodeDataUrl,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { driverUrl } = body;

    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (driverUrl) {
      fs.writeFileSync(
        path.join(dataDir, "active-tunnel.json"),
        JSON.stringify(
          {
            active: true,
            url: driverUrl.replace("/driver", ""),
            driverUrl,
            updatedAt: new Date().toISOString(),
          },
          null,
          2
        )
      );
    } else {
      try {
        fs.unlinkSync(path.join(dataDir, "active-tunnel.json"));
      } catch (e) {}
    }

    return NextResponse.json({ success: true, message: "Tunnel state updated" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
