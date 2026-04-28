import { prisma } from "@/lib/db";

const TABLE_SQL = `
CREATE TABLE IF NOT EXISTS "airtime_cash_config" (
  "id" TEXT PRIMARY KEY,
  "feePercent" INTEGER NOT NULL DEFAULT 10,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
)
`;

const DEFAULT_ID = "default";
const DEFAULT_FEE_PERCENT = 10;

export async function ensureAirtimeCashConfigTable() {
  await prisma.$executeRawUnsafe(TABLE_SQL);
}

export async function getAirtimeCashFeePercent() {
  await ensureAirtimeCashConfigTable();
  const rows = await prisma.$queryRawUnsafe<Array<{ feePercent: number }>>(
    `SELECT "feePercent" FROM "airtime_cash_config" WHERE "id" = $1 LIMIT 1`,
    DEFAULT_ID
  );

  if (!rows[0]) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "airtime_cash_config" ("id", "feePercent") VALUES ($1, $2) ON CONFLICT ("id") DO NOTHING`,
      DEFAULT_ID,
      DEFAULT_FEE_PERCENT
    );
    return DEFAULT_FEE_PERCENT;
  }

  const fee = Number(rows[0].feePercent);
  if (!Number.isFinite(fee) || fee < 0) return DEFAULT_FEE_PERCENT;
  return Math.min(100, Math.max(0, Math.round(fee)));
}

export async function setAirtimeCashFeePercent(feePercent: number) {
  const normalized = Math.min(100, Math.max(0, Math.round(feePercent)));
  await ensureAirtimeCashConfigTable();

  await prisma.$executeRawUnsafe(
    `
    INSERT INTO "airtime_cash_config" ("id", "feePercent")
    VALUES ($1, $2)
    ON CONFLICT ("id")
    DO UPDATE SET "feePercent" = EXCLUDED."feePercent", "updatedAt" = NOW()
  `,
    DEFAULT_ID,
    normalized
  );

  return normalized;
}
