import { NextRequest, NextResponse } from "next/server";
import { enforceAdminMutationGuard, requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updatePlanSchema = z.object({
  name: z.string().min(1).optional(),
  network: z.enum(["MTN", "GLO", "AIRTEL", "NINEMOBILE"]).optional(),
  sizeLabel: z.string().min(1).optional(),
  validity: z.string().min(1).optional(),
  user_price: z.number().min(50).optional(),
  agent_price: z.number().min(50).optional(),
  apiSource: z.enum(["API_A", "API_B"]).optional(),
  externalPlanId: z.number().int().positive().optional(),
  externalNetworkId: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const originError = enforceAdminMutationGuard(req);
    if (originError) return originError;

    await requireAdmin(req);

    const { id } = await params;
    const body = await req.json();
    const data = updatePlanSchema.parse(body);

    const plan = await prisma.plan.findUnique({
      where: { id },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const nextUserPrice = data.user_price ?? plan.user_price;
    const nextAgentPrice = data.agent_price ?? plan.agent_price;

    if (nextAgentPrice > nextUserPrice) {
      return NextResponse.json(
        { error: "Agent price cannot exceed user price" },
        { status: 400 }
      );
    }

    const updated = await prisma.plan.update({
      where: { id },
      data: {
        ...data,
        price: nextUserPrice,
      },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error: any) {
    console.error("[UPDATE PLAN ERROR]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }

    if (error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const originError = enforceAdminMutationGuard(req);
    if (originError) return originError;

    await requireAdmin(req);

    const { id } = await params;

    const plan = await prisma.plan.findUnique({
      where: { id },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    await prisma.plan.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Plan deleted" }, { status: 200 });
  } catch (error: any) {
    console.error("[DELETE PLAN ERROR]", error);

    if (error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
