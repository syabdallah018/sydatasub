DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RewardType') THEN
    CREATE TYPE "RewardType" AS ENUM (
      'SIGNUP_BONUS',
      'FIRST_DEPOSIT_2K',
      'DEPOSIT_10K_UPGRADE',
      'SALES_50GB_WEEKLY',
      'SALES_100GB_WEEKLY'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RewardStatus') THEN
    CREATE TYPE "RewardStatus" AS ENUM ('IN_PROGRESS', 'EARNED', 'CLAIMED');
  END IF;
END $$;

ALTER TYPE "RewardType" ADD VALUE IF NOT EXISTS 'SALES_50GB_WEEKLY';
ALTER TYPE "RewardType" ADD VALUE IF NOT EXISTS 'SALES_100GB_WEEKLY';

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "rewardBalance" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "rewards" (
  "id" TEXT PRIMARY KEY,
  "type" "RewardType" NOT NULL UNIQUE,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS "user_rewards" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "rewardId" TEXT NOT NULL REFERENCES "rewards"("id") ON DELETE CASCADE,
  "status" "RewardStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "claimedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_rewards_userId_rewardId_key" ON "user_rewards"("userId", "rewardId");
CREATE INDEX IF NOT EXISTS "user_rewards_userId_idx" ON "user_rewards"("userId");
CREATE INDEX IF NOT EXISTS "user_rewards_status_idx" ON "user_rewards"("status");
