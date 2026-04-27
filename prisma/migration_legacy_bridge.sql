-- ============================================================================
-- SY DATA SUB - Legacy Neon Bridge Migration
-- Purpose:
-- 1) Create the current app schema tables if missing.
-- 2) Migrate data from legacy tables ("User", "Transaction", etc.) safely.
-- 3) Normalize duplicate references so current unique constraints hold.
-- Safe to run multiple times.
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- Enums
-- --------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole') THEN
    CREATE TYPE "UserRole" AS ENUM ('USER', 'AGENT', 'ADMIN');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NetworkType') THEN
    CREATE TYPE "NetworkType" AS ENUM ('MTN', 'GLO', 'AIRTEL', 'NINEMOBILE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TransactionType') THEN
    CREATE TYPE "TransactionType" AS ENUM ('DATA_PURCHASE', 'AIRTIME_PURCHASE', 'WALLET_FUNDING', 'REWARD_CREDIT');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TransactionStatus') THEN
    CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REVERSED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ApiSource') THEN
    CREATE TYPE "ApiSource" AS ENUM ('API_A', 'API_B');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RewardType') THEN
    CREATE TYPE "RewardType" AS ENUM ('SIGNUP_BONUS', 'FIRST_DEPOSIT_2K', 'DEPOSIT_10K_UPGRADE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RewardStatus') THEN
    CREATE TYPE "RewardStatus" AS ENUM ('IN_PROGRESS', 'EARNED', 'CLAIMED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AgentRequestStatus') THEN
    CREATE TYPE "AgentRequestStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NoticeSeverity') THEN
    CREATE TYPE "NoticeSeverity" AS ENUM ('INFO', 'WARNING', 'SUCCESS', 'ERROR', 'PROMO');
  END IF;
END $$;

DO $$ BEGIN
  BEGIN ALTER TYPE "RewardType" ADD VALUE IF NOT EXISTS 'SALES_50GB_WEEKLY'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE "RewardType" ADD VALUE IF NOT EXISTS 'SALES_100GB_WEEKLY'; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- --------------------------------------------------------------------------
-- Current schema tables
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT PRIMARY KEY,
  "fullName" TEXT NOT NULL,
  "phone" TEXT NOT NULL UNIQUE,
  "pinHash" TEXT,
  "email" TEXT,
  "role" "UserRole" NOT NULL DEFAULT 'USER',
  "tier" TEXT NOT NULL DEFAULT 'user',
  "balance" INTEGER NOT NULL DEFAULT 0,
  "rewardBalance" INTEGER NOT NULL DEFAULT 0,
  "agentRequestStatus" "AgentRequestStatus" NOT NULL DEFAULT 'NONE',
  "isBanned" BOOLEAN NOT NULL DEFAULT FALSE,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "joinedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "virtual_accounts" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "accountNumber" TEXT NOT NULL,
  "bankName" TEXT NOT NULL,
  "flwRef" TEXT NOT NULL,
  "orderRef" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "plans" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "network" "NetworkType" NOT NULL,
  "sizeLabel" TEXT NOT NULL,
  "validity" TEXT NOT NULL,
  "price" INTEGER NOT NULL,
  "user_price" INTEGER NOT NULL DEFAULT 0,
  "agent_price" INTEGER NOT NULL DEFAULT 0,
  "apiSource" "ApiSource" NOT NULL,
  "externalPlanId" INTEGER NOT NULL,
  "externalNetworkId" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("apiSource", "externalPlanId", "externalNetworkId")
);

CREATE TABLE IF NOT EXISTS "transactions" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  "guestPhone" TEXT,
  "type" "TransactionType" NOT NULL,
  "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
  "amount" INTEGER NOT NULL,
  "balanceBefore" INTEGER,
  "balanceAfter" INTEGER,
  "phone" TEXT NOT NULL,
  "planId" TEXT REFERENCES "plans"("id") ON DELETE SET NULL,
  "description" TEXT,
  "reference" TEXT NOT NULL UNIQUE,
  "externalReference" TEXT,
  "flwRef" TEXT,
  "tempAccountNumber" TEXT,
  "tempBankName" TEXT,
  "tempTxRef" TEXT,
  "apiUsed" "ApiSource",
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
  "claimedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("userId", "rewardId")
);

CREATE TABLE IF NOT EXISTS "service_notices" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "severity" "NoticeSeverity" NOT NULL DEFAULT 'INFO',
  "audience" TEXT NOT NULL DEFAULT 'all',
  "network" "NetworkType",
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "startsAt" TIMESTAMPTZ,
  "endsAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- Legacy cleanup: normalize duplicate legacy references
-- --------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('"Transaction"') IS NOT NULL THEN
    WITH ranked AS (
      SELECT id, reference, ROW_NUMBER() OVER (PARTITION BY reference ORDER BY created_at ASC, id ASC) AS rn
      FROM "Transaction"
      WHERE reference IS NOT NULL
    )
    UPDATE "Transaction" t
    SET reference = CONCAT(t.reference, '-DUP-', ranked.rn)
    FROM ranked
    WHERE t.id = ranked.id
      AND ranked.rn > 1;
  END IF;
END $$;

-- --------------------------------------------------------------------------
-- Migrate users
-- --------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('"User"') IS NOT NULL THEN
    INSERT INTO "users" (
      "id","fullName","phone","pinHash","email","role","tier","balance","rewardBalance","isBanned","isActive","joinedAt","updatedAt"
    )
    SELECT
      u.id,
      COALESCE(NULLIF(TRIM(u.name), ''), CONCAT('User ', RIGHT(u.phone, 4))),
      u.phone,
      u.pin,
      NULLIF(u.email, ''),
      CASE WHEN UPPER(COALESCE(u.role, 'USER')) IN ('ADMIN','AGENT') THEN UPPER(u.role)::"UserRole" ELSE 'USER'::"UserRole" END,
      CASE WHEN UPPER(COALESCE(u.role, 'USER')) = 'AGENT' THEN 'agent' ELSE 'user' END,
      GREATEST(0, ROUND(COALESCE(u.balance, 0) * 100)::INTEGER),
      GREATEST(0, ROUND(COALESCE(u.reward_balance, 0) * 100)::INTEGER),
      NOT COALESCE(u."isActive", TRUE),
      COALESCE(u."isActive", TRUE),
      COALESCE(u."createdAt", NOW()),
      COALESCE(u."updatedAt", NOW())
    FROM "User" u
    ON CONFLICT ("id") DO UPDATE
    SET
      "fullName" = EXCLUDED."fullName",
      "phone" = EXCLUDED."phone",
      "pinHash" = EXCLUDED."pinHash",
      "email" = EXCLUDED."email",
      "role" = EXCLUDED."role",
      "tier" = EXCLUDED."tier",
      "balance" = EXCLUDED."balance",
      "rewardBalance" = EXCLUDED."rewardBalance",
      "isBanned" = EXCLUDED."isBanned",
      "isActive" = EXCLUDED."isActive",
      "joinedAt" = EXCLUDED."joinedAt",
      "updatedAt" = EXCLUDED."updatedAt";
  END IF;
END $$;

-- --------------------------------------------------------------------------
-- Migrate virtual accounts
-- --------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('"UserReservedAccount"') IS NOT NULL THEN
    WITH ranked AS (
      SELECT
        a.*,
        ROW_NUMBER() OVER (PARTITION BY a."userId" ORDER BY a."isPrimary" DESC, a."createdAt" DESC, a.id DESC) AS rn
      FROM "UserReservedAccount" a
    ),
    normalized AS (
      SELECT
        r.id,
        r."userId",
        COALESCE(NULLIF(r."accountNumber", ''), NULLIF(u.account_number, ''), '0000000000') AS "accountNumber",
        COALESCE(NULLIF(r."bankName", ''), NULLIF(u.bank_name, ''), 'SY DATA WALLET') AS "bankName",
        COALESCE(NULLIF(r."providerReference", ''), CONCAT('SYDATA-VA-', r."userId", '-', EXTRACT(EPOCH FROM COALESCE(r."createdAt", NOW()))::BIGINT)) AS "orderRef",
        COALESCE(r."createdAt", NOW()) AS "createdAt"
      FROM ranked r
      LEFT JOIN "User" u ON u.id = r."userId"
      WHERE r.rn = 1
    ),
    dedup AS (
      SELECT
        n.*,
        ROW_NUMBER() OVER (PARTITION BY n."orderRef" ORDER BY n."createdAt" DESC, n.id DESC) AS dup_rn
      FROM normalized n
    )
    INSERT INTO "virtual_accounts" ("id","userId","accountNumber","bankName","flwRef","orderRef","createdAt")
    SELECT
      d.id::TEXT,
      d."userId",
      d."accountNumber",
      d."bankName",
      d."orderRef",
      CASE WHEN d.dup_rn = 1 THEN d."orderRef" ELSE CONCAT(d."orderRef", '-DUP-', d.dup_rn) END,
      d."createdAt"
    FROM dedup d
    JOIN "users" u ON u.id = d."userId"
    ON CONFLICT ("userId") DO UPDATE
    SET
      "accountNumber" = EXCLUDED."accountNumber",
      "bankName" = EXCLUDED."bankName",
      "flwRef" = EXCLUDED."flwRef",
      "orderRef" = EXCLUDED."orderRef",
      "createdAt" = EXCLUDED."createdAt";
  END IF;
END $$;

-- --------------------------------------------------------------------------
-- Migrate plans
-- --------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('"DataPlan"') IS NOT NULL THEN
    WITH base AS (
      SELECT
        p.*,
        CASE
          WHEN UPPER(COALESCE(p."networkName", '')) LIKE 'MTN%' THEN 'MTN'::"NetworkType"
          WHEN UPPER(COALESCE(p."networkName", '')) LIKE 'GLO%' THEN 'GLO'::"NetworkType"
          WHEN UPPER(COALESCE(p."networkName", '')) LIKE 'AIRTEL%' THEN 'AIRTEL'::"NetworkType"
          ELSE 'NINEMOBILE'::"NetworkType"
        END AS net,
        CASE
          WHEN UPPER(COALESCE(p."activeApi", 'A')) = 'B' THEN 'API_B'::"ApiSource"
          ELSE 'API_A'::"ApiSource"
        END AS src,
        COALESCE(
          CASE WHEN UPPER(COALESCE(p."activeApi", 'A')) = 'B' THEN p."apiBId" ELSE p."apiAId" END,
          p."apiAId",
          p."apiBId",
          ABS(('x' || SUBSTRING(MD5(p.id::TEXT), 1, 8))::bit(32)::int)
        ) AS ext_plan_id
      FROM "DataPlan" p
    ),
    dedup AS (
      SELECT
        b.*,
        ROW_NUMBER() OVER (PARTITION BY b.src, b.ext_plan_id, COALESCE(b."networkId", 1) ORDER BY b."updatedAt" DESC, b."createdAt" DESC, b.id DESC) AS rn
      FROM base b
    )
    INSERT INTO "plans" (
      "id","name","network","sizeLabel","validity","price","user_price","agent_price","apiSource","externalPlanId","externalNetworkId","isActive","createdAt","updatedAt"
    )
    SELECT
      d.id::TEXT,
      COALESCE(NULLIF(d.name, ''), CONCAT(d."networkName", ' ', d."sizeLabel")),
      d.net,
      COALESCE(NULLIF(d."sizeLabel", ''), 'N/A'),
      COALESCE(NULLIF(d.validity, ''), 'N/A'),
      ROUND(COALESCE(NULLIF(d."userPrice", 0), d.price, 0))::INTEGER,
      ROUND(COALESCE(NULLIF(d."userPrice", 0), d.price, 0))::INTEGER,
      ROUND(COALESCE(NULLIF(d."agentPrice", 0), NULLIF(d."userPrice", 0), d.price, 0))::INTEGER,
      d.src,
      d.ext_plan_id::INTEGER,
      COALESCE(d."networkId", 1),
      COALESCE(d."isActive", TRUE),
      COALESCE(d."createdAt", NOW()),
      COALESCE(d."updatedAt", NOW())
    FROM dedup d
    WHERE d.rn = 1
    ON CONFLICT ("apiSource", "externalPlanId", "externalNetworkId") DO UPDATE
    SET
      "name" = EXCLUDED."name",
      "network" = EXCLUDED."network",
      "sizeLabel" = EXCLUDED."sizeLabel",
      "validity" = EXCLUDED."validity",
      "price" = EXCLUDED."price",
      "user_price" = EXCLUDED."user_price",
      "agent_price" = EXCLUDED."agent_price",
      "isActive" = EXCLUDED."isActive",
      "updatedAt" = EXCLUDED."updatedAt";
  END IF;
END $$;

-- --------------------------------------------------------------------------
-- Seed reward catalog expected by current app
-- --------------------------------------------------------------------------
INSERT INTO "rewards" ("id","type","title","description","amount","isActive")
VALUES
  ('legacy-signup-bonus', 'SIGNUP_BONUS', 'Welcome Bonus', 'Get a welcome reward after account creation.', 100, TRUE),
  ('legacy-first-deposit-2k', 'FIRST_DEPOSIT_2K', 'First Deposit Reward', 'Earn N200 on your first successful deposit between N2,000 and N9,999.', 200, TRUE),
  ('legacy-deposit-10k', 'DEPOSIT_10K_UPGRADE', 'Premium Deposit Reward', 'Earn N400 on your first successful deposit of N10,000 and above.', 400, TRUE),
  ('legacy-sales-50gb', 'SALES_50GB_WEEKLY', '50GB Weekly Milestone', 'Earn N1,000 when your successful data sales hit 50GB within 7 days.', 1000, TRUE),
  ('legacy-sales-100gb', 'SALES_100GB_WEEKLY', '100GB Weekly Milestone', 'Earn N2,500 when your successful data sales hit 100GB within 7 days.', 2500, TRUE)
ON CONFLICT ("type") DO UPDATE
SET
  "title" = EXCLUDED."title",
  "description" = EXCLUDED."description",
  "amount" = EXCLUDED."amount",
  "isActive" = EXCLUDED."isActive";

-- --------------------------------------------------------------------------
-- Migrate transactions
-- --------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('"Transaction"') IS NOT NULL THEN
    WITH normalized AS (
      SELECT
        t.id::TEXT AS legacy_id,
        t.user_id,
        u.phone,
        CASE LOWER(COALESCE(t.type, ''))
          WHEN 'data_purchase' THEN 'DATA_PURCHASE'::"TransactionType"
          WHEN 'airtime_purchase' THEN 'AIRTIME_PURCHASE'::"TransactionType"
          WHEN 'reward_credit' THEN 'REWARD_CREDIT'::"TransactionType"
          WHEN 'deposit' THEN 'WALLET_FUNDING'::"TransactionType"
          ELSE 'WALLET_FUNDING'::"TransactionType"
        END AS tx_type,
        CASE LOWER(COALESCE(t.status, 'pending'))
          WHEN 'success' THEN 'SUCCESS'::"TransactionStatus"
          WHEN 'failed' THEN 'FAILED'::"TransactionStatus"
          WHEN 'reversed' THEN 'REVERSED'::"TransactionStatus"
          ELSE 'PENDING'::"TransactionStatus"
        END AS tx_status,
        GREATEST(COALESCE(t.amount, 0), 0)::INTEGER AS amount,
        COALESCE(NULLIF(t.reference, ''), CONCAT('LEGACY-TX-', t.id::TEXT)) AS ref,
        COALESCE(t.created_at, NOW()) AS created_at,
        COALESCE(t.updated_at, NOW()) AS updated_at
      FROM "Transaction" t
      LEFT JOIN "User" u ON u.id = t.user_id
    ),
    dedup AS (
      SELECT
        n.*,
        ROW_NUMBER() OVER (PARTITION BY n.ref ORDER BY n.created_at ASC, n.legacy_id ASC) AS rn
      FROM normalized n
    )
    INSERT INTO "transactions" (
      "id","userId","type","status","amount","phone","reference","externalReference","flwRef","description","createdAt","updatedAt"
    )
    SELECT
      CONCAT('legacy-', d.legacy_id),
      CASE WHEN u.id IS NOT NULL THEN d.user_id ELSE NULL END,
      d.tx_type,
      d.tx_status,
      d.amount,
      COALESCE(d.phone, '00000000000'),
      CASE WHEN d.rn = 1 THEN d.ref ELSE CONCAT(d.ref, '-DUP-', d.rn) END,
      CASE WHEN d.tx_type = 'WALLET_FUNDING'::"TransactionType" AND d.ref LIKE 'SYDATA-VA-%' THEN d.ref ELSE NULL END,
      NULL,
      CASE
        WHEN d.tx_type = 'WALLET_FUNDING'::"TransactionType" THEN 'Legacy wallet funding migration'
        WHEN d.tx_type = 'REWARD_CREDIT'::"TransactionType" THEN 'Legacy reward credit migration'
        ELSE 'Legacy transaction migration'
      END,
      d.created_at,
      d.updated_at
    FROM dedup d
    LEFT JOIN "users" u ON u.id = d.user_id
    ON CONFLICT ("reference") DO NOTHING;
  END IF;
END $$;

-- --------------------------------------------------------------------------
-- Migrate claimed rewards where possible
-- --------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('"UserReward"') IS NOT NULL THEN
    INSERT INTO "user_rewards" ("id","userId","rewardId","status","claimedAt","createdAt")
    SELECT
      CONCAT('legacy-', ur.id::TEXT),
      ur."userId",
      r.id,
      CASE
        WHEN LOWER(COALESCE(ur.status, '')) IN ('claimed') THEN 'CLAIMED'::"RewardStatus"
        WHEN LOWER(COALESCE(ur.status, '')) IN ('earned') THEN 'EARNED'::"RewardStatus"
        ELSE 'IN_PROGRESS'::"RewardStatus"
      END,
      ur."claimedAt",
      COALESCE(ur."createdAt", NOW())
    FROM "UserReward" ur
    JOIN "users" u ON u.id = ur."userId"
    JOIN "rewards" r ON r."type" = CASE
      WHEN ur."ruleCode" ILIKE 'SIGNUP%' THEN 'SIGNUP_BONUS'::"RewardType"
      WHEN ur."ruleCode" ILIKE '%2000%' OR ur."ruleCode" ILIKE '%9999%' THEN 'FIRST_DEPOSIT_2K'::"RewardType"
      WHEN ur."ruleCode" ILIKE '%10000%' THEN 'DEPOSIT_10K_UPGRADE'::"RewardType"
      ELSE 'SIGNUP_BONUS'::"RewardType"
    END
    ON CONFLICT ("userId","rewardId") DO NOTHING;
  END IF;
END $$;

-- --------------------------------------------------------------------------
-- Helpful indexes
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "users_phone_idx" ON "users"("phone");
CREATE INDEX IF NOT EXISTS "transactions_user_status_idx" ON "transactions"("userId","status");
CREATE INDEX IF NOT EXISTS "transactions_type_created_idx" ON "transactions"("type","createdAt");
CREATE INDEX IF NOT EXISTS "virtual_accounts_order_ref_idx" ON "virtual_accounts"("orderRef");

COMMIT;
