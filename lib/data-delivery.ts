import { prisma } from "@/lib/db";
import * as smeplug from "@/lib/smeplug";
import * as saiful from "@/lib/saiful";
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

    let result;

    // Call appropriate API based on plan's API source
    if (plan.apiSource === "API_A") {
      result = await smeplug.purchaseData({
        externalNetworkId: plan.externalNetworkId,
        externalPlanId: plan.externalPlanId,
        phone: transaction.phone,
        reference: transaction.reference,
      });
    } else {
      result = await saiful.purchaseData({
        plan: plan.externalPlanId,
        mobileNumber: transaction.phone,
        network: plan.network,
        reference: transaction.reference,
      });
    }

    // Update transaction with result
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: result.success ? "SUCCESS" : "FAILED",
        externalReference: result.externalReference || undefined,
        description: result.message,
      },
    });

    return {
      success: result.success,
      message: result.message,
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
      message: `Delivery error: ${error.message}`,
    };
  }
}
