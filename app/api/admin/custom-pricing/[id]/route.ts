import { NextRequest, NextResponse } from "next/server";
import { enforceAdminMutationGuard, requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { invalidateCache } from "@/lib/cache";
import { z } from "zod";

const updateCustomPriceSchema = z.object({
  price: z.number().int().positive("Price must be a positive integer in Naira"),
});

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/custom-pricing/[id]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(req);
    const { id } = await params;

    const customPrice = await prisma.userCustomPrice.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, fullName: true, phone: true, email: true, tier: true },
        },
        plan: {
          select: {
            id: true,
            name: true,
            network: true,
            sizeLabel: true,
            user_price: true,
            agent_price: true,
          },
        },
      },
    });

    if (!customPrice) {
      return NextResponse.json({ success: false, error: "Custom price record not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: customPrice });
  } catch (error: any) {
    console.error("[ADMIN GET CUSTOM PRICING BY ID ERROR]", error);
    if (error.message?.includes("Unauthorized")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/custom-pricing/[id]
 * Update custom price amount
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const originError = enforceAdminMutationGuard(req);
    if (originError) return originError;

    await requireAdmin(req);
    const { id } = await params;

    const body = await req.json().catch(() => ({}));
    const { price } = updateCustomPriceSchema.parse(body);

    const updated = await prisma.userCustomPrice.update({
      where: { id },
      data: { price },
      include: {
        user: { select: { fullName: true, phone: true } },
        plan: { select: { name: true } },
      },
    });

    invalidateCache("plans_list_");
    invalidateCache("active_plans_dev");

    return NextResponse.json({
      success: true,
      message: `Updated custom price to ₦${price.toLocaleString()} for ${updated.user.fullName} on ${updated.plan.name}.`,
      data: updated,
    });
  } catch (error: any) {
    console.error("[ADMIN PATCH CUSTOM PRICING ERROR]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0].message }, { status: 400 });
    }
    if (error.message?.includes("Unauthorized")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/custom-pricing/[id]
 * Delete custom price record (reverts user to their default tier price)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const originError = enforceAdminMutationGuard(req);
    if (originError) return originError;

    await requireAdmin(req);
    const { id } = await params;

    const deleted = await prisma.userCustomPrice.delete({
      where: { id },
      include: {
        user: { select: { fullName: true } },
        plan: { select: { name: true } },
      },
    });

    invalidateCache("plans_list_");
    invalidateCache("active_plans_dev");

    return NextResponse.json({
      success: true,
      message: `Removed custom price for ${deleted.user.fullName} on ${deleted.plan.name}. User will now receive standard tier pricing.`,
    });
  } catch (error: any) {
    console.error("[ADMIN DELETE CUSTOM PRICING ERROR]", error);
    if (error.message?.includes("Unauthorized")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 });
  }
}
