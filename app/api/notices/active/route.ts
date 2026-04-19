import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const now = new Date();
    const notices = await prisma.serviceNotice.findMany({
      where: {
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ success: true, data: notices }, { status: 200 });
  } catch (error) {
    console.error("[ACTIVE NOTICES ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
