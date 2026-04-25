import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const utf8Headers = { "Content-Type": "application/json; charset=utf-8" };

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    
    // Verify admin access using JWT role
    const sessionUser = await getSessionUser(request);
    if (!sessionUser || sessionUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403, headers: utf8Headers }
      );
    }

    const userId = params.id;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400, headers: utf8Headers }
      );
    }

    // Fetch user's DATA transactions
    const dataTransactions = await query(
      `SELECT 
        dt.id,
        dt.phone,
        dt.amount,
        dt.status,
        dt."providerUsed",
        dt."providerRef",
        dt."customerRef",
        dt."createdAt",
        dp.name,
        dp."sizeLabel",
        dp."networkName"
      FROM "DataTransaction" dt
      LEFT JOIN "DataPlan" dp ON dt."planId" = dp.id
      WHERE dt."userId" = $1
      ORDER BY dt."createdAt" DESC
      LIMIT 100`,
      [userId]
    );

    // Fetch user's AIRTIME transactions
    const airtimeTransactions = await query(
      `SELECT 
        id,
        mobile_number as phone,
        amount,
        status,
        ident,
        created_at as "createdAt",
        network_name,
        NULL as name
      FROM airtime_transactions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 100`,
      [userId]
    );

    // Format data transactions to camelCase
    const formattedData = (dataTransactions || []).map((tx: any) => ({
      id: String(tx.id || ""),
      planName: String(tx.name || "Data Plan"),
      sizeLabel: tx.sizeLabel ? String(tx.sizeLabel) : "",
      networkName: String(tx.networkName || ""),
      phone: String(tx.phone || ""),
      amount: Number(tx.amount || 0),
      status: String(tx.status || "PENDING").toUpperCase(),
      createdAt: tx.createdAt ? new Date(tx.createdAt).toISOString() : new Date().toISOString(),
      type: "data",
    }));

    // Format airtime transactions to camelCase
    const formattedAirtime = (airtimeTransactions || []).map((tx: any) => ({
      id: String(tx.id || ""),
      planName: `${String(tx.network_name || "Unknown")} Airtime`,
      sizeLabel: "",
      networkName: String(tx.network_name || ""),
      phone: String(tx.phone || ""),
      amount: Number(tx.amount || 0),
      status: String(tx.status || "PENDING").toUpperCase(),
      createdAt: tx.createdAt ? new Date(tx.createdAt).toISOString() : new Date().toISOString(),
      type: "airtime",
    }));

    // Merge and sort by date
    const allTransactions = [...formattedData, ...formattedAirtime]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50);

    return NextResponse.json(allTransactions, {
      headers: utf8Headers,
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error("Error fetching user transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500, headers: utf8Headers }
    );
  }
}
