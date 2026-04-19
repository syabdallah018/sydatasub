import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { setUserSessionCookie, signToken } from "@/lib/auth";
import bcryptjs from "bcryptjs";
import { z } from "zod";
import { createFlutterwaveVirtualAccount } from "@/lib/flutterwave";
import { buildUserCreateCompatData, getUserSelectCompat, withCompatibleUserFields } from "@/lib/user-compat";
import { enforceRateLimit, rejectCrossSiteMutation } from "@/lib/security";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
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
    const originError = rejectCrossSiteMutation(req);
    if (originError) return originError;

    const rateLimitError = enforceRateLimit(req, "login", "signup");
    if (rateLimitError) return rateLimitError;

    const body = await req.json();
    const { name, phone, pin } = signupSchema.parse(body);
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
    const nameParts = name.trim().split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || firstName;

    const user = await prisma.user.create({
      data: await buildUserCreateCompatData({
        fullName: name,
        phone,
        pinHash,
        role: "USER",
        tier: "user",
        balance: 0,
        isBanned: false,
      }),
    });

    let virtualAccount = null;
    try {
      virtualAccount = await createFlutterwaveVirtualAccount({
        userId: user.id,
        email: process.env.FLW_ACCOUNT_EMAIL || "noreply@sydatasub.local",
        firstName,
        lastName,
        phone,
      });
    } catch (flwError) {
      console.warn("[FLUTTERWAVE WARNING] Virtual account creation failed, continuing without it", flwError);
      virtualAccount = {
        id: Math.floor(Math.random() * 999999),
        account_number: `PLACEHOLDER-${user.id.slice(0, 8)}`,
        bank_name: "SY DATA WALLET",
        bank_code: "000001",
        tx_ref: `SYDATA-VA-${user.id}-${Date.now()}`,
      };
    }

    if (virtualAccount) {
      await prisma.virtualAccount.create({
        data: {
          userId: user.id,
          accountNumber: virtualAccount.account_number || `PLACEHOLDER-${user.id.slice(0, 8)}`,
          bankName: virtualAccount.bank_name || "SY DATA WALLET",
          flwRef: String(virtualAccount.id || Math.floor(Math.random() * 999999)),
          orderRef: virtualAccount.order_ref || virtualAccount.tx_ref || `SYDATA-VA-${user.id}-${Date.now()}`,
        },
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
        ...withCompatibleUserFields({}, {
          rewardBalance: false,
          agentRequestStatus: compat.agentRequestStatus,
        }),
        virtualAccount: {
          select: { accountNumber: true, bankName: true },
        },
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
          role: updatedUser.role,
          balance: updatedUser.balance,
        },
        virtualAccount: {
          accountNumber: virtualAccount.account_number,
          bankName: virtualAccount.bank_name,
        },
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
