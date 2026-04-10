import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAdminToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    // Verify admin token
    const token = req.cookies.get("sy_session")?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized - no token" },
        { status: 401 }
      );
    }

    const admin = await verifyAdminToken(token);
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized - not admin" },
        { status: 403 }
      );
    }

    // Fetch all active plans grouped by network
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: [{ network: "asc" }, { sizeLabel: "asc" }],
    });

    // Group plans by network
    const groupedPlans = plans.reduce(
      (acc, plan) => {
        if (!acc[plan.network]) {
          acc[plan.network] = [];
        }
        acc[plan.network].push({
          id: plan.id,
          name: plan.name,
          sizeLabel: plan.sizeLabel,
          validity: plan.validity,
          network: plan.network,
          user_price: plan.user_price,
          agent_price: plan.agent_price,
          margin: plan.agent_price > 0 ? plan.user_price - plan.agent_price : 0,
          externalPlanId: plan.externalPlanId,
        });
        return acc;
      },
      {} as Record<string, any[]>
    );

    return NextResponse.json(
      {
        message: "Plans retrieved successfully",
        data: groupedPlans,
        summary: {
          totalPlans: plans.length,
          networks: Object.keys(groupedPlans),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[ADMIN LIST PLANS ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
