-- Migration: User Custom Pricing, Independent Developer Plan IDs, and Neon Performance Indexes

-- 1. Add independent developer plan ID and code to plans
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "developerPlanId" INTEGER UNIQUE;
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "planCode" TEXT UNIQUE;

-- Backfill developerPlanId with externalPlanId if developerPlanId is null, and generate default planCode
UPDATE "plans" 
SET "developerPlanId" = "externalPlanId" 
WHERE "developerPlanId" IS NULL;

UPDATE "plans"
SET "planCode" = CONCAT("network", '_', UPPER(REPLACE("sizeLabel", ' ', '')), '_', "developerPlanId")
WHERE "planCode" IS NULL AND "developerPlanId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "plans_isActive_network_idx" ON "plans" ("isActive", "network");
CREATE INDEX IF NOT EXISTS "plans_developerPlanId_idx" ON "plans" ("developerPlanId");
CREATE INDEX IF NOT EXISTS "plans_planCode_idx" ON "plans" ("planCode");

-- 2. Add performance indexes to users
CREATE INDEX IF NOT EXISTS "users_role_isBanned_idx" ON "users" ("role", "isBanned");
CREATE INDEX IF NOT EXISTS "users_fcmToken_idx" ON "users" ("fcmToken");

-- 3. Add performance indexes to transactions
CREATE INDEX IF NOT EXISTS "transactions_status_type_idx" ON "transactions" ("status", "type");
CREATE INDEX IF NOT EXISTS "transactions_userId_type_status_idx" ON "transactions" ("userId", "type", "status");

-- 4. Create UserCustomPrice table
CREATE TABLE IF NOT EXISTS "user_custom_prices" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "planId" TEXT NOT NULL REFERENCES "plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "price" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_custom_prices_userId_planId_key" UNIQUE ("userId", "planId")
);

CREATE INDEX IF NOT EXISTS "user_custom_prices_userId_idx" ON "user_custom_prices" ("userId");
CREATE INDEX IF NOT EXISTS "user_custom_prices_planId_idx" ON "user_custom_prices" ("planId");
