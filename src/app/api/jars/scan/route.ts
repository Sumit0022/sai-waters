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

      return NextResponse.json({
        success: true,
        jar: { ...jar, currentStatus: result.toStatus },
        transition: result,
      });
    }

    // Default action: LOOKUP
    return NextResponse.json({
      success: true,
      jar,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to process scan" }, { status: 400 });
  }
}
