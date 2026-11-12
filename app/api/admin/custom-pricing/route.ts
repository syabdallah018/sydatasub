import { NextRequest, NextResponse } from "next/server";
import { enforceAdminMutationGuard, requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { invalidateCache } from "@/lib/cache";
import { z } from "zod";

const createCustomPriceSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  planId: z.string().min(1, "Plan ID is required"),
  price: z.number().int().positive("Price must be a positive integer in Naira"),
});

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/custom-pricing
 * List all custom individual prices, with optional search and user filtering
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const planId = searchParams.get("planId");
    const query = searchParams.get("q")?.trim();

    const where: any = {};
    if (userId) where.userId = userId;
    if (planId) where.planId = planId;
    if (query) {
      where.OR = [
        { user: { phone: { contains: query } } },
        { user: { fullName: { contains: query, mode: "insensitive" } } },
        { user: { email: { contains: query, mode: "insensitive" } } },
        { plan: { name: { contains: query, mode: "insensitive" } } },
        { plan: { sizeLabel: { contains: query, mode: "insensitive" } } },
      ];
    }

    const customPrices = await prisma.userCustomPrice.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
            tier: true,
            balance: true,
          },
        },
        plan: {
          select: {
            id: true,
            name: true,
            network: true,
            sizeLabel: true,
            validity: true,
            user_price: true,
            agent_price: true,
            category: true,
            developerPlanId: true,
            planCode: true,
            isActive: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: customPrices,
    });
  } catch (error: any) {
    console.error("[ADMIN GET CUSTOM PRICING ERROR]", error);
    if (error.message?.includes("Unauthorized")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/admin/custom-pricing
 * Create or update a custom price for a specific user and plan
 */
export async function POST(req: NextRequest) {
  try {
    const originError = enforceAdminMutationGuard(req);
    if (originError) return originError;

    await requireAdmin(req);

    const body = await req.json().catch(() => ({}));
    const { userId, planId, price } = createCustomPriceSchema.parse(body);

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, phone: true },
    });
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Verify plan exists
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      select: { id: true, name: true, user_price: true, agent_price: true },
    });
    if (!plan) {
      return NextResponse.json({ success: false, error: "Plan not found" }, { status: 404 });
    }

    // Upsert the custom price
    const customPrice = await prisma.userCustomPrice.upsert({
      where: {
        userId_planId: { userId, planId },
      },
      create: {
        userId,
        planId,
        price,
      },
      update: {
        price,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
            tier: true,
          },
        },
        plan: {
          select: {
            id: true,
            name: true,
            network: true,
            sizeLabel: true,
            user_price: true,
            agent_price: true,
          },
        },
      },
    });

    invalidateCache("plans_list_");
    invalidateCache("active_plans_dev");

    return NextResponse.json({
      success: true,
      message: `Custom price of ₦${price.toLocaleString()} set for ${user.fullName} on ${plan.name}.`,
      data: customPrice,
    });
  } catch (error: any) {
    console.error("[ADMIN POST CUSTOM PRICING ERROR]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0].message }, { status: 400 });
    }
    if (error.message?.includes("Unauthorized")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 });
  }
}
