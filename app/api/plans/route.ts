import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyDeveloperRequest } from "@/lib/developer-auth";
import { getPlanPriceForUser } from "@/lib/pricing";

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

    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: [
        { network: "asc" },
        { user_price: "asc" },
      ],
    });

    const mappedPlans = plans.map((plan) => {
      const price = getPlanPriceForUser(plan, user);
      return {
        id: plan.externalPlanId,
        name: plan.name,
        network: plan.network,
        networkId: NETWORK_IDS[plan.network] || 0,
        size: plan.sizeLabel,
        validity: plan.validity,
        price, // Naira
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
