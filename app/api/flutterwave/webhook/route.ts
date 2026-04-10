import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { deliverGuestData } from "@/lib/data-delivery";
import { checkAndAwardRewards } from "@/lib/rewards";

// Handle CORS preflight requests
export async function OPTIONS(req: NextRequest) {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, verif-hash, authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

// Diagnostic endpoint to test webhook connectivity
export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: "webhook_endpoint_active",
    timestamp: new Date().toISOString(),
    secretConfigured: !!process.env.FLUTTERWAVE_WEBHOOK_SECRET,
    message: "This endpoint is ready to receive Flutterwave webhooks",
  });
}

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("verif-hash");
    const body = await req.text();
    const secret = process.env.FLUTTERWAVE_WEBHOOK_SECRET || "";

    console.log("[WEBHOOK] Request received at", new Date().toISOString());
    console.log("[WEBHOOK] Secret configured:", !!secret);

    // Raw secret comparison - no hashing
    if (!secret) {
      console.warn("[WEBHOOK] ⚠️  FLUTTERWAVE_WEBHOOK_SECRET not configured. Accepting all webhooks.");
    } else if (signature !== secret) {
      console.warn("[WEBHOOK] ⚠️  Secret mismatch - rejecting webhook");
      return NextResponse.json({ received: true }, { status: 200 });
    } else {
      console.log("[WEBHOOK] ✅ Secret verified successfully");
    }

    // Parse body
    let data;
    try {
      data = JSON.parse(body);
    } catch (e) {
      console.error("[WEBHOOK] Failed to parse JSON body");
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const { event, data: eventData } = data;

    // 4. Check idempotency - if this flwRef already processed successfully, skip
    const existingTx = await prisma.transaction.findFirst({
      where: {
        flwRef: eventData.flw_ref,
        status: "SUCCESS",
      },
    });

    if (existingTx) {
      console.log("[WEBHOOK] Already processed (idempotency check):", eventData.flw_ref);
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
      console.log("[WEBHOOK] Looking for guest transaction:", eventData.tx_ref, {
        found: !!transaction,
      });
    } else {
      // Try to find by VirtualAccount orderRef (user wallet funding)
      console.log("[WEBHOOK] Looking for wallet funding by orderRef:", eventData.tx_ref);
      const virtualAccount = await prisma.virtualAccount.findFirst({
        where: { orderRef: eventData.tx_ref },
      });

      console.log("[WEBHOOK] VirtualAccount lookup result:", {
        found: !!virtualAccount,
        accountNumber: virtualAccount?.accountNumber,
      });

      if (virtualAccount) {
        const relatedUser = await prisma.user.findUnique({
          where: { id: virtualAccount.userId },
        });

        console.log("[WEBHOOK] User lookup by virtualAccount:", {
          found: !!relatedUser,
          userId: virtualAccount.userId,
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

          console.log("[WEBHOOK] Transaction lookup for wallet funding:", {
            found: !!transaction,
            userId: virtualAccount.userId,
          });

          isWalletFunding = true;
        }
      }
    }

    // FALLBACK: If transaction not found, attempt phone-based user lookup
    if (!transaction && !isGuestTransaction) {
      console.log("[WEBHOOK PHONE LOOKUP] Transaction not found by normal lookup, attempting phone-based lookup...");
      
      // Extract phone number from various possible locations in Flutterwave payload
      const phoneFromPayload = 
        eventData.customer?.phone_number ||
        eventData.phone_number ||
        eventData.meta?.phone ||
        data.data?.customer?.phone_number;

      console.log("[WEBHOOK PHONE LOOKUP] Raw phone extracted from payload:", phoneFromPayload);
      console.log("[WEBHOOK PHONE LOOKUP] Full customer data:", JSON.stringify(eventData.customer || {}));

      if (phoneFromPayload) {
        // Normalize phone number (remove +234, 0, etc. and format as 11 digits starting with 0)
        let normalizedPhone = phoneFromPayload.toString().trim();
        console.log("[WEBHOOK PHONE LOOKUP] Raw phone before normalization:", normalizedPhone);
        
        if (normalizedPhone.startsWith('+234')) {
          normalizedPhone = '0' + normalizedPhone.slice(4);
        } else if (normalizedPhone.startsWith('234')) {
          normalizedPhone = '0' + normalizedPhone.slice(3);
        } else if (!normalizedPhone.startsWith('0')) {
          normalizedPhone = '0' + normalizedPhone;
        }

        console.log("[WEBHOOK PHONE LOOKUP] Normalized phone number:", normalizedPhone, "Length:", normalizedPhone.length);

        const userByPhone = await prisma.user.findUnique({
          where: { phone: normalizedPhone },
        });

        console.log("[WEBHOOK PHONE LOOKUP] User lookup result:", {
          found: !!userByPhone,
          userId: userByPhone?.id,
          phone: userByPhone?.phone,
        });

        if (userByPhone) {
          // Create a wallet funding entry
          transaction = await prisma.transaction.create({
            data: {
              userId: userByPhone.id,
              phone: userByPhone.phone,
              type: "WALLET_FUNDING",
              status: "PENDING",
              amount: eventData.amount,
              reference: eventData.tx_ref || eventData.flw_ref,
              description: "Wallet top-up via Flutterwave (phone-based match)",
            },
          });

          console.log("[WEBHOOK PHONE LOOKUP] Created transaction via phone lookup:", {
            transactionId: transaction.id,
            userId: userByPhone.id,
            userPhone: userByPhone.phone,
            amount: eventData.amount,
            normalizedPhone: normalizedPhone,
          });

          isWalletFunding = true;
        }
      }
    }

    if (!transaction) {
      console.warn("[WEBHOOK ERROR] Transaction not found - giving up on lookup for ref:", eventData.tx_ref);
      console.log("[WEBHOOK ERROR DETAILS]", {
        txRef: eventData.tx_ref,
        flwRef: eventData.flw_ref,
        amount: eventData.amount,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ received: true }); // Don't process unknown transactions
    }

    // 6a. GUEST TRANSACTION - deliver data
    if (isGuestTransaction) {
      console.log("[WEBHOOK GUEST] Processing guest DATA_PURCHASE:", transaction.reference);

      // Verify amount matches
      if (transaction.amount !== eventData.amount) {
        console.warn("[WEBHOOK GUEST] Amount mismatch for guest transaction:", {
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
      console.log("[WEBHOOK WALLET] Processing WALLET_FUNDING for user:", transaction.userId);

      await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: transaction.userId || "" },
        });

        if (!user) {
          console.error("[WEBHOOK WALLET ERROR] User not found during wallet funding:", transaction.userId);
          return;
        }

        console.log("[WEBHOOK WALLET] User found for wallet funding:", {
          userId: user.id,
          phone: user.phone,
          currentBalance: user.balance,
          amountToAdd: eventData.amount,
        });

        // Credit balance in kobo (amount is in naira)
        const amountInKobo = eventData.amount * 100;
        let bonusCredit = 0;
        let newTier = user.tier;

        // Apply deposit bonuses
        if (eventData.amount >= 10000) {
          // 10k+ deposit: 300 naira + upgrade to agent
          bonusCredit = 30000; // 300 naira in kobo
          newTier = "agent";
          console.log("[WEBHOOK WALLET] 🚀 Agent tier upgrade triggered for deposit >= 10k");
        } else if (eventData.amount >= 2000) {
          // 2k-10k deposit: 200 naira
          bonusCredit = 20000; // 200 naira in kobo
          console.log("[WEBHOOK WALLET] 🎁 Deposit bonus 200 naira triggered for deposit >= 2k");
        }

        const totalCredit = amountInKobo + bonusCredit;
        console.log("[WEBHOOK WALLET] Crediting balance in kobo:", {
          amountInKobo,
          bonusCredit,
          totalCredit,
          currentBalance: user.balance,
          newBalance: user.balance + totalCredit,
        });

        const updatedUser = await tx.user.update({
          where: { id: transaction.userId || "" },
          data: {
            balance: { increment: totalCredit },
            tier: newTier,
          },
        });

        console.log("[WEBHOOK WALLET] ✅ Balance updated successfully", {
          userId: transaction.userId,
          oldBalance: user.balance,
          amountAdded: amountInKobo,
          bonusCredit,
          newBalance: updatedUser.balance,
          newTier: updatedUser.tier,
        });

        // Update transaction to SUCCESS
        await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            status: "SUCCESS",
            flwRef: eventData.flw_ref,
            balanceAfter: updatedUser.balance,
          },
        });

        console.log("[WEBHOOK WALLET] ✅ Transaction marked as SUCCESS", {
          transactionId: transaction.id,
          flwRef: eventData.flw_ref,
          finalBalance: updatedUser.balance,
        });
      });

      // Award rewards for wallet funding
      if (transaction.userId) {
        console.log("[WEBHOOK WALLET] Checking rewards for wallet funding:", transaction.userId);
        await checkAndAwardRewards(transaction.userId, eventData.amount, "DEPOSIT");
      }
    }

    // 7. Always return 200 to acknowledge receipt
    console.log("[WEBHOOK SUCCESS] ✅ Webhook fully processed, returning 200 OK");
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[WEBHOOK CRITICAL ERROR] ❌ Webhook processing failed with exception:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    // Always return 200 to prevent Flutterwave retries
    return NextResponse.json({ received: true });
  }
}
