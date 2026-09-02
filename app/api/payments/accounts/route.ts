import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { enforceRateLimit, rejectCrossSiteMutation } from "@/lib/security";
import { BillstackBank, createBillstackBankAccount, listUserBankAccounts } from "@/lib/billstack-account";

const createSchema = z.object({
  bank: z.enum(["9PSB", "SAFEHAVEN", "PROVIDUS", "BANKLY", "PALMPAY"]),
  email: z.string().email().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const accounts = await listUserBankAccounts(sessionUser.userId);
    return NextResponse.json({
      success: true,
      data: accounts,
      accounts: accounts,
    });
  } catch (error) {
    console.error("[PAYMENT ACCOUNTS GET ERROR]", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const originError = rejectCrossSiteMutation(req, { requireOrigin: true });
    if (originError) return originError;

    const rateLimitError = enforceRateLimit(req, "webhook", "billstack-accounts-create");
    if (rateLimitError) return rateLimitError;

    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.userId },
      select: { id: true, fullName: true, phone: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = createSchema.parse(body);

    const userEmail = (parsed.email || user.email || "").trim() || `${user.phone}@sydatasub.local`;

    const created = await createBillstackBankAccount({
      userId: user.id,
      fullName: user.fullName,
      phone: user.phone,
      email: userEmail,
      bank: parsed.bank as BillstackBank,
      makePrimary: false,
    });

    const accounts = await listUserBankAccounts(user.id);
    return NextResponse.json({
      success: true,
      message: created.created ? "Account created successfully" : "Account already exists",
      data: accounts,
      accounts: accounts,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0]?.message || "Invalid payload" }, { status: 400 });
    }
    console.error("[PAYMENT ACCOUNTS POST ERROR]", error);
    return NextResponse.json({ success: false, error: "Could not create account right now" }, { status: 500 });
  }
}

