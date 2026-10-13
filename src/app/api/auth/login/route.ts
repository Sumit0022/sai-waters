import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    const expectedUser = process.env.OWNER_USERNAME || "sai";
    const expectedPass = process.env.OWNER_PASSWORD || "sai123";

    // Also allow 'admin' / 'admin123' as fallback
    const isOwner =
      (username === expectedUser && password === expectedPass) ||
      (username === "admin" && password === "admin123");

    if (!isOwner) {
      return NextResponse.json(
        { error: "Galat Username ya Password! (Invalid credentials)" },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      user: {
        username: "sai",
        fullName: "Sai (Owner)",
        role: "OWNER",
      },
    });

    // Set auth cookie
    response.cookies.set("sw_auth_session", "owner_session_active", {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: "lax",
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
