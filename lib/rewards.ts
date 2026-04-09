import { prisma } from "@/lib/db";

export async function checkAndAwardRewards(userId: string, amount: number, type: "DEPOSIT") {
  try {
    if (type !== "DEPOSIT") return;

    // Check for FIRST_DEPOSIT_2K reward
    const firstDepositReward = await prisma.reward.findFirst({
      where: { type: "FIRST_DEPOSIT_2K" },
    });

    if (firstDepositReward) {
      const userReward = await prisma.userReward.findFirst({
        where: {
          userId,
          rewardId: firstDepositReward.id,
          status: "IN_PROGRESS",
        },
      });

      // Check if user has any wallet funding transaction >= 2000
      const qualifyingTransaction = await prisma.transaction.findFirst({
        where: {
          userId,
          type: "WALLET_FUNDING",
          amount: { gte: 2000 },
          status: "SUCCESS",
        },
      });

      if (userReward && qualifyingTransaction) {
        // Award the reward
        const rewardInKobo = firstDepositReward.amount * 100;
        await prisma.$transaction(async (tx) => {
          // Credit reward balance
          await tx.user.update({
            where: { id: userId },
            data: { balance: { increment: rewardInKobo } },
          });

          // Create reward credit transaction
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

          // Update reward status to EARNED
          await tx.userReward.update({
            where: { id: userReward.id },
            data: { status: "EARNED" },
          });
        });
      }
    }

    // Check for DEPOSIT_10K_UPGRADE reward
    const deposit10kReward = await prisma.reward.findFirst({
      where: { type: "DEPOSIT_10K_UPGRADE" },
    });

    if (deposit10kReward) {
      const userReward = await prisma.userReward.findFirst({
        where: {
          userId,
          rewardId: deposit10kReward.id,
          status: "IN_PROGRESS",
        },
      });

      // Check if user has any wallet funding transaction >= 10000
      const qualifyingTransaction = await prisma.transaction.findFirst({
        where: {
          userId,
          type: "WALLET_FUNDING",
          amount: { gte: 10000 },
          status: "SUCCESS",
        },
      });

      if (userReward && qualifyingTransaction) {
        // Award the reward and upgrade to AGENT
        const rewardInKobo = deposit10kReward.amount * 100;
        await prisma.$transaction(async (tx) => {
          // Upgrade user to AGENT
          await tx.user.update({
            where: { id: userId },
            data: {
              role: "AGENT",
              balance: { increment: rewardInKobo },
            },
          });

          // Create reward credit transaction
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

          // Update reward status to EARNED
          await tx.userReward.update({
            where: { id: userReward.id },
            data: { status: "EARNED" },
          });
        });
      }
    }
  } catch (error) {
    console.error("[REWARD AWARD ERROR]", error);
    // Don't fail the main transaction if reward awarding fails
  }
}
