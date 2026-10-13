import { NextResponse } from "next/server";
import {
  getAdminCredentials,
  verifyAdminPassword,
  updateAdminCredentials,
  getBusinessInfo,
  updateBusinessInfo,
} from "@/lib/settings";

export async function GET() {
  try {
    const admin = await getAdminCredentials();
    const businessInfo = await getBusinessInfo();

    return NextResponse.json({
      success: true,
      adminUsername: admin.username,
      businessInfo,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load system settings" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, currentPassword } = body;

    // Requirement 2: "kuch bhi add karne ke liye current password required hoga......"
    if (!currentPassword || !currentPassword.trim()) {
      return NextResponse.json(
        { error: "Suraksha hetu Current Admin Password anivarya hai." },
        { status: 400 }
      );
    }

    const isValid = await verifyAdminPassword(currentPassword);
    if (!isValid) {
      return NextResponse.json(
        { error: "Galat Current Admin Password! Kripya sahi password enter karein." },
        { status: 401 }
      );
    }

    if (action === "VERIFY_PASSWORD") {
      return NextResponse.json({ success: true, verified: true });
    }

    if (action === "UPDATE_ADMIN_CREDENTIALS") {
      const { newUsername, newPassword } = body;
      if (!newUsername || !newUsername.trim()) {
        return NextResponse.json(
          { error: "Naya Admin Username khali nahi ho sakta." },
          { status: 400 }
        );
      }
      if (!newPassword || !newPassword.trim() || newPassword.trim().length < 4) {
        return NextResponse.json(
          { error: "Naya password kam se kam 4 aksharon ka hona chahiye." },
          { status: 400 }
        );
      }

      const updated = await updateAdminCredentials(newUsername, newPassword);
      return NextResponse.json({
        success: true,
        message: "Admin credentials safaltapoorvak update ho gaye hain!",
        adminUsername: updated.username,
      });
    }

    if (action === "UPDATE_BUSINESS_UPI") {
      const { upi_id, payee_name, phone, address, name } = body;
      if (!upi_id || !upi_id.trim() || !upi_id.includes("@")) {
        return NextResponse.json(
          { error: "Kripya valid UPI ID darj karein (e.g. yourname@okaxis, 9876543210@upi)." },
          { status: 400 }
        );
      }

      const updated = await updateBusinessInfo({
        upi_id: upi_id.trim(),
        payee_name: (payee_name || name || "Sai Waters").trim(),
        name: (name || payee_name || "Sai Waters").trim(),
        phone: phone?.trim(),
        address: address?.trim(),
      });

      return NextResponse.json({
        success: true,
        message: "Business UPI ID aur details safaltapoorvak update ho gaye hain!",
        businessInfo: updated,
      });
    }

    return NextResponse.json({ error: "Invalid settings action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process settings request" },
      { status: 500 }
    );
  }
}
