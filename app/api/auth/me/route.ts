import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { queryOne } from "@/lib/db";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const utf8Headers = { "Content-Type": "application/json; charset=utf-8" };

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request);

    if (!sessionUser) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401, headers: utf8Headers }
      );
    }

    // Get full user details from database
    const user = await queryOne<{
      id: string;
      name: string | null;
      phone: string | null;
      balance: number;
      role: string;
      isActive: boolean;
      account_number: string | null;
      bank_name: string | null;
      account_name: string | null;
    }>(
      `SELECT id, name, phone, balance, role, "isActive", "account_number", "bank_name", "account_name"
       FROM "User"
       WHERE id = $1`,
      [sessionUser.userId]
    );

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404, headers: utf8Headers }
      );
    }

    // Map role to tier for frontend (USER -> user, AGENT -> agent)
    const tier = (user.role || "USER").toLowerCase() as "user" | "agent" | "admin";

    return NextResponse.json({
      id: user.id,
      fullName: user.name,
      phone: user.phone,
      balance: typeof user.balance === 'number' ? user.balance : parseFloat(String(user.balance)),
      tier: tier,
      role: user.role,
      isActive: user.isActive,
      accountNumber: user.account_number,
      bankName: user.bank_name,
      accountName: user.account_name,
    }, { headers: utf8Headers });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500, headers: utf8Headers }
    );
  }
}
