import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let network = searchParams.get("network");

    // Convert network string to uppercase enum (mtn -> MTN)
    if (network) {
      const networkMap: { [key: string]: string } = {
        "mtn": "MTN",
        "airtel": "AIRTEL",
        "glo": "GLO",
        "9mobile": "NINEMOBILE",
      };
      network = networkMap[network.toLowerCase()] || network.toUpperCase();
    }

    const whereClause: any = {
      isActive: true,
      ...(network && { network }),
    };

    const plans = await prisma.plan.findMany({
      where: whereClause,
      orderBy: { price: "asc" },
    });

    return NextResponse.json({ success: true, data: plans }, { status: 200 });
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
