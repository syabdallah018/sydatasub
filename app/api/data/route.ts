import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyDeveloperRequest } from "@/lib/developer-auth";
import { purchaseData as purchaseFromSmeplug } from "@/lib/smeplug";
import { purchaseData as purchaseFromSaiful } from "@/lib/saiful";
import { purchaseData as purchaseFromAlrahuz } from "@/lib/alrahuz.mjs";
import { purchaseData as purchaseFromAmysub } from "@/lib/amysub";
import { purchaseDataByPlan } from "@/lib/data-provider.mjs";
import { getPlanPriceForUser } from "@/lib/pricing";
import { checkAndAwardRewards } from "@/lib/rewards";
import { sendPushToUser } from "@/lib/push";
import { dispatchDeveloperWebhook } from "@/lib/webhook-dispatcher";
import { normalizeProviderFailureMessage, PURCHASE_FAILED_GENERIC_MESSAGE } from "@/lib/purchase-utils";
import { z } from "zod";

const purchaseSchema = z.object({
  phone: z.string().regex(/^0[0-9]{10}$/, "Invalid phone number"),
  networkId: z.number().int().min(1).max(4, "Invalid network ID"),
  planId: z.union([z.number().int(), z.string().regex(/^\d+$/).transform(val => parseInt(val, 10))]),
  reference: z.string().min(1, "Unique transaction reference is required"),
});

const NETWORK_NAMES: Record<number, string> = {
  1: "MTN",
  2: "GLO",
  3: "NINEMOBILE",
  4: "AIRTEL",
};

async function acquirePurchaseLock(tx: any, lockKey: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyDeveloperRequest(req);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const { user } = authResult;

    const body = await req.json().catch(() => ({}));
    const parsed = purchaseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { phone, networkId, planId, reference } = parsed.data;

    // Check duplicate reference
    const existingTx = await prisma.transaction.findUnique({
      where: { reference },
      select: { id: true },
    });
    if (existingTx) {
      return NextResponse.json(
        { success: false, error: "Duplicate reference detected" },
        { status: 409 }
      );
    }

    // Rate Limiting: 1 purchase per recipient phone number per minute
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentRecipientTx = await prisma.transaction.findFirst({
      where: {
        phone: phone,
        status: { in: ["SUCCESS", "PENDING"] },
        createdAt: { gte: oneMinuteAgo },
      },
      select: { id: true },
    });
    if (recentRecipientTx) {
      return NextResponse.json({
        success: false,
        error: "Rate limit exceeded: You can only purchase data for the same number once per minute."
      }, { status: 429 });
    }

    // Velocity check: 3 purchases across all numbers under 3 minutes
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1500); // 180 seconds
    const recentUserTxCount = await prisma.transaction.count({
      where: {
        userId: user.id,
        status: { in: ["SUCCESS", "PENDING"] },
        createdAt: { gte: threeMinutesAgo },
      },
    });

    if (recentUserTxCount >= 3) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          kycLocked: true,
          kycLockReason: "Velocity threshold exceeded: 3 data purchases within 3 minutes",
          kycLockedAt: new Date(),
        },
      });
      return NextResponse.json({
        success: false,
        error: "Transaction declined. Your account KYC has been locked due to high frequency transactions. Please contact support."
      }, { status: 403 });
    }

    const expectedNetwork = NETWORK_NAMES[networkId];
    if (!expectedNetwork) {
      return NextResponse.json(
        { success: false, error: "Invalid network ID" },
        { status: 400 }
      );
    }

    // Fetch Plan by externalPlanId and network mapping
    const plan = await prisma.plan.findFirst({
      where: {
        externalPlanId: planId,
        network: expectedNetwork,
        isActive: true,
      },
    });
    if (!plan) {
      return NextResponse.json(
        { success: false, error: "Plan not found or inactive" },
        { status: 404 }
      );
    }

    const planPrice = getPlanPriceForUser(plan, user);
    const priceInKobo = planPrice * 100;

    const rewardBalance = user.rewardBalance ?? 0;
    const totalBalance = user.balance + rewardBalance;

    if (totalBalance < priceInKobo) {
      return NextResponse.json(
        { success: false, error: "Insufficient wallet balance" },
        { status: 400 }
      );
    }

    const lockKey = `dev:data:${user.id}:${planId}:${phone}:${planPrice}`;
    const txResult = await prisma.$transaction(async (tx) => {
      await acquirePurchaseLock(tx, lockKey);

      // Re-verify duplicate reference inside transaction lock
      const doubleCheckTx = await tx.transaction.findUnique({
        where: { reference },
        select: { id: true },
      });
      if (doubleCheckTx) {
        return { kind: "duplicate" as const };
      }

      // Re-verify balance
      const latestUser = await tx.user.findUnique({
        where: { id: user.id },
        select: { balance: true, rewardBalance: true },
      });
      if (!latestUser) {
        return { kind: "user_not_found" as const };
      }

      const latestRewardBalance = latestUser.rewardBalance ?? 0;
      const latestTotalBalance = latestUser.balance + latestRewardBalance;

      if (latestTotalBalance < priceInKobo) {
        return { kind: "insufficient_funds" as const };
      }

      // Debit logic
      const rewardDebit = Math.min(latestRewardBalance, priceInKobo);
      const walletDebit = priceInKobo - rewardDebit;

      await tx.user.update({
        where: { id: user.id },
        data: {
          ...(walletDebit > 0 ? { balance: { decrement: walletDebit } } : {}),
          ...(rewardDebit > 0 ? { rewardBalance: { decrement: rewardDebit } } : {}),
        },
      });

      const createdTx = await tx.transaction.create({
        data: {
          userId: user.id,
          type: "DATA_PURCHASE",
          amount: planPrice,
          status: "PENDING",
          reference,
          description: `Developer API: ${plan.name} (${plan.sizeLabel}) -> ${phone}`,
          phone,
          planId: plan.id,
          apiUsed: plan.apiSource,
          balanceBefore: latestUser.balance,
          balanceAfter: latestUser.balance - walletDebit,
        },
      });

      return {
        kind: "created" as const,
        transaction: createdTx,
        rewardDebit,
        walletDebit,
      };
    });

    if (txResult.kind === "duplicate") {
      return NextResponse.json({ success: false, error: "Duplicate reference detected" }, { status: 409 });
    }
    if (txResult.kind === "user_not_found") {
      return NextResponse.json({ success: false, error: "User account error" }, { status: 400 });
    }
    if (txResult.kind === "insufficient_funds") {
      return NextResponse.json({ success: false, error: "Insufficient wallet balance" }, { status: 400 });
    }

    const { transaction: dbTx, rewardDebit, walletDebit } = txResult;

    try {
      // Call provider API
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

      if (!apiResult.success) {
        const errorMessage = normalizeProviderFailureMessage(apiResult.message);

        // Refund balances
        const updatedTx = await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: user.id },
            data: {
              ...(walletDebit > 0 ? { balance: { increment: walletDebit } } : {}),
              ...(rewardDebit > 0 ? { rewardBalance: { increment: rewardDebit } } : {}),
            },
          });

          return tx.transaction.update({
            where: { reference },
            data: {
              status: "FAILED",
              description: errorMessage,
              externalReference: apiResult.externalReference || undefined,
            },
          });
        });

        // Fire failure Webhook
        dispatchDeveloperWebhook(user.id, updatedTx);

        return NextResponse.json(
          { success: false, error: errorMessage, reference, status: "FAILED" },
          { status: 400 }
        );
      }

      // Success transaction update
      const updatedTx = await prisma.transaction.update({
        where: { reference },
        data: {
          status: "SUCCESS",
          externalReference: apiResult.externalReference || undefined,
          description: apiResult.message || `Developer purchase successful`,
        },
      });

      // Award rewards
      await checkAndAwardRewards(user.id).catch(err => console.error("[REWARDS ERROR]", err));

      // Push notification
      sendPushToUser(
        user.id,
        "Developer API Purchase",
        `Successful purchase of ${plan.sizeLabel} for ${phone}. Ref: ${reference}`
      ).catch(err => console.error("[PUSH ERROR]", err));

      // Dispatch webhook
      dispatchDeveloperWebhook(user.id, updatedTx);

      return NextResponse.json(
        {
          success: true,
          reference,
          externalReference: updatedTx.externalReference,
          status: "SUCCESS",
        },
        { status: 200 }
      );
    } catch (error: any) {
      console.error("[DEV DATA API EXCEPTION]", error);

      // Refund balances on crash
      const updatedTx = await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: {
            ...(walletDebit > 0 ? { balance: { increment: walletDebit } } : {}),
            ...(rewardDebit > 0 ? { rewardBalance: { increment: rewardDebit } } : {}),
          },
        });

        return tx.transaction.update({
          where: { reference },
          data: {
            status: "FAILED",
            description: `API exception: ${error.message}`,
          },
        });
      });

      dispatchDeveloperWebhook(user.id, updatedTx);

      return NextResponse.json(
        { success: false, error: PURCHASE_FAILED_GENERIC_MESSAGE, reference, status: "FAILED" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[DEV PURCHASE SYSTEM ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
