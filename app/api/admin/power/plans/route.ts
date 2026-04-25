import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const log = (step: string, data: any) => {
  if (process.env.NODE_ENV === "development") {
    console.log(`[ADMIN_POWER_PLANS] ${step}:`, JSON.stringify(data, null, 2));
  }
};

export async function GET(request: NextRequest) {
  try {
    log("REQUEST", { timestamp: new Date().toISOString() });

    // Verify admin
    const sessionUser = await getSessionUser(request);
    if (!sessionUser || sessionUser.role !== "ADMIN") {
      log("UNAUTHORIZED", { role: sessionUser?.role });
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 403, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    const plans = await query<{
      id: string;
      provider: string;
      planName: string;
      meterType: string;
      price: number;
      isActive: boolean;
      createdAt: string;
    }>(
      `SELECT id, provider, "planName", "meterType", price, "isActive", "createdAt" 
       FROM power_plans 
       ORDER BY provider, "meterType", "createdAt" DESC`
    );

    log("RESPONSE_200", { count: plans.length });
    return NextResponse.json(plans || [], {
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (error: any) {
    log("ERROR_500", { error: error.message });
    return NextResponse.json(
      { error: "Failed to fetch plans" },
      { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    log("REQUEST", { timestamp: new Date().toISOString() });

    // Verify admin
    const sessionUser = await getSessionUser(request);
    if (!sessionUser || sessionUser.role !== "ADMIN") {
      log("UNAUTHORIZED", { role: sessionUser?.role });
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 403, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    const body = await request.json();
    const { provider, planName, meterType, price } = body;

    log("REQUEST_BODY", { provider, planName, meterType, price });

    // Validate
    if (!provider || !planName || !meterType || !price) {
      log("VALIDATION_ERROR", {
        missingFields: { provider: !provider, planName: !planName, meterType: !meterType, price: !price },
      });
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    const validProviders = [
      "EKEDC",
      "IBADANELECTRICITY",
      "ABUJA",
      "ENUGU",
      "KANO",
      "IJEBU",
      "KEDCO",
      "PHED",
      "AEDC",
    ];
    if (!validProviders.includes(provider)) {
      log("INVALID_PROVIDER", { provider });
      return NextResponse.json(
        { error: "Invalid power provider" },
        { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    const validMeterTypes = ["PREPAID", "POSTPAID"];
    if (!validMeterTypes.includes(meterType)) {
      log("INVALID_METER_TYPE", { meterType });
      return NextResponse.json(
        { error: "Meter type must be PREPAID or POSTPAID" },
        { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    const priceNum = parseFloat(String(price));
    if (isNaN(priceNum) || priceNum <= 0) {
      log("INVALID_PRICE", { price });
      return NextResponse.json(
        { error: "Price must be greater than 0" },
        { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    // Create plan
    const result = await queryOne<{ id: string }>(
      `INSERT INTO power_plans 
       (id, provider, "planName", "meterType", price, "isActive", "createdAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, true, NOW())
       RETURNING id`,
      [provider, planName, meterType, priceNum]
    );

    if (!result) {
      throw new Error("Failed to create plan");
    }

    log("PLAN_CREATED", { planId: result.id, provider, planName, meterType });

    return NextResponse.json(
      { id: result.id, provider, planName, meterType, price: priceNum, isActive: true },
      { status: 201, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  } catch (error: any) {
    log("ERROR_500", { error: error.message });
    return NextResponse.json(
      { error: "Failed to create plan", details: error.message },
      { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }
}
