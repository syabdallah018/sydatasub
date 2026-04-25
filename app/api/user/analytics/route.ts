import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const log = (step: string, data: any) => {
  if (process.env.NODE_ENV === "development") {
    console.log(`[USER_ANALYTICS] ${step}:`, JSON.stringify(data, null, 2));
  }
};

export async function GET(request: NextRequest) {
  try {
    log("REQUEST_START", { timestamp: new Date().toISOString() });

    // Authenticate user
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      log("AUTH_FAILED", { reason: "No session user" });
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    const userId = sessionUser.userId;
    log("AUTH_SUCCESS", { userId });

    // Fetch user info
    const user = await queryOne<{ balance: number; name: string }>(
      `SELECT balance, name FROM "User" WHERE id = $1`,
      [userId]
    );

    if (!user) {
      log("USER_NOT_FOUND", { userId });
      return NextResponse.json(
        { error: "User not found" },
        { status: 404, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    // Fetch data transactions
    const dataTransactions = await query<{
      id: string;
      amount: number;
      status: string;
      createdAt: string;
      phone: string;
    }>(
      `SELECT id, amount, status, "createdAt", phone 
       FROM "DataTransaction" 
       WHERE "userId" = $1 
       ORDER BY "createdAt" DESC`,
      [userId]
    );

    // Fetch airtime transactions
    const airtimeTransactions = await query<{
      id: string;
      amount: number;
      status: string;
      created_at: string;
      mobile_number: string;
    }>(
      `SELECT id, amount, status, created_at, mobile_number 
       FROM airtime_transactions 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    // Fetch cable transactions
    const cableTransactions = await query<{
      id: string;
      amount: number;
      status: string;
      created_at: string;
      smart_card_number: string;
    }>(
      `SELECT id, amount, status, created_at, smart_card_number 
       FROM cable_transactions 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    // Fetch power transactions
    const powerTransactions = await query<{
      id: string;
      amount: number;
      status: string;
      created_at: string;
      meter_number: string;
    }>(
      `SELECT id, amount, status, created_at, meter_number 
       FROM power_transactions 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    log("TRANSACTIONS_FETCHED", {
      dataCount: dataTransactions.length,
      airtimeCount: airtimeTransactions.length,
      cableCount: cableTransactions.length,
      powerCount: powerTransactions.length,
    });

    // Calculate total spend
    const dataSpend = dataTransactions
      .filter((t) => t.status === "SUCCESS")
      .reduce((sum, t) => sum + (typeof t.amount === "number" ? t.amount : parseFloat(String(t.amount || 0))), 0);

    const airtimeSpend = airtimeTransactions
      .filter((t) => t.status === "SUCCESS")
      .reduce((sum, t) => sum + (typeof t.amount === "number" ? t.amount : parseFloat(String(t.amount || 0))), 0);

    const cableSpend = cableTransactions
      .filter((t) => t.status === "SUCCESS")
      .reduce((sum, t) => sum + (typeof t.amount === "number" ? t.amount : parseFloat(String(t.amount || 0))), 0);

    const powerSpend = powerTransactions
      .filter((t) => t.status === "SUCCESS")
      .reduce((sum, t) => sum + (typeof t.amount === "number" ? t.amount : parseFloat(String(t.amount || 0))), 0);

    const totalSpend = dataSpend + airtimeSpend + cableSpend + powerSpend;

    log("ANALYTICS_CALCULATED", {
      totalSpend,
      dataSpend,
      airtimeSpend,
      cableSpend,
      powerSpend,
    });

    return NextResponse.json(
      {
        balance: user.balance,
        totalSpend,
        spendBreakdown: {
          data: dataSpend,
          airtime: airtimeSpend,
          cable: cableSpend,
          power: powerSpend,
        },
        transactionCounts: {
          data: dataTransactions.length,
          airtime: airtimeTransactions.length,
          cable: cableTransactions.length,
          power: powerTransactions.length,
        },
        successCounts: {
          data: dataTransactions.filter((t) => t.status === "SUCCESS").length,
          airtime: airtimeTransactions.filter((t) => t.status === "SUCCESS").length,
          cable: cableTransactions.filter((t) => t.status === "SUCCESS").length,
          power: powerTransactions.filter((t) => t.status === "SUCCESS").length,
        },
      },
      { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  } catch (error: any) {
    log("ERROR_500", { error: error.message, stack: error.stack });
    return NextResponse.json(
      { error: "Failed to fetch analytics", details: error.message },
      { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }
}
