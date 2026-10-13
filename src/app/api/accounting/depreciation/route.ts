import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { jarMasters } from "@/db/schema";
import { postJournalEntry } from "@/lib/accounting";
import { eq, and } from "drizzle-orm";
import { getTodayIST } from "@/lib/date-utils";

export async function POST(request: Request) {
  try {
    const db = getDb();
    const body = await request.json();

    // 1. Fetch all active jars
    const jars = await db
      .select()
      .from(jarMasters)
      .where(and(eq(jarMasters.isActive, true)));

    if (jars.length === 0) {
      return NextResponse.json({ error: "No active jar assets found to depreciate" }, { status: 400 });
    }

    const now = new Date();
    let totalMonthlyDepreciationPaise = 0;
    let eligibleJarsCount = 0;

    for (const jar of jars) {
      const acqDate = jar.acquisitionDate ? new Date(jar.acquisitionDate) : new Date();
      const elapsedMonths = Math.max(
        0,
        (now.getFullYear() - acqDate.getFullYear()) * 12 + (now.getMonth() - acqDate.getMonth())
      );
      
      const standardLifespanMonths = 24; // 24 months useful life
      const costPaise = jar.acquisitionCostPaise || 18000;
      const jarMonthlyDepPaise = Math.round(costPaise / standardLifespanMonths);

      // Only depreciate if within standard lifespan
      if (elapsedMonths < standardLifespanMonths) {
        totalMonthlyDepreciationPaise += jarMonthlyDepPaise;
        eligibleJarsCount++;
      }
    }

    if (totalMonthlyDepreciationPaise <= 0) {
      return NextResponse.json({
        error: "All active jars have reached full 24-month lifespan. No further depreciation required.",
      }, { status: 400 });
    }

    const todayStr = getTodayIST();

    const result = await postJournalEntry({
      sourceDocumentType: "DEPRECIATION",
      entryDate: todayStr,
      narration: `Asset lifecycle monthly depreciation for ${eligibleJarsCount} 20L jars based on individual acquisition dates`,
      postedBy: body.postedBy || "usr_owner_01",
      lines: [
        {
          accountId: 6510, // Depreciation Expense — Jars
          debitPaise: totalMonthlyDepreciationPaise,
          creditPaise: 0,
        },
        {
          accountId: 1220, // Accumulated Depreciation — Jars (Contra-Asset)
          debitPaise: 0,
          creditPaise: totalMonthlyDepreciationPaise,
        },
      ],
    });

    return NextResponse.json({
      success: true,
      eligibleJarsCount,
      totalJarsCount: jars.length,
      monthlyDepreciationPaise: totalMonthlyDepreciationPaise,
      ...result,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to post depreciation voucher" }, { status: 400 });
  }
}
