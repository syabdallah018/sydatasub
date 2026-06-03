import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE_NAME, verifyToken } from "@/lib/auth";
import { getUserSelectCompat, normalizeUserCompat, withCompatibleUserFields } from "@/lib/user-compat";
import DashboardClient, { type UserData } from "./dashboard-client";

export default async function AppPage() {
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

  const initialUser = normalizeUserCompat({
    ...user,
    joinedAt: user.joinedAt?.toISOString(),
    tier: user.tier as UserData["tier"],
  }) as unknown as UserData;

  return <DashboardClient initialUser={initialUser} />;
}
