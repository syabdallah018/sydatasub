import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { claimRewards, getRewardDashboard } from "@/lib/rewards";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const utf8Headers = { "Content-Type": "application/json; charset=utf-8" };

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: utf8Headers });
    }

    const body = await request.json().catch(() => ({}));
    const rewardIds = Array.isArray(body.rewardIds)
      ? body.rewardIds.filter((value: unknown) => typeof value === "string" && value)
      : undefined;

    const result = await claimRewards(sessionUser.userId, rewardIds);
    if (result.claimedCount === 0) {
      return NextResponse.json(
        { error: "No available rewards to claim" },
        { status: 400, headers: utf8Headers }
      );
    }

    const dashboard = await getRewardDashboard(sessionUser.userId);

    return NextResponse.json(
      {
        message: `Claimed ${result.claimedCount} reward${result.claimedCount > 1 ? "s" : ""}.`,
        claimedCount: result.claimedCount,
        totalAmount: result.totalAmount,
        dashboard,
      },
      { headers: utf8Headers }
    );
  } catch (error) {
    console.error("[REWARDS][CLAIM]", error);
    return NextResponse.json(
      { error: "Failed to claim rewards" },
      { status: 500, headers: utf8Headers }
    );
  }
}
