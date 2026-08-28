import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updateProfileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(100).optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
});

export async function PUT(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = updateProfileSchema.parse(body);

    const updateData: { fullName?: string; email?: string | null } = {};
    if (data.fullName) updateData.fullName = data.fullName.trim();
    if (data.email !== undefined) {
      updateData.email = data.email.trim() || null;
    }

    const updated = await prisma.user.update({
      where: { id: session.userId },
      data: updateData,
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        role: true,
        tier: true,
        balance: true,
        rewardBalance: true,
        agentRequestStatus: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("[PROFILE UPDATE ERROR]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return PUT(req);
}
