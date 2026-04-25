import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { execute, query, queryOne } from "@/lib/db";
import {
  createFlutterwaveVirtualAccount,
  generateFlutterwaveTxRef,
  splitName,
} from "@/lib/flutterwave";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const utf8Headers = { "Content-Type": "application/json; charset=utf-8" };

type ReservedAccountRow = {
  id: string;
  providerReference: string | null;
  accountNumber: string;
  accountName: string | null;
  bankName: string | null;
  bankId: string;
  isPrimary: boolean;
  createdAt: string;
};

type UserPrimaryAccountRow = {
  id: string;
  flutterwave_tx_ref: string | null;
  account_number: string | null;
  account_name: string | null;
  bank_name: string | null;
  bank_id: string | null;
  flutterwave_created_at: string | null;
};

const normalizeAccounts = (
  accounts: ReservedAccountRow[],
  fallbackUser?: UserPrimaryAccountRow | null
) => {
  const normalized = [...accounts];

  if (
    fallbackUser?.account_number &&
    fallbackUser.bank_id &&
    !normalized.some((account) => account.accountNumber === fallbackUser.account_number)
  ) {
    normalized.unshift({
      id: "primary-user-account",
      providerReference: fallbackUser.flutterwave_tx_ref,
      accountNumber: fallbackUser.account_number,
      accountName: fallbackUser.account_name,
      bankName: fallbackUser.bank_name,
      bankId: fallbackUser.bank_id,
      isPrimary: true,
      createdAt: fallbackUser.flutterwave_created_at || new Date().toISOString(),
    });
  }

  return normalized.sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
};

const getUserPrimaryAccount = async (userId: string) =>
  queryOne<UserPrimaryAccountRow>(
    `SELECT id, "flutterwave_tx_ref", "account_number", "account_name", "bank_name", "bank_id", "flutterwave_created_at"
     FROM "User"
     WHERE id = $1`,
    [userId]
  );

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request);

    if (!sessionUser) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401, headers: utf8Headers }
      );
    }

    const accounts = await query<ReservedAccountRow>(
      `SELECT id, "providerReference", "accountNumber", "accountName", "bankName", "bankId", "isPrimary", "createdAt"
       FROM "UserReservedAccount"
       WHERE "userId" = $1
       ORDER BY "isPrimary" DESC, "createdAt" ASC`,
      [sessionUser.userId]
    );

    const user = await getUserPrimaryAccount(sessionUser.userId);
    const normalizedAccounts = normalizeAccounts(accounts, user);

    return NextResponse.json({ accounts: normalizedAccounts }, { headers: utf8Headers });
  } catch (error) {
    console.error("Get accounts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 500, headers: utf8Headers }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request);

    if (!sessionUser) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401, headers: utf8Headers }
      );
    }

    const user = await queryOne<{
      id: string;
      name: string | null;
      email: string | null;
      phone: string | null;
      bvn: string | null;
      flutterwave_tx_ref: string | null;
      account_number: string | null;
    }>(
      `SELECT id, name, email, phone, bvn, "flutterwave_tx_ref", "account_number"
       FROM "User"
       WHERE id = $1`,
      [sessionUser.userId]
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404, headers: utf8Headers });
    }

    if (user.account_number && user.flutterwave_tx_ref) {
      const accounts = await query<ReservedAccountRow>(
        `SELECT id, "providerReference", "accountNumber", "accountName", "bankName", "bankId", "isPrimary", "createdAt"
         FROM "UserReservedAccount"
         WHERE "userId" = $1
         ORDER BY "isPrimary" DESC, "createdAt" ASC`,
        [sessionUser.userId]
      );
      const primary = await getUserPrimaryAccount(sessionUser.userId);
      const normalizedAccounts = normalizeAccounts(accounts, primary);
      return NextResponse.json(
        { message: "Virtual account already exists", accounts: normalizedAccounts },
        { headers: utf8Headers }
      );
    }

    if (!user.email) {
      return NextResponse.json(
        { error: "Email is required to create a virtual account. Please contact support." },
        { status: 400, headers: utf8Headers }
      );
    }

    if (!user.phone || !/^0[0-9]{10}$/.test(user.phone)) {
      return NextResponse.json(
        { error: "A valid phone number is required to create a virtual account." },
        { status: 400, headers: utf8Headers }
      );
    }

    const bvn = process.env.MY_BVN || process.env.my_bvn || process.env.FLW_BVN;
    if (!bvn) {
      console.error("[ACCOUNTS][CONFIG_ERROR] MY_BVN missing");
      return NextResponse.json(
        { error: "Virtual account creation is not configured. Please try again later." },
        { status: 500, headers: utf8Headers }
      );
    }

    const fullName = (user.name || "User").trim();
    const { firstName, lastName } = splitName(fullName);
    const accountLabel = `${fullName} SY Data`;

    let txRef = generateFlutterwaveTxRef(user.id);
    let flutterwaveAccount:
      | {
          flw_ref: string;
          order_ref: string;
          account_number: string;
          bank_name: string;
          created_at: string;
        }
      | null = null;

    // Retry once if Flutterwave rejects a tx_ref collision.
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log("[ACCOUNTS][FLUTTERWAVE_REQUEST]", {
          userId: user.id,
          attempt,
          txRef,
          accountLabel,
          email: user.email,
          phone: user.phone,
        });

        const resp = await createFlutterwaveVirtualAccount({
          email: user.email,
          tx_ref: txRef,
          phonenumber: user.phone,
          firstname: firstName,
          lastname: lastName,
          narration: accountLabel,
          is_permanent: true,
          bvn,
        });

        if (!resp.data?.account_number) {
          throw new Error("Flutterwave did not return an account number");
        }

        flutterwaveAccount = resp.data;
        break;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[ACCOUNTS][FLUTTERWAVE_FAILURE]", { userId: user.id, attempt, txRef, message });

        if (attempt === 1 && /tx_ref/i.test(message) && /exists|already/i.test(message)) {
          txRef = `${generateFlutterwaveTxRef(user.id)}-${attempt}`;
          continue;
        }
        throw err;
      }
    }

    if (!flutterwaveAccount) {
      throw new Error("Virtual account creation failed");
    }

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
           "flutterwave_created_at" = $9,
           bvn = COALESCE(bvn, $10),
           "updatedAt" = NOW()
       WHERE id = $11`,
      [
        txRef,
        flutterwaveAccount.flw_ref,
        flutterwaveAccount.order_ref,
        "FLUTTERWAVE",
        flutterwaveAccount.account_number,
        accountLabel,
        flutterwaveAccount.bank_name,
        "FLUTTERWAVE",
        flutterwaveAccount.created_at,
        bvn,
        user.id,
      ]
    );

    await execute(
      `INSERT INTO "UserReservedAccount"
       ("userId", "providerReference", "accountNumber", "accountName", "bankName", "bankId", "isPrimary", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, true, $7, NOW())
       ON CONFLICT ("userId", "bankId")
       DO UPDATE SET
         "providerReference" = EXCLUDED."providerReference",
         "accountNumber" = EXCLUDED."accountNumber",
         "accountName" = EXCLUDED."accountName",
         "bankName" = EXCLUDED."bankName",
         "isPrimary" = true,
         "updatedAt" = NOW()`,
      [
        user.id,
        txRef,
        flutterwaveAccount.account_number,
        accountLabel,
        flutterwaveAccount.bank_name,
        "FLUTTERWAVE",
        flutterwaveAccount.created_at,
      ]
    );

    // Return updated normalized list.
    const accounts = await query<ReservedAccountRow>(
      `SELECT id, "providerReference", "accountNumber", "accountName", "bankName", "bankId", "isPrimary", "createdAt"
       FROM "UserReservedAccount"
       WHERE "userId" = $1
       ORDER BY "isPrimary" DESC, "createdAt" ASC`,
      [sessionUser.userId]
    );
    const primary = await getUserPrimaryAccount(sessionUser.userId);
    const normalizedAccounts = normalizeAccounts(accounts, primary);

    return NextResponse.json(
      {
        message: "Virtual account created",
        account: {
          providerReference: txRef,
          accountNumber: flutterwaveAccount.account_number,
          bankName: flutterwaveAccount.bank_name,
        },
        accounts: normalizedAccounts,
      },
      { headers: utf8Headers }
    );
  } catch (error) {
    console.error("[ACCOUNTS][CREATE_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to create virtual account" },
      { status: 500, headers: utf8Headers }
    );
  }
}
