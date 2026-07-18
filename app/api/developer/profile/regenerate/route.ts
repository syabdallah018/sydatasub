import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import bcryptjs from "bcryptjs";
import { generateApiKey, generateClientSecret } from "@/lib/developer-auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.developerProfile.findUnique({
      where: { userId: session.userId },
    });

    if (!profile || profile.status !== "APPROVED") {
      return NextResponse.json(
        { success: false, error: "Only approved developer accounts can regenerate API credentials." },
        { status: 400 }
      );
    }

    const newApiKey = generateApiKey();
    const newRawSecret = generateClientSecret();

    const salt = await bcryptjs.genSalt(10);
    const newSecretHash = await bcryptjs.hash(newRawSecret, salt);

    await prisma.developerProfile.update({
      where: { userId: session.userId },
      data: {
        apiKey: newApiKey,
        apiSecretHash: newSecretHash,
      },
    });

    return NextResponse.json(
      {
        success: true,
        apiKey: newApiKey,
        clientSecret: newRawSecret, // Display once
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[DEV CREDENTIALS REGENERATE ERROR]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
