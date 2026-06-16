import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { purchaseData as purchaseFromSmeplug } from "@/lib/smeplug";
import { purchaseData as purchaseFromSaiful } from "@/lib/saiful";
import { purchaseData as purchaseFromAlrahuz } from "@/lib/alrahuz.mjs";
import { purchaseData as purchaseFromAmysub } from "@/lib/amysub";
import { purchaseDataByPlan } from "@/lib/data-provider.mjs";
import { getPlanPriceForUser } from "@/lib/pricing";
import {
  normalizeProviderFailureMessage,
  DATA_PURCHASE_SUCCESS_MESSAGE,
  PURCHASE_FAILED_GENERIC_MESSAGE,
} from "@/lib/purchase-utils";
import { z } from "zod";

const guestPurchaseSchema = z.object({
  planId: z.string().min(1, "Plan ID is required"),
  phone: z.string().regex(/^0[0-9]{10}$/, "Invalid phone number"),
  isGuest: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { planId, phone } = guestPurchaseSchema.parse(body);

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const reference = `GUEST-DATA-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const amount = getPlanPriceForUser(plan, { tier: "user" });

    await prisma.transaction.create({
      data: {
        guestPhone: phone,
        type: "DATA_PURCHASE",
        amount,
        status: "PENDING",
        reference,
        description: `${plan.name} -> ${phone}`,
        phone,
        planId,
        apiUsed: plan.apiSource,
      },
    });

    try {
      const apiResult = await purchaseDataByPlan(
        plan,
        {
          phone,
          reference,
        },
        {
          API_A: purchaseFromSmeplug,
          API_B: purchaseFromSaiful,
          API_C: purchaseFromAlrahuz,
          API_D: purchaseFromAmysub,
        }
      );

      if (apiResult.success) {
        await prisma.transaction.update({
          where: { reference },
          data: {
            status: "SUCCESS",
            externalReference: apiResult.externalReference || undefined,
            description: apiResult.message || "Data delivered successfully",
          },
        });

        return NextResponse.json(
          {
            success: true,
            message: DATA_PURCHASE_SUCCESS_MESSAGE,
            reference,
          },
          { status: 200 }
        );
      }

      const errorMessage = normalizeProviderFailureMessage(apiResult.message);
      await prisma.transaction.update({
        where: { reference },
        data: { status: "FAILED", description: errorMessage },
      });

      return NextResponse.json({ error: PURCHASE_FAILED_GENERIC_MESSAGE, reference }, { status: 400 });
    } catch (apiError) {
      console.error("[GUEST DATA PURCHASE API ERROR]", apiError);

      await prisma.transaction.update({
        where: { reference },
        data: { status: "FAILED", description: "Purchase processing failed. Please contact support." },
      });

      return NextResponse.json(
        {
          error: PURCHASE_FAILED_GENERIC_MESSAGE,
          reference,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[GUEST DATA PURCHASE ERROR]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
