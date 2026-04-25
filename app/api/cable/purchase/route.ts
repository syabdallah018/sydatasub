import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { withRateLimit } from "@/lib/rateLimit";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const log = (step: string, data: any) => {
  // Always log to console - appears in Vercel logs
  const timestamp = new Date().toISOString();
  const logMessage = `[CABLE_PURCHASE] ${timestamp} ${step}: ${JSON.stringify(data, null, 2)}`;
  console.log(logMessage);  // Always logs - visible in Vercel
  
  // Also log to stderr for guaranteed visibility
  console.error(`[CABLE_PURCHASE_LOG] ${step}`, JSON.stringify(data, null, 2));
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
        { status: 401, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    const userId = sessionUser.userId;
    log("AUTH_SUCCESS", { userId });

    // 1.5. CHECK RATE LIMIT - Max 10 requests per minute per user
    const rateLimitError = await withRateLimit(request, userId, "cable:purchase", { limit: 10, windowMs: 60000 });
    if (rateLimitError) {
      log("RATE_LIMITED", { userId });
      return rateLimitError;
    }

    // 2. PARSE REQUEST BODY
    const body = await request.json();
    const { provider, smartCardNumber, amount, email, phone, planCode, planName, pin } = body;
    log("REQUEST_BODY", {
      provider,
      smartCardNumber: smartCardNumber?.slice(-4),
      amountProvided: !!amount,
      emailProvided: !!email,
      phoneProvided: !!phone,
      pinProvided: !!pin,
    });

    // 3. VALIDATE INPUTS
    if (!provider || !smartCardNumber || !amount || !pin) {
      log("VALIDATION_ERROR", {
        missingFields: { provider: !provider, smartCardNumber: !smartCardNumber, amount: !amount, pin: !pin },
      });
      return NextResponse.json(
        { error: "provider, smartCardNumber, amount, and pin are required" },
        { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    const amountNum = parseFloat(String(amount));
    if (isNaN(amountNum) || amountNum <= 0) {
      log("INVALID_AMOUNT", { amount });
      return NextResponse.json(
        { errors: { amount: ["Amount must be greater than 0"] } },
        { status: 422, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    const validProviders = ["DSTV", "GOTV", "STARTIMES"];
    if (!validProviders.includes(provider)) {
      log("INVALID_PROVIDER", { provider });
      return NextResponse.json(
        { errors: { provider: ["Invalid cable provider"] } },
        { status: 422, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    // 4. VALIDATE PIN AND GET USER DETAILS
    const user = await queryOne<{ balance: number; pin: string | null }>(
      `SELECT balance, pin FROM "User" WHERE id = $1`,
      [userId]
    );

    if (!user) {
      log("USER_NOT_FOUND", { userId });
      return NextResponse.json(
        { error: "User not found" },
        { status: 404, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    log("USER_FETCHED", { userId, hasPin: !!user.pin, balance: user.balance });

    if (!user.pin) {
      log("PIN_NOT_SET", { userId });
      return NextResponse.json(
        { error: "PIN not set. Please set your PIN first." },
        { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    const isPinValid = await bcrypt.compare(pin, user.pin);
    if (!isPinValid) {
      log("PIN_INVALID", { userId });
      return NextResponse.json(
        { error: "Incorrect PIN." },
        { status: 401, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    log("PIN_VALID", { userId });

    // 5. BALANCE CHECK
    const MAX_BALANCE = 30000; // ₦30,000 limit
    const userBalance = typeof user.balance === "number" ? user.balance : parseFloat(String(user.balance));
    log("BALANCE_CHECK", { userBalance, amountNum, sufficient: userBalance >= amountNum, maxAllowed: MAX_BALANCE });

    if (userBalance < amountNum) {
      log("INSUFFICIENT_BALANCE", { userBalance, required: amountNum });
      return NextResponse.json(
        { error: "Insufficient wallet balance." },
        { status: 402, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    if (userBalance > MAX_BALANCE) {
      log("BALANCE_EXCEEDS_LIMIT", { userBalance, maxAllowed: MAX_BALANCE });
      return NextResponse.json(
        { error: `Maximum wallet balance is ₦${MAX_BALANCE.toLocaleString()}. Please use your credit before adding more.` },
        { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    // 6. GENERATE REFERENCE
    const customerRef = `CBL-${Date.now()}-${userId.slice(-6)}`;
    log("REFERENCE_GENERATED", { customerRef, provider });

    // 7. CREATE PENDING TRANSACTION and debit wallet
    const insertResult = await queryOne<{ id: string }>(
      `INSERT INTO cable_transactions 
       (id, user_id, ident, provider, provider_name, smart_card_number, email, phone, 
        amount, status, plan_code, plan_name, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
       RETURNING id`,
      [userId, customerRef, provider, provider, smartCardNumber, email, phone, amountNum, "PENDING", planCode, planName]
    );

    if (!insertResult) {
      log("TRANSACTION_INSERT_FAILED", { provider, userId });
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
      [amountNum, userId]
    );

    if (!updateResult) {
      throw new Error("Failed to update balance");
    }

    const balanceAfterDebit =
      typeof updateResult.balance === "number" ? updateResult.balance : parseFloat(String(updateResult.balance));
    log("WALLET_DEBITED", { transactionId, debitAmount: amountNum, newBalance: balanceAfterDebit });

    // 8. CALL PROVIDER B
    let providerRef: string | null = null;
    let providerResponse: string | null = null;
    let providerSuccess = false;
    let providerStatus: number | null = null;

    try {
      // Provider B API for cable
      const payloadB = {
        service_type: "cable",
        provider: provider,
        smart_card_number: smartCardNumber,
        amount: amountNum,
        customer_reference: customerRef,
        email: email || undefined,
        phone: phone || undefined,
        plan_code: planCode || undefined,
      };

      log("PROVIDER_B_REQUEST", payloadB);

      const providerBResponse = await fetch(`${process.env.PROVIDER_B_BASE_URL}/cable`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PROVIDER_B_TOKEN}`,
          Accept: "application/json",
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(payloadB),
      });

      providerStatus = providerBResponse.status;
      const providerBData = await providerBResponse.json();
      log("PROVIDER_B_RESPONSE", {
        status: providerStatus,
        data: providerBData,
      });

      if (providerBData && providerBData.Status === "successful") {
        providerSuccess = true;
        providerRef = providerBData.ident || customerRef;
        providerResponse = providerBData.api_response || "Success";
        log("PROVIDER_B_SUCCESS", { providerRef, message: providerResponse });
      } else {
        providerResponse = providerBData?.api_response || "Provider request failed";
        log("PROVIDER_B_FAILED", { message: providerResponse, data: providerBData });
      }
    } catch (providerError: any) {
      log("PROVIDER_B_ERROR", { error: providerError.message });
      providerResponse = `Provider error: ${providerError.message}`;
    }

    // 9. UPDATE TRANSACTION STATUS
    if (providerSuccess && transactionId) {
      const updateTransaction = await queryOne<{ id: string }>(
        `UPDATE cable_transactions
         SET status = $1, response_message = $2, provider_id = $3, updated_at = NOW()
         WHERE id = $4
         RETURNING id`,
        ["SUCCESS", providerResponse, providerRef, transactionId]
      );

      if (updateTransaction) {
        log("TRANSACTION_UPDATED_SUCCESS", { transactionId });
        return NextResponse.json(
          {
            success: true,
            message: "Cable subscription purchased successfully",
            transactionId,
            reference: providerRef,
            amount: amountNum,
            newBalance: balanceAfterDebit,
          },
          { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } }
        );
      }
    } else {
      // Failed or provider error
      const updateTransaction = await queryOne<{ id: string }>(
        `UPDATE cable_transactions
         SET status = $1, response_message = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING id`,
        ["FAILED", providerResponse, transactionId]
      );

      log("TRANSACTION_FAILED", { transactionId, reason: providerResponse });

      // Refund the wallet since transaction failed
      const refundResult = await queryOne<{ balance: number }>(
        `UPDATE "User"
         SET balance = balance + $1
         WHERE id = $2
         RETURNING balance`,
        [amountNum, userId]
      );

      log("WALLET_REFUNDED", { transactionId, refundAmount: amountNum });

      return NextResponse.json(
        {
          error: "Provider error: Could not complete transaction",
          message: providerResponse,
          transactionId,
        },
        { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }
  } catch (error: any) {
    log("ERROR_500", { error: error.message, stack: error.stack });

    // Attempt refund on error
    if (transactionId) {
      try {
        const debitAmount = await queryOne<{ amount: number }>(
          `SELECT amount FROM cable_transactions WHERE id = $1`,
          [transactionId]
        );

        if (debitAmount) {
          await queryOne(
            `UPDATE "User" SET balance = balance + $1 WHERE id = $2`,
            [debitAmount.amount, (await getSessionUser(request))?.userId]
          );
          log("ERROR_WALLET_REFUNDED", { transactionId });
        }
      } catch (refundError) {
        log("REFUND_FAILED", { transactionId, error: String(refundError) });
      }
    }

    return NextResponse.json(
      { error: "Cable subscription purchase failed", details: error.message },
      { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }
}
