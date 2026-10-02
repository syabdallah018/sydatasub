import { NextRequest, NextResponse } from "next/server";
import { getActiveCelebration } from "@/lib/celebrations";

export async function GET(_req: NextRequest) {
  try {
    const celebration = await getActiveCelebration();

    return NextResponse.json(
      { success: true, data: celebration },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    console.error("[ACTIVE CELEBRATION ERROR]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
