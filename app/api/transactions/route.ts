import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { query } from "@/lib/db";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key");

export async function GET(request: NextRequest) {
  try {
    // Get token from cookies - using standardized auth_token name
    const token = request.cookies.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized - No token" },
        { status: 401, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    // Verify token
    let payload: any;
    try {
      const verified = await jwtVerify(token, secret);
      payload = verified.payload;
    } catch {
      return NextResponse.json(
        { error: "Unauthorized - Invalid token" },
        { status: 401, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    const userId = payload.userId;

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - No user ID in token" },
        { status: 401, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    // Fetch user's transactions from data, airtime, cable, and power
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
       LIMIT 50`,
      [userId]
    );

    const airtimeTransactions = await query(
      `SELECT 
        at.id,
        at.mobile_number as phone,
        at.amount,
        at.status,
        at.provider_id,
        at.ident,
        at.created_at as "createdAt",
        at.network_name,
        NULL as name
       FROM airtime_transactions at
       WHERE at.user_id = $1
       ORDER BY at.created_at DESC
       LIMIT 50`,
      [userId]
    );

    const cableTransactions = await query(
      `SELECT 
        ct.id,
        ct.smart_card_number,
        ct.amount,
        ct.status,
        ct.provider,
        ct.ident,
        ct.created_at as "createdAt",
        ct.plan_name,
        ct.provider_name
       FROM cable_transactions ct
       WHERE ct.user_id = $1
       ORDER BY ct.created_at DESC
       LIMIT 50`,
      [userId]
    );

    const powerTransactions = await query(
      `SELECT 
        pt.id,
        pt.meter_number,
        pt.amount,
        pt.status,
        pt.provider,
        pt.ident,
        pt.created_at as "createdAt",
        pt.provider_name,
        pt.meter_type
       FROM power_transactions pt
       WHERE pt.user_id = $1
       ORDER BY pt.created_at DESC
       LIMIT 50`,
      [userId]
    );

    // Format data transactions
    const formattedData = (dataTransactions || []).map((tx: any) => ({
      id: tx.id,
      planName: tx.name || "Data Plan",
      sizeLabel: tx.sizeLabel || "",
      networkName: tx.networkName || "Network",
      phone: tx.phone,
      amount: Number(tx.amount) || 0,
      status: String(tx.status || "PENDING"),
      createdAt: tx.createdAt,
      type: "data",
    }));

    // Format airtime transactions
    const formattedAirtime = (airtimeTransactions || []).map((tx: any) => ({
      id: tx.id,
      planName: `${tx.network_name} Airtime`,
      sizeLabel: "",
      networkName: tx.network_name || "Network",
      phone: tx.phone,
      amount: Number(tx.amount) || 0,
      status: String(tx.status || "PENDING"),
      createdAt: tx.createdAt,
      type: "airtime",
    }));

    // Format cable transactions
    const formattedCable = (cableTransactions || []).map((tx: any) => ({
      id: tx.id,
      planName: tx.plan_name || "Cable Subscription",
      sizeLabel: tx.provider || "",
      networkName: tx.provider_name || "Provider",
      phone: tx.smart_card_number,
      amount: Number(tx.amount) || 0,
      status: String(tx.status || "PENDING"),
      createdAt: tx.createdAt,
      type: "cable",
    }));

    // Format power transactions
    const formattedPower = (powerTransactions || []).map((tx: any) => ({
      id: tx.id,
      planName: `${tx.meter_type || 'Meter'} - ${tx.provider || "Power"}`,
      sizeLabel: tx.meter_type || "",
      networkName: tx.provider_name || "Provider",
      phone: tx.meter_number,
      amount: Number(tx.amount) || 0,
      status: String(tx.status || "PENDING"),
      createdAt: tx.createdAt,
      type: "power",
    }));

    // Merge and sort by date
    const allTransactions = [...formattedData, ...formattedAirtime, ...formattedCable, ...formattedPower]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50);

    return NextResponse.json(
      {
        success: true,
        transactions: allTransactions,
      },
      { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error("Transactions fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }
}
