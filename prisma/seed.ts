import { PrismaClient, ApiSource, NetworkType, RewardType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  try {
    // ========================================================================
    // SEED PLANS
    // ========================================================================
    console.log("\n📱 Seeding Data Plans...");

    // API A Plans (All MTN)
    const apiAPlans = [
      {
        name: "500MB Share",
        network: NetworkType.MTN,
        sizeLabel: "500MB",
        validity: "Weekly",
        price: 300,
        apiSource: ApiSource.API_A,
        externalPlanId: 423,
        externalNetworkId: 1,
      },
      {
        name: "1GB Share",
        network: NetworkType.MTN,
        sizeLabel: "1GB",
        validity: "Weekly",
        price: 450,
        apiSource: ApiSource.API_A,
        externalPlanId: 424,
        externalNetworkId: 1,
      },
      {
        name: "2GB Share",
        network: NetworkType.MTN,
        sizeLabel: "2GB",
        validity: "Weekly",
        price: 900,
        apiSource: ApiSource.API_A,
        externalPlanId: 425,
        externalNetworkId: 1,
      },
      {
        name: "3GB Share",
        network: NetworkType.MTN,
        sizeLabel: "3GB",
        validity: "Weekly",
        price: 1200,
        apiSource: ApiSource.API_A,
        externalPlanId: 426,
        externalNetworkId: 1,
      },
      {
        name: "5GB Share",
        network: NetworkType.MTN,
        sizeLabel: "5GB",
        validity: "Monthly",
        price: 1500,
        apiSource: ApiSource.API_A,
        externalPlanId: 176,
        externalNetworkId: 1,
      },
      {
        name: "1GB Daily (Awoof)",
        network: NetworkType.MTN,
        sizeLabel: "1GB",
        validity: "Daily",
        price: 220,
        apiSource: ApiSource.API_A,
        externalPlanId: 498,
        externalNetworkId: 1,
      },
      {
        name: "2.5GB Daily",
        network: NetworkType.MTN,
        sizeLabel: "2.5GB",
        validity: "Daily",
        price: 550,
        apiSource: ApiSource.API_A,
        externalPlanId: 453,
        externalNetworkId: 1,
      },
      {
        name: "7GB Monthly",
        network: NetworkType.MTN,
        sizeLabel: "7GB",
        validity: "Monthly",
        price: 3500,
        apiSource: ApiSource.API_A,
        externalPlanId: 21,
        externalNetworkId: 1,
      },
      {
        name: "11GB Digital Bundle",
        network: NetworkType.MTN,
        sizeLabel: "11GB",
        validity: "7 Days",
        price: 3500,
        apiSource: ApiSource.API_A,
        externalPlanId: 226,
        externalNetworkId: 1,
      },
      {
        name: "10GB + 10mins Monthly",
        network: NetworkType.MTN,
        sizeLabel: "10GB",
        validity: "Monthly",
        price: 4500,
        apiSource: ApiSource.API_A,
        externalPlanId: 22,
        externalNetworkId: 1,
      },
      {
        name: "20GB Weekly",
        network: NetworkType.MTN,
        sizeLabel: "20GB",
        validity: "Weekly",
        price: 7500,
        apiSource: ApiSource.API_A,
        externalPlanId: 262,
        externalNetworkId: 1,
      },
      {
        name: "14.5GB Value Monthly",
        network: NetworkType.MTN,
        sizeLabel: "14.5GB",
        validity: "Monthly",
        price: 5000,
        apiSource: ApiSource.API_A,
        externalPlanId: 233,
        externalNetworkId: 1,
      },
      {
        name: "12.5GB Monthly",
        network: NetworkType.MTN,
        sizeLabel: "12.5GB",
        validity: "Monthly",
        price: 5500,
        apiSource: ApiSource.API_A,
        externalPlanId: 23,
        externalNetworkId: 1,
      },
      {
        name: "20GB Monthly",
        network: NetworkType.MTN,
        sizeLabel: "20GB",
        validity: "Monthly",
        price: 7500,
        apiSource: ApiSource.API_A,
        externalPlanId: 25,
        externalNetworkId: 1,
      },
      {
        name: "25GB Monthly",
        network: NetworkType.MTN,
        sizeLabel: "25GB",
        validity: "Monthly",
        price: 9000,
        apiSource: ApiSource.API_A,
        externalPlanId: 26,
        externalNetworkId: 1,
      },
      {
        name: "36GB Monthly",
        network: NetworkType.MTN,
        sizeLabel: "36GB",
        validity: "Monthly",
        price: 11000,
        apiSource: ApiSource.API_A,
        externalPlanId: 27,
        externalNetworkId: 1,
      },
      {
        name: "65GB Monthly",
        network: NetworkType.MTN,
        sizeLabel: "65GB",
        validity: "Monthly",
        price: 16000,
        apiSource: ApiSource.API_A,
        externalPlanId: 393,
        externalNetworkId: 1,
      },
      {
        name: "75GB Monthly",
        network: NetworkType.MTN,
        sizeLabel: "75GB",
        validity: "Monthly",
        price: 18000,
        apiSource: ApiSource.API_A,
        externalPlanId: 28,
        externalNetworkId: 1,
      },
    ];

    // API B Plans
    const apiBPlans = [
      {
        name: "MTN 5GB (14-30 Days)",
        network: NetworkType.MTN,
        sizeLabel: "5GB",
        validity: "14-30 Days",
        price: 1500,
        apiSource: ApiSource.API_B,
        externalPlanId: 85,
        externalNetworkId: 1,
      },
      {
        name: "MTN 5GB (21-30 Days)",
        network: NetworkType.MTN,
        sizeLabel: "5GB",
        validity: "21-30 Days",
        price: 1600,
        apiSource: ApiSource.API_B,
        externalPlanId: 86,
        externalNetworkId: 1,
      },
    ];

    // Combine all plans
    const allPlans = [...apiAPlans, ...apiBPlans];

    // Delete existing plans to avoid duplicates
    await prisma.plan.deleteMany();

    // Create plans
    for (const plan of allPlans) {
      await prisma.plan.create({
        data: plan,
      });
    }

    console.log(`✅ Seeded ${allPlans.length} data plans`);

    // ========================================================================
    // SEED REWARDS
    // ========================================================================
    console.log("\n🎁 Seeding Rewards...");

    // Delete existing rewards to avoid duplicates
    await prisma.reward.deleteMany();

    // Create rewards
    const signupBonus = await prisma.reward.create({
      data: {
        type: RewardType.SIGNUP_BONUS,
        title: "Welcome Bonus",
        description: "₦100 credited on account creation",
        amount: 100,
        isActive: true,
      },
    });

    const firstDeposit = await prisma.reward.create({
      data: {
        type: RewardType.FIRST_DEPOSIT_2K,
        title: "First Big Deposit",
        description: "₦200 credited on first deposit ≥ ₦2,000",
        amount: 200,
        isActive: true,
      },
    });

    const highroller = await prisma.reward.create({
      data: {
        type: RewardType.DEPOSIT_10K_UPGRADE,
        title: "High Roller",
        description: "₦300 credited + auto-upgrade to AGENT on deposit ≥ ₦10,000",
        amount: 300,
        isActive: true,
      },
    });

    console.log(
      `✅ Seeded 3 rewards (Signup Bonus, First Deposit, High Roller)`
    );

    // ========================================================================
    // SEED ADMIN USER
    // ========================================================================
    console.log("\n👤 Seeding Admin User...");

    const adminExists = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });

    if (!adminExists) {
      const pinHash = await bcrypt.hash("000000", 12); // Default admin PIN
      const admin = await prisma.user.create({
        data: {
          fullName: "SY DATA Admin",
          phone: "08000000000",
          email: `admin-${Date.now()}@sydatasub.local`,
          pinHash,
          role: "ADMIN",
          balance: 0,
        },
      });
      console.log(`✅ Admin created successfully`);
      console.log(`   • Phone: ${admin.phone}`);
      console.log(`   • PIN: 000000`);
      console.log(`   • Email: ${admin.email}`);
    } else {
      console.log(`⚠️  Admin user already exists, skipping creation`);
    }

    // ========================================================================
    // SUMMARY
    // ========================================================================
    console.log("\n");
    console.log("═══════════════════════════════════════════════════════════");
    console.log("✨ Database seeded successfully!");
    console.log("═══════════════════════════════════════════════════════════");
    console.log(`📊 Stats:`);
    console.log(`   • Plans seeded: ${allPlans.length}`);
    console.log(`   • Rewards seeded: 3`);
    console.log(`   • API A Plans: ${apiAPlans.length}`);
    console.log(`   • API B Plans: ${apiBPlans.length}`);
    console.log("═══════════════════════════════════════════════════════════\n");
  } catch (error) {
    console.error("❌ Error during seed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
