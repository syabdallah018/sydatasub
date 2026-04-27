import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceAdminMutationGuard, requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { ensureDefaultRewardCatalog, getSupportedManagedRewardTypes, ManagedRewardType } from "@/lib/rewards";

const rewardTypeValues = [
  "FIRST_DEPOSIT_2K",
  "DEPOSIT_10K_UPGRADE",
  "SALES_50GB_WEEKLY",
  "SALES_100GB_WEEKLY",
] as const satisfies readonly ManagedRewardType[];

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
    const support = await getSupportedManagedRewardTypes(prisma);

    const rewards =
      support.hasRewardsTable && support.supportedTypes.length > 0
        ? await prisma.reward.findMany({
            where: { type: { in: support.supportedTypes as any } },
            orderBy: { title: "asc" },
          })
        : [];

    return NextResponse.json(
      { success: true, data: rewards, supportedTypes: support.supportedTypes },
      { status: 200 }
    );
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
    const support = await getSupportedManagedRewardTypes(prisma);

    if (!support.hasRewardsTable) {
      return NextResponse.json(
        { success: false, error: "Rewards are not ready in this database yet." },
        { status: 503 }
      );
    }

    if (!support.supportedTypes.includes(data.type)) {
      return NextResponse.json(
        { success: false, error: "Ahh, sorry, that reward type is not ready in this database yet." },
        { status: 400 }
      );
    }

    const reward = await prisma.reward.create({
      data: {
        ...data,
        type: data.type as any,
      },
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
