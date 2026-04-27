import { Prisma, PrismaClient, Reward, RewardStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

export type ManagedRewardType =
  | "SIGNUP_BONUS"
  | "FIRST_DEPOSIT_2K"
  | "DEPOSIT_10K_UPGRADE"
  | "SALES_50GB_WEEKLY"
  | "SALES_100GB_WEEKLY";

const RT = {
  SIGNUP_BONUS: "SIGNUP_BONUS" as ManagedRewardType,
  FIRST_DEPOSIT_2K: "FIRST_DEPOSIT_2K" as ManagedRewardType,
  DEPOSIT_10K_UPGRADE: "DEPOSIT_10K_UPGRADE" as ManagedRewardType,
  SALES_50GB_WEEKLY: "SALES_50GB_WEEKLY" as ManagedRewardType,
  SALES_100GB_WEEKLY: "SALES_100GB_WEEKLY" as ManagedRewardType,
} as const;

type RewardDefinition = {
  type: ManagedRewardType;
  title: string;
  description: string;
  amount: number;
  metric: "deposit" | "data_sales";
  targetValue: number;
  unit: "NGN" | "GB";
};

export type RewardProgressItem = {
  id: string;
  type: ManagedRewardType;
  title: string;
  description: string;
  amount: number;
  claimed: boolean;
  claimable: boolean;
  status: "CLAIMED" | "IN_PROGRESS" | "MISSED";
  progressValue: number;
  targetValue: number;
  progressPercent: number;
  unit: "NGN" | "GB";
  claimedAt: string | null;
  isActive: boolean;
};

export const REWARD_DEFINITIONS: Record<ManagedRewardType, RewardDefinition> = {
  SIGNUP_BONUS: {
    type: RT.SIGNUP_BONUS,
    title: "Welcome Bonus",
    description: "Earn N100 once when your account is created.",
    amount: 100,
    metric: "deposit",
    targetValue: 1,
    unit: "NGN",
  },
  FIRST_DEPOSIT_2K: {
    type: RT.FIRST_DEPOSIT_2K,
    title: "First Deposit Reward",
    description: "Earn N200 on your first successful deposit between N2,000 and N9,999.",
    amount: 200,
    metric: "deposit",
    targetValue: 2000,
    unit: "NGN",
  },
  DEPOSIT_10K_UPGRADE: {
    type: RT.DEPOSIT_10K_UPGRADE,
    title: "Premium Deposit Reward",
    description: "Earn N400 on your first successful deposit of N10,000 and above.",
    amount: 400,
    metric: "deposit",
    targetValue: 10000,
    unit: "NGN",
  },
  SALES_50GB_WEEKLY: {
    type: RT.SALES_50GB_WEEKLY,
    title: "50GB Weekly Milestone",
    description: "Earn N1,000 when your successful data sales hit 50GB within 7 days.",
    amount: 1000,
    metric: "data_sales",
    targetValue: 50,
    unit: "GB",
  },
  SALES_100GB_WEEKLY: {
    type: RT.SALES_100GB_WEEKLY,
    title: "100GB Weekly Milestone",
    description: "Earn N2,500 when your successful data sales hit 100GB within 7 days.",
    amount: 2500,
    metric: "data_sales",
    targetValue: 100,
    unit: "GB",
  },
};

const MANAGED_REWARD_TYPES: ManagedRewardType[] = [
  RT.SIGNUP_BONUS,
  RT.FIRST_DEPOSIT_2K,
  RT.DEPOSIT_10K_UPGRADE,
  RT.SALES_50GB_WEEKLY,
  RT.SALES_100GB_WEEKLY,
];

type RewardDbClient = PrismaClient | Prisma.TransactionClient;

async function getRewardDbSupport(db: RewardDbClient) {
  const [enumRows, tableRows] = await Promise.all([
    db.$queryRawUnsafe<{ value: string }[]>(`
      SELECT e.enumlabel AS value
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'RewardType'
      ORDER BY e.enumsortorder
    `).catch(() => []),
    db.$queryRawUnsafe<{ table_name: string }[]>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('rewards', 'user_rewards')
    `).catch(() => []),
  ]);

  const enumValues = new Set(enumRows.map((row) => row.value));
  const tableSet = new Set(tableRows.map((row) => row.table_name));

  return {
    enumValues,
    hasRewardsTable: tableSet.has("rewards"),
    hasUserRewardsTable: tableSet.has("user_rewards"),
  };
}

export async function getSupportedManagedRewardTypes(db: RewardDbClient) {
  const support = await getRewardDbSupport(db);
  const supportedTypes = MANAGED_REWARD_TYPES.filter((type) => support.enumValues.has(type));

  return {
    ...support,
    supportedTypes,
  };
}

function asManagedRewardType(value: string): ManagedRewardType | null {
  return MANAGED_REWARD_TYPES.includes(value as ManagedRewardType) ? (value as ManagedRewardType) : null;
}

function clampPercent(current: number, target: number) {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((current / target) * 100)));
}

export function parsePlanSizeToGb(sizeLabel?: string | null) {
  if (!sizeLabel) return 0;
  const match = String(sizeLabel).trim().match(/(\d+(?:\.\d+)?)\s*(MB|GB|TB)/i);
  if (!match) return 0;

  const value = Number(match[1]);
  const unit = match[2].toUpperCase();
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (unit === "MB") return value / 1024;
  if (unit === "TB") return value * 1024;
  return value;
}

export async function ensureDefaultRewardCatalog(db: RewardDbClient = prisma) {
  const support = await getSupportedManagedRewardTypes(db);
  if (!support.hasRewardsTable || support.supportedTypes.length === 0) return;

  const existingCount = await db.reward.count({
    where: { type: { in: support.supportedTypes as any } },
  });

  if (existingCount > 0) return;

  await db.reward.createMany({
    data: support.supportedTypes.map((type) => {
      const definition = REWARD_DEFINITIONS[type];
      return {
        type: type as any,
        title: definition.title,
        description: definition.description,
        amount: definition.amount,
        isActive: true,
      };
    }),
  });
}

async function awardRewardInTx(
  tx: RewardDbClient,
  params: { userId: string; phone: string; reward: Reward }
) {
  const existingClaim = await tx.userReward.findFirst({
    where: {
      userId: params.userId,
      rewardId: params.reward.id,
      status: { in: [RewardStatus.EARNED, RewardStatus.CLAIMED] },
    },
    select: { id: true },
  });

  if (existingClaim) return false;

  const user = await tx.user.findUnique({
    where: { id: params.userId },
    select: { rewardBalance: true },
  });

  if (!user) return false;

  const amountInKobo = params.reward.amount * 100;

  await tx.userReward.create({
    data: {
      userId: params.userId,
      rewardId: params.reward.id,
      status: RewardStatus.CLAIMED,
      claimedAt: new Date(),
    },
  });

  await tx.user.update({
    where: { id: params.userId },
    data: {
      rewardBalance: { increment: amountInKobo },
    },
  });

  await tx.transaction.create({
    data: {
      userId: params.userId,
      phone: params.phone,
      type: "REWARD_CREDIT",
      status: "SUCCESS",
      amount: params.reward.amount,
      reference: `REWARD-${params.reward.type}-${params.userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      description: params.reward.title,
      balanceBefore: user.rewardBalance,
      balanceAfter: user.rewardBalance + amountInKobo,
    },
  });

  return true;
}

async function getSuccessfulDataTransactionsLastWeek(tx: RewardDbClient, userId: string) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return tx.transaction.findMany({
    where: {
      userId,
      type: "DATA_PURCHASE",
      status: "SUCCESS",
      createdAt: { gte: since },
    },
    select: {
      plan: {
        select: {
          sizeLabel: true,
        },
      },
    },
  });
}

export async function evaluateDepositRewardInTx(
  tx: RewardDbClient,
  params: { userId: string; phone: string; depositAmount: number }
) {
  await ensureDefaultRewardCatalog(tx);
  const support = await getSupportedManagedRewardTypes(tx);
  if (!support.hasRewardsTable || !support.hasUserRewardsTable) return;

  const priorSuccessfulDeposits = await tx.transaction.count({
    where: {
      userId: params.userId,
      type: "WALLET_FUNDING",
      status: "SUCCESS",
    },
  });

  if (priorSuccessfulDeposits > 0) return;

  let rewardType: ManagedRewardType | null = null;
  if (params.depositAmount >= 10000) {
    rewardType = RT.DEPOSIT_10K_UPGRADE;
  } else if (params.depositAmount >= 2000 && params.depositAmount <= 9999) {
    rewardType = RT.FIRST_DEPOSIT_2K;
  }

  if (!rewardType) return;
  if (!support.supportedTypes.includes(rewardType)) return;

  const reward = await tx.reward.findFirst({
    where: {
      type: rewardType as any,
      isActive: true,
    },
  });

  if (!reward) return;

  await awardRewardInTx(tx, {
    userId: params.userId,
    phone: params.phone,
    reward,
  });
}

export async function evaluateSignupRewardInTx(
  tx: RewardDbClient,
  params: { userId: string; phone: string }
) {
  await ensureDefaultRewardCatalog(tx);
  const support = await getSupportedManagedRewardTypes(tx);
  if (!support.hasRewardsTable || !support.hasUserRewardsTable) return;
  if (!support.supportedTypes.includes(RT.SIGNUP_BONUS)) return;

  const reward = await tx.reward.findFirst({
    where: {
      type: RT.SIGNUP_BONUS as any,
      isActive: true,
    },
  });

  if (!reward) return;

  await awardRewardInTx(tx, {
    userId: params.userId,
    phone: params.phone,
    reward,
  });
}

export async function checkAndAwardRewards(userId: string) {
  await ensureDefaultRewardCatalog(prisma);

  return prisma.$transaction(async (tx) => {
    const support = await getSupportedManagedRewardTypes(tx);
    if (!support.hasRewardsTable || !support.hasUserRewardsTable) return;

    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`reward:${userId}`}))`;

    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, phone: true },
    });

    if (!user) return;

    const rewardRows = await tx.reward.findMany({
      where: {
        type: { in: support.supportedTypes as any },
        isActive: true,
      },
    });

    const rewardMap = new Map(rewardRows.map((reward) => [reward.type, reward]));
    const weeklyTransactions = await getSuccessfulDataTransactionsLastWeek(tx, userId);
    const weeklyVolumeGb = weeklyTransactions.reduce(
      (sum, transaction) => sum + parsePlanSizeToGb(transaction.plan?.sizeLabel),
      0
    );

    for (const type of [RT.SALES_50GB_WEEKLY, RT.SALES_100GB_WEEKLY] as ManagedRewardType[]) {
      const reward = rewardMap.get(type);
      if (!reward) continue;
      const definition = REWARD_DEFINITIONS[type];
      if (weeklyVolumeGb < definition.targetValue) continue;

      await awardRewardInTx(tx, {
        userId: user.id,
        phone: user.phone,
        reward,
      });
    }
  });
}

export async function getRewardProgressForUser(userId: string) {
  await ensureDefaultRewardCatalog(prisma);
  const support = await getSupportedManagedRewardTypes(prisma);

  const [user, rewards, claims, firstDeposit, weeklyTransactions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { rewardBalance: true },
    }),
    support.hasRewardsTable
      ? prisma.reward.findMany({
          where: { type: { in: support.supportedTypes as any } },
          orderBy: { title: "asc" },
        })
      : Promise.resolve([]),
    support.hasUserRewardsTable && support.supportedTypes.length > 0
      ? prisma.userReward.findMany({
          where: {
            userId,
            reward: { type: { in: support.supportedTypes as any } },
          },
          include: {
            reward: {
              select: { type: true },
            },
          },
        })
      : Promise.resolve([]),
    prisma.transaction.findFirst({
      where: {
        userId,
        type: "WALLET_FUNDING",
        status: "SUCCESS",
      },
      orderBy: { createdAt: "asc" },
      select: { amount: true },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        type: "DATA_PURCHASE",
        status: "SUCCESS",
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      select: {
        plan: {
          select: { sizeLabel: true },
        },
      },
    }),
  ]);

  const rewardMap = new Map(
    rewards
      .map((reward) => {
        const type = asManagedRewardType(reward.type);
        return type ? [type, reward] : null;
      })
      .filter(Boolean) as [ManagedRewardType, (typeof rewards)[number]][]
  );

  const claimMap = new Map(
    claims
      .map((claim) => {
        const type = asManagedRewardType(claim.reward.type);
        return type ? [type, claim] : null;
      })
      .filter(Boolean) as [ManagedRewardType, (typeof claims)[number]][]
  );

  const weeklyVolumeGb = weeklyTransactions.reduce(
    (sum, transaction) => sum + parsePlanSizeToGb(transaction.plan?.sizeLabel),
    0
  );

  const items: RewardProgressItem[] = MANAGED_REWARD_TYPES
    .map((type) => {
      const definition = REWARD_DEFINITIONS[type];
      const reward = rewardMap.get(type);
      const claim = claimMap.get(type);

      if (claim) {
        return {
          id: reward?.id || type,
          type,
          title: reward?.title || definition.title,
          description: reward?.description || definition.description,
          amount: reward?.amount || definition.amount,
          claimed: true,
          claimable: false,
          status: "CLAIMED" as const,
          progressValue: definition.targetValue,
          targetValue: definition.targetValue,
          progressPercent: 100,
          unit: definition.unit,
          claimedAt: claim.claimedAt ? claim.claimedAt.toISOString() : null,
          isActive: reward?.isActive ?? true,
        };
      }

      if (type === RT.FIRST_DEPOSIT_2K || type === RT.DEPOSIT_10K_UPGRADE) {
        const firstAmount = Number(firstDeposit?.amount || 0);

        if (!firstDeposit) {
          return {
            id: reward?.id || type,
            type,
            title: reward?.title || definition.title,
            description: reward?.description || definition.description,
            amount: reward?.amount || definition.amount,
            claimed: false,
            claimable: false,
            status: "IN_PROGRESS",
            progressValue: 0,
            targetValue: definition.targetValue,
            progressPercent: 0,
            unit: definition.unit,
            claimedAt: null,
            isActive: reward?.isActive ?? true,
          };
        }

        const matches =
          type === RT.FIRST_DEPOSIT_2K
            ? firstAmount >= 2000 && firstAmount <= 9999
            : firstAmount >= 10000;

        return {
          id: reward?.id || type,
          type,
          title: reward?.title || definition.title,
          description: reward?.description || definition.description,
          amount: reward?.amount || definition.amount,
          claimed: false,
          claimable: matches,
          status: matches ? "IN_PROGRESS" : "MISSED",
          progressValue: matches ? definition.targetValue : Math.min(firstAmount, definition.targetValue),
          targetValue: definition.targetValue,
          progressPercent: matches ? 100 : clampPercent(firstAmount, definition.targetValue),
          unit: definition.unit,
          claimedAt: null,
          isActive: reward?.isActive ?? true,
        };
      }

      if (type === RT.SIGNUP_BONUS) {
        return {
          id: reward?.id || type,
          type,
          title: reward?.title || definition.title,
          description: reward?.description || definition.description,
          amount: reward?.amount || definition.amount,
          claimed: false,
          claimable: true,
          status: "IN_PROGRESS",
          progressValue: 1,
          targetValue: 1,
          progressPercent: 100,
          unit: definition.unit,
          claimedAt: null,
          isActive: reward?.isActive ?? true,
        };
      }

      return {
        id: reward?.id || type,
        type,
        title: reward?.title || definition.title,
        description: reward?.description || definition.description,
        amount: reward?.amount || definition.amount,
        claimed: false,
        claimable: weeklyVolumeGb >= definition.targetValue,
        status: weeklyVolumeGb >= definition.targetValue ? "IN_PROGRESS" : "IN_PROGRESS",
        progressValue: Number(weeklyVolumeGb.toFixed(2)),
        targetValue: definition.targetValue,
        progressPercent: clampPercent(weeklyVolumeGb, definition.targetValue),
        unit: definition.unit,
        claimedAt: null,
        isActive: reward?.isActive ?? true,
      };
    })
    .filter(Boolean) as RewardProgressItem[];

  const earnedTotal = claims.reduce((sum, claim) => sum + (REWARD_DEFINITIONS[claim.reward.type as ManagedRewardType]?.amount || 0), 0);

  return {
    rewardBalance: user?.rewardBalance ?? 0,
    earnedTotal,
    items,
  };
}
