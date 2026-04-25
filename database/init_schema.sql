CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_updatedat_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS "User" (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  phone TEXT NOT NULL UNIQUE,
  "pin" TEXT,
  bvn TEXT,
  balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
  reward_balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
  role VARCHAR(50) NOT NULL DEFAULT 'USER',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "flutterwave_tx_ref" VARCHAR(255) UNIQUE,
  "flutterwave_flw_ref" VARCHAR(255),
  "flutterwave_order_ref" VARCHAR(255),
  "flutterwave_created_at" TIMESTAMPTZ,
  "virtual_account_provider" VARCHAR(50),
  "account_number" VARCHAR(255),
  "account_name" VARCHAR(255),
  "bank_name" VARCHAR(255),
  "bank_id" VARCHAR(255),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "User_role_check" CHECK (role IN ('USER', 'AGENT', 'ADMIN'))
);

CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"(role);
CREATE INDEX IF NOT EXISTS "User_account_number_idx" ON "User"("account_number");

CREATE TABLE IF NOT EXISTS "DataPlan" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  "networkId" INTEGER NOT NULL,
  "networkName" TEXT,
  "sizeLabel" TEXT NOT NULL,
  validity TEXT NOT NULL,
  price NUMERIC(15, 2) NOT NULL,
  "userPrice" NUMERIC(15, 2),
  "agentPrice" NUMERIC(15, 2),
  "apiAId" INTEGER,
  "apiBId" INTEGER,
  "apiCId" INTEGER,
  "activeApi" VARCHAR(1) NOT NULL DEFAULT 'A',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "DataPlan_activeApi_check" CHECK ("activeApi" IN ('A', 'B', 'C'))
);

CREATE INDEX IF NOT EXISTS "DataPlan_network_idx" ON "DataPlan"("networkId");
CREATE INDEX IF NOT EXISTS "DataPlan_active_idx" ON "DataPlan"("isActive");
CREATE INDEX IF NOT EXISTS "DataPlan_agentPrice_idx"
ON "DataPlan"("agentPrice") WHERE "agentPrice" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "DataTransaction" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "planId" UUID NOT NULL REFERENCES "DataPlan"(id) ON DELETE RESTRICT,
  phone TEXT NOT NULL,
  "networkId" INTEGER NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  "providerUsed" TEXT,
  "providerRef" TEXT,
  "customerRef" TEXT UNIQUE,
  "providerResponse" TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  "balanceBefore" NUMERIC(15, 2),
  "balanceAfter" NUMERIC(15, 2),
  "rewardApplied" NUMERIC(15, 2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "DataTransaction_user_idx" ON "DataTransaction"("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "DataTransaction_status_idx" ON "DataTransaction"(status);
CREATE INDEX IF NOT EXISTS "DataTransaction_plan_idx" ON "DataTransaction"("planId");

CREATE TABLE IF NOT EXISTS "Transaction" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reference VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'deposit',
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, reference, amount)
);

CREATE INDEX IF NOT EXISTS idx_transaction_user_id ON "Transaction"(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_reference ON "Transaction"(reference);
CREATE INDEX IF NOT EXISTS idx_transaction_created_at ON "Transaction"(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transaction_status ON "Transaction"(status);

CREATE TABLE IF NOT EXISTS airtime_transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  provider_id TEXT,
  ident TEXT UNIQUE,
  network INTEGER NOT NULL,
  network_name TEXT,
  mobile_number TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  api_response TEXT,
  description TEXT,
  balance_before NUMERIC(15, 2),
  balance_after NUMERIC(15, 2),
  provider_created_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_airtime_user_id ON airtime_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_airtime_status ON airtime_transactions(status);
CREATE INDEX IF NOT EXISTS idx_airtime_network ON airtime_transactions(network);
CREATE INDEX IF NOT EXISTS idx_airtime_created_at ON airtime_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_airtime_mobile ON airtime_transactions(mobile_number);

CREATE TABLE IF NOT EXISTS cable_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  "planName" TEXT NOT NULL,
  "planCode" TEXT NOT NULL UNIQUE,
  price NUMERIC(15, 2) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cable_plans_provider ON cable_plans(provider);
CREATE INDEX IF NOT EXISTS idx_cable_plans_active ON cable_plans("isActive");

CREATE TABLE IF NOT EXISTS power_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  "planName" TEXT NOT NULL,
  "meterType" TEXT NOT NULL,
  price NUMERIC(15, 2) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_power_plans_provider ON power_plans(provider);
CREATE INDEX IF NOT EXISTS idx_power_plans_meter_type ON power_plans("meterType");
CREATE INDEX IF NOT EXISTS idx_power_plans_active ON power_plans("isActive");

CREATE TABLE IF NOT EXISTS cable_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  provider_id TEXT,
  ident TEXT UNIQUE,
  provider TEXT,
  provider_name TEXT,
  smart_card_number TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  amount NUMERIC(15, 2) NOT NULL,
  amount_received NUMERIC(15, 2),
  status TEXT NOT NULL DEFAULT 'PENDING',
  response_code TEXT,
  response_message TEXT,
  plan_code TEXT,
  plan_name TEXT,
  renewal_date TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cable_user_id ON cable_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_cable_status ON cable_transactions(status);
CREATE INDEX IF NOT EXISTS idx_cable_provider ON cable_transactions(provider);
CREATE INDEX IF NOT EXISTS idx_cable_created_at ON cable_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cable_smart_card ON cable_transactions(smart_card_number);

CREATE TABLE IF NOT EXISTS power_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  provider_id TEXT,
  ident TEXT UNIQUE,
  provider TEXT,
  provider_name TEXT,
  meter_number TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  amount NUMERIC(15, 2) NOT NULL,
  amount_received NUMERIC(15, 2),
  meter_type TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  response_code TEXT,
  response_message TEXT,
  token TEXT,
  units TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_power_user_id ON power_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_power_status ON power_transactions(status);
CREATE INDEX IF NOT EXISTS idx_power_provider ON power_transactions(provider);
CREATE INDEX IF NOT EXISTS idx_power_created_at ON power_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_power_meter ON power_transactions(meter_number);

CREATE TABLE IF NOT EXISTS "UserReservedAccount" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "providerReference" VARCHAR(255),
  "accountNumber" VARCHAR(255) NOT NULL UNIQUE,
  "accountName" VARCHAR(255),
  "bankName" VARCHAR(255),
  "bankId" VARCHAR(255) NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserReservedAccount_user_bank_key"
ON "UserReservedAccount" ("userId", "bankId");

CREATE UNIQUE INDEX IF NOT EXISTS "UserReservedAccount_primary_key"
ON "UserReservedAccount" ("userId")
WHERE "isPrimary" = true;

CREATE TABLE IF NOT EXISTS "BroadcastMessage" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdBy" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  "stoppedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "BroadcastDismissal" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "broadcastId" UUID NOT NULL REFERENCES "BroadcastMessage"(id) ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "BroadcastDismissal_broadcast_user_key"
ON "BroadcastDismissal" ("broadcastId", "userId");

CREATE INDEX IF NOT EXISTS "BroadcastMessage_isActive_createdAt_idx"
ON "BroadcastMessage" ("isActive", "createdAt" DESC);

CREATE TABLE IF NOT EXISTS "RewardRule" (
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
);

CREATE INDEX IF NOT EXISTS "RewardRule_active_order_idx"
ON "RewardRule" ("isActive", "displayOrder", "thresholdAmount");

CREATE TABLE IF NOT EXISTS "UserReward" (
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
);

CREATE INDEX IF NOT EXISTS "UserReward_user_status_idx"
ON "UserReward" ("userId", status, "createdAt" DESC);

DROP VIEW IF EXISTS "CablePlan";
CREATE VIEW "CablePlan" AS
SELECT id, "planName" AS name, provider, "planCode", price, "isActive", "createdAt", "updatedAt"
FROM cable_plans;

DROP VIEW IF EXISTS "PowerPlan";
CREATE VIEW "PowerPlan" AS
SELECT id, "planName" AS name, provider, "meterType", price, "isActive", "createdAt", "updatedAt"
FROM power_plans;

DROP VIEW IF EXISTS "CableTransaction";
CREATE VIEW "CableTransaction" AS
SELECT
  ct.id,
  ct.user_id AS "userId",
  cp.id AS "planId",
  ct.smart_card_number AS phone,
  ct.amount,
  ct.status,
  ct.created_at AS "createdAt"
FROM cable_transactions ct
LEFT JOIN cable_plans cp ON cp."planCode" = ct.plan_code;

DROP VIEW IF EXISTS "PowerTransaction";
CREATE VIEW "PowerTransaction" AS
SELECT
  pt.id,
  pt.user_id AS "userId",
  NULL::UUID AS "planId",
  pt.meter_number AS phone,
  pt.amount,
  pt.status,
  pt.created_at AS "createdAt"
FROM power_transactions pt;

DROP TRIGGER IF EXISTS user_set_updated_at ON "User";
CREATE TRIGGER user_set_updated_at
BEFORE UPDATE ON "User"
FOR EACH ROW
EXECUTE FUNCTION set_updatedat_column();

DROP TRIGGER IF EXISTS dataplan_set_updated_at ON "DataPlan";
CREATE TRIGGER dataplan_set_updated_at
BEFORE UPDATE ON "DataPlan"
FOR EACH ROW
EXECUTE FUNCTION set_updatedat_column();

DROP TRIGGER IF EXISTS datatransaction_set_updated_at ON "DataTransaction";
CREATE TRIGGER datatransaction_set_updated_at
BEFORE UPDATE ON "DataTransaction"
FOR EACH ROW
EXECUTE FUNCTION set_updatedat_column();

DROP TRIGGER IF EXISTS transaction_set_updated_at ON "Transaction";
CREATE TRIGGER transaction_set_updated_at
BEFORE UPDATE ON "Transaction"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_column();

DROP TRIGGER IF EXISTS airtime_transactions_set_updated_at ON airtime_transactions;
CREATE TRIGGER airtime_transactions_set_updated_at
BEFORE UPDATE ON airtime_transactions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_column();

DROP TRIGGER IF EXISTS cable_plans_set_updated_at ON cable_plans;
CREATE TRIGGER cable_plans_set_updated_at
BEFORE UPDATE ON cable_plans
FOR EACH ROW
EXECUTE FUNCTION set_updatedat_column();

DROP TRIGGER IF EXISTS power_plans_set_updated_at ON power_plans;
CREATE TRIGGER power_plans_set_updated_at
BEFORE UPDATE ON power_plans
FOR EACH ROW
EXECUTE FUNCTION set_updatedat_column();

DROP TRIGGER IF EXISTS cable_transactions_set_updated_at ON cable_transactions;
CREATE TRIGGER cable_transactions_set_updated_at
BEFORE UPDATE ON cable_transactions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_column();

DROP TRIGGER IF EXISTS power_transactions_set_updated_at ON power_transactions;
CREATE TRIGGER power_transactions_set_updated_at
BEFORE UPDATE ON power_transactions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_column();

DROP TRIGGER IF EXISTS user_reserved_accounts_set_updated_at ON "UserReservedAccount";
CREATE TRIGGER user_reserved_accounts_set_updated_at
BEFORE UPDATE ON "UserReservedAccount"
FOR EACH ROW
EXECUTE FUNCTION set_updatedat_column();

DROP TRIGGER IF EXISTS broadcast_messages_set_updated_at ON "BroadcastMessage";
CREATE TRIGGER broadcast_messages_set_updated_at
BEFORE UPDATE ON "BroadcastMessage"
FOR EACH ROW
EXECUTE FUNCTION set_updatedat_column();

DROP TRIGGER IF EXISTS reward_rule_set_updated_at ON "RewardRule";
CREATE TRIGGER reward_rule_set_updated_at
BEFORE UPDATE ON "RewardRule"
FOR EACH ROW
EXECUTE FUNCTION set_updatedat_column();

DROP TRIGGER IF EXISTS user_reward_set_updated_at ON "UserReward";
CREATE TRIGGER user_reward_set_updated_at
BEFORE UPDATE ON "UserReward"
FOR EACH ROW
EXECUTE FUNCTION set_updatedat_column();
