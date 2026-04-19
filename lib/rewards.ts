import { prisma } from "@/lib/db";
import { getDbCapabilities } from "@/lib/db-capabilities";

async function creditRewardBalance(tx: any, userId: string, amountNaira: number) {
  const rewardInKobo = amountNaira * 100;
  const dbCaps = await getDbCapabilities();

  await tx.user.update({
    where: { id: userId },
    data: dbCaps.userRewardBalance
      ? { rewardBalance: { increment: rewardInKobo } }
      : { balance: { increment: rewardInKobo } },
  });
}

async function createRewardTransaction(tx: any, userId: string, phone: string, amount: number, title: string) {
  await tx.transaction.create({
    data: {
      userId,
      phone,
      type: "REWARD_CREDIT",
      amount,
      status: "SUCCESS",
      reference: `REWARD-${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      description: title,
    },
  });
}

export async function checkAndAwardRewards(userId: string, amount: number, type: "DEPOSIT") {
  try {
    if (type !== "DEPOSIT") return;
    const dbCaps = await getDbCapabilities();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        role: true,
        tier: true,
        ...(dbCaps.userAgentRequestStatus ? { agentRequestStatus: true } : {}),
      },
    });

    if (!user) return;

    const [firstDepositReward, deposit10kReward] = await Promise.all([
      prisma.reward.findFirst({ where: { type: "FIRST_DEPOSIT_2K" } }),
      prisma.reward.findFirst({ where: { type: "DEPOSIT_10K_UPGRADE" } }),
    ]);

    if (firstDepositReward) {
      const userReward = await prisma.userReward.findFirst({
        where: {
          userId,
          rewardId: firstDepositReward.id,
          status: "IN_PROGRESS",
        },
      });

      const qualifyingTransaction = await prisma.transaction.findFirst({
        where: {
          userId,
          type: "WALLET_FUNDING",
          amount: { gte: 2000 },
          status: "SUCCESS",
        },
      });

      if (userReward && qualifyingTransaction) {
        await prisma.$transaction(async (tx) => {
          await creditRewardBalance(tx, userId, firstDepositReward.amount);
          await createRewardTransaction(tx, userId, user.phone, firstDepositReward.amount, firstDepositReward.title);

          await tx.userReward.update({
            where: { id: userReward.id },
            data: {
              status: "CLAIMED",
              claimedAt: new Date(),
            },
          });
        });
      }
    }

    if (deposit10kReward) {
      const userReward = await prisma.userReward.findFirst({
        where: {
          userId,
          rewardId: deposit10kReward.id,
          status: "IN_PROGRESS",
        },
      });

      const qualifyingTransaction = await prisma.transaction.findFirst({
        where: {
          userId,
          type: "WALLET_FUNDING",
          amount: { gte: 10000 },
          status: "SUCCESS",
        },
      });

      if (userReward && qualifyingTransaction) {
        await prisma.$transaction(async (tx) => {
          await creditRewardBalance(tx, userId, deposit10kReward.amount);
          await createRewardTransaction(tx, userId, user.phone, deposit10kReward.amount, deposit10kReward.title);

          await tx.user.update({
            where: { id: userId },
            data: dbCaps.userAgentRequestStatus
              ? {
                  agentRequestStatus:
                    user.agentRequestStatus === "APPROVED" ? "APPROVED" : "PENDING",
                }
              : {},
          });

          await tx.userReward.update({
            where: { id: userReward.id },
            data: {
              status: "EARNED",
              claimedAt: new Date(),
            },
          });
        });
      }
    }
  } catch (error) {
    console.error("[REWARD AWARD ERROR]", error);
  }
}
