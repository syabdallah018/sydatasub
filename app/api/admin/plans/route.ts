import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const planSchema = z.object({
  name: z.string().min(1, "Name is required"),
  network: z.enum(["MTN", "GLO", "AIRTEL", "NINEMOBILE"]),
  sizeLabel: z.string().min(1, "Size label is required"),
  validity: z.string().min(1, "Validity is required"),
  price: z.number().min(50, "Minimum price is ₦50"),
  apiSource: z.enum(["API_A", "API_B"]),
  externalPlanId: z.number().int().positive(),
  externalNetworkId: z.number().int().positive(),
});

/**
 * GET /api/admin/plans - Get all plans
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);

    const plans = await prisma.plan.findMany({
      orderBy: [{ network: "asc" }, { price: "asc" }],
    });

    return NextResponse.json(plans, { status: 200 });
  } catch (error: any) {
    console.error("[GET PLANS ERROR]", error);

    if (error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/plans - Create new plan
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);

    const body = await req.json();
    const data = planSchema.parse(body);

    // Check for duplicate unique constraint
    const existing = await prisma.plan.findFirst({
      where: {
        apiSource: data.apiSource,
        externalPlanId: data.externalPlanId,
        externalNetworkId: data.externalNetworkId,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Plan already exists for this API and external IDs" },
        { status: 400 }
      );
    }

    const plan = await prisma.plan.create({
      data: {
        ...data,
        isActive: true,
      },
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error: any) {
    console.error("[CREATE PLAN ERROR]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    if (error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
