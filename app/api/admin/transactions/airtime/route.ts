import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    // Verify admin access using JWT role
    const sessionUser = await getSessionUser(request);
    if (!sessionUser || sessionUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status") || "";
    const network = searchParams.get("network") || "";
    const search = searchParams.get("search") || "";

    const offset = (page - 1) * limit;
    let whereClause = "1=1";
    const params: any[] = [];

    if (status) {
      whereClause += ` AND status = $${params.length + 1}`;
      params.push(status.toUpperCase());
    }

    if (network && !isNaN(parseInt(network))) {
      whereClause += ` AND network = $${params.length + 1}`;
      params.push(parseInt(network));
    }

    if (search) {
      whereClause += ` AND (mobile_number LIKE $${params.length + 1} OR ident LIKE $${params.length + 2})`;
      params.push(`%${search}%`, `%${search}%`);
    }

    const offsetParam = `$${params.length + 1}`;
    const limitParam = `$${params.length + 2}`;

    params.push(offset, limit);

    // Fetch transactions
    const transactions = await query(
      `SELECT 
        id, user_id, ident, network, network_name, mobile_number, amount, 
        status, api_response, description, balance_before, balance_after, created_at, updated_at
       FROM airtime_transactions
       WHERE ${whereClause}
       ORDER BY created_at DESC
       OFFSET ${offsetParam} LIMIT ${limitParam}`,
      params
    );

    // Fetch total count
    const countParams = params.slice(0, -2);
    const countResult = await query(
      `SELECT COUNT(*) as total FROM airtime_transactions WHERE ${whereClause}`,
      countParams
    );

    const total = countResult[0]?.total || 0;

    return NextResponse.json({
      success: true,
      data: transactions,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    }, { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } });
  } catch (error: any) {
    console.error("[ADMIN_AIRTIME_ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch transactions" },
      { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }
}
