import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { deliverGuestData } from "@/lib/data-delivery";
import { checkAndAwardRewards } from "@/lib/rewards";

export async function POST(req: NextRequest) {
  try {
    // 1. Verify webhook signature
    const signature = req.headers.get("verif-hash");
    const body = await req.text();

    const hash = crypto
      .createHmac("sha256", process.env.FLUTTERWAVE_WEBHOOK_SECRET || "")
      .update(body)
      .digest("base64");

    if (hash !== signature) {
      console.warn("[WEBHOOK] Invalid signature");
      return NextResponse.json({ received: true }); // Always return 200
    }

    // 2. Parse body
    const data = JSON.parse(body);
    const { event, data: eventData } = data;

    // 3. Only process charge.completed events with NGN currency
    if (event !== "charge.completed") {
      return NextResponse.json({ received: true });
    }

    if (eventData.currency !== "NGN") {
      return NextResponse.json({ received: true });
    }

    // 4. Check idempotency - if this flwRef already processed successfully, skip
    const existingTx = await prisma.transaction.findFirst({
      where: {
        flwRef: eventData.flw_ref,
        status: "SUCCESS",
      },
    });

    if (existingTx) {
      console.log("[WEBHOOK] Already processed:", eventData.flw_ref);
      return NextResponse.json({ received: true });
    }

    // 5. Find the transaction - could be guest or user wallet funding
    let transaction = null;
    let isGuestTransaction = false;
    let isWalletFunding = false;

    // Try to find by reference (guest transaction)
    if (eventData.tx_ref?.startsWith("SYDATA-GUEST-")) {
      transaction = await prisma.transaction.findFirst({
        where: { reference: eventData.tx_ref },
      });
      isGuestTransaction = true;
    } else {
      // Try to find by VirtualAccount orderRef (user wallet funding)
      const virtualAccount = await prisma.virtualAccount.findFirst({
        where: { orderRef: eventData.tx_ref },
      });

      if (virtualAccount) {
        const relatedUser = await prisma.user.findUnique({
          where: { id: virtualAccount.userId },
        });

        if (relatedUser) {
          // For wallet funding, create or find transaction record
          // First check if we already have it
          transaction = await prisma.transaction.findFirst({
            where: {
              userId: virtualAccount.userId,
              type: "WALLET_FUNDING",
              status: "PENDING",
              reference: eventData.tx_ref,
            },
          });

          isWalletFunding = true;
        }
      }
    }

    if (!transaction) {
      console.warn("[WEBHOOK] Transaction not found for ref:", eventData.tx_ref);
      return NextResponse.json({ received: true }); // Don't process unknown transactions
    }

    // 6a. GUEST TRANSACTION - deliver data
    if (isGuestTransaction) {
      console.log("[WEBHOOK] Processing guest DATA_PURCHASE:", transaction.reference);

      // Verify amount matches
      if (transaction.amount !== eventData.amount) {
        console.warn("[WEBHOOK] Amount mismatch for guest transaction:", {
          stored: transaction.amount,
          flw: eventData.amount,
        });

        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: "FAILED",
            description: `Amount mismatch: expected ${transaction.amount}, received ${eventData.amount}`,
            flwRef: eventData.flw_ref,
          },
        });

        return NextResponse.json({ received: true });
      }

      // Update transaction with flw reference
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { flwRef: eventData.flw_ref },
      });

      // Deliver the data
      await deliverGuestData(transaction);
    }

    // 6b. USER WALLET FUNDING - credit balance and award rewards
    else if (isWalletFunding) {
      console.log("[WEBHOOK] Processing WALLET_FUNDING for user:", transaction.userId);

      await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: transaction.userId || "" },
        });

        if (!user) {
          console.error("[WEBHOOK] User not found:", transaction.userId);
          return;
        }

        // Credit balance in kobo (amount is in naira)
        const amountInKobo = eventData.amount * 100;
        await tx.user.update({
          where: { id: transaction.userId || "" },
          data: {
            balance: { increment: amountInKobo },
          },
        });

        // Update transaction to SUCCESS
        await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            status: "SUCCESS",
            flwRef: eventData.flw_ref,
            balanceAfter: user.balance + amountInKobo,
          },
        });
      });

      // Award rewards for wallet funding
      if (transaction.userId) {
        await checkAndAwardRewards(transaction.userId, eventData.amount, "DEPOSIT");
      }
    }

    // 7. Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[WEBHOOK CRITICAL ERROR]", error);
    // Always return 200 to prevent Flutterwave retries
    return NextResponse.json({ received: true });
  }
}
