import { NextRequest, NextResponse } from "next/server";
import { enforceAdminMutationGuard, requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { purchaseData as purchaseFromSmeplug, purchaseAirtime as purchaseAirtimeSmeplug } from "@/lib/smeplug";
import { purchaseData as purchaseFromSaiful, purchaseAirtime as purchaseAirtimeSaiful } from "@/lib/saiful";
import { purchaseData as purchaseFromAlrahuz, purchaseAirtime as purchaseAirtimeAlrahuz } from "@/lib/alrahuz.mjs";
import { purchaseData as purchaseFromAmysub } from "@/lib/amysub";
import { purchaseData as purchaseFromDatabills } from "@/lib/databills";
import { purchaseDataByPlan } from "@/lib/data-provider.mjs";
import { isSimDispenseError, isTimeoutError, SIM_CONFIG_PREFIX, TIMEOUT_PREFIX } from "@/lib/purchase-utils";
import { checkAndAwardRewards } from "@/lib/rewards";
import { sendPushToUser } from "@/lib/push";
import { z } from "zod";

const requestSchema = z.object({
  reference: z.string().min(1, "Transaction reference is required"),
  action: z.enum(["retry", "refund", "mark_success", "mark_failed"]).default("retry"),
  adminNote: z.string().optional(),
});

export const maxDuration = 60;

function inferNetworkId(desc: string = "", phone: string = ""): number {
  const lower = desc.toLowerCase();
  if (lower.includes("mtn")) return 1;
  if (lower.includes("glo")) return 2;
  if (lower.includes("9mobile") || lower.includes("etisalat")) return 3;
  if (lower.includes("airtel")) return 4;
  return 1;
}

export async function POST(req: NextRequest) {
  try {
    const originError = enforceAdminMutationGuard(req);
    if (originError) return originError;

    await requireAdmin(req);

    const body = await req.json();
    const { reference, action, adminNote } = requestSchema.parse(body);

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

    // 1. Handle Admin Mark Success (Manual Delivery Confirmed)
    if (action === "mark_success") {
      const isAirtime = transaction.type === "AIRTIME_PURCHASE";
      const serviceName = isAirtime ? "Airtime" : "Data";
      const itemDesc = transaction.plan?.sizeLabel || (transaction.plan?.name) || `₦${transaction.amount}`;
      const successDescription = adminNote?.trim()
        ? `Manual Delivery: ${adminNote.trim()}`
        : `Delivered manually / verified by Admin`;

      await prisma.transaction.update({
        where: { reference },
        data: {
          status: "SUCCESS",
          description: successDescription,
        },
      });

      if (transaction.userId) {
        await checkAndAwardRewards(transaction.userId).catch((err) =>
          console.error("[REWARDS ERROR] Admin mark success reward check failed:", err)
        );

        sendPushToUser(
          transaction.userId,
          `${serviceName} Delivered! 🚀`,
          `Your ${serviceName.toLowerCase()} order (${itemDesc}) for ${transaction.phone} has been verified and delivered successfully! Ref: ${reference}`
        ).catch((err) => console.error("[PUSH ERROR] Success push failed:", err));
      }

      return NextResponse.json({
        success: true,
        status: "SUCCESS",
        message: `Transaction ${reference} marked as SUCCESS and customer notified.`,
        reference,
      });
    }

    // 2. Handle Admin Mark Failed / Refund Action
    if (action === "refund" || action === "mark_failed") {
      const refundKobo = transaction.amount * 100;
      const failDescription = adminNote?.trim()
        ? `Cancelled and refunded by Admin: ${adminNote.trim()}`
        : "Cancelled and refunded by Admin";

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
            description: failDescription,
          },
        });
      });

      if (transaction.userId) {
        sendPushToUser(
          transaction.userId,
          "Order Cancelled & Refunded",
          `Your queued order of ₦${transaction.amount} has been refunded to your wallet. Ref: ${reference}`
        ).catch((err) => console.error("[PUSH ERROR] Refund push failed:", err));
      }

      return NextResponse.json({
        success: true,
        status: "REFUNDED",
        message: `Transaction ${reference} cancelled and refunded (₦${transaction.amount}) to customer wallet.`,
        reference,
      });
    }

    // 3. Handle Admin Retry Action
    if (transaction.type === "AIRTIME_PURCHASE") {
      const netId = inferNetworkId(transaction.description || "", transaction.phone);
      console.log(`[ADMIN AIRTIME RETRY] Attempting airtime purchase for ref ${reference}, phone ${transaction.phone}, networkId ${netId}`);

      let apiResult;
      try {
        if (transaction.apiUsed === "API_C") {
          apiResult = await purchaseAirtimeAlrahuz({
            network: netId,
            amount: transaction.amount,
            phone: transaction.phone,
            reference: transaction.reference,
          });
        } else if (transaction.apiUsed === "API_B") {
          apiResult = await purchaseAirtimeSaiful({
            mobileNumber: transaction.phone,
            amount: transaction.amount,
            network: netId,
          });
        } else {
          apiResult = await purchaseAirtimeSmeplug({
            networkId: netId,
            amount: transaction.amount,
            phone: transaction.phone,
            reference: transaction.reference,
          });
        }
      } catch (err: any) {
        apiResult = {
          success: false,
          isTimeout: isTimeoutError(err),
          message: err.message || "Provider retry exception",
        };
      }

      if (apiResult.success) {
        await prisma.transaction.update({
          where: { reference },
          data: {
            status: "SUCCESS",
            description: apiResult.message || "Airtime delivered via Admin Retry",
            externalReference: apiResult.externalReference || undefined,
          },
        });

        if (transaction.userId) {
          sendPushToUser(
            transaction.userId,
            "Airtime Delivered! 🚀",
            `Your queued airtime order (₦${transaction.amount}) for ${transaction.phone} has now been delivered successfully! Ref: ${reference}`
          ).catch((err) => console.error("[PUSH ERROR] Success push failed:", err));
        }

        return NextResponse.json({
          success: true,
          status: "SUCCESS",
          message: apiResult.message || "Airtime order delivered successfully!",
          reference,
        });
      } else {
        const isTimeout = (apiResult as any).isTimeout || isTimeoutError(apiResult.message);
        const updatedDescription = isTimeout
          ? `${TIMEOUT_PREFIX} ${apiResult.message || "Provider gateway timeout on retry"}`
          : apiResult.message || "Provider returned failure on retry";

        await prisma.transaction.update({
          where: { reference },
          data: {
            description: updatedDescription,
            externalReference: apiResult.externalReference || undefined,
          },
        });

        return NextResponse.json({
          success: false,
          status: isTimeout ? "PENDING" : "FAILED_PROVIDER",
          message: apiResult.message || "Provider failed to dispense",
          reference,
        });
      }
    }

    // DATA_PURCHASE retry
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
      const isTimeout = (apiResult as any).isTimeout || isTimeoutError(apiResult.message);
      const updatedDescription = isTimeout
        ? `${TIMEOUT_PREFIX} ${apiResult.message || "Provider gateway timeout on retry"}`
        : isSimError
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
        status: (isSimError || isTimeout) ? "PENDING" : "FAILED_PROVIDER",
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
