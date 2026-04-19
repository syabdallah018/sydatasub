import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { purchaseData as purchaseFromSmeplug } from "@/lib/smeplug";
import { purchaseData as purchaseFromSaiful } from "@/lib/saiful";
import { findRecentDuplicateTransaction, normalizeProviderFailureMessage, DATA_INSUFFICIENT_FUNDS_MESSAGE } from "@/lib/purchase-utils";
import { getPlanPriceForUser } from "@/lib/pricing";
import { getDbCapabilities } from "@/lib/db-capabilities";
import bcryptjs from "bcryptjs";
import { z } from "zod";

const purchaseSchema = z.object({
  planId: z.string().min(1, "Plan ID is required"),
  buyerPhone: z.string().regex(/^0[0-9]{10}$/, "Invalid buyer phone number"),
  recipientPhone: z.string().regex(/^0[0-9]{10}$/, "Invalid recipient phone number"),
  pin: z.string().regex(/^\d{6}$/, "Invalid PIN"),
  confirmDuplicate: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { planId, buyerPhone, recipientPhone, pin, confirmDuplicate = false } =
      purchaseSchema.parse(body);
    const dbCaps = await getDbCapabilities();

    const user = await prisma.user.findUnique({
      where: { phone: buyerPhone },
      select: {
        id: true,
        phone: true,
        pinHash: true,
        isBanned: true,
        tier: true,
        balance: true,
        ...(dbCaps.userRewardBalance ? { rewardBalance: true } : {}),
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    if (user.isBanned) {
      return NextResponse.json({ success: false, error: "Account is banned" }, { status: 403 });
    }

    if (!user.pinHash) {
      return NextResponse.json({ success: false, error: "PIN not set" }, { status: 400 });
    }

    const isPinValid = await bcryptjs.compare(pin, user.pinHash);
    if (!isPinValid) {
      return NextResponse.json({ success: false, error: "Invalid PIN" }, { status: 401 });
    }

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan || !plan.isActive) {
      return NextResponse.json({ success: false, error: "Plan not found" }, { status: 404 });
    }

    const planPrice = getPlanPriceForUser(plan, user);
    const priceInKobo = planPrice * 100;
    const rewardBalance = dbCaps.userRewardBalance ? user.rewardBalance ?? 0 : 0;
    const totalSpendable = user.balance + rewardBalance;

    if (totalSpendable < priceInKobo) {
      return NextResponse.json(
        { success: false, error: DATA_INSUFFICIENT_FUNDS_MESSAGE },
        { status: 400 }
      );
    }

    const duplicateTransaction = await findRecentDuplicateTransaction({
      userId: user.id,
      type: "DATA_PURCHASE",
      phone: recipientPhone,
      planId,
      amount: planPrice,
    });

    if (duplicateTransaction && !confirmDuplicate) {
      return NextResponse.json(
        {
          success: false,
          error: "Duplicate transaction detected. Confirm to continue.",
          requiresConfirmation: true,
          duplicateTransaction,
        },
        { status: 409 }
      );
    }

    const rewardDebit = dbCaps.userRewardBalance ? Math.min(rewardBalance, priceInKobo) : 0;
    const walletDebit = priceInKobo - rewardDebit;
    const reference = `DATA-${user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: dbCaps.userRewardBalance
          ? {
              balance: { decrement: walletDebit },
              rewardBalance: { decrement: rewardDebit },
            }
          : {
              balance: { decrement: priceInKobo },
            },
      });

      await tx.transaction.create({
        data: {
          userId: user.id,
          type: "DATA_PURCHASE",
          amount: planPrice,
          status: "PENDING",
          reference,
          description: `${plan.name} (${plan.sizeLabel}) -> ${recipientPhone}`,
          phone: recipientPhone,
          planId,
          apiUsed: plan.apiSource,
          balanceBefore: user.balance,
          balanceAfter: user.balance - walletDebit,
        },
      });
    });

    try {
      const apiResult =
        plan.apiSource === "API_A"
          ? await purchaseFromSmeplug({
              externalNetworkId: plan.externalNetworkId,
              externalPlanId: plan.externalPlanId,
              phone: recipientPhone,
              reference,
            })
          : await purchaseFromSaiful({
              plan: plan.externalPlanId,
              mobileNumber: recipientPhone,
              network: plan.network,
              reference,
            });

      if (!apiResult.success) {
        const errorMessage = normalizeProviderFailureMessage(apiResult.message);

        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: user.id },
            data: dbCaps.userRewardBalance
              ? {
                  balance: { increment: walletDebit },
                  rewardBalance: { increment: rewardDebit },
                }
              : {
                  balance: { increment: priceInKobo },
                },
          });

          await tx.transaction.updateMany({
            where: { reference },
            data: {
              status: "FAILED",
              description: errorMessage,
              externalReference: apiResult.externalReference || undefined,
            },
          });
        });

        return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
      }

      await prisma.transaction.updateMany({
        where: { reference },
        data: {
          status: "SUCCESS",
          externalReference: apiResult.externalReference || undefined,
          description: apiResult.message,
        },
      });

      return NextResponse.json(
        {
          success: true,
          message: apiResult.message,
          reference,
          amountCharged: planPrice,
          walletUsed: walletDebit / 100,
          rewardUsed: rewardDebit / 100,
        },
        { status: 200 }
      );
    } catch (error) {
      console.error("[DATA PURCHASE API ERROR]", error);

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: dbCaps.userRewardBalance
            ? {
                balance: { increment: walletDebit },
                rewardBalance: { increment: rewardDebit },
              }
            : {
                balance: { increment: priceInKobo },
              },
        });

        await tx.transaction.updateMany({
          where: { reference },
          data: {
            status: "FAILED",
            description: "Purchase failed, balances refunded",
          },
        });
      });

      return NextResponse.json(
        { success: false, error: "Purchase failed, balances refunded" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[DATA PURCHASE ERROR]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
