import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const sql = neon(databaseUrl);

const statements = [
  `CREATE EXTENSION IF NOT EXISTS pgcrypto`,
  `CREATE OR REPLACE FUNCTION set_updatedat_column()
   RETURNS TRIGGER AS $$
   BEGIN
     NEW."updatedAt" = NOW();
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql`,
  `CREATE OR REPLACE FUNCTION set_updated_at_column()
   RETURNS TRIGGER AS $$
   BEGIN
     NEW.updated_at = NOW();
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql`,
  `CREATE TABLE IF NOT EXISTS "User" (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    phone TEXT NOT NULL UNIQUE,
    "pin" TEXT,
    bvn TEXT,
    balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
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
  )`,
  `CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"(role)`,
  `CREATE INDEX IF NOT EXISTS "User_account_number_idx" ON "User"("account_number")`,
  `CREATE TABLE IF NOT EXISTS "DataPlan" (
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
  )`,
  `CREATE INDEX IF NOT EXISTS "DataPlan_network_idx" ON "DataPlan"("networkId")`,
  `CREATE INDEX IF NOT EXISTS "DataPlan_active_idx" ON "DataPlan"("isActive")`,
  `CREATE INDEX IF NOT EXISTS "DataPlan_agentPrice_idx"
   ON "DataPlan"("agentPrice") WHERE "agentPrice" IS NOT NULL`,
  `CREATE TABLE IF NOT EXISTS "DataTransaction" (
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
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS "DataTransaction_user_idx" ON "DataTransaction"("userId", "createdAt" DESC)`,
  `CREATE INDEX IF NOT EXISTS "DataTransaction_status_idx" ON "DataTransaction"(status)`,
  `CREATE INDEX IF NOT EXISTS "DataTransaction_plan_idx" ON "DataTransaction"("planId")`,
  `CREATE TABLE IF NOT EXISTS "Transaction" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    reference VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'deposit',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, reference, amount)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_transaction_user_id ON "Transaction"(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_transaction_reference ON "Transaction"(reference)`,
  `CREATE INDEX IF NOT EXISTS idx_transaction_created_at ON "Transaction"(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_transaction_status ON "Transaction"(status)`,
  `CREATE TABLE IF NOT EXISTS airtime_transactions (
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
  )`,
  `CREATE INDEX IF NOT EXISTS idx_airtime_user_id ON airtime_transactions(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_airtime_status ON airtime_transactions(status)`,
  `CREATE INDEX IF NOT EXISTS idx_airtime_network ON airtime_transactions(network)`,
  `CREATE INDEX IF NOT EXISTS idx_airtime_created_at ON airtime_transactions(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_airtime_mobile ON airtime_transactions(mobile_number)`,
  `CREATE TABLE IF NOT EXISTS cable_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "planCode" TEXT NOT NULL UNIQUE,
    price NUMERIC(15, 2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS power_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "meterType" TEXT NOT NULL,
    price NUMERIC(15, 2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS cable_transactions (
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
  )`,
  `CREATE TABLE IF NOT EXISTS power_transactions (
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
  )`,
  `CREATE TABLE IF NOT EXISTS "UserReservedAccount" (
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
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "UserReservedAccount_user_bank_key"
   ON "UserReservedAccount" ("userId", "bankId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "UserReservedAccount_primary_key"
   ON "UserReservedAccount" ("userId")
   WHERE "isPrimary" = true`,
  `CREATE TABLE IF NOT EXISTS "BroadcastMessage" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
    "stoppedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS "BroadcastDismissal" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "broadcastId" UUID NOT NULL REFERENCES "BroadcastMessage"(id) ON DELETE CASCADE,
    "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "BroadcastDismissal_broadcast_user_key"
   ON "BroadcastDismissal" ("broadcastId", "userId")`,
  `CREATE INDEX IF NOT EXISTS "BroadcastMessage_isActive_createdAt_idx"
   ON "BroadcastMessage" ("isActive", "createdAt" DESC)`,
  `DROP VIEW IF EXISTS "CablePlan"`,
  `CREATE VIEW "CablePlan" AS
   SELECT id, "planName" AS name, provider, "planCode", price, "isActive", "createdAt", "updatedAt"
   FROM cable_plans`,
  `DROP VIEW IF EXISTS "PowerPlan"`,
  `CREATE VIEW "PowerPlan" AS
   SELECT id, "planName" AS name, provider, "meterType", price, "isActive", "createdAt", "updatedAt"
   FROM power_plans`,
  `DROP VIEW IF EXISTS "CableTransaction"`,
  `CREATE VIEW "CableTransaction" AS
   SELECT
     ct.id,
     ct.user_id AS "userId",
     cp.id AS "planId",
     ct.smart_card_number AS phone,
     ct.amount,
     ct.status,
     ct.created_at AS "createdAt"
   FROM cable_transactions ct
   LEFT JOIN cable_plans cp ON cp."planCode" = ct.plan_code`,
  `DROP VIEW IF EXISTS "PowerTransaction"`,
  `CREATE VIEW "PowerTransaction" AS
   SELECT
     pt.id,
     pt.user_id AS "userId",
     NULL::UUID AS "planId",
     pt.meter_number AS phone,
     pt.amount,
     pt.status,
     pt.created_at AS "createdAt"
   FROM power_transactions pt`,
  `DROP TRIGGER IF EXISTS user_set_updated_at ON "User"`,
  `CREATE TRIGGER user_set_updated_at
   BEFORE UPDATE ON "User"
   FOR EACH ROW
   EXECUTE FUNCTION set_updatedat_column()`,
  `DROP TRIGGER IF EXISTS dataplan_set_updated_at ON "DataPlan"`,
  `CREATE TRIGGER dataplan_set_updated_at
   BEFORE UPDATE ON "DataPlan"
   FOR EACH ROW
   EXECUTE FUNCTION set_updatedat_column()`,
  `DROP TRIGGER IF EXISTS datatransaction_set_updated_at ON "DataTransaction"`,
  `CREATE TRIGGER datatransaction_set_updated_at
   BEFORE UPDATE ON "DataTransaction"
   FOR EACH ROW
   EXECUTE FUNCTION set_updatedat_column()`,
  `DROP TRIGGER IF EXISTS transaction_set_updated_at ON "Transaction"`,
  `CREATE TRIGGER transaction_set_updated_at
   BEFORE UPDATE ON "Transaction"
   FOR EACH ROW
   EXECUTE FUNCTION set_updated_at_column()`,
  `DROP TRIGGER IF EXISTS airtime_transactions_set_updated_at ON airtime_transactions`,
  `CREATE TRIGGER airtime_transactions_set_updated_at
   BEFORE UPDATE ON airtime_transactions
   FOR EACH ROW
   EXECUTE FUNCTION set_updated_at_column()`,
  `DROP TRIGGER IF EXISTS cable_plans_set_updated_at ON cable_plans`,
  `CREATE TRIGGER cable_plans_set_updated_at
   BEFORE UPDATE ON cable_plans
   FOR EACH ROW
   EXECUTE FUNCTION set_updatedat_column()`,
  `DROP TRIGGER IF EXISTS power_plans_set_updated_at ON power_plans`,
  `CREATE TRIGGER power_plans_set_updated_at
   BEFORE UPDATE ON power_plans
   FOR EACH ROW
   EXECUTE FUNCTION set_updatedat_column()`,
  `DROP TRIGGER IF EXISTS cable_transactions_set_updated_at ON cable_transactions`,
  `CREATE TRIGGER cable_transactions_set_updated_at
   BEFORE UPDATE ON cable_transactions
   FOR EACH ROW
   EXECUTE FUNCTION set_updated_at_column()`,
  `DROP TRIGGER IF EXISTS power_transactions_set_updated_at ON power_transactions`,
  `CREATE TRIGGER power_transactions_set_updated_at
   BEFORE UPDATE ON power_transactions
   FOR EACH ROW
   EXECUTE FUNCTION set_updated_at_column()`,
  `DROP TRIGGER IF EXISTS user_reserved_accounts_set_updated_at ON "UserReservedAccount"`,
  `CREATE TRIGGER user_reserved_accounts_set_updated_at
   BEFORE UPDATE ON "UserReservedAccount"
   FOR EACH ROW
   EXECUTE FUNCTION set_updatedat_column()`,
  `DROP TRIGGER IF EXISTS broadcast_messages_set_updated_at ON "BroadcastMessage"`,
  `CREATE TRIGGER broadcast_messages_set_updated_at
   BEFORE UPDATE ON "BroadcastMessage"
   FOR EACH ROW
   EXECUTE FUNCTION set_updatedat_column()`,
];

const migrationInserts = [
  `INSERT INTO "User" (
      id, name, email, phone, "pin", bvn, balance, role, "isActive",
      "flutterwave_tx_ref", "flutterwave_flw_ref", "flutterwave_order_ref", "flutterwave_created_at",
      "virtual_account_provider", "account_number", "account_name", "bank_name", "bank_id",
      "createdAt", "updatedAt"
    )
    SELECT
      u.id,
      NULLIF(BTRIM(u."fullName"), ''),
      NULLIF(BTRIM(u.email), ''),
      u.phone,
      u."pinHash",
      NULL,
      ROUND(COALESCE(u.balance, 0)::numeric / 100.0, 2)::numeric(15,2),
      CASE
        WHEN UPPER(u.role::text) IN ('USER', 'AGENT', 'ADMIN') THEN UPPER(u.role::text)
        WHEN LOWER(COALESCE(u.tier, '')) = 'agent' THEN 'AGENT'
        ELSE 'USER'
      END,
      CASE WHEN COALESCE(u."isBanned", false) THEN false ELSE COALESCE(u."isActive", true) END,
      va."orderRef",
      va."flwRef",
      va."orderRef",
      COALESCE(va."createdAt"::timestamptz, u."joinedAt"::timestamptz, NOW()),
      CASE WHEN va.id IS NOT NULL THEN 'FLUTTERWAVE' ELSE NULL END,
      va."accountNumber",
      CASE WHEN va.id IS NOT NULL THEN CONCAT(COALESCE(NULLIF(BTRIM(u."fullName"), ''), 'User'), ' SY Data') ELSE NULL END,
      va."bankName",
      CASE WHEN va.id IS NOT NULL THEN 'FLUTTERWAVE' ELSE NULL END,
      COALESCE(u."joinedAt"::timestamptz, NOW()),
      COALESCE(u."updatedAt"::timestamptz, NOW())
    FROM users u
    LEFT JOIN virtual_accounts va ON va."userId" = u.id
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      email = COALESCE(EXCLUDED.email, "User".email),
      phone = EXCLUDED.phone,
      "pin" = COALESCE(EXCLUDED."pin", "User"."pin"),
      balance = EXCLUDED.balance,
      role = EXCLUDED.role,
      "isActive" = EXCLUDED."isActive",
      "flutterwave_tx_ref" = COALESCE(EXCLUDED."flutterwave_tx_ref", "User"."flutterwave_tx_ref"),
      "flutterwave_flw_ref" = COALESCE(EXCLUDED."flutterwave_flw_ref", "User"."flutterwave_flw_ref"),
      "flutterwave_order_ref" = COALESCE(EXCLUDED."flutterwave_order_ref", "User"."flutterwave_order_ref"),
      "flutterwave_created_at" = COALESCE(EXCLUDED."flutterwave_created_at", "User"."flutterwave_created_at"),
      "virtual_account_provider" = COALESCE(EXCLUDED."virtual_account_provider", "User"."virtual_account_provider"),
      "account_number" = COALESCE(EXCLUDED."account_number", "User"."account_number"),
      "account_name" = COALESCE(EXCLUDED."account_name", "User"."account_name"),
      "bank_name" = COALESCE(EXCLUDED."bank_name", "User"."bank_name"),
      "bank_id" = COALESCE(EXCLUDED."bank_id", "User"."bank_id"),
      "updatedAt" = NOW()`,
  `INSERT INTO "UserReservedAccount" (
      "userId", "providerReference", "accountNumber", "accountName", "bankName", "bankId", "isPrimary", "createdAt", "updatedAt"
    )
    SELECT
      va."userId",
      va."orderRef",
      va."accountNumber",
      CONCAT(COALESCE(NULLIF(BTRIM(u."fullName"), ''), 'User'), ' SY Data'),
      va."bankName",
      'FLUTTERWAVE',
      true,
      COALESCE(va."createdAt"::timestamptz, NOW()),
      COALESCE(va."createdAt"::timestamptz, NOW())
    FROM virtual_accounts va
    INNER JOIN users u ON u.id = va."userId"
    ON CONFLICT ("accountNumber") DO UPDATE SET
      "providerReference" = EXCLUDED."providerReference",
      "accountName" = EXCLUDED."accountName",
      "bankName" = EXCLUDED."bankName",
      "isPrimary" = true,
      "updatedAt" = NOW()`,
  `INSERT INTO "DataPlan" (
      id, name, "networkId", "networkName", "sizeLabel", validity, price,
      "userPrice", "agentPrice", "apiAId", "apiBId", "apiCId", "activeApi", "isActive", "createdAt", "updatedAt"
    )
    SELECT
      p.id::uuid,
      p.name,
      CASE UPPER(p.network::text)
        WHEN 'MTN' THEN 1
        WHEN 'GLO' THEN 2
        WHEN '9MOBILE' THEN 3
        WHEN 'AIRTEL' THEN 4
        ELSE 0
      END,
      CASE
        WHEN UPPER(p.network::text) = '9MOBILE' THEN '9mobile'
        WHEN UPPER(p.network::text) = 'GLO' THEN 'Glo'
        WHEN UPPER(p.network::text) = 'AIRTEL' THEN 'Airtel'
        ELSE INITCAP(LOWER(p.network::text))
      END,
      p."sizeLabel",
      p.validity,
      p.price::numeric(15,2),
      NULLIF(p.user_price, 0)::numeric(15,2),
      NULLIF(p.agent_price, 0)::numeric(15,2),
      CASE WHEN p."apiSource"::text = 'API_A' THEN p."externalPlanId" ELSE NULL END,
      CASE WHEN p."apiSource"::text = 'API_B' THEN p."externalPlanId" ELSE NULL END,
      CASE WHEN p."apiSource"::text = 'API_C' THEN p."externalPlanId" ELSE NULL END,
      CASE
        WHEN p."apiSource"::text = 'API_B' THEN 'B'
        WHEN p."apiSource"::text = 'API_C' THEN 'C'
        ELSE 'A'
      END,
      p."isActive",
      COALESCE(p."createdAt"::timestamptz, NOW()),
      COALESCE(p."updatedAt"::timestamptz, NOW())
    FROM plans p
    WHERE p.id ~* '^[0-9a-f-]{36}$'
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      "networkId" = EXCLUDED."networkId",
      "networkName" = EXCLUDED."networkName",
      "sizeLabel" = EXCLUDED."sizeLabel",
      validity = EXCLUDED.validity,
      price = EXCLUDED.price,
      "userPrice" = EXCLUDED."userPrice",
      "agentPrice" = EXCLUDED."agentPrice",
      "apiAId" = EXCLUDED."apiAId",
      "apiBId" = EXCLUDED."apiBId",
      "apiCId" = EXCLUDED."apiCId",
      "activeApi" = EXCLUDED."activeApi",
      "isActive" = EXCLUDED."isActive",
      "updatedAt" = NOW()`,
  `INSERT INTO "DataTransaction" (
      "userId", "planId", phone, "networkId", amount, "providerUsed", "providerRef",
      "customerRef", "providerResponse", status, "balanceBefore", "balanceAfter", "createdAt", "updatedAt"
    )
    SELECT
      t."userId",
      t."planId"::uuid,
      t.phone,
      COALESCE(dp."networkId", 0),
      t.amount::numeric(15,2),
      t."apiUsed"::text,
      t."externalReference",
      t.reference,
      t.description,
      UPPER(t.status::text),
      t."balanceBefore"::numeric(15,2),
      t."balanceAfter"::numeric(15,2),
      COALESCE(t."createdAt"::timestamptz, NOW()),
      COALESCE(t."updatedAt"::timestamptz, NOW())
    FROM transactions t
    INNER JOIN "User" u ON u.id = t."userId"
    INNER JOIN "DataPlan" dp ON dp.id = t."planId"::uuid
    WHERE t.type::text = 'DATA_PURCHASE'
      AND t."planId" IS NOT NULL
      AND t."planId" ~* '^[0-9a-f-]{36}$'
    ON CONFLICT ("customerRef") DO NOTHING`,
  `INSERT INTO "Transaction" (user_id, amount, reference, type, status, created_at, updated_at)
    SELECT
      t."userId",
      ROUND(t.amount::numeric / 100.0)::integer,
      COALESCE(t."externalReference", t.reference),
      CASE WHEN t.type::text = 'WALLET_FUNDING' THEN 'deposit' ELSE LOWER(t.type::text) END,
      LOWER(t.status::text),
      COALESCE(t."createdAt"::timestamptz, NOW()),
      COALESCE(t."updatedAt"::timestamptz, NOW())
    FROM transactions t
    INNER JOIN "User" u ON u.id = t."userId"
    WHERE t.type::text IN ('WALLET_FUNDING', 'REWARD_CREDIT')
    ON CONFLICT (user_id, reference, amount) DO NOTHING`,
  `INSERT INTO airtime_transactions (
      user_id, provider_id, ident, network, network_name, mobile_number, amount, status, api_response,
      description, balance_before, balance_after, provider_created_at, created_at, updated_at
    )
    SELECT
      t."userId",
      t."externalReference",
      t.reference,
      0,
      'Unknown',
      t.phone,
      ROUND(t.amount::numeric / 100.0, 2)::numeric(15,2),
      UPPER(t.status::text),
      t.description,
      t.description,
      ROUND(t."balanceBefore"::numeric / 100.0, 2)::numeric(15,2),
      ROUND(t."balanceAfter"::numeric / 100.0, 2)::numeric(15,2),
      COALESCE(t."createdAt"::timestamptz, NOW()),
      COALESCE(t."createdAt"::timestamptz, NOW()),
      COALESCE(t."updatedAt"::timestamptz, NOW())
    FROM transactions t
    INNER JOIN "User" u ON u.id = t."userId"
    WHERE t.type::text = 'AIRTIME_PURCHASE'
    ON CONFLICT (ident) DO NOTHING`,
  `INSERT INTO "BroadcastMessage" (id, message, "isActive", "createdBy", "createdAt", "updatedAt")
    SELECT
      gen_random_uuid(),
      CONCAT(COALESCE(sn.title, 'Notice'), ': ', sn.message),
      sn."isActive",
      NULL,
      COALESCE(sn."createdAt"::timestamptz, NOW()),
      COALESCE(sn."updatedAt"::timestamptz, NOW())
    FROM service_notices sn
    WHERE NOT EXISTS (SELECT 1 FROM "BroadcastMessage")`,
];

async function main() {
  for (const statement of statements) {
    await sql(statement);
  }

  for (const statement of migrationInserts) {
    await sql(statement);
  }

  const summary = {
    users: await sql(`SELECT COUNT(*)::int AS count FROM "User"`),
    dataPlans: await sql(`SELECT COUNT(*)::int AS count FROM "DataPlan"`),
    dataTransactions: await sql(`SELECT COUNT(*)::int AS count FROM "DataTransaction"`),
    deposits: await sql(`SELECT COUNT(*)::int AS count FROM "Transaction"`),
    airtimeTransactions: await sql(`SELECT COUNT(*)::int AS count FROM airtime_transactions`),
    reservedAccounts: await sql(`SELECT COUNT(*)::int AS count FROM "UserReservedAccount"`),
    broadcasts: await sql(`SELECT COUNT(*)::int AS count FROM "BroadcastMessage"`),
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
