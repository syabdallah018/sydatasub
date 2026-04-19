import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let network = searchParams.get("network");

    if (network) {
      const networkMap: Record<string, string> = {
        mtn: "MTN",
        airtel: "AIRTEL",
        glo: "GLO",
        "9mobile": "NINEMOBILE",
      };
      network = networkMap[network.toLowerCase()] || network.toUpperCase();
    }

    const plans = await prisma.plan.findMany({
      where: {
        isActive: true,
        ...(network ? { network: network as any } : {}),
      },
      orderBy: [{ user_price: "asc" }, { price: "asc" }],
    });

    const serializedPlans = plans.map((plan) => ({
      ...plan,
      price: plan.user_price > 0 ? plan.user_price : plan.price,
    }));

    return NextResponse.json(
      { success: true, data: serializedPlans, plans: serializedPlans },
      { status: 200 }
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
        isActive: true,
      },
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    console.error("[CREATE PLAN ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
