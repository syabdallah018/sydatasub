import { NextRequest, NextResponse } from "next/server";
import { signToken } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { queryOne, execute } from "@/lib/db";
import { randomUUID } from "crypto";
import { checkRateLimit, resetRateLimit } from "@/lib/rateLimiter";
import {
  createFlutterwaveVirtualAccount,
  generateFlutterwaveTxRef,
  splitName,
} from "@/lib/flutterwave";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const utf8Headers = { "Content-Type": "application/json; charset=utf-8" };

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, pin, confirmPin, acceptTerms } = body;
    const requestId = randomUUID();

    console.log("[SIGNUP][REQUEST]", {
      requestId,
      name,
      email,
      phone,
      acceptTerms: Boolean(acceptTerms),
      hasPin: Boolean(pin),
      hasConfirmPin: Boolean(confirmPin),
    });

    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: "Name must be at least 2 characters" },
        { status: 400, headers: utf8Headers }
      );
    }

    if (!phone || !/^0[0-9]{10}$/.test(phone)) {
      return NextResponse.json(
        { error: "Phone number must be 11 digits starting with 0" },
        { status: 400, headers: utf8Headers }
      );
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Enter a valid email address" },
        { status: 400, headers: utf8Headers }
      );
    }

    if (!pin || !/^\d{6}$/.test(pin)) {
      return NextResponse.json(
        { error: "PIN must be exactly 6 digits" },
        { status: 400, headers: utf8Headers }
      );
    }

    if (!confirmPin || pin !== confirmPin) {
      return NextResponse.json(
        { error: "PINs don't match" },
        { status: 400, headers: utf8Headers }
      );
    }

    if (!acceptTerms) {
      return NextResponse.json(
        { error: "You must accept the terms and conditions" },
        { status: 400, headers: utf8Headers }
      );
    }

    const rateLimitCheck = checkRateLimit(phone, "signup", {
      maxAttempts: 3,
      windowMs: 60 * 60 * 1000,
    });

    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          error: "Too many signup attempts. Please try again later.",
          retryAfter: rateLimitCheck.resetTime,
        },
        { status: 429, headers: utf8Headers }
      );
    }

    const existingPhone = await queryOne<{ id: string }>(
      `SELECT id FROM "User" WHERE phone = $1`,
      [phone]
    );

    if (existingPhone) {
      return NextResponse.json(
        { error: "Phone number already registered" },
        { status: 409, headers: utf8Headers }
      );
    }

    const existingEmail = await queryOne<{ id: string }>(
      `SELECT id FROM "User" WHERE email = $1`,
      [email]
    );

    if (existingEmail) {
      return NextResponse.json(
        { error: "Email address already registered" },
        { status: 409, headers: utf8Headers }
      );
    }

    resetRateLimit(phone, "signup");

    const bvn = process.env.MY_BVN || process.env.my_bvn || process.env.FLW_BVN;
    if (!bvn) {
      console.error("[SIGNUP][CONFIG_ERROR]", {
        requestId,
        hasMyBvn: Boolean(process.env.MY_BVN),
        hasLowercaseBvn: Boolean(process.env.my_bvn),
        hasFlwBvn: Boolean(process.env.FLW_BVN),
      });
      return NextResponse.json(
        { error: "MY_BVN is not configured" },
        { status: 500, headers: utf8Headers }
      );
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash(pin, salt);

    const userId = randomUUID();
    const now = new Date().toISOString();

    console.log("[SIGNUP][USER_INSERT_START]", {
      requestId,
      userId,
      email,
      phone,
    });

    const result = await queryOne<{ id: string }>(
      `INSERT INTO "User" (id, name, email, phone, "pin", balance, role, "isActive", bvn, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [userId, name, email, phone, hashedPin, 0, "USER", true, bvn, now, now]
    );

    if (!result) {
      throw new Error("Failed to create user");
    }

    console.log("[SIGNUP][USER_INSERTED]", {
      requestId,
      userId,
    });

    try {
      const { firstName, lastName } = splitName(name);
      const txRef = generateFlutterwaveTxRef(userId);
      const accountLabel = `${name.trim()} SY Data`;
      console.log("[SIGNUP][FLUTTERWAVE_REQUEST]", {
        requestId,
        userId,
        txRef,
        firstName,
        lastName,
        accountLabel,
        email,
        phone,
        hasBvn: Boolean(bvn),
      });
      const flutterwaveResponse = await createFlutterwaveVirtualAccount({
        email,
        tx_ref: txRef,
        phonenumber: phone,
        firstname: firstName,
        lastname: lastName,
        narration: accountLabel,
        is_permanent: true,
        bvn,
      });

      const account = flutterwaveResponse.data;
      if (!account?.account_number) {
        throw new Error("Flutterwave did not return an account number");
      }

      console.log("[SIGNUP][FLUTTERWAVE_SUCCESS]", {
        requestId,
        userId,
        txRef,
        bankName: account.bank_name,
        accountNumber: account.account_number,
        flwRef: account.flw_ref,
        orderRef: account.order_ref,
      });

      await execute(
        `UPDATE "User"
         SET "flutterwave_tx_ref" = $1,
             "flutterwave_flw_ref" = $2,
             "flutterwave_order_ref" = $3,
             "virtual_account_provider" = $4,
             "account_number" = $5,
             "account_name" = $6,
             "bank_name" = $7,
             "bank_id" = $8,
             "flutterwave_created_at" = $9
         WHERE id = $10`,
        [
          txRef,
          account.flw_ref,
          account.order_ref,
          "FLUTTERWAVE",
          account.account_number,
          accountLabel,
          account.bank_name,
          "FLUTTERWAVE",
          account.created_at,
          userId,
        ]
      );

      await execute(
        `INSERT INTO "UserReservedAccount"
         ("userId", "providerReference", "accountNumber", "accountName", "bankName", "bankId", "isPrimary", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, true, $7, NOW())`,
        [
          userId,
          txRef,
          account.account_number,
          accountLabel,
          account.bank_name,
          "FLUTTERWAVE",
          account.created_at,
        ]
      );

      console.log("[SIGNUP][USER_ACCOUNT_SAVED]", {
        requestId,
        userId,
        txRef,
      });
    } catch (virtualAccountError) {
      console.error("[SIGNUP][FLUTTERWAVE_FAILURE]", {
        requestId,
        userId,
        email,
        phone,
        error:
          virtualAccountError instanceof Error
            ? {
                name: virtualAccountError.name,
                message: virtualAccountError.message,
                stack: virtualAccountError.stack,
              }
            : virtualAccountError,
      });
      try {
        await execute(`DELETE FROM "User" WHERE id = $1`, [userId]);
        console.log("[SIGNUP][ROLLBACK_SUCCESS]", {
          requestId,
          userId,
        });
      } catch (deleteError) {
        console.error("[SIGNUP] Failed to delete user after account creation failure:", deleteError);
      }

      const errorMessage =
        virtualAccountError instanceof Error
          ? virtualAccountError.message
          : "Failed to create virtual account";

      return NextResponse.json(
        {
          error: "Account creation failed",
          details: `Virtual account creation failed. ${errorMessage} Please try again.`,
        },
        { status: 500, headers: utf8Headers }
      );
    }

    const token = await signToken({
      userId,
      phone,
      role: "USER" as const,
    });

    const cookieStore = await cookies();
    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    const userWithAccount = await queryOne<any>(
      `SELECT id, name, email, phone, balance, role,
              "account_number", "account_name", "bank_name", "bank_id",
              "flutterwave_tx_ref", "flutterwave_flw_ref", "flutterwave_order_ref",
              "virtual_account_provider"
       FROM "User" WHERE id = $1`,
      [userId]
    );

    return NextResponse.json(
      {
        message: "Account created successfully",
        user: {
          id: userId,
          name,
          email,
          phone,
          balance: 0,
          role: "USER",
          providerReference: userWithAccount?.flutterwave_tx_ref,
          accountNumber: userWithAccount?.account_number,
          accountName: userWithAccount?.account_name,
          bankName: userWithAccount?.bank_name,
          bankId: userWithAccount?.bank_id,
          virtualAccountProvider: userWithAccount?.virtual_account_provider,
          flutterwaveTxRef: userWithAccount?.flutterwave_tx_ref,
          flutterwaveFlwRef: userWithAccount?.flutterwave_flw_ref,
          flutterwaveOrderRef: userWithAccount?.flutterwave_order_ref,
        },
        token,
      },
      { status: 201, headers: utf8Headers }
    );
  } catch (error: any) {
    console.error("[SIGNUP][UNHANDLED_ERROR]", {
      message: error?.message,
      stack: error?.stack,
      error,
    });
    return NextResponse.json(
      { error: "Failed to create account", details: error.message },
      { status: 500, headers: utf8Headers }
    );
  }
}
