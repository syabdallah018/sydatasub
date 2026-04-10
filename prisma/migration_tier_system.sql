-- SY DATA SUB - User Tier System Migration
-- This script implements the USER vs AGENT tier system with dual pricing
-- Safe to run multiple times - uses IF NOT EXISTS clauses
-- Run this in Neon SQL Editor

-- 1. Add tier column to users table
-- Values: 'user' (default customer) or 'agent' (reseller/bulk buyer)
ALTER TABLE "users" 
ADD COLUMN IF NOT EXISTS "tier" TEXT NOT NULL DEFAULT 'user' 
CHECK ("tier" IN ('user', 'agent'));

-- Add index for querying by tier
CREATE INDEX IF NOT EXISTS "idx_user_tier" ON "users"("tier");

-- 2. Add dual pricing columns to plans table
-- user_price: Standard customer price
-- agent_price: Lower bulk/reseller price (must be < user_price)
ALTER TABLE "plans"
ADD COLUMN IF NOT EXISTS "user_price" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "agent_price" INTEGER NOT NULL DEFAULT 0;

-- Note: The old 'price' column should remain for backward compatibility
-- Update queries will reference user_price or agent_price based on user tier

-- 3. Add constraint to ensure agent_price < user_price
-- (After migration, ensure all data satisfies this)
-- ALTER TABLE "plans" ADD CONSTRAINT "chk_agent_price_less_than_user_price" 
-- CHECK ("agent_price" < "user_price");

-- 4. Migrate existing prices to user_price for backward compatibility
-- This assumes existing 'price' column contains user (standard) pricing
UPDATE "plans" 
SET "user_price" = COALESCE("price", 0)
WHERE "user_price" = 0;

-- Set agent price to 5% less than user price (base migration)
-- Adjust percentage as needed
UPDATE "plans"
SET "agent_price" = FLOOR("user_price" * 0.95)
WHERE "agent_price" = 0 AND "user_price" > 0;

-- 5. Verify migration
-- Run these selects to check:
-- SELECT COUNT(*) as total_users, 
--        SUM(CASE WHEN tier = 'user' THEN 1 ELSE 0 END) as standard_users,
--        SUM(CASE WHEN tier = 'agent' THEN 1 ELSE 0 END) as agent_users
-- FROM "users";

-- SELECT id, name, user_price, agent_price,
--        ROUND((((user_price - agent_price)::float / user_price) * 100)::numeric, 1) as discount_percent
-- FROM "plans"
-- WHERE user_price > 0
-- ORDER BY user_price DESC
-- LIMIT 10;

-- 6. Notes for implementation:
-- - In app: Check user.tier when displaying prices
-- - In admin: Show both user_price and agent_price fields in plan forms
-- - Validation: Ensure agent_price < user_price always
-- - Reports: Can now track user vs agent volume separately via tier field
