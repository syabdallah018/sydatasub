import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
const cutoff = process.env.LEGACY_MONEY_CUTOFF || "2026-04-25T00:00:00Z";

if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const sql = neon(databaseUrl);

async function callSql(queryText, params = [], retries = 5) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await sql(queryText, params);
    } catch (error) {
      lastError = error;
      if (attempt === retries) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
  }
  throw lastError;
}

async function main() {
  const before = await callSql(
    `SELECT id, name, balance
     FROM "User"
     ORDER BY name ASC`
  );

  await callSql(
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
    [cutoff]
  );

  const after = await callSql(
    `SELECT id, name, balance
     FROM "User"
     ORDER BY name ASC`
  );

  console.log(
    JSON.stringify(
      {
        cutoff,
        before,
        after,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
