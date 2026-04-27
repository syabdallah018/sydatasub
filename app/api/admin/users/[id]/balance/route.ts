import { NextRequest, NextResponse } from "next/server";
import { enforceAdminMutationGuard, logAdminAction, requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const balanceSchema = z.object({
  action: z.enum(["ADD", "DEDUCT"]),
  amount: z.number().positive("Amount must be greater than 0"),
});

/**
 * POST /api/admin/users/[id]/balance - Add or deduct user balance
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const originError = enforceAdminMutationGuard(req);
    if (originError) return originError;

    await requireAdmin(req);

    const body = await req.json();
    const { action, amount } = balanceSchema.parse(body);

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, balance: true, phone: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Validate DEDUCT doesn't go negative
    const amountInKobo = amount * 100;
    if (action === "DEDUCT" && user.balance < amountInKobo) {
      return NextResponse.json(
        { error: "Insufficient balance for deduction" },
        { status: 400 }
      );
    }

    // Update balance atomically
    const updatedUser = await prisma.$transaction(async (tx) => {
      const delta = action === "ADD" ? amountInKobo : -amountInKobo;

      // Update user balance
      const updated = await tx.user.update({
        where: { id },
        data: {
          balance: { increment: delta },
        },
        select: {
          id: true,
          balance: true,
          fullName: true,
          phone: true,
        },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          userId: id,
          phone: user.phone,
          type: "WALLET_FUNDING",
          status: "SUCCESS",
          amount,
          reference: `ADMIN-${action}-${id}-${Date.now()}`,
          description: `Admin ${action === "ADD" ? "credited" : "deducted"} ₦${amount}`,
        },
      });

      return updated;
    });

    logAdminAction(req, "user_balance_adjustment", {
      targetUserId: id,
      action,
      amountNaira: amount,
      resultingBalanceKobo: updatedUser.balance,
    });

    return NextResponse.json(
      {
        success: true,
        message: `Balance ${action === "ADD" ? "increased" : "decreased"} by ₦${amount}`,
        user: updatedUser,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[UPDATE BALANCE ERROR]", error);

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
