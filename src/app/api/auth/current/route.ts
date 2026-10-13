import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const db = getDb();
  const url = new URL(request.url);
  const requestedUserId = url.searchParams.get("userId") || "usr_owner_01";

  const user = (await db.select().from(users).where(eq(users.id, requestedUserId)).limit(1))[0];
  const allUsers = await db.select().from(users).orderBy(users.role);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    currentUser: {
      id: user.id,
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
      role: user.role,
    },
    availableRoles: allUsers.map((u: any) => ({
      id: u.id,
      fullName: u.fullName,
      role: u.role,
      phone: u.phone,
    })),
  });
}
