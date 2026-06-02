import { prisma } from "@/lib/db";
import * as smeplug from "@/lib/smeplug";
import * as saiful from "@/lib/saiful";
import { purchaseData as purchaseFromAlrahuz } from "@/lib/alrahuz.mjs";
import { purchaseDataByPlan } from "@/lib/data-provider.mjs";
import {
  normalizeProviderFailureMessage,
  DATA_PURCHASE_SUCCESS_MESSAGE,
  PURCHASE_FAILED_GENERIC_MESSAGE,
} from "@/lib/purchase-utils";
import { Transaction } from "@prisma/client";

/**
 * Delivers data to guest after successful Flutterwave payment
 * Called from webhook after payment confirmation
 */
export async function deliverGuestData(transaction: Transaction) {
  try {
    // Fetch plan details
    const plan = await prisma.plan.findUnique({
      where: { id: transaction.planId || "" },
    });

    if (!plan) {
      console.error("[DATA DELIVER] Plan not found:", transaction.planId);
      return {
        success: false,
        message: "Plan not found",
      };
    }

    const result = await purchaseDataByPlan(
      plan,
      {
        phone: transaction.phone,
        reference: transaction.reference,
      },
      {
        API_A: smeplug.purchaseData,
        API_B: saiful.purchaseData,
        API_C: purchaseFromAlrahuz,
      }
    );

    // Update transaction with result
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: result.success ? "SUCCESS" : "FAILED",
        externalReference: result.externalReference || undefined,
        description: result.success ? result.message : normalizeProviderFailureMessage(result.message),
      },
    });

    return {
      success: result.success,
      message: result.success ? DATA_PURCHASE_SUCCESS_MESSAGE : PURCHASE_FAILED_GENERIC_MESSAGE,
      externalReference: result.externalReference,
    };
  } catch (error: any) {
    console.error("[DATA DELIVER ERROR]", error);

    // Update transaction as failed
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: "FAILED",
        description: `Delivery error: ${error.message}`,
      },
    });

    return {
      success: false,
      message: PURCHASE_FAILED_GENERIC_MESSAGE,
    };
  }
}
