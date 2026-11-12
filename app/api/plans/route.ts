import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyDeveloperRequest } from "@/lib/developer-auth";
import { getPlanPriceForUser, getUserCustomPriceMap } from "@/lib/pricing";
import { getOrSetCache } from "@/lib/cache";

const NETWORK_IDS: Record<string, number> = {
  MTN: 1,
  GLO: 2,
  NINEMOBILE: 3,
  AIRTEL: 4,
};

export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyDeveloperRequest(req);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const { user } = authResult;
    const customPriceMap = await getUserCustomPriceMap(user.id);

    // Cache active plans to avoid repetitive Neon DB wakes
    const plans = await getOrSetCache("active_plans_dev", 60, async () => {
      return prisma.plan.findMany({
        where: { isActive: true },
        orderBy: [
          { network: "asc" },
          { user_price: "asc" },
        ],
      });
    });

    const mappedPlans = plans.map((plan) => {
      const customPrice = customPriceMap.get(plan.id);
      const price = getPlanPriceForUser(plan, user, customPrice);

      // Independent Plan ID:
      // Canonical independent integer ID: developerPlanId (or fallback to externalPlanId if not explicitly set)
      const independentPlanId = plan.developerPlanId ?? plan.externalPlanId;
      const canonicalCode =
        plan.planCode ||
        `${plan.network}-${plan.sizeLabel.replace(/\s+/g, "")}-${plan.category}`.toUpperCase();

      return {
        id: independentPlanId, // Canonical provider-independent Plan ID
        planId: independentPlanId,
        planCode: canonicalCode,
        name: plan.name,
        network: plan.network,
        networkId: NETWORK_IDS[plan.network] || 0,
        category: plan.category,
        size: plan.sizeLabel,
        validity: plan.validity,
        price, // Naira, honoring individual pricing
        isCustomPrice: customPrice !== undefined && customPrice !== null && customPrice > 0,
      };
    });

    return NextResponse.json(
      { success: true, plans: mappedPlans },
      { status: 200 }
    );
  } catch (error) {
    console.error("[DEV PLANS API ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
