import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { z } from "zod";

const registerSchema = z.object({
  fcmToken: z.string().min(1, "Token is required"),
});

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { fcmToken } = registerSchema.parse(body);

    await prisma.user.update({
      where: { id: sessionUser.userId },
      data: { fcmToken },
    });

    return NextResponse.json({ success: true, message: "Token registered successfully" });
  } catch (error) {
    console.error("[FCM REGISTER ERROR]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
