import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { execute, query } from "@/lib/db";

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

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await requireAdmin(request);
    if (!sessionUser) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403, headers: utf8Headers }
      );
    }

    const broadcasts = await query<{
      id: string;
      message: string;
      isActive: boolean;
      createdAt: string;
      updatedAt: string;
      stoppedAt: string | null;
      dismissCount: number;
    }>(
      `SELECT bm.id,
              bm.message,
              bm."isActive",
              bm."createdAt",
              bm."updatedAt",
              bm."stoppedAt",
              COUNT(bd.id)::int AS "dismissCount"
       FROM "BroadcastMessage" bm
       LEFT JOIN "BroadcastDismissal" bd
         ON bd."broadcastId" = bm.id
       GROUP BY bm.id
       ORDER BY bm."createdAt" DESC`,
      []
    );

    return NextResponse.json({ broadcasts }, { headers: utf8Headers });
  } catch (error) {
    console.error("Admin broadcasts fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch broadcasts" },
      { status: 500, headers: utf8Headers }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await requireAdmin(request);
    if (!sessionUser) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403, headers: utf8Headers }
      );
    }

    const body = await request.json();
    const message = String(body?.message || "").trim();

    if (message.length < 3) {
      return NextResponse.json(
        { error: "Message must be at least 3 characters" },
        { status: 400, headers: utf8Headers }
      );
    }

    const broadcast = await query<{
      id: string;
      message: string;
      isActive: boolean;
      createdAt: string;
      updatedAt: string;
      stoppedAt: string | null;
      dismissCount: number;
    }>(
      `INSERT INTO "BroadcastMessage" (id, message, "isActive", "createdBy", "createdAt", "updatedAt")
       VALUES ($1, $2, true, $3, NOW(), NOW())
       RETURNING id, message, "isActive", "createdAt", "updatedAt", "stoppedAt", 0::int AS "dismissCount"`,
      [randomUUID(), message, sessionUser.userId]
    );

    return NextResponse.json(
      { message: "Broadcast created", broadcast: broadcast[0] },
      { status: 201, headers: utf8Headers }
    );
  } catch (error) {
    console.error("Create broadcast error:", error);
    return NextResponse.json(
      { error: "Failed to create broadcast" },
      { status: 500, headers: utf8Headers }
    );
  }
}
