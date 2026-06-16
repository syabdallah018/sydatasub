import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcryptjs from "bcryptjs";
import { z } from "zod";
import { setUserSessionCookie, signToken } from "@/lib/auth";
import { getUserSelectCompat, normalizeUserCompat, withCompatibleUserFields } from "@/lib/user-compat";
import { enforceRateLimit, rejectCrossSiteMutation } from "@/lib/security";

const loginSchema = z.object({
  phone: z.string().regex(/^0[0-9]{10}$/, "Invalid phone number"),
  token: z.string().min(10, "Invalid biometric token"),
});

export async function POST(req: NextRequest) {
  try {
    const originError = rejectCrossSiteMutation(req, { requireOrigin: true });
    if (originError) return originError;

    const rateLimitError = enforceRateLimit(req, "login");
    if (rateLimitError) return rateLimitError;

    const body = await req.json();
    const { phone, token } = loginSchema.parse(body);
    const compat = await getUserSelectCompat();

    const user = await prisma.user.findUnique({
      where: { phone },
      select: {
        id: true,
        phone: true,
        fullName: true,
        role: true,
        tier: true,
        balance: true,
        email: true,
        biometricTokenHash: true,
        isBanned: true,
        ...withCompatibleUserFields({}, compat),
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Biometric login failed. User not found." }, { status: 401 });
    }

    if (user.isBanned) {
      return NextResponse.json({ error: "Account is banned" }, { status: 403 });
    }

    if (!user.biometricTokenHash) {
      return NextResponse.json({ error: "Biometrics not registered on this account" }, { status: 400 });
    }

    const isTokenValid = await bcryptjs.compare(token, user.biometricTokenHash);
    if (!isTokenValid) {
      return NextResponse.json({ error: "Biometric verification failed" }, { status: 401 });
    }

    const normalizedUser = normalizeUserCompat(user);

    const sessionToken = await signToken({
      userId: normalizedUser.id,
      email: normalizedUser.email || normalizedUser.phone,
      role: normalizedUser.role,
    });

    const response = NextResponse.json(
      {
        message: "Biometric login successful",
        user: {
          id: user.id,
          phone: normalizedUser.phone,
          fullName: normalizedUser.fullName,
          email: normalizedUser.email,
          role: normalizedUser.role,
          tier: normalizedUser.tier || "user",
          balance: normalizedUser.balance,
          rewardBalance: normalizedUser.rewardBalance,
          agentRequestStatus: normalizedUser.agentRequestStatus,
        },
      },
      { status: 200 }
    );

    setUserSessionCookie(response, sessionToken);
    return response;
  } catch (error) {
    console.error("[BIOMETRIC LOGIN ERROR]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
