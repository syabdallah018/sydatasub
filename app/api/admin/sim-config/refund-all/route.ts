import { NextRequest, NextResponse } from "next/server";
import { enforceAdminMutationGuard, requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { SIM_CONFIG_PREFIX, TIMEOUT_PREFIX } from "@/lib/purchase-utils";
import { sendPushToUser } from "@/lib/push";
import { z } from "zod";

const refundAllSchema = z.object({
  queueType: z.enum(["sim", "timeout", "airtime", "all"]).default("all"),
  adminNote: z.string().optional(),
  referenceIds: z.array(z.string()).optional(),
});

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const originError = enforceAdminMutationGuard(req);
    if (originError) return originError;

    await requireAdmin(req);

    const body = await req.json().catch(() => ({}));
    const { queueType, adminNote, referenceIds } = refundAllSchema.parse(body);

    let whereClause: any = {
      status: "PENDING",
    };

    if (referenceIds && referenceIds.length > 0) {
      whereClause.reference = { in: referenceIds };
    } else if (queueType === "sim") {
      whereClause.type = "DATA_PURCHASE";
      whereClause.AND = [
        { NOT: { description: { startsWith: TIMEOUT_PREFIX } } },
        {
          OR: [
            { description: { startsWith: SIM_CONFIG_PREFIX } },
            { description: { contains: "sim", mode: "insensitive" } },
            { description: { contains: "dispense", mode: "insensitive" } },
          ],
        },
      ];
    } else if (queueType === "timeout") {
      whereClause.OR = [
        { description: { startsWith: TIMEOUT_PREFIX } },
        { description: { contains: "timeout", mode: "insensitive" } },
        { description: { contains: "timed out", mode: "insensitive" } },
        { description: { contains: "gateway timeout", mode: "insensitive" } },
        { description: { contains: "in flight", mode: "insensitive" } },
      ];
    } else if (queueType === "airtime") {
      whereClause.type = "AIRTIME_PURCHASE";
      whereClause.NOT = { description: { startsWith: TIMEOUT_PREFIX } };
    }

    const transactionsToRefund = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, fullName: true, phone: true } },
      },
      take: 200,
    });

    if (transactionsToRefund.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        totalRefundedNaira: 0,
        message: "No pending transactions found to refund.",
      });
    }

    let refundedCount = 0;
    let totalRefundedNaira = 0;
    const errors: string[] = [];

    const failDescription = adminNote?.trim()
      ? `Cancelled and refunded in bulk by Admin: ${adminNote.trim()}`
      : "Cancelled and refunded in bulk by Admin";

    // Process each refund in atomic units so one user error does not abort the entire batch
    for (const tx of transactionsToRefund) {
      try {
        const refundKobo = (tx.amount || 0) * 100;

        await prisma.$transaction(async (prismaTx) => {
          if (tx.userId && refundKobo > 0) {
            await prismaTx.user.update({
              where: { id: tx.userId },
              data: {
                balance: { increment: refundKobo },
              },
            });
          }

          await prismaTx.transaction.update({
            where: { id: tx.id },
            data: {
              status: "FAILED",
              description: failDescription,
            },
          });
        });

        refundedCount++;
        totalRefundedNaira += tx.amount || 0;

        if (tx.userId) {
          sendPushToUser(
            tx.userId,
            "Order Cancelled & Refunded",
            `Your queued order of ₦${tx.amount} has been refunded to your wallet. Ref: ${tx.reference}`
          ).catch((pushErr) => console.warn(`[REFUND PUSH WARNING] ${tx.reference}:`, pushErr));
        }
      } catch (err: any) {
        console.error(`[BULK REFUND ERROR] Tx ${tx.reference}:`, err);
        errors.push(`${tx.reference}: ${err.message || "Failed"}`);
      }
    }

    return NextResponse.json({
      success: true,
      count: refundedCount,
      totalRefundedNaira,
      failedCount: errors.length,
      errors: errors.length > 0 ? errors.slice(0, 5) : undefined,
      message: `Successfully refunded ${refundedCount} transaction(s) totaling ₦${totalRefundedNaira.toLocaleString()}.`,
    });
  } catch (error: any) {
    console.error("[ADMIN SIM CONFIG REFUND ALL ERROR]", error);
    if (error.message?.includes("Unauthorized")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
