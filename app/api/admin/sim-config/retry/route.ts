import { NextRequest, NextResponse } from "next/server";
import { enforceAdminMutationGuard, requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { purchaseData as purchaseFromSmeplug } from "@/lib/smeplug";
import { purchaseData as purchaseFromSaiful } from "@/lib/saiful";
import { purchaseData as purchaseFromAlrahuz } from "@/lib/alrahuz.mjs";
import { purchaseData as purchaseFromAmysub } from "@/lib/amysub";
import { purchaseData as purchaseFromDatabills } from "@/lib/databills";
import { purchaseDataByPlan } from "@/lib/data-provider.mjs";
import { isSimDispenseError, SIM_CONFIG_PREFIX } from "@/lib/purchase-utils";
import { checkAndAwardRewards } from "@/lib/rewards";
import { sendPushToUser } from "@/lib/push";
import { z } from "zod";

const requestSchema = z.object({
  reference: z.string().min(1, "Transaction reference is required"),
  action: z.enum(["retry", "refund"]).default("retry"),
});

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const originError = enforceAdminMutationGuard(req);
    if (originError) return originError;

    await requireAdmin(req);

    const body = await req.json();
    const { reference, action } = requestSchema.parse(body);

    const transaction = await prisma.transaction.findUnique({
      where: { reference },
      include: {
        plan: true,
        user: true,
      },
    });

    if (!transaction) {
      return NextResponse.json({ success: false, error: "Transaction not found" }, { status: 404 });
    }

    if (transaction.status !== "PENDING") {
      return NextResponse.json(
        { success: false, error: `Transaction is already marked as ${transaction.status}` },
        { status: 400 }
      );
    }

    // Handle Admin Refund Action
    if (action === "refund") {
      const refundKobo = transaction.amount * 100;

      await prisma.$transaction(async (tx) => {
        if (transaction.userId) {
          await tx.user.update({
            where: { id: transaction.userId },
            data: {
              balance: { increment: refundKobo },
            },
          });
        }

        await tx.transaction.update({
          where: { reference },
          data: {
            status: "FAILED",
            description: "Cancelled and refunded by Admin: SIM route unavailable",
          },
        });
      });

      if (transaction.userId) {
        sendPushToUser(
          transaction.userId,
          "Order Refunded",
          `Your queued data order of ₦${transaction.amount} has been refunded to your wallet. Ref: ${reference}`
        ).catch((err) => console.error("[PUSH ERROR] Refund push failed:", err));
      }

      return NextResponse.json({
        success: true,
        status: "REFUNDED",
        message: `Transaction ${reference} cancelled and refunded (₦${transaction.amount}) to customer wallet.`,
      });
    }

    // Handle Admin Retry Action
    if (!transaction.plan) {
      return NextResponse.json(
        { success: false, error: "Cannot retry transaction without associated Plan configuration" },
        { status: 400 }
      );
    }

    const plan = transaction.plan;

    console.log(`[ADMIN SIM RETRY] Attempting purchase for ref ${reference}, phone ${transaction.phone}, provider: ${plan.apiSource}`);

    const apiResult = await purchaseDataByPlan(
      plan,
      {
        phone: transaction.phone,
        reference: transaction.reference,
      },
      {
        API_A: purchaseFromSmeplug,
        API_B: purchaseFromSaiful,
        API_C: purchaseFromAlrahuz,
        API_D: purchaseFromAmysub,
        API_E: purchaseFromDatabills,
      }
    );

    if (apiResult.success) {
      await prisma.transaction.update({
        where: { reference },
        data: {
          status: "SUCCESS",
          description: apiResult.message || "Delivered via Admin SIM Retry",
          externalReference: apiResult.externalReference || undefined,
        },
      });

      if (transaction.userId) {
        await checkAndAwardRewards(transaction.userId).catch((err) =>
          console.error("[REWARDS ERROR] Admin retry reward check failed:", err)
        );

        sendPushToUser(
          transaction.userId,
          "Data Delivered! 🚀",
          `Your queued data bundle (${plan.sizeLabel} ${plan.network}) for ${transaction.phone} has now been delivered successfully! Ref: ${reference}`
        ).catch((err) => console.error("[PUSH ERROR] Success push failed:", err));
      }

      return NextResponse.json({
        success: true,
        status: "SUCCESS",
        message: apiResult.message || "Data order delivered successfully!",
        reference,
      });
    } else {
      const isSimError = isSimDispenseError(apiResult.message);
      const updatedDescription = isSimError
        ? `${SIM_CONFIG_PREFIX} ${apiResult.message || "Awaiting SIM configuration"}`
        : apiResult.message || "Provider returned failure";

      await prisma.transaction.update({
        where: { reference },
        data: {
          description: updatedDescription,
          externalReference: apiResult.externalReference || undefined,
        },
      });

      return NextResponse.json({
        success: false,
        status: isSimError ? "PENDING" : "FAILED_PROVIDER",
        message: apiResult.message || "Provider failed to dispense",
        reference,
      });
    }
  } catch (error: any) {
    console.error("[ADMIN SIM RETRY ERROR]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0].message }, { status: 400 });
    }

    if (error.message?.includes("Unauthorized")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 });
  }
}
