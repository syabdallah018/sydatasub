import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updatePlanSchema = z.object({
  name: z.string().min(1).optional(),
  network: z.enum(["MTN", "GLO", "AIRTEL", "NINEMOBILE"]).optional(),
  sizeLabel: z.string().min(1).optional(),
  validity: z.string().min(1).optional(),
  price: z.number().min(50).optional(),
  apiSource: z.enum(["API_A", "API_B"]).optional(),
  externalPlanId: z.number().int().positive().optional(),
  externalNetworkId: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

/**
 * PATCH /api/admin/plans/[id] - Update plan
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(req);
    
    const { id } = await params;
    const body = await req.json();
    const data = updatePlanSchema.parse(body);

    // Check if plan exists
    const plan = await prisma.plan.findUnique({
      where: { id },
    });

    if (!plan) {
      return NextResponse.json(
        { error: "Plan not found" },
        { status: 404 }
      );
    }

    // Update plan
    const updated = await prisma.plan.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error: any) {
    console.error("[UPDATE PLAN ERROR]", error);

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

/**
 * DELETE /api/admin/plans/[id] - Delete plan
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(req);
    
    const { id } = await params;

    // Check if plan exists
    const plan = await prisma.plan.findUnique({
      where: { id },
    });

    if (!plan) {
      return NextResponse.json(
        { error: "Plan not found" },
        { status: 404 }
      );
    }

    // Delete plan (hard delete)
    await prisma.plan.delete({
      where: { id },
    });

    return NextResponse.json(
      { success: true, message: "Plan deleted" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[DELETE PLAN ERROR]", error);

    if (error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error.code === "P2025") {
      // Prisma record not found
      return NextResponse.json(
        { error: "Plan not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
