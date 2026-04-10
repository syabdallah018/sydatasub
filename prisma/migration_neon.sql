-- ============================================================================
-- SY DATA SUB - Neon Database Migration Script
-- ============================================================================
-- 
-- This script applies all necessary schema changes for the production release.
-- Use non-destructive ALTER operations to preserve existing data.
--
-- Safe to run multiple times (uses IF NOT EXISTS / IF EXISTS patterns)
-- 
-- Features:
--  - User Tier System (USER vs AGENT)
--  - Dual Tier-Based Pricing (user_price vs agent_price)
--  - Index optimization for tier queries
--
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Create UserTier enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserTier') THEN
    CREATE TYPE "UserTier" AS ENUM ('user', 'agent');
  END IF;
END $$;

-- Create NetworkType enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NetworkType') THEN
    CREATE TYPE "NetworkType" AS ENUM ('MTN', 'GLO', 'AIRTEL', 'NINEMOBILE');
  END IF;
END $$;

-- Create TransactionType enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TransactionType') THEN
    CREATE TYPE "TransactionType" AS ENUM ('DATA_PURCHASE', 'AIRTIME_PURCHASE', 'WALLET_FUNDING', 'REWARD_CREDIT');
  END IF;
END $$;

-- Create TransactionStatus enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TransactionStatus') THEN
    CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REVERSED');
  END IF;
END $$;

-- Create ApiSource enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ApiSource') THEN
    CREATE TYPE "ApiSource" AS ENUM ('API_A', 'API_B');
  END IF;
END $$;

-- Create RewardType enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RewardType') THEN
    CREATE TYPE "RewardType" AS ENUM ('SIGNUP_BONUS', 'FIRST_DEPOSIT_2K', 'DEPOSIT_10K_UPGRADE');
  END IF;
END $$;

-- Create RewardStatus enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RewardStatus') THEN
    CREATE TYPE "RewardStatus" AS ENUM ('IN_PROGRESS', 'EARNED', 'CLAIMED');
  END IF;
END $$;

-- Create UserRole enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole') THEN
    CREATE TYPE "UserRole" AS ENUM ('USER', 'AGENT', 'ADMIN');
  END IF;
END $$;

-- ============================================================================
-- ALTER USERS TABLE - Add Tier Column
-- ============================================================================

-- Add tier column to users table if it doesn't exist
ALTER TABLE IF EXISTS "users"
ADD COLUMN IF NOT EXISTS "tier" "UserTier" NOT NULL DEFAULT 'user';

-- Create index on tier for efficient queries
CREATE INDEX IF NOT EXISTS "users_tier_idx" ON "users"("tier");

-- ============================================================================
-- ALTER PLANS TABLE - Add Dual Pricing Columns
-- ============================================================================

-- Add user_price column (standard customer price)
ALTER TABLE IF EXISTS "plans"
ADD COLUMN IF NOT EXISTS "user_price" INTEGER NOT NULL DEFAULT 0;

-- Add agent_price column (reseller/bulk buyer price)
ALTER TABLE IF EXISTS "plans"
ADD COLUMN IF NOT EXISTS "agent_price" INTEGER NOT NULL DEFAULT 0;

-- Populate dual pricing columns from legacy price column if they're empty
UPDATE "plans"
SET "user_price" = "price", "agent_price" = GREATEST("price" - 50, "price" - ("price" * 0.05)::int)
WHERE ("user_price" = 0 OR "agent_price" = 0) AND "price" != 0;

-- Create indexes on pricing columns for better query performance
CREATE INDEX IF NOT EXISTS "plans_user_price_idx" ON "plans"("user_price");
CREATE INDEX IF NOT EXISTS "plans_agent_price_idx" ON "plans"("agent_price");

-- ============================================================================
-- CREATE INDEXES - Performance Optimization
-- ============================================================================

-- Index for tier-based pricing queries
CREATE INDEX IF NOT EXISTS "users_tier_created_idx" ON "users"("tier", "createdAt" DESC);

-- Index for transaction lookups by status and user
CREATE INDEX IF NOT EXISTS "transactions_status_user_idx" ON "transactions"("status", "userId");

-- Index for recent transactions
CREATE INDEX IF NOT EXISTS "transactions_created_idx" ON "transactions"("createdAt" DESC);

-- Index for plan lookups by network and active status
CREATE INDEX IF NOT EXISTS "plans_network_active_idx" ON "plans"("network", "isActive");

-- ============================================================================
-- VALIDATION & CONSTRAINTS
-- ============================================================================

-- Ensure agent prices are less than or equal to user prices
ALTER TABLE "plans"
ADD CONSTRAINT "agent_price_check" CHECK ("agent_price" <= "user_price");

-- Ensure prices are non-negative
ALTER TABLE "plans"
ADD CONSTRAINT "user_price_non_negative" CHECK ("user_price" >= 0);

ALTER TABLE "plans"
ADD CONSTRAINT "agent_price_non_negative" CHECK ("agent_price" >= 0);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log completion
SELECT NOW() AS "Migration Completed At",
       'SY DATA SUB Production Migration' AS "Script",
       'Tier system and dual pricing implementation' AS "Description";

-- Show table statistics
SELECT tablename, 
       (SELECT count(*) FROM information_schema.columns WHERE table_name = tablename) AS column_count
FROM pg_tables 
WHERE schemaname = 'public' AND tablename IN ('users', 'plans', 'transactions')
ORDER BY tablename;
