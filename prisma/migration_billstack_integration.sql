BEGIN;

CREATE TABLE IF NOT EXISTS "payment_webhook_events" (
  "id" TEXT PRIMARY KEY,
  "provider" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "transactionReference" TEXT,
  "interbankReference" TEXT,
  "merchantReference" TEXT,
  "amount" INTEGER,
  "payload" JSONB,
  "status" TEXT NOT NULL DEFAULT 'RECEIVED',
  "transactionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3)
);

CREATE UNIQUE INDEX IF NOT EXISTS "payment_webhook_events_provider_transaction_ref_key"
  ON "payment_webhook_events"("provider", "transactionReference");

CREATE UNIQUE INDEX IF NOT EXISTS "payment_webhook_events_provider_interbank_ref_key"
  ON "payment_webhook_events"("provider", "interbankReference");

CREATE INDEX IF NOT EXISTS "payment_webhook_events_merchant_reference_idx"
  ON "payment_webhook_events"("merchantReference");

CREATE INDEX IF NOT EXISTS "payment_webhook_events_status_idx"
  ON "payment_webhook_events"("status");

CREATE TABLE IF NOT EXISTS "user_bank_accounts" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "bankCode" TEXT NOT NULL,
  "accountNumber" TEXT NOT NULL UNIQUE,
  "accountName" TEXT,
  "bankName" TEXT NOT NULL,
  "merchantReference" TEXT NOT NULL UNIQUE,
  "providerReference" TEXT,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_bank_accounts_user_bank_code_key"
  ON "user_bank_accounts"("userId", "bankCode");

CREATE INDEX IF NOT EXISTS "user_bank_accounts_user_primary_idx"
  ON "user_bank_accounts"("userId", "isPrimary");

CREATE INDEX IF NOT EXISTS "user_bank_accounts_merchant_reference_idx"
  ON "user_bank_accounts"("merchantReference");

INSERT INTO "user_bank_accounts" (
  "id",
  "userId",
  "bankCode",
  "accountNumber",
  "accountName",
  "bankName",
  "merchantReference",
  "providerReference",
  "isPrimary",
  "createdAt",
  "updatedAt"
)
SELECT
  CONCAT('LEGACY-UBA-', "id"),
  "userId",
  'LEGACY',
  "accountNumber",
  NULL,
  "bankName",
  "orderRef",
  "flwRef",
  true,
  "createdAt",
  "createdAt"
FROM "virtual_accounts"
ON CONFLICT ("accountNumber") DO NOTHING;

COMMIT;
