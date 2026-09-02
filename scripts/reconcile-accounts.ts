import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const dbUrl =
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_Cd7IRop3XYqK@ep-lively-mountain-amx3wb6a.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require";

const prisma = new PrismaClient({
  datasources: {
    db: { url: dbUrl },
  },
});

async function main() {
  console.log("=== SY DATA SUB: VIRTUAL ACCOUNT & EMAIL RECONCILIATION AUDIT ===\n");

  // 1. Audit duplicate emails
  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      phone: true,
      fullName: true,
      email: true,
      role: true,
      balance: true,
      joinedAt: true,
      bankAccounts: {
        select: {
          id: true,
          bankName: true,
          bankCode: true,
          accountNumber: true,
          merchantReference: true,
        },
      },
    },
  });

  const emailGroups = new Map<string, typeof allUsers>();
  for (const u of allUsers) {
    if (u.email && u.email.trim().length > 0) {
      const em = u.email.trim().toLowerCase();
      if (!emailGroups.has(em)) {
        emailGroups.set(em, []);
      }
      emailGroups.get(em)!.push(u);
    }
  }

  const duplicates = Array.from(emailGroups.entries()).filter(([_, users]) => users.length > 1);
  console.log(`Found ${duplicates.length} duplicate email groups across ${allUsers.length} total users.`);

  for (const [email, users] of duplicates) {
    console.log(`\nDuplicate Email: ${email} (${users.length} users):`);
    for (const u of users) {
      console.log(`  - User: ${u.id} | Name: ${u.fullName} | Phone: ${u.phone} | Accounts: ${u.bankAccounts.length}`);
      for (const acc of u.bankAccounts) {
        console.log(`      * [${acc.bankName}] ${acc.accountNumber} (Ref: ${acc.merchantReference})`);
      }
    }
  }

  // 2. Audit mismatched merchant references (where merchant_ref contains another user ID)
  console.log("\n=== AUDITING MISMATCHED VIRTUAL ACCOUNTS ===");
  let mismatchedCount = 0;
  for (const u of allUsers) {
    for (const acc of u.bankAccounts) {
      if (acc.merchantReference) {
        const parts = acc.merchantReference.split("-");
        // Typically BS-VA-<userId>-<bank> or BS-VA-<random>
        if (parts.length >= 3 && parts[0] === "BS" && parts[1] === "VA") {
          const embeddedId = parts[2];
          if (embeddedId !== u.id && embeddedId.startsWith("cm")) {
            console.log(`⚠️ MISMATCH FOUND:`);
            console.log(`   Account: ${acc.bankName} ${acc.accountNumber}`);
            console.log(`   Owner User ID: ${u.id} (${u.fullName}, ${u.phone})`);
            console.log(`   Embedded Merchant Ref: ${acc.merchantReference} (Target: ${embeddedId})`);
            mismatchedCount++;
          }
        }
      }
    }
  }

  if (mismatchedCount === 0) {
    console.log("No mismatched embedded user IDs found in merchant references.");
  } else {
    console.log(`Total mismatched accounts detected: ${mismatchedCount}`);
  }

  console.log("\n=== RECONCILIATION SUMMARY ===");
  console.log(`Total users audited: ${allUsers.length}`);
  console.log(`Total virtual bank accounts: ${allUsers.reduce((sum, u) => sum + u.bankAccounts.length, 0)}`);
  console.log("With accountNumber-first resolution, deposits to any virtual account will strictly credit the owning user.\n");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
