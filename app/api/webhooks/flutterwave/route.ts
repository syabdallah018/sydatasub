import { NextRequest, NextResponse } from "next/server";
import { queryOne, query, execute } from "@/lib/db";
import { verifyFlutterwaveTransaction } from "@/lib/flutterwave";

export const dynamic = "force-dynamic";

const utf8Headers = { "Content-Type": "application/json; charset=utf-8" };

interface FlutterwaveWebhookPayload {
  event: string;
  "event.type"?: string;
  data?: {
    id?: number;
    tx_ref?: string;
    flw_ref?: string;
    amount?: number;
    currency?: string;
    charged_amount?: number;
    app_fee?: number;
    status?: string;
    payment_type?: string;
    customer?: {
      email?: string;
      name?: string;
      phone_number?: string;
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    const webhookHash =
      process.env.FLUTTERWAVE_WEBHOOK_HASH ||
      process.env.FLUTTERWAVE_WEBHOOK_SECRET;
    const incomingHash = request.headers.get("verif-hash");

    if (webhookHash && incomingHash !== webhookHash) {
      return NextResponse.json({ error: "Invalid webhook hash" }, { status: 401, headers: utf8Headers });
    }

    const payload = (await request.json()) as FlutterwaveWebhookPayload;

    if (
      payload.event !== "charge.completed" ||
      payload["event.type"] !== "BANK_TRANSFER_TRANSACTION" ||
      payload.data?.status !== "successful"
    ) {
      return NextResponse.json({ status: "ignored" }, { status: 200, headers: utf8Headers });
    }

    const transactionId = payload.data?.id;
    const txRef = payload.data?.tx_ref;

    if (!transactionId || !txRef) {
      return NextResponse.json({ status: "ignored" }, { status: 200, headers: utf8Headers });
    }

    const verification = await verifyFlutterwaveTransaction(transactionId);
    const verified = verification.data;

    if (
      !verified ||
      verified.status !== "successful" ||
      verified.payment_type !== "bank_transfer" ||
      verified.tx_ref !== txRef
    ) {
      return NextResponse.json({ status: "ignored" }, { status: 200, headers: utf8Headers });
    }

    const user = await queryOne<{
      id: string;
      balance: number | string;
    }>(
      `SELECT id, balance
       FROM "User"
       WHERE "flutterwave_tx_ref" = $1`,
      [txRef]
    );

    if (!user) {
      return NextResponse.json({ status: "processed" }, { status: 200, headers: utf8Headers });
    }

    const amount = Number(verified.amount || verified.charged_amount || 0);
    const flwRef = verified.flw_ref || payload.data?.flw_ref || txRef;

    const existingTransaction = await queryOne<{ id: string }>(
      `SELECT id FROM "Transaction" WHERE user_id = $1 AND reference = $2`,
      [user.id, flwRef]
    );

    if (existingTransaction) {
      return NextResponse.json({ status: "processed" }, { status: 200, headers: utf8Headers });
    }

    const currentBalance =
      typeof user.balance === "string" ? parseFloat(user.balance) : user.balance;
    const MAX_BALANCE = 30000;
    const creditAmount = Math.max(0, Math.min(amount, MAX_BALANCE - currentBalance));
    const newBalance = currentBalance + creditAmount;

    await execute(`UPDATE "User" SET balance = $1, "flutterwave_flw_ref" = $2 WHERE id = $3`, [
      newBalance,
      flwRef,
      user.id,
    ]);

    await query(
      `INSERT INTO "Transaction" (user_id, amount, reference, type, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [user.id, creditAmount, flwRef, "deposit", "success"]
    );

    return NextResponse.json(
      { status: "processed", userId: user.id, newBalance },
      { status: 200, headers: utf8Headers }
    );
  } catch (error) {
    console.error("[FLUTTERWAVE_WEBHOOK] Error:", error);
    return NextResponse.json(
      { status: "processed", error: "Server error handled" },
      { status: 200, headers: utf8Headers }
    );
  }
}
