import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { setUserSessionCookie, signToken } from "@/lib/auth";
import bcryptjs from "bcryptjs";
import { z } from "zod";
import { buildUserCreateCompatData, getUserSelectCompat, withCompatibleUserFields } from "@/lib/user-compat";
import { enforceRateLimit, rejectCrossSiteMutation } from "@/lib/security";
import { evaluateSignupRewardInTx } from "@/lib/rewards";
import { provisionSignupBillstackAccount } from "@/lib/billstack-account";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  phone: z.string().regex(/^0[0-9]{10}$/, "Phone number must be 11 digits starting with 0"),
  pin: z.string().regex(/^\d{6}$/, "PIN must be 6 digits"),
  confirmPin: z.string().regex(/^\d{6}$/, "PIN must be 6 digits"),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms and conditions",
  }),
}).refine((data) => data.pin === data.confirmPin, {
  message: "PINs don't match",
  path: ["confirmPin"],
});

export async function POST(req: NextRequest) {
  try {
    const originError = rejectCrossSiteMutation(req, { requireOrigin: true });
    if (originError) return originError;

    const rateLimitError = enforceRateLimit(req, "login", "signup");
    if (rateLimitError) return rateLimitError;

    const body = await req.json();
    const { name, email, phone, pin } = signupSchema.parse(body);
    const compat = await getUserSelectCompat();

    const existingUser = await prisma.user.findUnique({
      where: { phone },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Phone number already registered" },
        { status: 409 }
      );
    }

    const pinHash = await bcryptjs.hash(pin, 12);
    const user = await prisma.user.create({
      data: await buildUserCreateCompatData({
        fullName: name,
        phone,
        email,
        pinHash,
        role: "USER",
        tier: "user",
        balance: 0,
        isBanned: false,
      }),
    });

    await prisma.$transaction(async (tx) => {
      await evaluateSignupRewardInTx(tx, {
        userId: user.id,
        phone: user.phone,
      });
    });

    let fundingAccountProvisioned = false;
    try {
      const provisioning = await provisionSignupBillstackAccount({
        userId: user.id,
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
      });
      fundingAccountProvisioned = provisioning.success;
    } catch (billstackError: unknown) {
      const message = billstackError instanceof Error ? billstackError.message : "provision_failed";
      console.error("[BILLSTACK SIGNUP PROVISION WARNING]", {
        userId: user.id,
        message,
      });
    }

    const token = await signToken({
      userId: user.id,
      email: user.email || user.phone,
      role: user.role,
    });

    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        phone: true,
        fullName: true,
        role: true,
        balance: true,
        email: true,
        ...withCompatibleUserFields({}, {
          rewardBalance: compat.rewardBalance,
          agentRequestStatus: compat.agentRequestStatus,
        }),
      },
    });

    if (!updatedUser) {
      return NextResponse.json(
        { error: "Failed to retrieve user data" },
        { status: 500 }
      );
    }

    const response = NextResponse.json(
      {
        message: "Account created successfully",
        user: {
          id: updatedUser.id,
          phone: updatedUser.phone,
          fullName: updatedUser.fullName,
          email: updatedUser.email,
          role: updatedUser.role,
          balance: updatedUser.balance,
          rewardBalance: "rewardBalance" in updatedUser ? updatedUser.rewardBalance ?? 0 : 0,
        },
        fundingAccountProvisioned,
      },
      { status: 201 }
    );

    setUserSessionCookie(response, token);

    return response;
  } catch (error) {
    console.error("[SIGNUP ERROR]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
