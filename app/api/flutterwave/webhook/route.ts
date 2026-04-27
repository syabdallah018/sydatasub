import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deliverGuestData } from "@/lib/data-delivery";
import { evaluateDepositRewardInTx } from "@/lib/rewards";
import { enforceRateLimit, secureCompare } from "@/lib/security";

type WebhookLogContext = Record<string, unknown>;

function logWebhook(stage: string, context: WebhookLogContext) {
  console.info(
    "[FLW WEBHOOK]",
    JSON.stringify({
      stage,
      at: new Date().toISOString(),
      ...context,
    })
  );
}

async function acquireFundingLock(tx: any, reference: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`wallet:${reference}`}))`;
}

function extractUserIdFromTxRef(txRef: string): string | null {
  const value = String(txRef || "");
  const marker = "SYDATA-VA-";
  if (!value.startsWith(marker)) return null;
  const parts = value.split("-");
  if (parts.length < 4) return null;
  return parts.slice(2, parts.length - 1).join("-") || null;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 405 });
}

export async function GET() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function POST(req: NextRequest) {
  try {
    const webhookRateError = enforceRateLimit(req, "webhook", "flutterwave-webhook");
    if (webhookRateError) return webhookRateError;

    const signature = req.headers.get("verif-hash");
    const secret = process.env.FLUTTERWAVE_WEBHOOK_SECRET;

    if (!secret) {
      console.error("[WEBHOOK] Missing FLUTTERWAVE_WEBHOOK_SECRET");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
    }

    if (!signature || !secureCompare(signature, secret)) {
      console.warn("[WEBHOOK] Invalid webhook signature");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawBody = await req.text();
    const payload = JSON.parse(rawBody);
    const event = payload?.event;
    const eventData = payload?.data;
    const baseContext = {
      event,
      txRef: eventData?.tx_ref || null,
      flwRef: eventData?.flw_ref || null,
      amount: eventData?.amount || null,
      accountNumber: eventData?.account_number || null,
      status: eventData?.status || null,
    };

    logWebhook("received", baseContext);

    if (event !== "charge.completed" || !eventData?.flw_ref || !eventData?.tx_ref) {
      logWebhook("ignored_event", baseContext);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    if (String(eventData.status || "").toLowerCase() !== "successful") {
      logWebhook("ignored_unsuccessful_status", baseContext);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const amount = Number(eventData.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      logWebhook("ignored_invalid_amount", baseContext);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const existingSuccess = await prisma.transaction.findFirst({
      where: {
        flwRef: eventData.flw_ref,
        status: "SUCCESS",
      },
      select: {
        id: true,
        reference: true,
      },
    });

    if (existingSuccess) {
      logWebhook("already_processed", {
        ...baseContext,
        transactionId: existingSuccess.id,
        reference: existingSuccess.reference,
      });
      return NextResponse.json({ received: true }, { status: 200 });
    }

    if (String(eventData.tx_ref).startsWith("SYDATA-GUEST-")) {
      const transaction = await prisma.transaction.findFirst({
        where: { reference: eventData.tx_ref },
      });

      if (!transaction) {
        logWebhook("guest_transaction_missing", baseContext);
        return NextResponse.json({ received: true }, { status: 200 });
      }

      if (transaction.amount !== amount) {
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: "FAILED",
            description: `Amount mismatch: expected ${transaction.amount}, received ${amount}`,
            flwRef: eventData.flw_ref,
          },
        });

        logWebhook("guest_amount_mismatch", {
          ...baseContext,
          transactionId: transaction.id,
          expectedAmount: transaction.amount,
        });
        return NextResponse.json({ received: true }, { status: 200 });
      }

      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { flwRef: eventData.flw_ref },
      });

      const guestResult = await deliverGuestData(transaction);
      logWebhook("guest_processed", {
        ...baseContext,
        transactionId: transaction.id,
        delivered: guestResult.success,
        message: guestResult.message,
      });
      return NextResponse.json({ received: true }, { status: 200 });
    }

    let virtualAccount = await prisma.virtualAccount.findFirst({
      where: { orderRef: eventData.tx_ref },
      select: {
        id: true,
        userId: true,
        accountNumber: true,
        orderRef: true,
      },
    });

    if (!virtualAccount && eventData.account_number) {
      virtualAccount = await prisma.virtualAccount.findFirst({
        where: { accountNumber: String(eventData.account_number) },
        select: {
          id: true,
          userId: true,
          accountNumber: true,
          orderRef: true,
        },
      });
      if (virtualAccount) {
        logWebhook("matched_by_account_number", {
          ...baseContext,
          virtualAccountId: virtualAccount.id,
          storedOrderRef: virtualAccount.orderRef,
        });
      }
    }

    if (!virtualAccount) {
      const parsedUserId = extractUserIdFromTxRef(String(eventData.tx_ref));
      if (parsedUserId) {
        virtualAccount = await prisma.virtualAccount.findFirst({
          where: { userId: parsedUserId },
          select: {
            id: true,
            userId: true,
            accountNumber: true,
            orderRef: true,
          },
        });
        if (virtualAccount) {
          logWebhook("matched_by_tx_ref_user", {
            ...baseContext,
            virtualAccountId: virtualAccount.id,
            userId: virtualAccount.userId,
          });
        }
      }
    }

    if (!virtualAccount) {
      const existingFunding = await prisma.transaction.findFirst({
        where: {
          type: "WALLET_FUNDING",
          OR: [{ externalReference: String(eventData.tx_ref) }, { reference: String(eventData.tx_ref) }],
        },
        select: { userId: true, id: true },
        orderBy: { createdAt: "desc" },
      });

      if (existingFunding?.userId) {
        virtualAccount = await prisma.virtualAccount.findFirst({
          where: { userId: existingFunding.userId },
          select: {
            id: true,
            userId: true,
            accountNumber: true,
            orderRef: true,
          },
        });
        if (virtualAccount) {
          logWebhook("matched_by_existing_funding_ref", {
            ...baseContext,
            virtualAccountId: virtualAccount.id,
            transactionId: existingFunding.id,
            userId: virtualAccount.userId,
          });
        }
      }
    }

    if (!virtualAccount) {
      logWebhook("virtual_account_missing", baseContext);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    if (
      eventData.account_number &&
      String(eventData.account_number) !== virtualAccount.accountNumber
    ) {
      logWebhook("account_number_mismatch", {
        ...baseContext,
        virtualAccountId: virtualAccount.id,
        storedAccountNumber: virtualAccount.accountNumber,
      });
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const accountUser = await prisma.user.findUnique({
      where: { id: virtualAccount.userId },
      select: { id: true, phone: true, balance: true },
    });

    if (!accountUser) {
      logWebhook("virtual_account_user_missing", {
        ...baseContext,
        virtualAccountId: virtualAccount.id,
      });
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const amountInKobo = Math.round(amount * 100);

    const creditResult = await prisma.$transaction(async (tx) => {
      await acquireFundingLock(tx, String(eventData.flw_ref));

      const existingTransaction = await tx.transaction.findFirst({
        where: {
          userId: accountUser.id,
          type: "WALLET_FUNDING",
          flwRef: eventData.flw_ref,
        },
        select: {
          id: true,
          status: true,
          amount: true,
          balanceBefore: true,
          balanceAfter: true,
        },
      });

      if (existingTransaction?.status === "SUCCESS") {
        return {
          alreadyProcessed: true,
          transactionId: existingTransaction.id,
          balanceAfter: existingTransaction.balanceAfter,
        };
      }

      const transaction =
        existingTransaction ||
        (await tx.transaction.create({
          data: {
            userId: accountUser.id,
            phone: accountUser.phone,
            type: "WALLET_FUNDING",
            status: "PENDING",
            amount,
            reference: eventData.flw_ref,
            externalReference: eventData.tx_ref,
            flwRef: eventData.flw_ref,
            description: `Wallet top-up via Flutterwave (${eventData.tx_ref})`,
          },
          select: {
            id: true,
            status: true,
            amount: true,
            balanceBefore: true,
            balanceAfter: true,
          },
        }));

      if (transaction.amount !== amount) {
        await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            status: "FAILED",
            flwRef: eventData.flw_ref,
            externalReference: eventData.tx_ref,
            description: `Amount mismatch: expected ${transaction.amount}, received ${amount}`,
          },
        });

        return {
          alreadyProcessed: false,
          amountMismatch: true,
          transactionId: transaction.id,
          expectedAmount: transaction.amount,
        };
      }

      const currentUser = await tx.user.findUnique({
        where: { id: accountUser.id },
        select: { balance: true },
      });

      if (!currentUser) {
        throw new Error("Wallet funding user not found");
      }

      const updatedUser = await tx.user.update({
        where: { id: accountUser.id },
        data: { balance: { increment: amountInKobo } },
        select: { balance: true },
      });

      await evaluateDepositRewardInTx(tx, {
        userId: accountUser.id,
        phone: accountUser.phone,
        depositAmount: amount,
      });

      await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          status: "SUCCESS",
          flwRef: eventData.flw_ref,
          externalReference: eventData.tx_ref,
          balanceBefore: transaction.balanceBefore ?? currentUser.balance,
          balanceAfter: updatedUser.balance,
          description: `Wallet top-up via Flutterwave (${eventData.tx_ref})`,
        },
      });

      return {
        alreadyProcessed: false,
        transactionId: transaction.id,
        balanceBefore: currentUser.balance,
        balanceAfter: updatedUser.balance,
      };
    });

    if ("amountMismatch" in creditResult && creditResult.amountMismatch) {
      logWebhook("wallet_amount_mismatch", {
        ...baseContext,
        transactionId: creditResult.transactionId,
        expectedAmount: creditResult.expectedAmount,
      });
      return NextResponse.json({ received: true }, { status: 200 });
    }

    logWebhook(creditResult.alreadyProcessed ? "wallet_already_processed" : "wallet_credited", {
      ...baseContext,
      userId: accountUser.id,
      virtualAccountId: virtualAccount.id,
      transactionId: creditResult.transactionId,
      balanceBefore: "balanceBefore" in creditResult ? creditResult.balanceBefore : undefined,
      balanceAfter: creditResult.balanceAfter,
    });

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("[WEBHOOK ERROR]", error instanceof Error ? error.message : error);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
