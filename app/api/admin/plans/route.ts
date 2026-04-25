import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const utf8Headers = { "Content-Type": "application/json; charset=utf-8" };

const normalizeValidity = (value: string | null | undefined) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return null;
  if (raw === "daily" || raw.includes("day") || raw.includes("24hr")) return "daily";
  if (raw === "weekly" || raw.includes("week") || raw.includes("7 days")) return "weekly";
  if (raw === "monthly" || raw.includes("month") || raw.includes("30 days")) return "monthly";
  return null;
};

export async function GET(request: NextRequest) {
  try {
    // Verify admin access using JWT role
    const sessionUser = await getSessionUser(request);
    if (!sessionUser || sessionUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403, headers: utf8Headers });
    }

    const plans = await query<any>(
      `SELECT * FROM "DataPlan" ORDER BY "createdAt" DESC`,
      []
    );

    return NextResponse.json(plans.map((plan: any) => ({
      id: plan.id || "",
      name: plan.name || "",
      networkId: String(plan.networkId || ""),
      networkName: plan.networkName || "",
      sizeLabel: plan.sizeLabel || "",
      validity: normalizeValidity(plan.validity) || "",
      price: typeof plan.price === 'number' ? plan.price : parseFloat(String(plan.price || 0)),
      userPrice: typeof plan.userPrice === 'number' ? plan.userPrice : parseFloat(String(plan.userPrice || 0)),
      agentPrice: typeof plan.agentPrice === 'number' ? plan.agentPrice : parseFloat(String(plan.agentPrice || 0)),
      apiAId: String(plan.apiAId || ""),
      apiBId: String(plan.apiBId || ""),
      apiCId: String(plan.apiCId || ""),
      activeApi: plan.activeApi || "A",
      isActive: plan.isActive === true,
    })), { headers: utf8Headers });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error("Plans fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch plans" },
      { status: 500, headers: utf8Headers }
    );
  }
}

async function createHandler(request: NextRequest) {
  try {
    // Verify admin access
    const sessionUser = await getSessionUser(request);
    if (!sessionUser || sessionUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403, headers: utf8Headers });
    }

    const body = await request.json();
    console.log("[DATA_PLAN_CREATE] REQUEST_BODY:", JSON.stringify(body, null, 2));

    const {
      name,
      networkId,
      networkName,
      sizeLabel,
      validity,
      price,
      userPrice,
      agentPrice,
      apiAId,
      apiBId,
      apiCId,
      activeApi,
      isActive,
    } = body;

    const normalizedValidity = normalizeValidity(validity);

    if (!name || !networkId || !normalizedValidity || !sizeLabel || !price) {
      const missingFields = {
        name: !name,
        networkId: !networkId,
        sizeLabel: !sizeLabel,
        validity: !normalizedValidity,
        price: !price,
      };
      console.log("[DATA_PLAN_CREATE] MISSING_FIELDS:", missingFields);
      return NextResponse.json(
        { error: "Missing required fields: " + Object.keys(missingFields).filter(k => missingFields[k as keyof typeof missingFields]).join(", ") },
        { status: 400, headers: utf8Headers }
      );
    }

    // Validate numeric fields
    const networkIdNum = typeof networkId === "number" ? networkId : parseInt(String(networkId));
    if (isNaN(networkIdNum) || networkIdNum <= 0) {
      console.log("[DATA_PLAN_CREATE] INVALID_NETWORK_ID:", { received: networkId, parsed: networkIdNum });
      return NextResponse.json(
        { error: `Invalid networkId: received '${networkId}', must be a positive integer (1=MTN, 2=Glo, 3=9mobile, 4=Airtel)` },
        { status: 400, headers: utf8Headers }
      );
    }

    const priceNum = parseFloat(String(price));
    if (isNaN(priceNum) || priceNum <= 0) {
      console.log("[DATA_PLAN_CREATE] INVALID_PRICE:", { received: price, parsed: priceNum });
      return NextResponse.json(
        { error: `Invalid price: received '${price}', must be a positive number` },
        { status: 400, headers: utf8Headers }
      );
    }

    const userPriceNum = userPrice ? parseFloat(String(userPrice)) : null;
    if (userPrice && (isNaN(userPriceNum!) || userPriceNum! <= 0)) {
      console.log("[DATA_PLAN_CREATE] INVALID_USER_PRICE:", { received: userPrice, parsed: userPriceNum });
      return NextResponse.json(
        { error: `Invalid userPrice: received '${userPrice}', must be a positive number` },
        { status: 400, headers: utf8Headers }
      );
    }

    const agentPriceNum = agentPrice ? parseFloat(String(agentPrice)) : null;
    if (agentPrice && (isNaN(agentPriceNum!) || agentPriceNum! <= 0)) {
      console.log("[DATA_PLAN_CREATE] INVALID_AGENT_PRICE:", { received: agentPrice, parsed: agentPriceNum });
      return NextResponse.json(
        { error: `Invalid agentPrice: received '${agentPrice}', must be a positive number` },
        { status: 400, headers: utf8Headers }
      );
    }

    const apiAIdNum = apiAId ? parseInt(String(apiAId)) : null;
    if (apiAId && (isNaN(apiAIdNum!) || apiAIdNum! <= 0)) {
      console.log("[DATA_PLAN_CREATE] INVALID_API_A_ID:", { received: apiAId, parsed: apiAIdNum });
      return NextResponse.json(
        { error: `Invalid apiAId: received '${apiAId}', must be a positive integer` },
        { status: 400, headers: utf8Headers }
      );
    }

    const apiBIdNum = apiBId ? parseInt(String(apiBId)) : null;
    if (apiBId && (isNaN(apiBIdNum!) || apiBIdNum! <= 0)) {
      console.log("[DATA_PLAN_CREATE] INVALID_API_B_ID:", { received: apiBId, parsed: apiBIdNum });
      return NextResponse.json(
        { error: `Invalid apiBId: received '${apiBId}', must be a positive integer` },
        { status: 400, headers: utf8Headers }
      );
    }

    const apiCIdNum = apiCId ? parseInt(String(apiCId)) : null;
    if (apiCId && (isNaN(apiCIdNum!) || apiCIdNum! <= 0)) {
      console.log("[DATA_PLAN_CREATE] INVALID_API_C_ID:", { received: apiCId, parsed: apiCIdNum });
      return NextResponse.json(
        { error: `Invalid apiCId: received '${apiCId}', must be a positive integer` },
        { status: 400, headers: utf8Headers }
      );
    }

    if (!["A", "B", "C"].includes(activeApi || "A")) {
      return NextResponse.json(
        { error: "activeApi must be one of A, B, or C" },
        { status: 400, headers: utf8Headers }
      );
    }

    if (activeApi === "A" && !apiAIdNum) {
      return NextResponse.json(
        { error: "apiAId is required when activeApi is A" },
        { status: 400, headers: utf8Headers }
      );
    }

    if (activeApi === "B" && !apiBIdNum) {
      return NextResponse.json(
        { error: "apiBId is required when activeApi is B" },
        { status: 400, headers: utf8Headers }
      );
    }

    if (activeApi === "C" && !apiCIdNum) {
      return NextResponse.json(
        { error: "apiCId is required when activeApi is C" },
        { status: 400, headers: utf8Headers }
      );
    }

    console.log("[DATA_PLAN_CREATE] VALIDATED_DATA:", {
      name,
      networkIdNum,
      sizeLabel,
      validity: normalizedValidity,
      priceNum,
      userPriceNum,
      agentPriceNum,
      apiAIdNum,
      apiBIdNum,
      apiCIdNum,
    });

    const plan = await queryOne<any>(
      `INSERT INTO "DataPlan" 
       (id, name, "networkId", "networkName", "sizeLabel", validity, price, "userPrice", 
        "agentPrice", "apiAId", "apiBId", "apiCId", "activeApi", "isActive", "createdAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
       RETURNING *`,
      [
        name,
        networkIdNum,
        networkName || null,
        sizeLabel,
        normalizedValidity,
        priceNum,
        userPriceNum,
        agentPriceNum,
        apiAIdNum,
        apiBIdNum,
        apiCIdNum,
        activeApi || "A",
        isActive !== false,
      ]
    );

    if (!plan) {
      throw new Error("Failed to create plan");
    }

    console.log("[DATA_PLAN_CREATE] SUCCESS:", { planId: plan.id, name: plan.name, networkId: plan.networkId });

    return NextResponse.json(
      {
        ...plan,
        validity: normalizeValidity(plan.validity),
        price: typeof plan.price === 'number' ? plan.price : parseFloat(String(plan.price)),
        userPrice: plan.userPrice ? (typeof plan.userPrice === 'number' ? plan.userPrice : parseFloat(String(plan.userPrice))) : null,
        agentPrice: plan.agentPrice ? (typeof plan.agentPrice === 'number' ? plan.agentPrice : parseFloat(String(plan.agentPrice))) : null,
      },
      { status: 201, headers: utf8Headers }
    );
  } catch (error) {
    console.error("[DATA_PLAN_CREATE] ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create plan" },
      { status: 500, headers: utf8Headers }
    );
  }
}

export async function POST(request: NextRequest) {
  return createHandler(request);
}
