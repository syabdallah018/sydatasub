import { NextRequest, NextResponse } from "next/server";
import { enforceAdminMutationGuard, logAdminAction, requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { getDbCapabilities } from "@/lib/db-capabilities";

export async function POST(req: NextRequest) {
  try {
    const guardError = enforceAdminMutationGuard(req);
    if (guardError) return guardError;
    await requireAdmin(req);

    const caps = await getDbCapabilities();
    if (!caps.userRewardBalance) {
      return NextResponse.json(
        { success: false, error: "Reward balance column is not available yet." },
        { status: 503 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const claimDelete = await tx.userReward.deleteMany({});
      const rewardTxDelete = await tx.transaction.deleteMany({
        where: { type: "REWARD_CREDIT" },
      });
      const userReset = await tx.user.updateMany({
        data: { rewardBalance: 0 },
      });
      return {
        deletedClaims: claimDelete.count,
        deletedRewardTransactions: rewardTxDelete.count,
        resetUsers: userReset.count,
      };
    });

    logAdminAction(req, "rewards_reset_all_users", result);

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error) {
    console.error("[ADMIN REWARDS RESET ERROR]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
