import { prisma } from "@/lib/db";
import { Prisma, PrismaClient } from "@prisma/client";

type DbClient = PrismaClient | Prisma.TransactionClient;

export const DEFAULT_NIGERIA_CELEBRATION = {
  title: "Happy 66th Independence Nigeria! 🇳🇬",
  subtitle: "Celebrating our Great Nation • Tap to celebrate",
  badge: "🇳🇬 66TH INDEPENDENCE ANNIVERSARY",
  tag: "OFFICIAL ANNIVERSARY",
  icon: "🇳🇬",
  theme: "NIGERIA_GREEN",
  accentColor: "#10B981",
  message:
    "Happy 66th Independence Day, Nigeria! 🇳🇬 SY Data Sub proudly celebrates the resilience, unity, and greatness of our nation. Thank you for connecting with us as we empower digital lifestyles and businesses across Nigeria with fast, reliable, and affordable telecom services.",
  stat1Top: "🇳🇬 66 Years",
  stat1Bottom: "Resilient & Strong",
  stat2Top: "⚡ 99.9%",
  stat2Bottom: "Nationwide Uptime",
  stat3Top: "💎 Wholesale",
  stat3Bottom: "Cheapest Rates",
  actionText: "Share Independence Spirit 🇳🇬",
  shareText:
    "🎉 Celebrating Nigeria's 66th Independence Day! 🇳🇬\n\nEmpower your hustle with Nigeria's fastest & cheapest data bundles, airtime, and bill payments on SY Data Sub.\n\nDownload the app & celebrate with us: https://sydatasub.com",
  dismissText: "Keep Celebrating 🚀",
  isActive: true,
  priority: 100,
};

export async function ensureDefaultCelebration(db: DbClient = prisma) {
  try {
    const count = await db.celebration.count();
    if (count === 0) {
      return await db.celebration.create({
        data: DEFAULT_NIGERIA_CELEBRATION,
      });
    }
  } catch (error) {
    console.error("[ENSURE DEFAULT CELEBRATION ERROR]", error);
  }
}

export async function getActiveCelebration(db: DbClient = prisma) {
  await ensureDefaultCelebration(db);

  const now = new Date();
  return db.celebration.findFirst({
    where: {
      isActive: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });
}
