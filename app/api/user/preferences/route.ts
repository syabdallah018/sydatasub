import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updatePreferencesSchema = z.object({
  themeMode: z.enum(["system", "light", "dark"]).optional(),
  biometricsEnabled: z.boolean().optional(),
  hideBalance: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  twoFactorEnabled: z.boolean().optional(),
  transactionReceipts: z.boolean().optional(),
  preferredNetwork: z.string().nullable().optional(),
  language: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let pref = await prisma.userPreference.findUnique({
      where: { userId: session.userId },
    });

    if (!pref) {
      pref = await prisma.userPreference.create({
        data: {
          userId: session.userId,
          themeMode: "system",
          biometricsEnabled: false,
          hideBalance: false,
          emailNotifications: true,
          smsNotifications: true,
          pushNotifications: true,
          twoFactorEnabled: false,
          transactionReceipts: true,
          preferredNetwork: "MTN",
          language: "en",
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: pref,
    });
  } catch (error) {
    console.error("[PREFERENCES GET ERROR]", error);
    return NextResponse.json(
      { error: "Failed to load preferences" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = updatePreferencesSchema.parse(body);

    const updated = await prisma.userPreference.upsert({
      where: { userId: session.userId },
      create: {
        userId: session.userId,
        ...data,
      },
      update: {
        ...data,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Preferences updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("[PREFERENCES PUT ERROR]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return PUT(req);
}
