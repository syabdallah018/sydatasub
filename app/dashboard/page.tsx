import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE_NAME, verifyToken } from "@/lib/auth";
import { getUserSelectCompat, normalizeUserCompat, withCompatibleUserFields } from "@/lib/user-compat";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    redirect("/app/auth");
  }

  const session = await verifyToken(token);
  if (!session?.userId) {
    redirect("/app/auth");
  }

  const compat = await getUserSelectCompat();
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      fullName: true,
      phone: true,
      email: true,
      role: true,
      tier: true,
      balance: true,
      isBanned: true,
      isActive: true,
      joinedAt: true,
      ...withCompatibleUserFields({}, compat),
    },
  });

  if (!user || user.isBanned || !user.isActive) {
    redirect("/app/auth");
  }

  const normalizedUser = normalizeUserCompat({
    ...user,
    joinedAt: user.joinedAt?.toISOString(),
    tier: user.tier,
  });

  // Fetch developer profile if any
  const devProfile = await prisma.developerProfile.findUnique({
    where: { userId: session.userId },
    select: {
      id: true,
      apiKey: true,
      webhookUrl: true,
      whitelistIps: true,
      status: true,
      createdAt: true,
    },
  });

  // Fetch active plans to pass to documentation / developer section
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      network: true,
      sizeLabel: true,
      validity: true,
      user_price: true,
      agent_price: true,
      price: true,
    },
    orderBy: [
      { network: "asc" },
      { user_price: "asc" },
    ],
  });

  const parsedPlans = plans.map(p => ({
    id: p.id,
    name: p.name,
    network: p.network,
    size: p.sizeLabel,
    validity: p.validity,
    user_price: p.user_price || p.price,
    agent_price: p.agent_price || p.price,
  }));

  return (
    <DashboardClient
      initialUser={normalizedUser as any}
      initialDevProfile={devProfile}
      initialPlans={parsedPlans}
    />
  );
}
