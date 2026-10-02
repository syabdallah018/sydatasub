import { NextRequest, NextResponse } from "next/server";
import { enforceAdminMutationGuard, requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { ensureDefaultCelebration } from "@/lib/celebrations";
import { z } from "zod";

const celebrationSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subtitle: z.string().min(1, "Subtitle is required"),
  badge: z.string().min(1, "Badge text is required"),
  tag: z.string().optional().default("OFFICIAL CELEBRATION"),
  icon: z.string().min(1, "Icon/emoji is required").default("🇳🇬"),
  theme: z.enum(["NIGERIA_GREEN", "GOLD", "BLUE", "PURPLE", "RED"]).default("NIGERIA_GREEN"),
  accentColor: z.string().nullable().optional(),
  message: z.string().min(1, "Message is required"),
  stat1Top: z.string().nullable().optional(),
  stat1Bottom: z.string().nullable().optional(),
  stat2Top: z.string().nullable().optional(),
  stat2Bottom: z.string().nullable().optional(),
  stat3Top: z.string().nullable().optional(),
  stat3Bottom: z.string().nullable().optional(),
  actionText: z.string().optional().default("Share with Friends & Community"),
  shareText: z.string().nullable().optional(),
  dismissText: z.string().optional().default("Keep Celebrating 🚀"),
  isActive: z.boolean().default(true),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  priority: z.number().int().default(0),
});

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    await ensureDefaultCelebration();

    const celebrations = await prisma.celebration.findMany({
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ success: true, data: celebrations }, { status: 200 });
  } catch (error: any) {
    console.error("[ADMIN GET CELEBRATIONS ERROR]", error);
    if (error?.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const originError = enforceAdminMutationGuard(req);
    if (originError) return originError;

    await requireAdmin(req);

    const body = await req.json();
    const data = celebrationSchema.parse(body);

    const celebration = await prisma.celebration.create({
      data: {
        title: data.title,
        subtitle: data.subtitle,
        badge: data.badge,
        tag: data.tag || "OFFICIAL CELEBRATION",
        icon: data.icon,
        theme: data.theme,
        accentColor: data.accentColor ?? null,
        message: data.message,
        stat1Top: data.stat1Top ?? null,
        stat1Bottom: data.stat1Bottom ?? null,
        stat2Top: data.stat2Top ?? null,
        stat2Bottom: data.stat2Bottom ?? null,
        stat3Top: data.stat3Top ?? null,
        stat3Bottom: data.stat3Bottom ?? null,
        actionText: data.actionText || "Share with Friends & Community",
        shareText: data.shareText ?? null,
        dismissText: data.dismissText || "Keep Celebrating 🚀",
        isActive: data.isActive,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        priority: data.priority,
      },
    });

    return NextResponse.json({ success: true, data: celebration }, { status: 201 });
  } catch (error: any) {
    console.error("[ADMIN CREATE CELEBRATION ERROR]", error);
    if (error?.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
