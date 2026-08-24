import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { testDeveloperWebhook } from "@/lib/webhook-dispatcher";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const result = await testDeveloperWebhook(session.userId);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || `Webhook delivery failed with HTTP status ${result.statusCode}`,
          statusCode: result.statusCode,
          latencyMs: result.latencyMs,
          responseBody: result.responseBody,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Webhook test delivered successfully (Status ${result.statusCode})`,
        statusCode: result.statusCode,
        latencyMs: result.latencyMs,
        responseBody: result.responseBody,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[DEV WEBHOOK TEST ERROR]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
