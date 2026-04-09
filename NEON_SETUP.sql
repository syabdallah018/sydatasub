-- ====================================================================
-- SY DATA SUB - Complete Database Schema & Seed Script
-- For Neon PostgreSQL
-- Copy & paste this entire script into: Neon Console → SQL Editor
-- ====================================================================
-- Enable required extension for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ====================================================================
-- 1. DROP EXISTING OBJECTS (Safe Cleanup)
-- ====================================================================
DROP TABLE IF EXISTS user_rewards CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS virtual_accounts CASCADE;
DROP TABLE IF EXISTS plans CASCADE;
DROP TABLE IF EXISTS rewards CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop enums
DROP TYPE IF EXISTS "UserRole" CASCADE;
DROP TYPE IF EXISTS "NetworkType" CASCADE;
DROP TYPE IF EXISTS "TransactionType" CASCADE;
DROP TYPE IF EXISTS "TransactionStatus" CASCADE;
DROP TYPE IF EXISTS "ApiSource" CASCADE;
DROP TYPE IF EXISTS "RewardType" CASCADE;
DROP TYPE IF EXISTS "RewardStatus" CASCADE;

-- ====================================================================
-- 2. CREATE ENUMS
-- ====================================================================
CREATE TYPE "UserRole" AS ENUM ('USER', 'AGENT', 'ADMIN');
CREATE TYPE "NetworkType" AS ENUM ('MTN', 'GLO', 'AIRTEL', 'NINEMOBILE');
CREATE TYPE "TransactionType" AS ENUM ('DATA_PURCHASE', 'AIRTIME_PURCHASE', 'WALLET_FUNDING', 'REWARD_CREDIT');
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REVERSED');
CREATE TYPE "ApiSource" AS ENUM ('API_A', 'API_B');
CREATE TYPE "RewardType" AS ENUM ('SIGNUP_BONUS', 'FIRST_DEPOSIT_2K', 'DEPOSIT_10K_UPGRADE');
CREATE TYPE "RewardStatus" AS ENUM ('IN_PROGRESS', 'EARNED', 'CLAIMED');

-- ====================================================================
-- 3. CREATE TABLES
-- ====================================================================

-- Users Table
CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "fullName" TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  "pinHash" TEXT,
  email TEXT,
  role "UserRole" NOT NULL DEFAULT 'USER',
  balance INTEGER NOT NULL DEFAULT 0,
  "isBanned" BOOLEAN NOT NULL DEFAULT FALSE,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "joinedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email);

-- Virtual Accounts Table
CREATE TABLE virtual_accounts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "userId" TEXT NOT NULL UNIQUE,
  "accountNumber" TEXT NOT NULL,
  "bankName" TEXT NOT NULL,
  "flwRef" TEXT NOT NULL,
  "orderRef" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

-- Plans Table
CREATE TABLE plans (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name TEXT NOT NULL,
  network "NetworkType" NOT NULL,
  "sizeLabel" TEXT NOT NULL,
  validity TEXT NOT NULL,
  price INTEGER NOT NULL,
  "apiSource" "ApiSource" NOT NULL,
  "externalPlanId" INTEGER NOT NULL,
  "externalNetworkId" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("apiSource", "externalPlanId", "externalNetworkId")
);

CREATE INDEX idx_plans_network ON plans(network);
CREATE INDEX idx_plans_active ON plans("isActive");

-- Transactions Table
CREATE TABLE transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "userId" TEXT,
  "guestPhone" TEXT,
  type "TransactionType" NOT NULL,
  status "TransactionStatus" NOT NULL DEFAULT 'PENDING',
  amount INTEGER NOT NULL,
  "balanceBefore" INTEGER,
  "balanceAfter" INTEGER,
  phone TEXT NOT NULL,
  "planId" TEXT,
  description TEXT,
  reference TEXT NOT NULL UNIQUE,
  "externalReference" TEXT,
  "flwRef" TEXT,
  "tempAccountNumber" TEXT,
  "tempBankName" TEXT,
  "tempTxRef" TEXT,
  "apiUsed" "ApiSource",
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY ("planId") REFERENCES plans(id)
);

CREATE INDEX idx_transactions_user ON transactions("userId");
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_phone ON transactions(phone);
CREATE INDEX idx_transactions_reference ON transactions(reference);
CREATE INDEX idx_transactions_external_ref ON transactions("externalReference");

-- Rewards Table
CREATE TABLE rewards (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  type "RewardType" NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  amount INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE
);

-- User Rewards Table (Join Table)
CREATE TABLE user_rewards (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "userId" TEXT NOT NULL,
  "rewardId" TEXT NOT NULL,
  status "RewardStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "claimedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("userId", "rewardId"),
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY ("rewardId") REFERENCES rewards(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_rewards_user ON user_rewards("userId");
CREATE INDEX idx_user_rewards_status ON user_rewards(status);

-- ====================================================================
-- 4. SEED DATA - REWARDS
-- ====================================================================

INSERT INTO rewards (id, type, title, description, amount, "isActive")
VALUES
  (gen_random_uuid()::TEXT, 'SIGNUP_BONUS', 'Welcome Bonus', '₦100 credited on account creation', 100, TRUE),
  (gen_random_uuid()::TEXT, 'FIRST_DEPOSIT_2K', 'First Big Deposit', '₦200 credited on first deposit ≥ ₦2,000', 200, TRUE),
  (gen_random_uuid()::TEXT, 'DEPOSIT_10K_UPGRADE', 'High Roller', '₦300 credited + auto-upgrade to AGENT on deposit ≥ ₦10,000', 300, TRUE);

-- ====================================================================
-- 5. SEED DATA - DATA PLANS (MTN API A)
-- ====================================================================

INSERT INTO plans (id, name, network, "sizeLabel", validity, price, "apiSource", "externalPlanId", "externalNetworkId", "isActive")
VALUES
  (gen_random_uuid()::TEXT, '500MB Share', 'MTN', '500MB', 'Weekly', 300, 'API_A', 423, 1, TRUE),
  (gen_random_uuid()::TEXT, '1GB Share', 'MTN', '1GB', 'Weekly', 450, 'API_A', 424, 1, TRUE),
  (gen_random_uuid()::TEXT, '2GB Share', 'MTN', '2GB', 'Weekly', 900, 'API_A', 425, 1, TRUE),
  (gen_random_uuid()::TEXT, '3GB Share', 'MTN', '3GB', 'Weekly', 1200, 'API_A', 426, 1, TRUE),
  (gen_random_uuid()::TEXT, '5GB Share', 'MTN', '5GB', 'Monthly', 1500, 'API_A', 176, 1, TRUE),
  (gen_random_uuid()::TEXT, '1GB Daily (Awoof)', 'MTN', '1GB', 'Daily', 220, 'API_A', 498, 1, TRUE),
  (gen_random_uuid()::TEXT, '2.5GB Daily', 'MTN', '2.5GB', 'Daily', 550, 'API_A', 453, 1, TRUE),
  (gen_random_uuid()::TEXT, '7GB Monthly', 'MTN', '7GB', 'Monthly', 3500, 'API_A', 21, 1, TRUE),
  (gen_random_uuid()::TEXT, '11GB Digital Bundle', 'MTN', '11GB', '7 Days', 3500, 'API_A', 226, 1, TRUE),
  (gen_random_uuid()::TEXT, '10GB + 10mins Monthly', 'MTN', '10GB', 'Monthly', 4500, 'API_A', 22, 1, TRUE),
  (gen_random_uuid()::TEXT, '20GB Weekly', 'MTN', '20GB', 'Weekly', 7500, 'API_A', 262, 1, TRUE),
  (gen_random_uuid()::TEXT, '14.5GB Value Monthly', 'MTN', '14.5GB', 'Monthly', 5000, 'API_A', 233, 1, TRUE),
  (gen_random_uuid()::TEXT, '12.5GB Monthly', 'MTN', '12.5GB', 'Monthly', 5500, 'API_A', 23, 1, TRUE),
  (gen_random_uuid()::TEXT, '20GB Monthly', 'MTN', '20GB', 'Monthly', 7500, 'API_A', 25, 1, TRUE),
  (gen_random_uuid()::TEXT, '25GB Monthly', 'MTN', '25GB', 'Monthly', 9000, 'API_A', 26, 1, TRUE),
  (gen_random_uuid()::TEXT, '36GB Monthly', 'MTN', '36GB', 'Monthly', 11000, 'API_A', 27, 1, TRUE),
  (gen_random_uuid()::TEXT, '65GB Monthly', 'MTN', '65GB', 'Monthly', 16000, 'API_A', 393, 1, TRUE),
  (gen_random_uuid()::TEXT, '75GB Monthly', 'MTN', '75GB', 'Monthly', 18000, 'API_A', 28, 1, TRUE);

-- ====================================================================
-- 6. SEED DATA - DATA PLANS (MTN API B)
-- ====================================================================

INSERT INTO plans (id, name, network, "sizeLabel", validity, price, "apiSource", "externalPlanId", "externalNetworkId", "isActive")
VALUES
  (gen_random_uuid()::TEXT, 'MTN 5GB (14-30 Days)', 'MTN', '5GB', '14-30 Days', 1500, 'API_B', 85, 1, TRUE),
  (gen_random_uuid()::TEXT, 'MTN 5GB (21-30 Days)', 'MTN', '5GB', '21-30 Days', 1600, 'API_B', 86, 1, TRUE);

-- ====================================================================
-- 7. SEED DATA - ADMIN USER
-- ====================================================================
-- Note: PIN Hash for "000000" using bcrypt (generated separately)
-- This is a placeholder - the actual admin will need to be created via signup or updated via backend

INSERT INTO users (id, "fullName", phone, "pinHash", email, role, balance, "isBanned", "isActive")
VALUES
  (gen_random_uuid()::TEXT, 'SY DATA Admin', '08000000000', '$2b$12$puQ4dKDdzL7dDeakd7MDROIC7I.5EItLV0iz9p7kYga.aa4S.ezY', 'admin@sydatasub.local', 'ADMIN', 0, FALSE, TRUE);

-- ====================================================================
-- 8. VERIFICATION QUERIES (Run these to confirm seeding)
-- ====================================================================
-- Uncomment and run these individually to verify:

-- Check users:
-- SELECT COUNT(*) as total_users FROM users;
-- SELECT * FROM users WHERE role = 'ADMIN';

-- Check plans:
-- SELECT COUNT(*) as total_plans FROM plans;
-- SELECT network, COUNT(*) FROM plans GROUP BY network;

-- Check rewards:
-- SELECT COUNT(*) as total_rewards FROM rewards;
-- SELECT * FROM rewards;

-- ====================================================================
-- ✅ SETUP COMPLETE!
-- ====================================================================
-- Your database is now ready with:
-- • 20+ data plans (MTN)
-- • 3 reward types
-- • 1 admin user (phone: 08000000000, PIN: 000000)
-- ====================================================================
