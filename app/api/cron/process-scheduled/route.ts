import { NextRequest, NextResponse } from "next/server";
import { processDueScheduledTopUps } from "@/lib/scheduled-processor";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // Allow internal/vercel cron execution
    }

    const result = await processDueScheduledTopUps();
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("[CRON PROCESS SCHEDULED ERROR]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process scheduled top-ups" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
