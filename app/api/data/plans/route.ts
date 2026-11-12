import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getUserCustomPriceMap } from "@/lib/pricing";
import { getOrSetCache } from "@/lib/cache";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let network = searchParams.get("network");

    if (network) {
      const networkMap: Record<string, string> = {
        mtn: "MTN",
        airtel: "AIRTEL",
        glo: "GLO",
      };
      network = networkMap[network.toLowerCase()] || network.toUpperCase();
    }

    const cacheKey = `plans_list_${network || "ALL"}`;

    // Use in-memory cache for the base plans list to reduce Neon DB reads
    const plans = await getOrSetCache(cacheKey, 60, async () => {
      return prisma.plan.findMany({
        where: {
          isActive: true,
          ...(network ? { network: network as any } : {}),
        },
        orderBy: [{ user_price: "asc" }, { price: "asc" }],
      });
    });

    const user = await getSessionUser(req).catch(() => null);
    const customPriceMap = user ? await getUserCustomPriceMap(user.id) : new Map<string, number>();

    const serializedPlans = plans.map((plan) => {
      const customPrice = customPriceMap.get(plan.id);
      let effectivePrice = plan.user_price > 0 ? plan.user_price : plan.price;
      if (customPrice && customPrice > 0) {
        effectivePrice = customPrice;
      } else if (user?.tier === "agent" && plan.agent_price > 0) {
        effectivePrice = plan.agent_price;
      }

      return {
        ...plan,
        price: effectivePrice,
        customPrice: customPrice ?? null,
      };
    });

    return NextResponse.json(
      { success: true, data: serializedPlans, plans: serializedPlans },
      {
        status: 200,
        headers: {
          "Cache-Control": user ? "private, no-cache" : "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("[DATA PLANS ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      user_price,
      agent_price,
      sizeLabel,
      validity,
      network,
      apiSource,
      externalPlanId,
      externalNetworkId,
      developerPlanId,
      planCode,
    } = body;

    const fallbackPrice = Number(user_price || agent_price || 0);

    const plan = await prisma.plan.create({
      data: {
        name,
        price: fallbackPrice,
        user_price: Number(user_price || fallbackPrice),
        agent_price: Number(agent_price || fallbackPrice),
        sizeLabel,
        validity,
        network,
        apiSource,
        externalPlanId: parseInt(externalPlanId, 10),
        externalNetworkId: parseInt(externalNetworkId, 10),
        developerPlanId: developerPlanId ? parseInt(developerPlanId, 10) : undefined,
        planCode: planCode?.trim() || undefined,
        isActive: true,
      },
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    console.error("[CREATE PLAN ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
