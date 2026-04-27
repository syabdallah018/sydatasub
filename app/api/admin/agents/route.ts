import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { getDbCapabilities } from "@/lib/db-capabilities";
import { parsePlanSizeToGb } from "@/lib/rewards";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const caps = await getDbCapabilities();
    if (!caps.userAgentRequestStatus) {
      return NextResponse.json(
        { success: true, data: [], featureUnavailable: true },
        { status: 200 }
      );
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [{ tier: "agent" }, { agentRequestStatus: { in: ["PENDING", "APPROVED", "REJECTED"] } }],
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        tier: true,
        role: true,
        agentRequestStatus: true,
        joinedAt: true,
      },
      orderBy: [{ agentRequestStatus: "asc" }, { joinedAt: "desc" }],
    });

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const salesRows = await prisma.transaction.findMany({
      where: {
        userId: { in: users.map((u) => u.id) },
        type: "DATA_PURCHASE",
        status: "SUCCESS",
        createdAt: { gte: since },
      },
      select: {
        userId: true,
        plan: { select: { sizeLabel: true } },
      },
    });

    const weeklyMap = new Map<string, number>();
    for (const row of salesRows) {
      const gb = parsePlanSizeToGb(row.plan?.sizeLabel);
      weeklyMap.set(row.userId || "", (weeklyMap.get(row.userId || "") || 0) + gb);
    }

    return NextResponse.json(
      {
        success: true,
        data: users.map((u) => {
          const weeklySalesGb = Number((weeklyMap.get(u.id) || 0).toFixed(2));
          return {
            ...u,
            weeklySalesGb,
            thresholdGb: 50,
            isAtRisk: u.tier === "agent" && weeklySalesGb < 50,
          };
        }),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[ADMIN AGENTS GET ERROR]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
