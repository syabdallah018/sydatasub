import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signToken } from "@/lib/auth";
import bcryptjs from "bcryptjs";
import { z } from "zod";
import { createFlutterwaveVirtualAccount } from "@/lib/flutterwave";

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
    const body = await req.json();
    const { name, phone, pin, confirmPin, acceptTerms } = signupSchema.parse(body);

    // Check if phone already registered
    const existingUser = await prisma.user.findUnique({
      where: { phone },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Phone number already registered" },
        { status: 409 }
      );
    }

    // Hash PIN
    const pinHash = await bcryptjs.hash(pin, 12);

    // Split name into first and last
    const nameParts = name.trim().split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || firstName;

    // Create user
    const user = await prisma.user.create({
      data: {
        fullName: name,
        phone,
        pinHash,
        role: "USER",
        balance: 0,
        isBanned: false,
      },
    });

    // Create Flutterwave virtual account
    const virtualAccount = await createFlutterwaveVirtualAccount({
      userId: user.id,
      email: process.env.FLW_ACCOUNT_EMAIL!,
      firstName,
      lastName,
      phone,
    });

    // Save virtual account to DB
    await prisma.virtualAccount.create({
      data: {
        userId: user.id,
        accountNumber: virtualAccount.account_number,
        bankName: virtualAccount.bank_name,
        flwRef: virtualAccount.id.toString(),
        orderRef: `SYDATA-VA-${user.id}-${Date.now()}`,
      },
    });

    // Create UserReward records for all rewards
    const rewards = await prisma.reward.findMany();
    await Promise.all(
      rewards.map((reward) =>
        prisma.userReward.create({
          data: {
            userId: user.id,
            rewardId: reward.id,
            status: "IN_PROGRESS",
          },
        })
      )
    );

    // Credit signup bonus (₦100 = 10000 kobo)
    const SIGNUP_BONUS = 10000;
    await prisma.user.update({
      where: { id: user.id },
      data: { balance: { increment: SIGNUP_BONUS } },
    });

    // Create transaction record for signup bonus
    const signupBonusReward = await prisma.reward.findFirst({
      where: { type: "SIGNUP_BONUS" },
    });
    if (signupBonusReward) {
      await prisma.transaction.create({
        data: {
          userId: user.id,
          type: "REWARD_CREDIT",
          amount: SIGNUP_BONUS,
          status: "SUCCESS",
          reference: `SIGNUP-BONUS-${user.id}-${Date.now()}`,
          description: "Signup bonus credit",
          phone: user.phone,
        },
      });

      // Update UserReward status to CLAIMED
      await prisma.userReward.updateMany({
        where: {
          userId: user.id,
          rewardId: signupBonusReward.id,
        },
        data: { status: "CLAIMED" },
      });
    }

    // Sign JWT
    const token = await signToken({
      userId: user.id,
      email: user.email || user.phone,
      role: user.role,
    });

    const response = NextResponse.json(
      {
        message: "Account created successfully",
        user: {
          id: user.id,
          phone: user.phone,
          fullName: user.fullName,
          role: user.role,
          balance: user.balance,
        },
        virtualAccount: {
          accountNumber: virtualAccount.account_number,
          bankName: virtualAccount.bank_name,
        },
      },
      { status: 201 }
    );

    // Set httpOnly cookie
    response.cookies.set("sy_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

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
