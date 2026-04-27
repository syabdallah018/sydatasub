import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getRewardProgressForUser } from "@/lib/rewards";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const data = await getRewardProgressForUser(user.userId);
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error("[REWARDS ERROR]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
