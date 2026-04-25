import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const utf8Headers = { "Content-Type": "application/json; charset=utf-8" };

export async function GET(request: NextRequest) {
  try {
    // Verify admin access using JWT role
    const sessionUser = await getSessionUser(request);
    if (!sessionUser || sessionUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403, headers: utf8Headers });
    }

    // Fetch all users from database
    const users = await query<{
      id: string;
      email: string;
      name: string | null;
      phone: string | null;
      balance: number;
      role: string;
      createdAt: string;
      account_number: string | null;
      bank_name: string | null;
      account_name: string | null;
    }>(
      `SELECT id, email, name, phone, balance, role, "createdAt", account_number, bank_name, account_name
       FROM "User"
       ORDER BY "createdAt" DESC`,
      []
    );

    return NextResponse.json(
      users.map((user) => ({
        id: user.id || "",
        email: user.email || "",
        fullName: String(user.name || ""),
        phone: String(user.phone || ""),
        balance: typeof user.balance === 'number' ? user.balance : parseFloat(String(user.balance || 0)),
        tier: String(user.role || "user"),
        createdAt: user.createdAt || new Date().toISOString(),
        accountNumber: user.account_number || null,
        bankName: user.bank_name || null,
        accountName: user.account_name || null,
      })),
      { headers: utf8Headers }
    );
  } catch (error) {
    console.error("Users fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500, headers: utf8Headers }
    );
  }
}
