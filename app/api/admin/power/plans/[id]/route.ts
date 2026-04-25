import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const log = (step: string, data: any) => {
  if (process.env.NODE_ENV === "development") {
    console.log(`[ADMIN_POWER_PLAN_ID] ${step}:`, JSON.stringify(data, null, 2));
  }
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    log("REQUEST", { id });

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
    const { planName, meterType, price, isActive } = body;

    log("REQUEST_BODY", { planName, meterType, price, isActive });

    // Update plan
    const result = await queryOne<{ id: string }>(
      `UPDATE power_plans 
       SET "planName" = $1, "meterType" = $2, price = $3, "isActive" = $4, "updatedAt" = NOW()
       WHERE id = $5
       RETURNING id`,
      [planName, meterType, parseFloat(String(price)), isActive, id]
    );

    if (!result) {
      log("PLAN_NOT_FOUND", { id });
      return NextResponse.json(
        { error: "Plan not found" },
        { status: 404, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    log("PLAN_UPDATED", { id });

    return NextResponse.json(
      { message: "Plan updated successfully" },
      { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  } catch (error: any) {
    log("ERROR_500", { error: error.message });
    return NextResponse.json(
      { error: "Failed to update plan", details: error.message },
      { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    log("REQUEST", { id });

    // Verify admin
    const sessionUser = await getSessionUser(request);
    if (!sessionUser || sessionUser.role !== "ADMIN") {
      log("UNAUTHORIZED", { role: sessionUser?.role });
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 403, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    // Delete plan
    const result = await queryOne<{ id: string }>(
      `DELETE FROM power_plans WHERE id = $1 RETURNING id`,
      [id]
    );

    if (!result) {
      log("PLAN_NOT_FOUND", { id });
      return NextResponse.json(
        { error: "Plan not found" },
        { status: 404, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    log("PLAN_DELETED", { id });

    return NextResponse.json(
      { message: "Plan deleted successfully" },
      { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  } catch (error: any) {
    log("ERROR_500", { error: error.message });
    return NextResponse.json(
      { error: "Failed to delete plan", details: error.message },
      { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }
}
