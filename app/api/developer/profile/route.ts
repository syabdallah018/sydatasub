import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { z } from "zod";
import bcryptjs from "bcryptjs";
import { generateApiKey, generateClientSecret } from "@/lib/developer-auth";

const profileUpdateSchema = z.object({
  webhookUrl: z.string().url("Invalid Webhook URL").nullable().optional(),
  whitelistIps: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.developerProfile.findUnique({
      where: { userId: session.userId },
      select: {
        id: true,
        apiKey: true,
        webhookUrl: true,
        whitelistIps: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, profile }, { status: 200 });
  } catch (error) {
    console.error("[DEV PROFILE GET ERROR]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const existingProfile = await prisma.developerProfile.findUnique({
      where: { userId: session.userId },
    });

    if (existingProfile) {
      return NextResponse.json(
        { success: false, error: "Developer profile already exists", status: existingProfile.status },
        { status: 400 }
      );
    }

    // Creating initial profile with PENDING status and empty keys (keys generated on APPROVAL)
    const profile = await prisma.developerProfile.create({
      data: {
        userId: session.userId,
        apiKey: `pending_${Math.random().toString(36).slice(2, 10)}`, // temporary placeholder API key
        apiSecretHash: "pending",
        status: "PENDING",
      },
    });

    return NextResponse.json({ success: true, profile }, { status: 201 });
  } catch (error) {
    console.error("[DEV PROFILE POST ERROR]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = profileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const profile = await prisma.developerProfile.findUnique({
      where: { userId: session.userId },
    });

    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Developer profile not found" },
        { status: 404 }
      );
    }

    const updatedData: Record<string, any> = {};
    if (parsed.data.webhookUrl !== undefined) {
      updatedData.webhookUrl = parsed.data.webhookUrl;
    }
    if (parsed.data.whitelistIps !== undefined) {
      updatedData.whitelistIps = parsed.data.whitelistIps;
    }

    const updatedProfile = await prisma.developerProfile.update({
      where: { userId: session.userId },
      data: updatedData,
      select: {
        id: true,
        apiKey: true,
        webhookUrl: true,
        whitelistIps: true,
        status: true,
      },
    });

    return NextResponse.json({ success: true, profile: updatedProfile }, { status: 200 });
  } catch (error) {
    console.error("[DEV PROFILE PATCH ERROR]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
