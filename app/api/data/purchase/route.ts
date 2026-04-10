import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { purchaseData as purchaseFromSmeplug } from "@/lib/smeplug";
import { purchaseData as purchaseFromSaiful } from "@/lib/saiful";
import bcryptjs from "bcryptjs";
import { z } from "zod";

const purchaseSchema = z.object({
  planId: z.string().min(1, "Plan ID is required"),
  buyerPhone: z.string().regex(/^0[0-9]{10}$/, "Invalid buyer phone number"),
  recipientPhone: z.string().regex(/^0[0-9]{10}$/, "Invalid recipient phone number"),
  pin: z.string().regex(/^\d{6}$/, "Invalid PIN"),
});

export async function POST(req: NextRequest) {
  try {
    console.log("[DATA PURCHASE] Starting purchase request");
    
    const body = await req.json();
    console.log("[DATA PURCHASE] Request body received:", { buyerPhone: body.buyerPhone, recipientPhone: body.recipientPhone, planId: body.planId });
    
    const { planId, buyerPhone, recipientPhone, pin } = purchaseSchema.parse(body);

    // DIRECT AUTH: Look up user by buyerPhone
    console.log("[DATA PURCHASE] Looking up buyer by phone:", buyerPhone);
    const userData = await prisma.user.findUnique({
      where: { phone: buyerPhone },
    });

    if (!userData) {
      console.error("[DATA PURCHASE] ❌ User not found by phone:", buyerPhone);
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    console.log("[DATA PURCHASE] ✅ User found:", { userId: userData.id, phone: userData.phone });

    if (userData.isBanned) {
      console.error("[DATA PURCHASE] ❌ Account banned:", userData.id);
      return NextResponse.json(
        { success: false, error: "Account is banned" },
        { status: 403 }
      );
    }

    // Verify PIN
    if (!userData.pinHash) {
      console.error("[DATA PURCHASE] ❌ PIN not set for user:", userData.id);
      return NextResponse.json(
        { success: false, error: "PIN not set" },
        { status: 400 }
      );
    }

    console.log("[DATA PURCHASE] Verifying PIN...");
    const isPinValid = await bcryptjs.compare(pin, userData.pinHash);
    
    if (!isPinValid) {
      console.error("[DATA PURCHASE] ❌ Invalid PIN for user:", userData.id);
      return NextResponse.json(
        { success: false, error: "Invalid PIN" },
        { status: 401 }
      );
    }

    console.log("[DATA PURCHASE] ✅ PIN verified successfully");

    // Get plan
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      console.error("[DATA PURCHASE] ❌ Plan not found:", planId);
      return NextResponse.json(
        { success: false, error: "Plan not found" },
        { status: 404 }
      );
    }

    // Check balance (convert naira to kobo for comparison)
    const planPriceInKobo = plan.price * 100;
    console.log("[DATA PURCHASE] Balance check:", { userBalance: userData.balance, planPrice: planPriceInKobo, sufficient: userData.balance >= planPriceInKobo });
    
    if (userData.balance < planPriceInKobo) {
      console.error("[DATA PURCHASE] ❌ Insufficient balance:", { have: userData.balance, need: planPriceInKobo });
      return NextResponse.json(
        { success: false, error: "Insufficient balance" },
        { status: 400 }
      );
    }
      );
    }

    // Deduct balance and create transaction atomically
    const reference = `DATA-${userData.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await prisma.$transaction(async (tx) => {
      // Deduct balance (in kobo)
      await tx.user.update({
        where: { id: userData.id },
        data: { balance: { decrement: planPriceInKobo } },
      });

      // Create transaction (amount in naira)
      await tx.transaction.create({
        data: {
          userId: userData.id,
          type: "DATA_PURCHASE",
          amount: plan.price,
          status: "PENDING",
          reference,
          description: `${plan.name} (${plan.sizeLabel}) → ${recipientPhone}`,
          phone: recipientPhone,
          planId,
        },
      });
    });

    // Call data API
    let apiResult;
    try {
      console.log("[DATA PURCHASE] Calling provider API...");
      if (plan.apiSource === "API_A") {
        // Smeplug API
        apiResult = await purchaseFromSmeplug({
          externalNetworkId: plan.externalNetworkId,
          externalPlanId: plan.externalPlanId,
          phone: recipientPhone,
          reference,
        });
      } else if (plan.apiSource === "API_B") {
        // Saiful API - pass externalPlanId as integer
        apiResult = await purchaseFromSaiful({
          plan: plan.externalPlanId,  // Send plan ID as integer
          mobileNumber: recipientPhone,
          network: plan.network,
          reference,
        });
      } else {
        throw new Error("Unsupported API source");
      }

      if (apiResult.success) {
        // Update transaction to success
        await prisma.transaction.updateMany({
          where: { reference },
          data: { status: "SUCCESS" },
        });

        // Check and credit rewards
        await checkAndCreditRewards(userData.id, plan.price);

        console.log("[DATA PURCHASE] ✅ SUCCESS:", { userId: userData.id, planId, recipientPhone, reference });

        return NextResponse.json(
          {
            success: true,
            message: apiResult.message,
            reference,
          },
          { status: 200 }
        );
      } else {
        // API failed, refund balance (in kobo)
        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: userData.id },
            data: { balance: { increment: planPriceInKobo } },
          });

          await tx.transaction.updateMany({
            where: { reference },
            data: { status: "FAILED" },
          });
        });

        console.error("[DATA PURCHASE] ❌ API FAILED:", { error: apiResult.message });

        return NextResponse.json(
          { success: false, error: apiResult.message || "Purchase failed" },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error("[DATA PURCHASE API ERROR]", error);

      // Refund on API error (in kobo)
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userData.id },
          data: { balance: { increment: planPriceInKobo } },
        });

        await tx.transaction.updateMany({
          where: { reference },
          data: { status: "FAILED" },
        });
      });

      console.error("[DATA PURCHASE] ❌ API exception, balance refunded:", { userId: userData.id });
      return NextResponse.json(
        { success: false, error: "Purchase failed, balance refunded" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[DATA PURCHASE ERROR]", error);
    if (error instanceof z.ZodError) {
      console.error("[DATA PURCHASE] ❌ Validation error:", error.issues[0].message);
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("[DATA PURCHASE] ❌ Unhandled error:", { error: error instanceof Error ? error.message : error });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Check and credit rewards after successful transaction
async function checkAndCreditRewards(userId: string, transactionAmount: number) {
  try {
    // Check for FIRST_DEPOSIT_2K reward
    const firstDepositReward = await prisma.reward.findFirst({
      where: { type: "FIRST_DEPOSIT_2K", title: { contains: "First Deposit" } },
    });

    if (firstDepositReward) {
      const userReward = await prisma.userReward.findFirst({
        where: {
          userId,
          rewardId: firstDepositReward.id,
          status: "IN_PROGRESS",
        },
      });

      if (userReward && transactionAmount >= 2000) { // ₦2,000
        await prisma.$transaction(async (tx) => {
          // Credit reward (convert naira to kobo for balance)
          const rewardInKobo = firstDepositReward.amount * 100;
          await tx.user.update({
            where: { id: userId },
            data: { balance: { increment: rewardInKobo } },
          });

          // Create transaction
          // Fetch user phone for transaction
          const user = await tx.user.findUnique({ where: { id: userId } });
          await tx.transaction.create({
            data: {
              userId,
              phone: user?.phone || "",
              type: "REWARD_CREDIT",
              amount: firstDepositReward.amount,
              status: "SUCCESS",
              reference: `REWARD-${userId}-${Date.now()}`,
              description: firstDepositReward.title,
            },
          });

          // Update user reward status
          await tx.userReward.update({
            where: { id: userReward.id },
            data: { status: "CLAIMED" },
          });
        });
      }
    }

    // Check for DEPOSIT_10K_UPGRADE reward
    const deposit10kReward = await prisma.reward.findFirst({
      where: { type: "DEPOSIT_10K_UPGRADE", title: { contains: "10K" } },
    });

    if (deposit10kReward) {
      const userReward = await prisma.userReward.findFirst({
        where: {
          userId,
          rewardId: deposit10kReward.id,
          status: "IN_PROGRESS",
        },
      });

      if (userReward && transactionAmount >= 10000) { // ₦10,000
        await prisma.$transaction(async (tx) => {
          // Credit reward (convert naira to kobo for balance)
          const rewardInKobo = deposit10kReward.amount * 100;
          await tx.user.update({
            where: { id: userId },
            data: { balance: { increment: rewardInKobo } },
          });

          // Create transaction
          // Fetch user phone for transaction
          const user = await tx.user.findUnique({ where: { id: userId } });
          await tx.transaction.create({
            data: {
              userId,
              phone: user?.phone || "",
              type: "REWARD_CREDIT",
              amount: deposit10kReward.amount,
              status: "SUCCESS",
              reference: `REWARD-${userId}-${Date.now()}`,
              description: deposit10kReward.title,
            },
          });

          // Update user reward status
          await tx.userReward.update({
            where: { id: userReward.id },
            data: { status: "CLAIMED" },
          });
        });
      }
    }
  } catch (error) {
    console.error("[REWARD CREDIT ERROR]", error);
    // Don't fail the main transaction if reward crediting fails
  }
}
