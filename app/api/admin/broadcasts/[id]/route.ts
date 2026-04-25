import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { execute, queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const utf8Headers = { "Content-Type": "application/json; charset=utf-8" };

const requireAdmin = async (request: NextRequest) => {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || sessionUser.role !== "ADMIN") {
    return null;
  }
  return sessionUser;
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await requireAdmin(request);
    if (!sessionUser) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403, headers: utf8Headers }
      );
    }

    const { id } = await context.params;
    const body = await request.json();
    const action = String(body?.action || "").trim().toLowerCase();

    if (!["stop", "start"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400, headers: utf8Headers }
      );
    }

    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM "BroadcastMessage" WHERE id = $1`,
      [id]
    );
    if (!existing) {
      return NextResponse.json(
        { error: "Broadcast not found" },
        { status: 404, headers: utf8Headers }
      );
    }

    await execute(
      `UPDATE "BroadcastMessage"
       SET "isActive" = $1,
           "stoppedAt" = $2,
           "updatedAt" = NOW()
       WHERE id = $3`,
      [action === "start", action === "stop" ? new Date().toISOString() : null, id]
    );

    return NextResponse.json(
      { message: action === "stop" ? "Broadcast stopped" : "Broadcast resumed" },
      { headers: utf8Headers }
    );
  } catch (error) {
    console.error("Update broadcast error:", error);
    return NextResponse.json(
      { error: "Failed to update broadcast" },
      { status: 500, headers: utf8Headers }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await requireAdmin(request);
    if (!sessionUser) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403, headers: utf8Headers }
      );
    }

    const { id } = await context.params;
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM "BroadcastMessage" WHERE id = $1`,
      [id]
    );
    if (!existing) {
      return NextResponse.json(
        { error: "Broadcast not found" },
        { status: 404, headers: utf8Headers }
      );
    }

    await execute(`DELETE FROM "BroadcastMessage" WHERE id = $1`, [id]);

    return NextResponse.json(
      { message: "Broadcast deleted" },
      { headers: utf8Headers }
    );
  } catch (error) {
    console.error("Delete broadcast error:", error);
    return NextResponse.json(
      { error: "Failed to delete broadcast" },
      { status: 500, headers: utf8Headers }
    );
  }
}
