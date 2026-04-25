import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { queryOne, execute } from "@/lib/db";

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

export async function PATCH(request: NextRequest) {
  try {
    // Verify admin access using JWT role
    const sessionUser = await getSessionUser(request);
    if (!sessionUser || sessionUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403, headers: utf8Headers }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id") || (request.nextUrl.pathname.split("/").pop());

    if (!id) {
      return NextResponse.json({ error: "Plan ID is required" }, { status: 400, headers: utf8Headers });
    }

    const existingPlan = await queryOne<{
      apiAId: number | null;
      apiBId: number | null;
      apiCId: number | null;
      activeApi: string | null;
    }>(
      `SELECT "apiAId", "apiBId", "apiCId", "activeApi" FROM "DataPlan" WHERE id = $1`,
      [id]
    );

    if (!existingPlan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404, headers: utf8Headers });
    }

    const body = await request.json();
    const {
      name,
      networkId,
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

    // Build UPDATE query dynamically
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      params.push(name);
      paramCount++;
    }
    if (networkId !== undefined) {
      const networkIdNum = parseInt(String(networkId));
      if (isNaN(networkIdNum) || networkIdNum <= 0) {
        return NextResponse.json(
          { error: "Invalid networkId - must be a positive integer" },
          { status: 400, headers: utf8Headers }
        );
      }
      updates.push(`"networkId" = $${paramCount}`);
      params.push(networkIdNum);
      paramCount++;
    }
    if (sizeLabel !== undefined) {
      updates.push(`"sizeLabel" = $${paramCount}`);
      params.push(sizeLabel);
      paramCount++;
    }
    if (validity !== undefined) {
      const normalizedValidity = normalizeValidity(validity);
      if (!normalizedValidity) {
        return NextResponse.json(
          { error: "Invalid validity - must be daily, weekly, or monthly" },
          { status: 400, headers: utf8Headers }
        );
      }
      updates.push(`validity = $${paramCount}`);
      params.push(normalizedValidity);
      paramCount++;
    }
    if (price !== undefined) {
      const priceNum = parseFloat(String(price));
      if (isNaN(priceNum) || priceNum <= 0) {
        return NextResponse.json(
          { error: "Invalid price - must be a positive number" },
          { status: 400, headers: utf8Headers }
        );
      }
      updates.push(`price = $${paramCount}`);
      params.push(priceNum);
      paramCount++;
    }
    if (userPrice !== undefined) {
      const userPriceNum = userPrice ? parseFloat(String(userPrice)) : null;
      if (userPrice && (isNaN(userPriceNum!) || userPriceNum! <= 0)) {
        return NextResponse.json(
          { error: "Invalid userPrice - must be a positive number" },
          { status: 400, headers: utf8Headers }
        );
      }
      updates.push(`"userPrice" = $${paramCount}`);
      params.push(userPriceNum);
      paramCount++;
    }
    if (agentPrice !== undefined) {
      const agentPriceNum = agentPrice ? parseFloat(String(agentPrice)) : null;
      if (agentPrice && (isNaN(agentPriceNum!) || agentPriceNum! <= 0)) {
        return NextResponse.json(
          { error: "Invalid agentPrice - must be a positive number" },
          { status: 400, headers: utf8Headers }
        );
      }
      updates.push(`"agentPrice" = $${paramCount}`);
      params.push(agentPriceNum);
      paramCount++;
    }
    if (apiAId !== undefined) {
      const apiAIdNum = apiAId ? parseInt(String(apiAId)) : null;
      if (apiAId && (isNaN(apiAIdNum!) || apiAIdNum! <= 0)) {
        return NextResponse.json(
          { error: "Invalid apiAId - must be a positive integer" },
          { status: 400, headers: utf8Headers }
        );
      }
      updates.push(`"apiAId" = $${paramCount}`);
      params.push(apiAIdNum);
      paramCount++;
    }
    if (apiBId !== undefined) {
      const apiBIdNum = apiBId ? parseInt(String(apiBId)) : null;
      if (apiBId && (isNaN(apiBIdNum!) || apiBIdNum! <= 0)) {
        return NextResponse.json(
          { error: "Invalid apiBId - must be a positive integer" },
          { status: 400, headers: utf8Headers }
        );
      }
      updates.push(`"apiBId" = $${paramCount}`);
      params.push(apiBIdNum);
      paramCount++;
    }
    if (apiCId !== undefined) {
      const apiCIdNum = apiCId ? parseInt(String(apiCId)) : null;
      if (apiCId && (isNaN(apiCIdNum!) || apiCIdNum! <= 0)) {
        return NextResponse.json(
          { error: "Invalid apiCId - must be a positive integer" },
          { status: 400, headers: utf8Headers }
        );
      }
      updates.push(`"apiCId" = $${paramCount}`);
      params.push(apiCIdNum);
      paramCount++;
    }
    if (activeApi !== undefined) {
      if (!["A", "B", "C"].includes(String(activeApi))) {
        return NextResponse.json(
          { error: "Invalid activeApi - must be A, B, or C" },
          { status: 400, headers: utf8Headers }
        );
      }
      updates.push(`"activeApi" = $${paramCount}`);
      params.push(activeApi);
      paramCount++;
    }
    if (isActive !== undefined) {
      updates.push(`"isActive" = $${paramCount}`);
      params.push(isActive);
      paramCount++;
    }

    const nextApiAId = apiAId !== undefined
      ? (apiAId ? parseInt(String(apiAId)) : null)
      : existingPlan.apiAId;
    const nextApiBId = apiBId !== undefined
      ? (apiBId ? parseInt(String(apiBId)) : null)
      : existingPlan.apiBId;
    const nextApiCId = apiCId !== undefined
      ? (apiCId ? parseInt(String(apiCId)) : null)
      : existingPlan.apiCId;
    const nextActiveApi = activeApi !== undefined
      ? String(activeApi)
      : (existingPlan.activeApi || "A");

    if (nextActiveApi === "A" && !nextApiAId) {
      return NextResponse.json(
        { error: "apiAId is required when activeApi is A" },
        { status: 400, headers: utf8Headers }
      );
    }

    if (nextActiveApi === "B" && !nextApiBId) {
      return NextResponse.json(
        { error: "apiBId is required when activeApi is B" },
        { status: 400, headers: utf8Headers }
      );
    }

    if (nextActiveApi === "C" && !nextApiCId) {
      return NextResponse.json(
        { error: "apiCId is required when activeApi is C" },
        { status: 400, headers: utf8Headers }
      );
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400, headers: utf8Headers }
      );
    }

    // Add the ID to params for WHERE clause
    params.push(id);

    const updateQuery = `
      UPDATE "DataPlan"
      SET ${updates.join(", ")}
      WHERE id = $${paramCount}
      RETURNING id, name, "networkId", "sizeLabel", validity, price, "userPrice", "agentPrice", 
                "apiAId", "apiBId", "apiCId", "activeApi", "isActive", "createdAt"
    `;

    const plan = await queryOne<any>(updateQuery, params);

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404, headers: utf8Headers });
    }

    return NextResponse.json({
      ...plan,
      validity: normalizeValidity(plan.validity),
      price: typeof plan.price === 'number' ? plan.price : parseFloat(String(plan.price)),
      userPrice: plan.userPrice ? (typeof plan.userPrice === 'number' ? plan.userPrice : parseFloat(String(plan.userPrice))) : null,
      agentPrice: plan.agentPrice ? (typeof plan.agentPrice === 'number' ? plan.agentPrice : parseFloat(String(plan.agentPrice))) : null,
    }, { headers: utf8Headers });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error("Plan update error:", error);
    return NextResponse.json(
      { error: "Failed to update plan" },
      { status: 500, headers: utf8Headers }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify admin access using JWT role
    const sessionUser = await getSessionUser(request);
    if (!sessionUser || sessionUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403, headers: utf8Headers }
      );
    }

    const id = request.nextUrl.pathname.split("/").pop();

    if (!id) {
      return NextResponse.json({ error: "Plan ID is required" }, { status: 400, headers: utf8Headers });
    }

    await execute(`DELETE FROM "DataPlan" WHERE id = $1`, [id]);

    return NextResponse.json({ success: true }, { headers: utf8Headers });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error("Plan delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete plan" },
      { status: 500, headers: utf8Headers }
    );
  }
}
