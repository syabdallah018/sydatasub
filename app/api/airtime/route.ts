import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { query, queryOne, execute } from "@/lib/db";
import { withRateLimit } from "@/lib/rateLimit";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const log = (step: string, data: any) => {
  // Always log to console - appears in Vercel logs
  const timestamp = new Date().toISOString();
  const logMessage = `[AIRTIME] ${timestamp} ${step}: ${JSON.stringify(data, null, 2)}`;
  console.log(logMessage);  // Always logs - visible in Vercel
  
  // Also log to stderr for guaranteed visibility
  console.error(`[AIRTIME_LOG] ${step}`, JSON.stringify(data, null, 2));
};

export async function POST(request: NextRequest) {
  let transactionId: string | null = null;

  try {
    log("START", { 
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url,
      headers: {
        contentType: request.headers.get('content-type'),
        authorization: request.headers.get('authorization') ? 'present' : 'missing',
      }
    });

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
    const rateLimitError = await withRateLimit(request, userId, "airtime:purchase", { limit: 10, windowMs: 60000 });
    if (rateLimitError) {
      log("RATE_LIMITED", { userId });
      return rateLimitError;
    }

    // 2. PARSE REQUEST BODY
    const body = await request.json();
    const { network, mobile_number, amount, pin } = body;
    log("REQUEST_BODY_RECEIVED", { 
      allKeys: Object.keys(body),
      network: { value: network, type: typeof network },
      mobile_number: { value: mobile_number, type: typeof mobile_number },
      amount: { value: amount, type: typeof amount },
      pin: { provided: !!pin, type: typeof pin },
      bodySize: JSON.stringify(body).length
    });
    log("REQUEST_BODY", { network, mobile_number, amount, pinProvided: !!pin });

    if (!network || !mobile_number || !amount || !pin) {
      log("VALIDATION_ERROR", { missingFields: { network: !network, mobile_number: !mobile_number, amount: !amount, pin: !pin } });
      return NextResponse.json(
        { errors: { amount: amount ? [] : ["Amount is required"], mobile_number: mobile_number ? [] : ["Mobile number is required"], network: network ? [] : ["Network is required"], pin: pin ? [] : ["PIN is required"] } },
        { status: 422, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    // Validate mobile number format
    if (!/^0\d{10}$/.test(mobile_number)) {
      log("INVALID_PHONE", { mobile_number });
      return NextResponse.json(
        { errors: { mobile_number: ["Enter a valid 11-digit Nigerian number"] } },
        { status: 422, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    // Validate amount - convert to number safely
    let amountNum = typeof amount === "string" ? parseInt(amount) : amount;
    if (isNaN(amountNum) || amountNum < 50 || amountNum > 100000) {
      log("INVALID_AMOUNT", { amount: amountNum });
      return NextResponse.json(
        { errors: { amount: ["Amount must be between ₦50 and ₦100,000"] } },
        { status: 422, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    // Validate network
    if (![1, 2, 3, 4].includes(network)) {
      log("INVALID_NETWORK", { network });
      return NextResponse.json(
        { errors: { network: ["Invalid network selected"] } },
        { status: 422, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    // 3. VALIDATE PIN AND GET USER DETAILS
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

    // Check if PIN is set
    if (!user.pin) {
      log("PIN_NOT_SET", { userId });
      return NextResponse.json(
        { error: "PIN not set. Please set your PIN first." },
        { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    // Validate PIN with bcrypt
    const isPinValid = await bcrypt.compare(pin, user.pin);
    if (!isPinValid) {
      log("PIN_INVALID", { userId });
      return NextResponse.json(
        { error: "Incorrect PIN." },
        { status: 401, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    log("PIN_VALID", { userId });

    const MAX_BALANCE = 30000; // ₦30,000 limit
    const userBalance = typeof user.balance === 'number' ? user.balance : parseFloat(String(user.balance));
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

    // 4. GENERATE REFERENCE
    const customerRef = `AIR-${Date.now()}-${userId.slice(-6)}`;
    const networkNames = { 1: "MTN", 2: "Airtel", 3: "Glo", 4: "9mobile" };
    const networkName = networkNames[network as keyof typeof networkNames] || "Unknown";
    log("REFERENCE_GENERATED", { customerRef, networkName });

    // 5. CREATE PENDING TRANSACTION AND DEBIT WALLET
    const insertResult = await queryOne<{ id: string }>(
      `INSERT INTO airtime_transactions 
       (user_id, provider_id, ident, network, network_name, mobile_number, amount, status, created_at, updated_at)
       VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING id`,
      [userId, customerRef, network, networkName, mobile_number, amountNum, "PENDING"]
    );

    if (!insertResult) {
      log("TRANSACTION_INSERT_FAILED", { userId, mobile_number });
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

    const balanceAfterDebit = typeof updateResult.balance === 'number' ? updateResult.balance : parseFloat(String(updateResult.balance));
    log("WALLET_DEBITED", { transactionId, debitAmount: amountNum, newBalance: balanceAfterDebit });

    // 6. CALL PROVIDER (PROVIDER_B)
    let providerRef: string | null = null;
    let providerResponse: string | null = null;
    let providerSuccess = false;
    let providerStatus: number | null = null;
    let apiResponse: any = null;

    try {
      const payload = {
        network,
        mobile_number,
        amount: amountNum,
      };
      log("PROVIDER_REQUEST", { url: `${process.env.PROVIDER_B_BASE_URL}/topup`, payload });

      const providerBResponse = await fetch(
        `${process.env.PROVIDER_B_BASE_URL}/topup`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.PROVIDER_B_TOKEN}`,
            Accept: "application/json",
            "Content-Type": "application/json; charset=utf-8",
          },
          body: JSON.stringify(payload),
        }
      );

      providerStatus = providerBResponse.status;
      const providerData = await providerBResponse.json();
      apiResponse = providerData;
      log("PROVIDER_RESPONSE", { status: providerStatus, data: providerData });

      if (providerData && providerData.Status === "successful") {
        providerSuccess = true;
        providerRef = providerData.ident || providerData.reference || customerRef;
        providerResponse = providerData.api_response || providerData.message || "Success";
        log("PROVIDER_SUCCESS", { providerRef, message: providerResponse });
      } else {
        providerResponse = providerData?.api_response || providerData?.message || "Provider request failed";
        log("PROVIDER_FAILED", { message: providerResponse, data: providerData });
      }
    } catch (providerError: any) {
      log("PROVIDER_ERROR", { error: providerError.message });
      providerSuccess = false;
      providerResponse = `Provider error: ${providerError.message}`;
    }

    // 7. HANDLE PROVIDER RESPONSE
    if (!providerSuccess) {
      log("PROVIDER_FAILED_REFUNDING", { transactionId });

      // Mark transaction as failed
      await execute(
        `UPDATE airtime_transactions
         SET status = $1, api_response = $2, updated_at = NOW()
         WHERE id = $3`,
        ["FAILED", JSON.stringify(apiResponse || { error: providerResponse }), transactionId]
      );

      // Refund wallet
      await execute(
        `UPDATE "User"
         SET balance = balance + $1
         WHERE id = $2`,
        [amountNum, userId]
      );

      log("REFUND_COMPLETED", { transactionId, refundAmount: amountNum });

      const errorMsg = providerResponse || "Provider failed to deliver airtime";
      log("RESPONSE_422", { error: errorMsg, transactionId });

      return NextResponse.json(
        {
          error: `${errorMsg}. Your balance has been refunded.`,
          transactionId,
          refunded: true,
        },
        { status: 422, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    // 8. ON SUCCESS - UPDATE TRANSACTION
    log("MARKING_TRANSACTION_SUCCESS", { transactionId });

    await execute(
      `UPDATE airtime_transactions
       SET status = $1, provider_id = $2, ident = $3, api_response = $4, description = $5, balance_before = $6, balance_after = $7, provider_created_at = NOW(), updated_at = NOW()
       WHERE id = $8`,
      ["SUCCESS", null, providerRef || customerRef, JSON.stringify(apiResponse), providerResponse, String(userBalance), String(balanceAfterDebit), transactionId]
    );

    log("TRANSACTION_COMPLETED", { transactionId, status: "SUCCESS", providerRef });

    // 9. RETURN SUCCESS
    const successResponse = {
      message: "Airtime sent successfully.",
      transactionId,
      reference: providerRef || customerRef,
      network: networkName,
      mobile_number,
      amount: amountNum,
      newBalance: balanceAfterDebit,
    };

    log("RESPONSE_200", successResponse);

    return NextResponse.json(successResponse, {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });

  } catch (error: any) {
    log("FATAL_ERROR", { error: error.message, stack: error.stack });

    if (transactionId) {
      try {
        await execute(
          `UPDATE airtime_transactions
           SET status = $1, api_response = $2, updated_at = NOW()
           WHERE id = $3`,
          ["FAILED", JSON.stringify({ fatal_error: error.message }), transactionId]
        );

        // Attempt refund
        const txn = await queryOne<{ amount: number }>(
          `SELECT amount FROM airtime_transactions WHERE id = $1`,
          [transactionId]
        );

        if (txn) {
          await execute(
            `UPDATE "User"
             SET balance = balance + $1
             WHERE id = $2`,
            [txn.amount, (await getSessionUser(request))?.userId]
          );
        }
      } catch (cleanupErr: any) {
        log("CLEANUP_ERROR", { error: cleanupErr.message });
      }
    }

    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }
}
