import { NextResponse } from "next/server";
import { lookupJar, transitionJarState, JarStatus } from "@/lib/jars";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, action, toStatus, actorUserId, customerId, orderId, assignmentId, notes } = body;

    if (!query) {
      return NextResponse.json({ error: "Missing query or QR token" }, { status: 400 });
    }

    const jar = await lookupJar(query);
    if (!jar) {
      return NextResponse.json({ error: `No jar found matching token/code "${query}"` }, { status: 404 });
    }

    if (action === "TRANSITION" && toStatus) {
      const result = await transitionJarState({
        jarId: jar.id,
        toStatus: toStatus as JarStatus,
        actorUserId: actorUserId || "usr_owner_01",
        customerId,
        orderId,
        assignmentId,
        notes,
      });

      const updatedJar = await lookupJar(jar.id);

      return NextResponse.json({
        success: true,
        jar: updatedJar || { ...jar, currentStatus: result.toStatus },
        transition: result,
      });
    }

    // Default action: LOOKUP
    const db = (await import("@/db")).getDb();
    const { jarCustodies, customers } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");

    const [custody] = await db
      .select({
        jarId: jarCustodies.jarId,
        custodyType: jarCustodies.custodyType,
        customerId: jarCustodies.customerId,
        customerName: customers.fullName,
        customerCode: customers.customerCode,
      })
      .from(jarCustodies)
      .leftJoin(customers, eq(jarCustodies.customerId, customers.id))
      .where(eq(jarCustodies.jarId, jar.id))
      .limit(1);

    return NextResponse.json({
      success: true,
      jar,
      custody: custody || null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to process scan" }, { status: 400 });
  }
}
