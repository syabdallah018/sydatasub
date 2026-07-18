import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const developers = await prisma.developerProfile.findMany({
      include: {
        user: {
          select: {
            fullName: true,
            phone: true,
            email: true,
            balance: true,
            tier: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, developers }, { status: 200 });
  } catch (error) {
    console.error("[ADMIN GET DEVELOPERS ERROR]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
