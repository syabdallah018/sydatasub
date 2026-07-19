import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcryptjs from "bcryptjs";
import { generateApiKey, generateClientSecret } from "@/lib/developer-auth";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const { status } = body;

    if (status !== "APPROVED" && status !== "REJECTED") {
      return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 });
    }

    const profile = await prisma.developerProfile.findUnique({
      where: { id },
    });

    if (!profile) {
      return NextResponse.json({ success: false, error: "Developer profile not found" }, { status: 404 });
    }

    let rawApiKey = profile.apiKey;
    let rawSecret = "";
    let secretHash = profile.apiSecretHash;

    if (status === "APPROVED" && (profile.apiKey.startsWith("pending_") || profile.apiSecretHash === "pending")) {
      // Generate live credentials
      rawApiKey = generateApiKey();
      rawSecret = generateClientSecret();

      const salt = await bcryptjs.genSalt(10);
      secretHash = await bcryptjs.hash(rawSecret, salt);
    }

    const updatedProfile = await prisma.developerProfile.update({
      where: { id },
      data: {
        status,
        apiKey: rawApiKey,
        apiSecretHash: secretHash,
      },
    });

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
    }, { status: 200 });
  } catch (error) {
    console.error("[ADMIN DEV ACTION ERROR]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
