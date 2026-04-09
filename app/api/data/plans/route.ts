import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const network = searchParams.get("network");

    const whereClause = {
      isActive: true,
      ...(network && { network: network as any }),
    };

    const plans = await prisma.plan.findMany({
      where: whereClause,
      orderBy: { price: "asc" },
    });

    return NextResponse.json(plans, { status: 200 });
  } catch (error) {
    console.error("[DATA PLANS ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // This should be admin only
    const body = await req.json();
    const { name, price, sizeLabel, validity, network, apiSource, externalPlanId, externalNetworkId } = body;

    const plan = await prisma.plan.create({
      data: {
        name,
        price: parseFloat(price),
        sizeLabel,
        validity,
        network,
        apiSource,
        externalPlanId: parseInt(externalPlanId),
        externalNetworkId: parseInt(externalNetworkId),
        isActive: true,
      },
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    console.error("[CREATE PLAN ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
