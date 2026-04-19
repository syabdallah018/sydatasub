-- Add reward-only balance, agent approval workflow, and service notices

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AgentRequestStatus') THEN
    CREATE TYPE "AgentRequestStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NoticeSeverity') THEN
    CREATE TYPE "NoticeSeverity" AS ENUM ('INFO', 'WARNING', 'SUCCESS', 'ERROR', 'PROMO');
  END IF;
END $$;

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "rewardBalance" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "agentRequestStatus" "AgentRequestStatus" NOT NULL DEFAULT 'NONE';

CREATE TABLE IF NOT EXISTS "service_notices" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "severity" "NoticeSeverity" NOT NULL DEFAULT 'INFO',
  "audience" TEXT NOT NULL DEFAULT 'all',
  "network" "NetworkType",
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "service_notices_active_window_idx"
ON "service_notices"("isActive", "startsAt", "endsAt");

CREATE INDEX IF NOT EXISTS "service_notices_audience_idx"
ON "service_notices"("audience");
