import { NextRequest, NextResponse } from "next/server";
import { enforceAdminMutationGuard, requireAdmin } from "@/lib/adminAuth";
import { sendPushToAll } from "@/lib/push";
import { z } from "zod";

const pushSchema = z.object({
  title: z.string().min(1, "Title is required"),
  body: z.string().min(1, "Body is required"),
});

export async function POST(req: NextRequest) {
  try {
    const originError = enforceAdminMutationGuard(req);
    if (originError) return originError;

    await requireAdmin(req);

    const data = await req.json();
    const { title, body } = pushSchema.parse(data);

    const result = await sendPushToAll(title, body);

    return NextResponse.json({
      success: true,
      message: `Push broadcast completed: ${result.successCount} succeeded, ${result.failureCount} failed`,
      result,
    });
  } catch (error: any) {
    console.error("[ADMIN PUSH ERROR]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0].message }, { status: 400 });
    }

    if (error.message?.includes("Unauthorized")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (error.message?.includes("Forbidden")) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }

    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
