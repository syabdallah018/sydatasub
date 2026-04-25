const fs = require("fs");
const path = require("path");
const { neon } = require("@neondatabase/serverless");

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith("#")) continue;
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^"/, "").replace(/"$/, "");
  }
}

loadEnv(path.join(__dirname, "..", ".env"));
loadEnv(path.join(__dirname, "..", ".env.local"));

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set.");
}

const sql = neon(process.env.DATABASE_URL);

const plans = [
  { networkId: 1, networkName: "MTN", sizeLabel: "500MB", validity: "daily", price: 250, userPrice: 250, agentPrice: 240, activeApi: "A" },
  { networkId: 1, networkName: "MTN", sizeLabel: "2GB", validity: "weekly", price: 950, userPrice: 950, agentPrice: 920, activeApi: "B" },
  { networkId: 1, networkName: "MTN", sizeLabel: "10GB", validity: "monthly", price: 3900, userPrice: 3900, agentPrice: 3840, activeApi: "C" },

  { networkId: 2, networkName: "Glo", sizeLabel: "500MB", validity: "daily", price: 220, userPrice: 220, agentPrice: 210, activeApi: "B" },
  { networkId: 2, networkName: "Glo", sizeLabel: "2.5GB", validity: "weekly", price: 900, userPrice: 900, agentPrice: 870, activeApi: "C" },
  { networkId: 2, networkName: "Glo", sizeLabel: "12GB", validity: "monthly", price: 3650, userPrice: 3650, agentPrice: 3590, activeApi: "A" },

  { networkId: 3, networkName: "9mobile", sizeLabel: "500MB", validity: "daily", price: 230, userPrice: 230, agentPrice: 220, activeApi: "C" },
  { networkId: 3, networkName: "9mobile", sizeLabel: "2GB", validity: "weekly", price: 920, userPrice: 920, agentPrice: 890, activeApi: "A" },
  { networkId: 3, networkName: "9mobile", sizeLabel: "11GB", validity: "monthly", price: 3700, userPrice: 3700, agentPrice: 3640, activeApi: "B" },

  { networkId: 4, networkName: "Airtel", sizeLabel: "750MB", validity: "daily", price: 260, userPrice: 260, agentPrice: 250, activeApi: "A" },
  { networkId: 4, networkName: "Airtel", sizeLabel: "3GB", validity: "weekly", price: 980, userPrice: 980, agentPrice: 950, activeApi: "C" },
  { networkId: 4, networkName: "Airtel", sizeLabel: "15GB", validity: "monthly", price: 4200, userPrice: 4200, agentPrice: 4140, activeApi: "B" },
];

function providerIds(networkId, index) {
  const base = networkId * 1000 + index * 10;
  return {
    apiAId: base + 1,
    apiBId: base + 2,
    apiCId: base + 3,
  };
}

async function run() {
  console.log(`[seed-demo-plans] Seeding ${plans.length} plans...`);

  for (const [index, plan] of plans.entries()) {
    const ids = providerIds(plan.networkId, index + 1);
    const name = `${plan.networkName} ${plan.sizeLabel} ${plan.validity}`;

    await sql(
      `INSERT INTO "DataPlan"
        (id, name, "networkId", "networkName", "sizeLabel", validity, price, "userPrice", "agentPrice", "apiAId", "apiBId", "apiCId", "activeApi", "isActive", "createdAt", "updatedAt")
       VALUES
        (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [
        name,
        plan.networkId,
        plan.networkName,
        plan.sizeLabel,
        plan.validity,
        plan.price,
        plan.userPrice,
        plan.agentPrice,
        ids.apiAId,
        ids.apiBId,
        ids.apiCId,
        plan.activeApi,
      ]
    );
  }

  const count = await sql(`SELECT COUNT(*)::int AS count FROM "DataPlan"`);
  console.log(`[seed-demo-plans] DataPlan count: ${count[0].count}`);
}

run().catch((error) => {
  console.error("[seed-demo-plans] Failed:", error);
  process.exit(1);
});
