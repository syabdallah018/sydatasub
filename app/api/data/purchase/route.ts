import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { query, queryOne, execute, sql } from "@/lib/db";
import { withRateLimit } from "@/lib/rateLimit";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Logging helper - LOGS TO VERCEL IN PRODUCTION + DEVELOPMENT
const log = (step: string, data: any) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[DATA_PURCHASE] ${timestamp} ${step}: ${JSON.stringify(data, null, 2)}`;
  console.log(logMessage);  // Always logs - visible in Vercel
  
  // Also log to stderr for guaranteed visibility
  console.error(`[DATA_PURCHASE_LOG] ${step}`, JSON.stringify(data, null, 2));
};

export async function POST(request: NextRequest) {
  let transactionId: string | null = null;

  try {
    log("START", { timestamp: new Date().toISOString() });

    // 1. AUTHENTICATE USER
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      log("AUTH_FAILED", { reason: "No session user" });
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { 
          status: 401,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        }
      );
    }

    const userId = sessionUser.userId;
    log("AUTH_SUCCESS", { userId });

    // 1.5. CHECK RATE LIMIT - Max 10 requests per minute per user
    const rateLimitError = await withRateLimit(request, userId, "data:purchase", { limit: 10, windowMs: 60000 });
    if (rateLimitError) {
      log("RATE_LIMITED", { userId });
      return rateLimitError;
    }

    // 2. PARSE REQUEST BODY
    const body = await request.json();
    const { planId, phone, pin } = body;
    log("REQUEST_BODY", { planId, phone, pinProvided: !!pin });

    if (!planId || !phone || !pin) {
      log("VALIDATION_ERROR", { missingFields: { planId: !planId, phone: !phone, pin: !pin } });
      return NextResponse.json(
        { error: "planId, phone, and pin are required" },
        { 
          status: 400,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        }
      );
    }

    // 3. VALIDATE PIN AND GET USER DETAILS
    const user = await queryOne<{
      pin: string | null;
      balance: number;
      name: string | null;
      role: string;
    }>(
      `SELECT pin, balance, name, role FROM "User" WHERE id = $1`,
      [userId]
    );

    if (!user) {
      log("USER_NOT_FOUND", { userId });
      return NextResponse.json(
        { error: "User not found" },
        { 
          status: 404,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        }
      );
    }

    log("USER_FETCHED", { userId, hasPin: !!user.pin, balance: user.balance });

    if (!user.pin) {
      log("PIN_NOT_SET", { userId });
      return NextResponse.json(
        { error: "PIN not set. Please set your PIN first." },
        { 
          status: 400,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        }
      );
    }

    const isPinValid = await bcrypt.compare(pin, user.pin);
    if (!isPinValid) {
      log("PIN_INVALID", { userId, submittedPin: pin });
      return NextResponse.json(
        { error: "Incorrect PIN." },
        { 
          status: 401,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        }
      );
    }

    log("PIN_VALID", { userId });

    // 4. LOAD PLAN
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

    if (!plan) {
      log("PLAN_NOT_FOUND", { planId });
      return NextResponse.json(
        { error: "Plan not found" },
        { 
          status: 404,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        }
      );
    }

    if (!plan.isActive) {
      log("PLAN_INACTIVE", { planId, isActive: plan.isActive });
      return NextResponse.json(
        { error: "Plan not available." },
        { 
          status: 404,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        }
      );
    }

    // Apply role-based pricing
    let planPrice = plan.price;
    if (user.role === "AGENT" && plan.agentPrice && plan.agentPrice > 0) {
      planPrice = plan.agentPrice;
    }

    log("PLAN_LOADED", { planId, planName: plan.name, basePrice: plan.price, agentPrice: plan.agentPrice, userRole: user.role, appliedPrice: planPrice, activeApi: plan.activeApi });

    // 5. BALANCE CHECK
    const MAX_BALANCE = 30000; // ₦30,000 limit
    const userBalance = typeof user.balance === 'number' ? user.balance : parseFloat(String(user.balance));
    log("BALANCE_CHECK", { userBalance, planPrice, sufficient: userBalance >= planPrice, maxAllowed: MAX_BALANCE });

    if (userBalance < planPrice) {
      log("INSUFFICIENT_BALANCE", { userBalance, required: planPrice, shortfall: planPrice - userBalance });
      return NextResponse.json(
        { error: "Insufficient wallet balance." },
        { 
          status: 402,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        }
      );
    }

    if (userBalance > MAX_BALANCE) {
      log("BALANCE_EXCEEDS_LIMIT", { userBalance, maxAllowed: MAX_BALANCE });
      return NextResponse.json(
        { error: `Maximum wallet balance is ₦${MAX_BALANCE.toLocaleString()}. Please use your credit before adding more.` },
        { 
          status: 400,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        }
      );
    }

    // 6. GENERATE REFERENCE
    const customerRef = `DAT-${Date.now()}-${userId.slice(-6)}`;
    log("REFERENCE_GENERATED", { customerRef });

    // 7. CREATE PENDING TRANSACTION and debit wallet
    const insertResult = await queryOne<{ id: string }>(
      `INSERT INTO "DataTransaction" 
       (id, "userId", "planId", phone, "networkId", amount, "providerUsed", "customerRef", 
        status, "balanceBefore", "createdAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
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
      ]
    );

    if (!insertResult) {
      log("TRANSACTION_INSERT_FAILED", { planId, userId });
      throw new Error("Failed to create transaction");
    }

    transactionId = insertResult.id;
    log("TRANSACTION_CREATED", { transactionId, status: "PENDING" });

    // Debit wallet
    const updateResult = await queryOne<{ balance: number }>(
      `UPDATE "User"
       SET balance = balance - $1
       WHERE id = $2
       RETURNING balance`,
      [planPrice, userId]
    );

    if (!updateResult) {
      throw new Error("Failed to update balance");
    }

    const balanceAfterDebit = typeof updateResult.balance === 'number' ? updateResult.balance : parseFloat(String(updateResult.balance));
    log("WALLET_DEBITED", { transactionId, debitAmount: planPrice, newBalance: balanceAfterDebit });

    // 8. CALL PROVIDER
    let providerRef: string | null = null;
    let providerResponse: string | null = null;
    let providerSuccess = false;
    let providerStatus: number | null = null;

    try {
      if (plan.activeApi === "A") {
        if (!process.env.AMIGO_BASE_URL || !process.env.AMIGO_TOKEN || !plan.apiAId) {
          throw new Error("Provider A is not configured for this plan");
        }

        if (![1, 2, 4].includes(plan.networkId)) {
          throw new Error(`Provider A does not support network ${plan.networkId}`);
        }

        const payloadA = {
          network: plan.networkId,
          mobile_number: phone,
          plan: plan.apiAId,
          Ported_number: true,
        };
        log("PROVIDER_A_REQUEST", payloadA);

        const providerAHttpResponse = await fetch(
          `${process.env.AMIGO_BASE_URL.replace(/\/+$/, "")}/data/`,
          {
            method: "POST",
            headers: {
              "X-API-Key": process.env.AMIGO_TOKEN,
              Accept: "application/json",
              "Content-Type": "application/json; charset=utf-8",
              "Idempotency-Key": customerRef,
            },
            body: JSON.stringify(payloadA),
          }
        );

        providerStatus = providerAHttpResponse.status;
        const providerAData = await providerAHttpResponse.json();
        log("PROVIDER_A_RESPONSE", {
          status: providerStatus,
          data: providerAData,
        });

        if (providerAData?.success === true) {
          providerSuccess = true;
          providerRef = providerAData.reference || customerRef;
          providerResponse = providerAData.message || "Success";
          log("PROVIDER_A_SUCCESS", { providerRef, message: providerResponse });
        } else {
          providerResponse =
            providerAData?.message || providerAData?.error || "Provider request failed";
          log("PROVIDER_A_FAILED", { message: providerResponse, data: providerAData });
        }
      } else if (plan.activeApi === "B" || plan.activeApi === "C") {
        const providerLabel = plan.activeApi === "B" ? "B" : "C";
        const providerBaseUrl =
          plan.activeApi === "B"
            ? process.env.PROVIDER_B_BASE_URL
            : process.env.PROVIDER_C_BASE_URL;
        const providerToken =
          plan.activeApi === "B"
            ? process.env.PROVIDER_B_TOKEN
            : process.env.PROVIDER_C_TOKEN;
        const providerPlanId =
          plan.activeApi === "B" ? plan.apiBId : plan.apiCId;

        if (!providerBaseUrl || !providerToken || !providerPlanId) {
          throw new Error(`Provider ${providerLabel} is not configured for this plan`);
        }

        const payload = {
          plan: providerPlanId,
          mobile_number: phone,
          network: plan.networkId,
        };
        log(`PROVIDER_${providerLabel}_REQUEST`, payload);

        const providerHttpResponse = await fetch(
          `${providerBaseUrl}/data`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${providerToken}`,
              Accept: "application/json",
              "Content-Type": "application/json; charset=utf-8",
            },
            body: JSON.stringify(payload),
          }
        );

        providerStatus = providerHttpResponse.status;
        const providerData = await providerHttpResponse.json();
        log(`PROVIDER_${providerLabel}_RESPONSE`, {
          status: providerStatus, 
          data: providerData
        });

        if (providerData && providerData.Status === "successful") {
          providerSuccess = true;
          providerRef = providerData.ident || customerRef;
          providerResponse = providerData.api_response || "Success";
          log(`PROVIDER_${providerLabel}_SUCCESS`, { providerRef, message: providerResponse });
        } else {
          providerResponse =
            providerData?.api_response || "Provider request failed";
          log(`PROVIDER_${providerLabel}_FAILED`, { message: providerResponse, data: providerData });
        }
      } else {
        log("UNKNOWN_PROVIDER", { activeApi: plan.activeApi });
        throw new Error(`Unknown provider: ${plan.activeApi}`);
      }
    } catch (providerError: any) {
      log("PROVIDER_ERROR", { 
        error: providerError.message, 
        stack: providerError.stack 
      });
      providerSuccess = false;
      providerResponse = `Provider error: ${providerError.message}`;
    }

    // 9. HANDLE PROVIDER RESPONSE
    if (!providerSuccess) {
      log("PROVIDER_FAILED_REFUNDING", { transactionId });
      
      // Mark transaction as failed
      await execute(
        `UPDATE "DataTransaction"
         SET status = $1, "providerResponse" = $2
         WHERE id = $3`,
        ["FAILED", providerResponse, transactionId]
      );

      // Refund wallet
      await execute(
        `UPDATE "User"
         SET balance = balance + $1
         WHERE id = $2`,
        [plan.price, userId]
      );

      log("REFUND_COMPLETED", { transactionId, refundAmount: plan.price });

      const errorMsg = providerResponse || "Provider failed to deliver data";
      log("RESPONSE_422", { error: errorMsg, transactionId });

      return NextResponse.json(
        {
          error: `${errorMsg}. Your balance has been refunded.`,
          transactionId,
          refunded: true,
        },
        { 
          status: 422,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        }
      );
    }

    // 10. ON SUCCESS - UPDATE TRANSACTION
    log("MARKING_TRANSACTION_SUCCESS", { transactionId });
    
    await execute(
      `UPDATE "DataTransaction"
       SET status = $1, "providerRef" = $2, "providerResponse" = $3, "balanceAfter" = $4, "updatedAt" = NOW()
       WHERE id = $5`,
      ["SUCCESS", providerRef || customerRef, providerResponse, balanceAfterDebit, transactionId]
    );

    log("TRANSACTION_COMPLETED", { transactionId, status: "SUCCESS", providerRef });

    // 11. RETURN SUCCESS
    const successResponse = {
      message: "Data delivered successfully. ₦" + plan.price.toLocaleString() + " debited from your wallet.",
      transactionId,
      reference: providerRef || customerRef,
      plan: plan.name,
      phone,
      amount: plan.price,
      newBalance: balanceAfterDebit,
    };
    
    log("RESPONSE_200", successResponse);

    return NextResponse.json(successResponse, {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });

  } catch (error: any) {
    log("FATAL_ERROR", { 
      error: error.message, 
      stack: error.stack,
      transactionId
    });

    // If transaction was created and we hit an error, try to refund and mark as failed
    if (transactionId) {
      try {
        const existingTransaction = await queryOne<{
          status: string;
          amount: number;
        }>(
          `SELECT status, amount FROM "DataTransaction" WHERE id = $1`,
          [transactionId]
        );

        if (existingTransaction && existingTransaction.status === "PENDING") {
          log("AUTO_REFUND_ATTEMPT", { transactionId });
          
          // Mark as failed
          await execute(
            `UPDATE "DataTransaction"
             SET status = $1, "updatedAt" = NOW()
             WHERE id = $2`,
            ["FAILED", transactionId]
          );

          // Refund wallet
          const sessionUser = await getSessionUser(request);
          if (sessionUser) {
            const amount = typeof existingTransaction.amount === 'number' ? existingTransaction.amount : parseFloat(String(existingTransaction.amount));
            await execute(
              `UPDATE "User"
               SET balance = balance + $1
               WHERE id = $2`,
              [amount, sessionUser.userId]
            );
            log("AUTO_REFUND_SUCCESS", { transactionId, refundAmount: amount });
          }
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
      { 
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      }
    );
  }
}
