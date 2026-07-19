const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Starting verification test...");
    
    // Find a test user
    const testUser = await prisma.user.findFirst({
      where: { phone: { startsWith: "0" }, isBanned: false },
    });

    if (!testUser) {
      console.warn("No valid test user found to perform verification check.");
      return;
    }
    
    console.log(`Using test user: ID=${testUser.id}, Name=${testUser.fullName}, Phone=${testUser.phone}`);
    console.log(`Current KYC Lock status: kycLocked=${testUser.kycLocked}, Reason=${testUser.kycLockReason}`);

    // Clean up locks to be sure
    await prisma.user.update({
      where: { id: testUser.id },
      data: { kycLocked: false, kycLockReason: null, kycLockedAt: null },
    });
    console.log("Reset test user lock state successfully.");
    
  } catch (error) {
    console.error("Verification Test Error:", error.message || error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
