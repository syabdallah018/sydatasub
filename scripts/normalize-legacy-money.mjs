import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
const cutoff = process.env.LEGACY_MONEY_CUTOFF || "2026-04-25T00:00:00Z";
const apply = process.argv.includes("--apply");

if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const sql = neon(databaseUrl);

async function main() {
  const report = {
    cutoff,
    mode: apply ? "apply" : "dry-run",
    before: {},
    after: {},
  };

  await sql(
    `ALTER TABLE "User"
     ADD COLUMN IF NOT EXISTS reward_balance NUMERIC(15, 2) NOT NULL DEFAULT 0`
  );

  await sql(
    `ALTER TABLE "DataTransaction"
     ADD COLUMN IF NOT EXISTS "rewardApplied" NUMERIC(15, 2) NOT NULL DEFAULT 0`
  );

  report.before.legacyTransactions = await sql(
    `SELECT type, COUNT(*)::int AS count, COALESCE(SUM(amount), 0)::bigint AS total
     FROM "Transaction"
     WHERE created_at < $1
       AND status = 'success'
       AND type IN ('deposit', 'reward_credit')
     GROUP BY type
     ORDER BY type`,
    [cutoff]
  );

  report.before.legacyAirtime = await sql(
    `SELECT COUNT(*)::int AS count,
            COALESCE(SUM(amount), 0)::numeric(15,2) AS total_amount
     FROM airtime_transactions
     WHERE created_at < $1`,
    [cutoff]
  );

  report.before.userBalances = await sql(
    `SELECT COUNT(*)::int AS count,
            COALESCE(SUM(balance), 0)::numeric(18,2) AS total_balance
     FROM "User"`,
    []
  );

  if (apply) {
    await sql("BEGIN");
    try {
      await sql(
        `WITH candidates AS (
           SELECT
             id,
             created_at,
             status,
             type,
             ROW_NUMBER() OVER (
               PARTITION BY
                 user_id,
                 reference,
                 CASE
                   WHEN created_at < $1
                    AND status = 'success'
                    AND type IN ('deposit', 'reward_credit')
                   THEN ROUND(amount::numeric / 100.0)::integer
                   ELSE amount
                 END
               ORDER BY created_at ASC, id ASC
             ) AS row_num
           FROM "Transaction"
         )
         DELETE FROM "Transaction" t
         USING candidates c
         WHERE t.id = c.id
           AND c.created_at < $1
           AND c.status = 'success'
           AND c.type IN ('deposit', 'reward_credit')
           AND c.row_num > 1`,
        [cutoff]
      );

      await sql(
        `UPDATE "Transaction"
         SET amount = ROUND(amount::numeric / 100.0)::integer
         WHERE created_at < $1
           AND status = 'success'
           AND type IN ('deposit', 'reward_credit')`,
        [cutoff]
      );

      await sql(
        `UPDATE airtime_transactions
         SET amount = ROUND(amount / 100.0, 2),
             balance_before = CASE WHEN balance_before IS NULL THEN NULL ELSE ROUND(balance_before / 100.0, 2) END,
             balance_after = CASE WHEN balance_after IS NULL THEN NULL ELSE ROUND(balance_after / 100.0, 2) END
         WHERE created_at < $1`,
        [cutoff]
      );

      await sql(
        `WITH latest_snapshot AS (
           SELECT DISTINCT ON (user_id)
             user_id,
             snapshot_at,
             snapshot_balance
           FROM (
             SELECT
               "userId" AS user_id,
               "createdAt" AS snapshot_at,
               CASE
                 WHEN "createdAt" < $1
                 THEN ROUND(COALESCE("balanceAfter", "balanceBefore", 0)::numeric / 100.0, 2)
                 ELSE COALESCE("balanceAfter", "balanceBefore", 0)::numeric(15,2)
               END AS snapshot_balance
             FROM "DataTransaction"
             WHERE COALESCE("balanceAfter", "balanceBefore") IS NOT NULL
           ) snapshots
           ORDER BY user_id, snapshot_at DESC
         ),
         tx_components AS (
           SELECT
             u.id AS user_id,
             COALESCE(
               SUM(
                 CASE
                   WHEN t.type IN ('deposit', 'reward_credit')
                    AND t.status = 'success'
                    AND (ls.snapshot_at IS NULL OR t.created_at > ls.snapshot_at)
                   THEN t.amount
                   ELSE 0
                 END
               ),
               0
             )::numeric(15,2) AS credits,
             COALESCE(
               SUM(
                 CASE
                   WHEN t.type = 'reward_spend'
                    AND t.status = 'success'
                    AND (ls.snapshot_at IS NULL OR t.created_at > ls.snapshot_at)
                   THEN t.amount
                   ELSE 0
                 END
               ),
               0
             )::numeric(15,2) AS reward_spent
           FROM "User" u
           LEFT JOIN latest_snapshot ls ON ls.user_id = u.id
           LEFT JOIN "Transaction" t ON t.user_id = u.id
           GROUP BY u.id, ls.snapshot_at
         ),
         service_components AS (
           SELECT
             u.id AS user_id,
             COALESCE(
               SUM(
                 CASE
                   WHEN service.created_at IS NOT NULL
                    AND (ls.snapshot_at IS NULL OR service.created_at > ls.snapshot_at)
                   THEN service.amount
                   ELSE 0
                 END
               ),
               0
             )::numeric(15,2) AS service_debits
           FROM "User" u
           LEFT JOIN latest_snapshot ls ON ls.user_id = u.id
           LEFT JOIN (
             SELECT
               "userId" AS user_id,
               "createdAt" AS created_at,
               GREATEST(amount - COALESCE("rewardApplied", 0), 0)::numeric(15,2) AS amount
             FROM "DataTransaction"
             WHERE status = 'SUCCESS'

             UNION ALL

             SELECT
               user_id,
               created_at,
               amount::numeric(15,2) AS amount
             FROM airtime_transactions
             WHERE status = 'SUCCESS'

             UNION ALL

             SELECT
               user_id,
               created_at,
               amount::numeric(15,2) AS amount
             FROM cable_transactions
             WHERE status = 'SUCCESS'

             UNION ALL

             SELECT
               user_id,
               created_at,
               amount::numeric(15,2) AS amount
             FROM power_transactions
             WHERE status = 'SUCCESS'
           ) service ON service.user_id = u.id
           GROUP BY u.id, ls.snapshot_at
         )
         UPDATE "User" u
         SET balance = GREATEST(
           COALESCE(ls.snapshot_balance, 0)
           + COALESCE(tx.credits, 0)
           - COALESCE(tx.reward_spent, 0)
           - COALESCE(svc.service_debits, 0),
           0
         )
         FROM latest_snapshot ls
         RIGHT JOIN tx_components tx ON tx.user_id = ls.user_id
         LEFT JOIN service_components svc ON svc.user_id = tx.user_id
         WHERE u.id = tx.user_id`,
        []
      );

      await sql("COMMIT");
    } catch (error) {
      await sql("ROLLBACK");
      throw error;
    }
  }

  report.after.legacyTransactions = await sql(
    `SELECT type, COUNT(*)::int AS count, COALESCE(SUM(amount), 0)::bigint AS total
     FROM "Transaction"
     WHERE created_at < $1
       AND status = 'success'
       AND type IN ('deposit', 'reward_credit')
     GROUP BY type
     ORDER BY type`,
    [cutoff]
  );

  report.after.legacyAirtime = await sql(
    `SELECT COUNT(*)::int AS count,
            COALESCE(SUM(amount), 0)::numeric(15,2) AS total_amount
     FROM airtime_transactions
     WHERE created_at < $1`,
    [cutoff]
  );

  report.after.userBalances = await sql(
    `SELECT COUNT(*)::int AS count,
            COALESCE(SUM(balance), 0)::numeric(18,2) AS total_balance
     FROM "User"`,
    []
  );

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
