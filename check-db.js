const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function main() {
  try {
    console.log("Attempting to query all plans...");
    const plans = await prisma.plan.findMany();
    console.log(`Success! Found ${plans.length} plans.`);
    
    // Check for null values on fields marked non-nullable in schema
    let nullCount = 0;
    plans.forEach((p, idx) => {
      const issues = [];
      if (p.user_price === null || p.user_price === undefined) issues.push("user_price");
      if (p.agent_price === null || p.agent_price === undefined) issues.push("agent_price");
      
      if (issues.length > 0) {
        nullCount++;
        console.warn(`Plan index ${idx} (ID: ${p.id}, Name: ${p.name}) has null/undefined for:`, issues);
      }
    });

    console.log(`Inspection complete. Total plans with schema issues: ${nullCount}`);
  } catch (error) {
    console.error("DB Query Error:", error.message || error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
