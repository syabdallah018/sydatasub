import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { execute, queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const utf8Headers = { "Content-Type": "application/json; charset=utf-8" };

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401, headers: utf8Headers }
      );
    }

    const { id } = await context.params;
    const message = await queryOne<{ id: string }>(
      `SELECT id FROM "BroadcastMessage" WHERE id = $1`,
      [id]
    );

    if (!message) {
      return NextResponse.json(
        { error: "Broadcast not found" },
        { status: 404, headers: utf8Headers }
      );
    }

    await execute(
      `INSERT INTO "BroadcastDismissal" (id, "broadcastId", "userId", "createdAt")
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT ("broadcastId", "userId") DO NOTHING`,
      [randomUUID(), id, sessionUser.userId]
    );

    return NextResponse.json(
      { message: "Broadcast dismissed" },
      { headers: utf8Headers }
    );
  } catch (error) {
    console.error("Dismiss broadcast error:", error);
    return NextResponse.json(
      { error: "Failed to dismiss broadcast" },
      { status: 500, headers: utf8Headers }
    );
  }
}
