import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user's rewards with their status
    const userRewards = await prisma.userReward.findMany({
      where: { userId: user.userId },
      include: { reward: true },
      orderBy: { createdAt: "asc" },
    });

    // Format response
    const rewards = userRewards.map((ur) => ({
      id: ur.reward.id,
      type: ur.reward.type,
      title: ur.reward.title,
      description: ur.reward.description,
      amount: ur.reward.amount,
      status: ur.status,
      claimedAt: ur.claimedAt,
    }));

    return NextResponse.json(rewards, { status: 200 });
  } catch (error) {
    console.error("[REWARDS ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
