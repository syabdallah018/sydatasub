import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { RewardType } from "@prisma/client";
import { enforceAdminMutationGuard, requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { ensureDefaultRewardCatalog, REWARD_DEFINITIONS } from "@/lib/rewards";

const rewardTypeValues = [
  RewardType.FIRST_DEPOSIT_2K,
  RewardType.DEPOSIT_10K_UPGRADE,
  RewardType.SALES_50GB_WEEKLY,
  RewardType.SALES_100GB_WEEKLY,
];

const rewardSchema = z.object({
  type: z.enum(rewardTypeValues),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.number().int().positive("Amount must be greater than zero"),
  isActive: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    await ensureDefaultRewardCatalog(prisma);

    const rewards = await prisma.reward.findMany({
      where: { type: { in: rewardTypeValues } },
      orderBy: { title: "asc" },
    });

    return NextResponse.json({ success: true, data: rewards }, { status: 200 });
  } catch (error) {
    console.error("[ADMIN GET REWARDS ERROR]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const originError = enforceAdminMutationGuard(req);
    if (originError) return originError;

    await requireAdmin(req);
    const body = await req.json();
    const data = rewardSchema.parse(body);

    const reward = await prisma.reward.create({
      data,
    });

    return NextResponse.json({ success: true, data: reward }, { status: 201 });
  } catch (error) {
    console.error("[ADMIN CREATE REWARD ERROR]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
