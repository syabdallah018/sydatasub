import { NextRequest, NextResponse } from "next/server";
import { enforceAdminMutationGuard, requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { getDbCapabilities } from "@/lib/db-capabilities";
import { z } from "zod";

const noticeSchema = z.object({
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  severity: z.enum(["INFO", "WARNING", "SUCCESS", "ERROR", "PROMO"]),
  audience: z.string().default("all"),
  network: z.enum(["MTN", "GLO", "AIRTEL", "NINEMOBILE"]).nullable().optional(),
  isActive: z.boolean().default(true),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const dbCaps = await getDbCapabilities();
    if (!dbCaps.serviceNotices) {
      return NextResponse.json(
        { success: true, data: [], featureUnavailable: true },
        { status: 200 }
      );
    }

    const notices = await prisma.serviceNotice.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: notices }, { status: 200 });
  } catch (error: any) {
    console.error("[ADMIN GET NOTICES ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const originError = enforceAdminMutationGuard(req);
    if (originError) return originError;

    await requireAdmin(req);
    const dbCaps = await getDbCapabilities();
    if (!dbCaps.serviceNotices) {
      return NextResponse.json(
        { error: "Service notices table is not available until the database migration is applied." },
        { status: 503 }
      );
    }

    const body = await req.json();
    const data = noticeSchema.parse(body);

    const notice = await prisma.serviceNotice.create({
      data: {
        title: data.title,
        message: data.message,
        severity: data.severity,
        audience: data.audience,
        network: data.network ?? null,
        isActive: data.isActive,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
      },
    });

    return NextResponse.json({ success: true, data: notice }, { status: 201 });
  } catch (error) {
    console.error("[ADMIN CREATE NOTICE ERROR]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
