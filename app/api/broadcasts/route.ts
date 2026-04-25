import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const utf8Headers = { "Content-Type": "application/json; charset=utf-8" };

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request);

    if (!sessionUser) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401, headers: utf8Headers }
      );
    }

    const broadcasts = await query<{
      id: string;
      message: string;
      createdAt: string;
    }>(
      `SELECT bm.id, bm.message, bm."createdAt"
       FROM "BroadcastMessage" bm
       LEFT JOIN "BroadcastDismissal" bd
         ON bd."broadcastId" = bm.id
        AND bd."userId" = $1
       WHERE bm."isActive" = true
         AND bd.id IS NULL
       ORDER BY bm."createdAt" DESC`,
      [sessionUser.userId]
    );

    return NextResponse.json({ broadcasts }, { headers: utf8Headers });
  } catch (error) {
    console.error("Get broadcasts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch broadcasts" },
      { status: 500, headers: utf8Headers }
    );
  }
}
