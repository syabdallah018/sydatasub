import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Logging helper - LOGS TO VERCEL IN PRODUCTION + DEVELOPMENT
const log = (step: string, data: any) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[DATA_PLANS] ${timestamp} ${step}: ${JSON.stringify(data, null, 2)}`;
  console.log(logMessage);  // Always logs - visible in Vercel
  console.error(`[DATA_PLANS_LOG] ${step}`, JSON.stringify(data, null, 2));
};

const normalizeValidity = (value: string | null | undefined) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "daily";
  if (raw === "daily" || raw.includes("day") || raw.includes("24hr")) return "daily";
  if (raw === "weekly" || raw.includes("week") || raw.includes("7 days")) return "weekly";
  if (raw === "monthly" || raw.includes("month") || raw.includes("30 days")) return "monthly";
  return raw;
};

export async function GET(request: NextRequest) {
  try {
    // Extract networkId from query parameters
    const { searchParams } = new URL(request.url);
    const networkId = searchParams.get("networkId");
    
    log("REQUEST", { timestamp: new Date().toISOString(), networkId });

    // Get user session to check their role
    const sessionUser = await getSessionUser(request);
    const userRole = sessionUser?.role || "USER";
    log("SESSION", { userRole });

    let sqlQuery = "SELECT id, name, \"networkId\", \"networkName\", \"sizeLabel\", validity, price, \"userPrice\", \"agentPrice\", \"isActive\" FROM \"DataPlan\" WHERE \"isActive\" = true";
    
    // Filter by networkId if provided
    if (networkId) {
      sqlQuery += ` AND "networkId" = ${parseInt(networkId)}`;
    }
    
    sqlQuery += " ORDER BY \"networkId\", price";

    const plans = await query<{
      id: string;
      name: string;
      networkId: number;
      networkName: string;
      sizeLabel: string;
      validity: string;
      price: number;
      userPrice: number | null;
      agentPrice: number | null;
      isActive: boolean;
    }>(sqlQuery);

    // Apply role-based pricing
    const plansWithRoleBasedPrice = plans.map((plan) => {
      let displayPrice = plan.price;

      // If user is AGENT and plan has agentPrice, use agentPrice
      if (userRole === "AGENT" && plan.agentPrice && plan.agentPrice > 0) {
        displayPrice = plan.agentPrice;
      }
      // Otherwise use the regular price
      else {
        displayPrice = plan.price;
      }

      return {
        ...plan,
        validity: normalizeValidity(plan.validity),
        price: displayPrice, // Display price is now role-aware
      };
    });

    log("RESPONSE_200", { count: plansWithRoleBasedPrice.length, userRole, plans: plansWithRoleBasedPrice.slice(0, 2) });

    return NextResponse.json(plansWithRoleBasedPrice, {
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  } catch (error: any) {
    log("ERROR_500", { error: error.message, stack: error.stack });
    return NextResponse.json(
      { error: "Failed to fetch plans", details: error.message },
      { 
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      }
    );
  }
}
