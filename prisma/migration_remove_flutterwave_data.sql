BEGIN;

-- Remove stored virtual account records created for Flutterwave funding.
DELETE FROM "virtual_accounts";

-- Remove Flutterwave/account metadata previously stored on transactions.
UPDATE "transactions"
SET
  "flwRef" = NULL,
  "tempAccountNumber" = NULL,
  "tempBankName" = NULL,
  "tempTxRef" = NULL
WHERE
  "flwRef" IS NOT NULL
  OR "tempAccountNumber" IS NOT NULL
  OR "tempBankName" IS NOT NULL
  OR "tempTxRef" IS NOT NULL;

COMMIT;
