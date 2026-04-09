import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { purchaseData as purchaseFromSmeplug } from "@/lib/smeplug";
import { purchaseData as purchaseFromSaiful } from "@/lib/saiful";
import { z } from "zod";

const guestPurchaseSchema = z.object({
  planId: z.string().min(1, "Plan ID is required"),
  phone: z.string().regex(/^0[0-9]{10}$/, "Invalid phone number"),
  isGuest: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { planId, phone, isGuest } = guestPurchaseSchema.parse(body);

    // Get plan
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return NextResponse.json(
        { error: "Plan not found" },
        { status: 404 }
      );
    }

    // Create transaction for guest
    const reference = `GUEST-DATA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create temporary transaction record
    await prisma.transaction.create({
      data: {
        guestPhone: phone,
        type: "DATA_PURCHASE",
        amount: plan.price,
        status: "PENDING",
        reference,
        description: `${plan.name} → ${phone}`,
        phone,
        planId,
        apiUsed: plan.apiSource,
      },
    });

    // Call data API
    let apiResult;
    try {
      if (plan.apiSource === "API_A") {
        apiResult = await purchaseFromSmeplug({
          externalNetworkId: plan.externalNetworkId,
          externalPlanId: plan.externalPlanId,
          phone,
          reference,
        });
      } else if (plan.apiSource === "API_B") {
        apiResult = await purchaseFromSaiful({
          plan: plan.name,
          mobileNumber: phone,
          network: plan.network,
          reference,
        });
      } else {
        throw new Error("Unsupported API source");
      }

      if (apiResult.success) {
        // Update transaction to success
        await prisma.transaction.update({
          where: { reference },
          data: { status: "SUCCESS" },
        });

        return NextResponse.json(
          {
            success: true,
            message: apiResult.message || "Data delivered successfully",
            reference,
          },
          { status: 200 }
        );
      } else {
        // API failed
        await prisma.transaction.update({
          where: { reference },
          data: { status: "FAILED" },
        });

        return NextResponse.json(
          {
            error: apiResult.message || "Purchase failed",
            reference,
          },
          { status: 400 }
        );
      }
    } catch (apiError) {
      console.error("[GUEST DATA PURCHASE API ERROR]", apiError);

      // Mark as failed
      await prisma.transaction.update({
        where: { reference },
        data: { status: "FAILED" },
      });

      return NextResponse.json(
        {
          error: "Purchase processing failed. Please contact support.",
          reference,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[GUEST DATA PURCHASE ERROR]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
