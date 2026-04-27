import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parsePlanSizeToGb } from "@/lib/rewards";
import { getUserSelectCompat, withCompatibleUserFields } from "@/lib/user-compat";

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const compat = await getUserSelectCompat();
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.userId },
      select: withCompatibleUserFields(
        {
          id: true,
          tier: true,
          role: true,
        },
        compat
      ),
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const txs = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        type: "DATA_PURCHASE",
        status: "SUCCESS",
        createdAt: { gte: since },
      },
      select: {
        plan: { select: { sizeLabel: true } },
      },
    });

    const weeklySalesGb = Number(
      txs.reduce((sum, tx) => sum + parsePlanSizeToGb(tx.plan?.sizeLabel), 0).toFixed(2)
    );
    const thresholdGb = 50;

    return NextResponse.json(
      {
        success: true,
        data: {
          tier: user.tier,
          role: user.role,
          agentRequestStatus: "agentRequestStatus" in user ? user.agentRequestStatus ?? "NONE" : "NONE",
          weeklySalesGb,
          thresholdGb,
          remainingGb: Math.max(0, Number((thresholdGb - weeklySalesGb).toFixed(2))),
          isAtRisk: user.tier === "agent" && weeklySalesGb < thresholdGb,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[AGENT STATUS ERROR]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
