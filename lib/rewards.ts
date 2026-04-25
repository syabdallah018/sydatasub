import { execute, query, queryOne } from "@/lib/db";

export type RewardTriggerType = "SIGNUP" | "DEPOSIT";
export type UserRewardStatus = "AVAILABLE" | "CLAIMED";

export interface RewardRule {
  id: string;
  code: string;
  title: string;
  description: string | null;
  triggerType: RewardTriggerType;
  thresholdAmount: number | null;
  maxThresholdAmount: number | null;
  rewardAmount: number;
  isActive: boolean;
  displayOrder: number;
}

export interface UserReward {
  id: string;
  userId: string;
  ruleId: string;
  ruleCode: string;
  title: string;
  description: string | null;
  triggerType: RewardTriggerType;
  thresholdAmount: number | null;
  maxThresholdAmount: number | null;
  rewardAmount: number;
  sourceAmount: number | null;
  sourceReference: string | null;
  status: UserRewardStatus;
  claimedAt: string | null;
  createdAt: string;
}

const DEFAULT_REWARD_RULES = [
  {
    code: "SIGNUP_100",
    title: "Welcome Bonus",
    description: "Get ₦100 reward credit after creating your account.",
    triggerType: "SIGNUP" as RewardTriggerType,
    thresholdAmount: null,
    maxThresholdAmount: null,
    rewardAmount: 100,
    displayOrder: 10,
  },
  {
    code: "DEPOSIT_2000_TO_9999_100",
    title: "₦2,000 - ₦9,999 Deposit Bonus",
    description: "Deposit between ₦2,000 and ₦9,999 to unlock ₦100 data reward credit.",
    triggerType: "DEPOSIT" as RewardTriggerType,
    thresholdAmount: 2000,
    maxThresholdAmount: 9999.99,
    rewardAmount: 100,
    displayOrder: 20,
  },
  {
    code: "DEPOSIT_10000_UP_200",
    title: "₦10,000+ Deposit Bonus",
    description: "Deposit ₦10,000 or more to unlock ₦200 data reward credit.",
    triggerType: "DEPOSIT" as RewardTriggerType,
    thresholdAmount: 10000,
    maxThresholdAmount: null,
    rewardAmount: 200,
    displayOrder: 30,
  },
] as const;

let rewardSchemaPromise: Promise<void> | null = null;

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  const parsed = parseFloat(String(value ?? 0));
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function ensureRewardSchema() {
  if (rewardSchemaPromise) {
    return rewardSchemaPromise;
  }

  rewardSchemaPromise = (async () => {
    await execute(
      `ALTER TABLE "User"
       ADD COLUMN IF NOT EXISTS reward_balance NUMERIC(15, 2) NOT NULL DEFAULT 0`
    );

    await execute(
      `ALTER TABLE "DataTransaction"
       ADD COLUMN IF NOT EXISTS "rewardApplied" NUMERIC(15, 2) NOT NULL DEFAULT 0`
    );

    await execute(
      `CREATE TABLE IF NOT EXISTS "RewardRule" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        description TEXT,
        "triggerType" TEXT NOT NULL,
        "thresholdAmount" NUMERIC(15, 2),
        "maxThresholdAmount" NUMERIC(15, 2),
        "rewardAmount" NUMERIC(15, 2) NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "displayOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "RewardRule_triggerType_check" CHECK ("triggerType" IN ('SIGNUP', 'DEPOSIT'))
      )`
    );

    await execute(
      `ALTER TABLE "RewardRule"
       ADD COLUMN IF NOT EXISTS "maxThresholdAmount" NUMERIC(15, 2)`
    );

    await execute(
      `CREATE TABLE IF NOT EXISTS "UserReward" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        "ruleId" UUID NOT NULL REFERENCES "RewardRule"(id) ON DELETE CASCADE,
        "ruleCode" TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        "triggerType" TEXT NOT NULL,
        "thresholdAmount" NUMERIC(15, 2),
        "maxThresholdAmount" NUMERIC(15, 2),
        "rewardAmount" NUMERIC(15, 2) NOT NULL,
        "sourceAmount" NUMERIC(15, 2),
        "sourceReference" TEXT,
        status TEXT NOT NULL DEFAULT 'AVAILABLE',
        "claimedAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "UserReward_status_check" CHECK (status IN ('AVAILABLE', 'CLAIMED')),
        CONSTRAINT "UserReward_triggerType_check" CHECK ("triggerType" IN ('SIGNUP', 'DEPOSIT')),
        CONSTRAINT "UserReward_user_rule_code_key" UNIQUE ("userId", "ruleCode")
      )`
    );

    await execute(
      `ALTER TABLE "UserReward"
       ADD COLUMN IF NOT EXISTS "maxThresholdAmount" NUMERIC(15, 2)`
    );

    await execute(
      `CREATE INDEX IF NOT EXISTS "RewardRule_active_order_idx"
       ON "RewardRule" ("isActive", "displayOrder", "thresholdAmount")`
    );

    await execute(
      `CREATE INDEX IF NOT EXISTS "UserReward_user_status_idx"
       ON "UserReward" ("userId", status, "createdAt" DESC)`
    );

    await execute(
      `DELETE FROM "UserReward"
       WHERE "ruleCode" IN ('DEPOSIT_3000_200', 'DEPOSIT_5000_300', 'DEPOSIT_10000_500')`
    );

    await execute(
      `DELETE FROM "RewardRule"
       WHERE code IN ('DEPOSIT_3000_200', 'DEPOSIT_5000_300', 'DEPOSIT_10000_500')`
    );

    for (const rule of DEFAULT_REWARD_RULES) {
      await execute(
        `INSERT INTO "RewardRule"
         (code, title, description, "triggerType", "thresholdAmount", "maxThresholdAmount", "rewardAmount", "displayOrder", "isActive", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW())
         ON CONFLICT (code) DO UPDATE
         SET title = EXCLUDED.title,
             description = EXCLUDED.description,
             "triggerType" = EXCLUDED."triggerType",
             "thresholdAmount" = EXCLUDED."thresholdAmount",
             "maxThresholdAmount" = EXCLUDED."maxThresholdAmount",
             "rewardAmount" = EXCLUDED."rewardAmount",
             "displayOrder" = EXCLUDED."displayOrder",
             "updatedAt" = NOW()`,
        [
          rule.code,
          rule.title,
          rule.description,
          rule.triggerType,
          rule.thresholdAmount,
          rule.maxThresholdAmount,
          rule.rewardAmount,
          rule.displayOrder,
        ]
      );
    }
  })().catch((error) => {
    rewardSchemaPromise = null;
    throw error;
  });

  return rewardSchemaPromise;
}

export async function getRewardRules() {
  await ensureRewardSchema();

  const rows = await query<any>(
    `SELECT id, code, title, description, "triggerType", "thresholdAmount", "maxThresholdAmount", "rewardAmount", "isActive", "displayOrder"
     FROM "RewardRule"
     ORDER BY "displayOrder" ASC, "thresholdAmount" ASC NULLS FIRST, title ASC`
  );

  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    title: row.title,
    description: row.description,
    triggerType: row.triggerType,
    thresholdAmount: row.thresholdAmount === null ? null : toNumber(row.thresholdAmount),
    maxThresholdAmount: row.maxThresholdAmount === null ? null : toNumber(row.maxThresholdAmount),
    rewardAmount: toNumber(row.rewardAmount),
    isActive: Boolean(row.isActive),
    displayOrder: Number(row.displayOrder || 0),
  })) as RewardRule[];
}

export async function syncUserRewards(userId: string) {
  await ensureRewardSchema();

  const rules = await getRewardRules();
  const existingRewards = await query<{ ruleCode: string }>(
    `SELECT "ruleCode" FROM "UserReward" WHERE "userId" = $1`,
    [userId]
  );
  const existingCodes = new Set(existingRewards.map((reward) => reward.ruleCode));

  const depositAggregate = await queryOne<{ maxDeposit: number | string | null }>(
    `SELECT COALESCE(MAX(amount), 0) AS "maxDeposit"
     FROM "Transaction"
     WHERE user_id = $1 AND type = 'deposit' AND status = 'success'`,
    [userId]
  );
  const maxDeposit = toNumber(depositAggregate?.maxDeposit ?? 0);

  for (const rule of rules) {
    if (!rule.isActive || existingCodes.has(rule.code)) {
      continue;
    }

    if (rule.triggerType === "SIGNUP") {
      await execute(
        `INSERT INTO "UserReward"
         ("userId", "ruleId", "ruleCode", title, description, "triggerType", "thresholdAmount", "maxThresholdAmount", "rewardAmount", status, "sourceReference", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'AVAILABLE', 'signup', NOW(), NOW())
         ON CONFLICT ("userId", "ruleCode") DO NOTHING`,
        [
          userId,
          rule.id,
          rule.code,
          rule.title,
          rule.description,
          rule.triggerType,
          rule.thresholdAmount,
          rule.maxThresholdAmount,
          rule.rewardAmount,
        ]
      );
      continue;
    }

    const minThreshold = rule.thresholdAmount ?? 0;
    const maxThreshold = rule.maxThresholdAmount;
    const matchesDepositBracket =
      rule.triggerType === "DEPOSIT" &&
      rule.thresholdAmount !== null &&
      maxDeposit >= minThreshold &&
      (maxThreshold === null || maxDeposit <= maxThreshold);

    if (matchesDepositBracket) {
      await execute(
        `INSERT INTO "UserReward"
         ("userId", "ruleId", "ruleCode", title, description, "triggerType", "thresholdAmount", "maxThresholdAmount", "rewardAmount", "sourceAmount", "sourceReference", status, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'AVAILABLE', NOW(), NOW())
         ON CONFLICT ("userId", "ruleCode") DO NOTHING`,
        [
          userId,
          rule.id,
          rule.code,
          rule.title,
          rule.description,
          rule.triggerType,
          rule.thresholdAmount,
          rule.maxThresholdAmount,
          rule.rewardAmount,
          maxDeposit,
          "deposit-threshold",
        ]
      );
    }
  }
}

export async function getRewardDashboard(userId: string) {
  await syncUserRewards(userId);

  const user = await queryOne<{ reward_balance: number | string | null }>(
    `SELECT reward_balance FROM "User" WHERE id = $1`,
    [userId]
  );

  const rewards = await query<any>(
    `SELECT id, "userId", "ruleId", "ruleCode", title, description, "triggerType", "thresholdAmount",
            "maxThresholdAmount", "rewardAmount", "sourceAmount", "sourceReference", status, "claimedAt", "createdAt"
     FROM "UserReward"
     WHERE "userId" = $1
     ORDER BY "createdAt" DESC`,
    [userId]
  );

  const rules = await getRewardRules();
  const depositAggregate = await queryOne<{ maxDeposit: number | string | null }>(
    `SELECT COALESCE(MAX(amount), 0) AS "maxDeposit"
     FROM "Transaction"
     WHERE user_id = $1 AND type = 'deposit' AND status = 'success'`,
    [userId]
  );
  const maxDeposit = toNumber(depositAggregate?.maxDeposit ?? 0);

  const normalizedRewards: UserReward[] = rewards.map((reward) => ({
    id: reward.id,
    userId: reward.userId,
    ruleId: reward.ruleId,
    ruleCode: reward.ruleCode,
    title: reward.title,
    description: reward.description,
    triggerType: reward.triggerType,
    thresholdAmount: reward.thresholdAmount === null ? null : toNumber(reward.thresholdAmount),
    maxThresholdAmount: reward.maxThresholdAmount === null ? null : toNumber(reward.maxThresholdAmount),
    rewardAmount: toNumber(reward.rewardAmount),
    sourceAmount: reward.sourceAmount === null ? null : toNumber(reward.sourceAmount),
    sourceReference: reward.sourceReference,
    status: reward.status,
    claimedAt: reward.claimedAt,
    createdAt: reward.createdAt,
  }));

  const rewardCodeSet = new Set(normalizedRewards.map((reward) => reward.ruleCode));

  const progress = rules
    .filter((rule) => rule.isActive && rule.triggerType === "DEPOSIT" && !rewardCodeSet.has(rule.code))
    .map((rule) => {
      const currentAmount = Math.min(maxDeposit, rule.thresholdAmount || 0);
      const targetAmount = rule.thresholdAmount || 0;
      const percentage =
        targetAmount <= 0 ? 100 : Math.max(0, Math.min(100, (currentAmount / targetAmount) * 100));

      return {
        code: rule.code,
        title: rule.title,
        description: rule.description,
        thresholdAmount: targetAmount,
        maxThresholdAmount: rule.maxThresholdAmount,
        rewardAmount: rule.rewardAmount,
        currentAmount,
        percentage,
        remainingAmount: Math.max(0, targetAmount - currentAmount),
      };
    });

  const availableRewards = normalizedRewards.filter((reward) => reward.status === "AVAILABLE");
  const claimedRewards = normalizedRewards.filter((reward) => reward.status === "CLAIMED");

  return {
    rewardBalance: toNumber(user?.reward_balance ?? 0),
    availableRewards,
    claimedRewards,
    progress,
    stats: {
      maxDeposit,
      totalAvailableAmount: availableRewards.reduce((sum, reward) => sum + reward.rewardAmount, 0),
      totalClaimedAmount: claimedRewards.reduce((sum, reward) => sum + reward.rewardAmount, 0),
      totalClaimedCount: claimedRewards.length,
    },
  };
}

export async function claimRewards(userId: string, rewardIds?: string[]) {
  await syncUserRewards(userId);

  const params: any[] = [userId];
  let idFilter = "";
  if (rewardIds && rewardIds.length > 0) {
    params.push(rewardIds);
    idFilter = ` AND id = ANY($2::uuid[])`;
  }

  const availableRewards = await query<any>(
    `SELECT id, "ruleCode", title, "rewardAmount"
     FROM "UserReward"
     WHERE "userId" = $1 AND status = 'AVAILABLE'${idFilter}
     ORDER BY "createdAt" ASC`,
    params
  );

  if (availableRewards.length === 0) {
    return { claimedCount: 0, totalAmount: 0 };
  }

  const totalAmount = availableRewards.reduce((sum, reward) => sum + toNumber(reward.rewardAmount), 0);
  const rewardIdList = availableRewards.map((reward) => reward.id);

  await execute(
    `UPDATE "User"
     SET reward_balance = reward_balance + $1
     WHERE id = $2`,
    [totalAmount, userId]
  );

  await execute(
    `UPDATE "UserReward"
     SET status = 'CLAIMED', "claimedAt" = NOW(), "updatedAt" = NOW()
     WHERE "userId" = $1 AND id = ANY($2::uuid[])`,
    [userId, rewardIdList]
  );

  for (const reward of availableRewards) {
    const reference = `RWD-${reward.ruleCode}-${reward.id}`;
    await execute(
      `INSERT INTO "Transaction" (user_id, amount, reference, type, status, created_at, updated_at)
       VALUES ($1, $2, $3, 'reward_credit', 'success', NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [userId, Math.round(toNumber(reward.rewardAmount)), reference]
    );
  }

  return {
    claimedCount: availableRewards.length,
    totalAmount,
  };
}
