import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSessionUser } from "@/lib/auth";
import { execute, queryOne } from "@/lib/db";
import { getProviderAConfig, getProviderBConfig, getProviderCConfig } from "@/lib/providers";
import { ensureRewardSchema } from "@/lib/rewards";
import { withRateLimit } from "@/lib/rateLimit";
import { formatNaira, getWalletLimitForRole } from "@/lib/wallet";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const log = (step: string, data: any) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[DATA_PURCHASE] ${timestamp} ${step}: ${JSON.stringify(data, null, 2)}`;
  console.log(logMessage);
  console.error(`[DATA_PURCHASE_LOG] ${step}`, JSON.stringify(data, null, 2));
};

export async function POST(request: NextRequest) {
  let transactionId: string | null = null;
  let userId: string | null = null;
  let walletDebitAmount = 0;
  let rewardAppliedAmount = 0;

  try {
    await ensureRewardSchema();
    log("START", { timestamp: new Date().toISOString() });

    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    userId = sessionUser.userId;
    const rateLimitError = await withRateLimit(request, userId, "data:purchase", { limit: 10, windowMs: 60000 });
    if (rateLimitError) {
      return rateLimitError;
    }

    const body = await request.json();
    const { planId, phone, pin } = body;
    if (!planId || !phone || !pin) {
      return NextResponse.json(
        { error: "planId, phone, and pin are required" },
        { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    const user = await queryOne<{
      pin: string | null;
      balance: number;
      reward_balance: number;
      role: string;
    }>(
      `SELECT pin, balance, reward_balance, role FROM "User" WHERE id = $1`,
      [userId]
    );

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    if (!user.pin) {
      return NextResponse.json(
        { error: "PIN not set. Please set your PIN first." },
        { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    const isPinValid = await bcrypt.compare(pin, user.pin);
    if (!isPinValid) {
      return NextResponse.json(
        { error: "Incorrect PIN." },
        { status: 401, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    const plan = await queryOne<{
      id: string;
      name: string;
      networkId: number;
      price: number;
      agentPrice: number | null;
      activeApi: string;
      apiAId: number | null;
      apiBId: number | null;
      apiCId: number | null;
      isActive: boolean;
    }>(
      `SELECT id, name, "networkId", price, "agentPrice", "activeApi", "apiAId", "apiBId", "apiCId", "isActive"
       FROM "DataPlan"
       WHERE id = $1`,
      [planId]
    );

    if (!plan || !plan.isActive) {
      return NextResponse.json(
        { error: "Plan not available." },
        { status: 404, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    const planPrice =
      user.role === "AGENT" && plan.agentPrice && plan.agentPrice > 0
        ? Number(plan.agentPrice)
        : Number(plan.price);
    const userBalance = Number(user.balance || 0);
    const rewardBalance = Number(user.reward_balance || 0);
    const totalSpendable = userBalance + rewardBalance;

    log("BALANCE_CHECK", {
      planPrice,
      userBalance,
      rewardBalance,
      totalSpendable,
      walletLimit: getWalletLimitForRole(user.role),
    });

    if (totalSpendable < planPrice) {
      return NextResponse.json(
        { error: "Insufficient wallet and reward balance." },
        { status: 402, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    const customerRef = `DAT-${Date.now()}-${userId.slice(-6)}`;
    rewardAppliedAmount = Math.min(rewardBalance, planPrice);
    walletDebitAmount = Math.max(0, planPrice - rewardAppliedAmount);

    const insertResult = await queryOne<{ id: string }>(
      `INSERT INTO "DataTransaction"
       (id, "userId", "planId", phone, "networkId", amount, "providerUsed", "customerRef",
        status, "balanceBefore", "rewardApplied", "createdAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
       RETURNING id`,
      [
        userId,
        planId,
        phone,
        plan.networkId,
        planPrice,
        plan.activeApi,
        customerRef,
        "PENDING",
        userBalance,
        rewardAppliedAmount,
      ]
    );

    if (!insertResult) {
      throw new Error("Failed to create transaction");
    }

    transactionId = insertResult.id;

    const updateResult = await queryOne<{ balance: number }>(
      `UPDATE "User"
       SET balance = balance - $1,
           reward_balance = reward_balance - $2
       WHERE id = $3
       RETURNING balance`,
      [walletDebitAmount, rewardAppliedAmount, userId]
    );

    if (!updateResult) {
      throw new Error("Failed to update balance");
    }

    const balanceAfterDebit = Number(updateResult.balance || 0);
    let providerRef: string | null = null;
    let providerResponse: string | null = null;
    let providerSuccess = false;

    try {
      if (plan.activeApi === "A") {
        const providerA = getProviderAConfig();
        if (!providerA.baseUrl || !providerA.token || !plan.apiAId) {
          throw new Error("Provider A is not configured for this plan");
        }

        const payload = {
          network_id: plan.networkId,
          plan_id: plan.apiAId,
          phone,
          customer_reference: customerRef,
        };
        log("PROVIDER_A_REQUEST", payload);

        const response = await fetch(`${providerA.baseUrl.replace(/\/+$/, "")}/data/purchase`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${providerA.token}`,
            Accept: "application/json",
            "Content-Type": "application/json; charset=utf-8",
          },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        log("PROVIDER_A_RESPONSE", { status: response.status, data });

        if (data?.status === true) {
          providerSuccess = true;
          providerRef = data?.data?.reference || customerRef;
          providerResponse = data?.data?.current_status
            ? `${data?.data?.msg || "Success"} (${data.data.current_status})`
            : data?.data?.msg || "Success";
        } else {
          providerResponse = data?.data?.msg || data?.message || "Provider request failed";
        }
      } else if (plan.activeApi === "B" || plan.activeApi === "C") {
        const providerConfig = plan.activeApi === "B" ? getProviderBConfig() : getProviderCConfig();
        const providerLabel = plan.activeApi === "B" ? "B" : "C";
        const providerPlanId = plan.activeApi === "B" ? plan.apiBId : plan.apiCId;

        if (!providerConfig.baseUrl || !providerConfig.token || !providerPlanId) {
          throw new Error(`Provider ${providerLabel} is not configured for this plan`);
        }

        const payload = {
          plan: providerPlanId,
          mobile_number: phone,
          network: plan.networkId,
          customer_reference: customerRef,
        };
        log(`PROVIDER_${providerLabel}_REQUEST`, payload);

        const response = await fetch(`${providerConfig.baseUrl}/data`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${providerConfig.token}`,
            Accept: "application/json",
            "Content-Type": "application/json; charset=utf-8",
          },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        log(`PROVIDER_${providerLabel}_RESPONSE`, { status: response.status, data });

        if (data?.Status === "successful") {
          providerSuccess = true;
          providerRef = data.ident || customerRef;
          providerResponse = data.api_response || "Success";
        } else {
          providerResponse = data?.api_response || "Provider request failed";
        }
      } else {
        throw new Error(`Unknown provider: ${plan.activeApi}`);
      }
    } catch (providerError: any) {
      providerResponse = `Provider error: ${providerError.message}`;
      providerSuccess = false;
      log("PROVIDER_ERROR", { error: providerError.message });
    }

    if (!providerSuccess) {
      await execute(
        `UPDATE "DataTransaction"
         SET status = 'FAILED', "providerResponse" = $1, "updatedAt" = NOW()
         WHERE id = $2`,
        [providerResponse, transactionId]
      );

      await execute(
        `UPDATE "User"
         SET balance = balance + $1,
             reward_balance = reward_balance + $2
         WHERE id = $3`,
        [walletDebitAmount, rewardAppliedAmount, userId]
      );

      return NextResponse.json(
        {
          error: `${providerResponse || "Provider failed to deliver data"}. Your balance has been refunded.`,
          transactionId,
          refunded: true,
        },
        { status: 422, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    await execute(
      `UPDATE "DataTransaction"
       SET status = 'SUCCESS',
           "providerRef" = $1,
           "providerResponse" = $2,
           "balanceAfter" = $3,
           "rewardApplied" = $4,
           "updatedAt" = NOW()
       WHERE id = $5`,
      [providerRef || customerRef, providerResponse, balanceAfterDebit, rewardAppliedAmount, transactionId]
    );

    if (rewardAppliedAmount > 0) {
      await execute(
        `INSERT INTO "Transaction" (user_id, amount, reference, type, status, created_at, updated_at)
         VALUES ($1, $2, $3, 'reward_spend', 'success', NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        [userId, Math.round(rewardAppliedAmount), `${customerRef}-REWARD`]
      );
    }

    return NextResponse.json(
      {
        message:
          rewardAppliedAmount > 0
            ? `Data delivered successfully. ${formatNaira(walletDebitAmount)} debited from wallet and ${formatNaira(rewardAppliedAmount)} applied from rewards.`
            : `Data delivered successfully. ${formatNaira(planPrice)} debited from your wallet.`,
        transactionId,
        reference: providerRef || customerRef,
        plan: plan.name,
        phone,
        amount: planPrice,
        newBalance: balanceAfterDebit,
        rewardApplied: rewardAppliedAmount,
      },
      { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  } catch (error: any) {
    log("FATAL_ERROR", { error: error.message, stack: error.stack, transactionId });

    if (transactionId && userId) {
      try {
        const existingTransaction = await queryOne<{ status: string }>(
          `SELECT status FROM "DataTransaction" WHERE id = $1`,
          [transactionId]
        );

        if (existingTransaction?.status === "PENDING") {
          await execute(
            `UPDATE "DataTransaction"
             SET status = 'FAILED', "updatedAt" = NOW()
             WHERE id = $1`,
            [transactionId]
          );

          await execute(
            `UPDATE "User"
             SET balance = balance + $1,
                 reward_balance = reward_balance + $2
             WHERE id = $3`,
            [walletDebitAmount, rewardAppliedAmount, userId]
          );
        }
      } catch (cleanupError: any) {
        log("AUTO_REFUND_FAILED", { transactionId, error: cleanupError.message });
      }
    }

    return NextResponse.json(
      {
        error: "An unexpected error occurred. Please contact support.",
        details: error.message,
      },
      { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }
}
