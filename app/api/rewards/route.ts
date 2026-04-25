import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getRewardDashboard } from "@/lib/rewards";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const utf8Headers = { "Content-Type": "application/json; charset=utf-8" };

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: utf8Headers });
    }

    const dashboard = await getRewardDashboard(sessionUser.userId);
    return NextResponse.json(dashboard, { headers: utf8Headers });
  } catch (error) {
    console.error("[REWARDS][GET]", error);
    return NextResponse.json(
      { error: "Failed to load rewards" },
      { status: 500, headers: utf8Headers }
    );
  }
}
