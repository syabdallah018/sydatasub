import { NextRequest, NextResponse } from "next/server";
import { enforceAdminMutationGuard, requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  subtitle: z.string().min(1).optional(),
  badge: z.string().min(1).optional(),
  tag: z.string().optional(),
  icon: z.string().min(1).optional(),
  theme: z.enum(["NIGERIA_GREEN", "GOLD", "BLUE", "PURPLE", "RED"]).optional(),
  accentColor: z.string().nullable().optional(),
  message: z.string().min(1).optional(),
  stat1Top: z.string().nullable().optional(),
  stat1Bottom: z.string().nullable().optional(),
  stat2Top: z.string().nullable().optional(),
  stat2Bottom: z.string().nullable().optional(),
  stat3Top: z.string().nullable().optional(),
  stat3Bottom: z.string().nullable().optional(),
  actionText: z.string().optional(),
  shareText: z.string().nullable().optional(),
  dismissText: z.string().optional(),
  isActive: z.boolean().optional(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  priority: z.number().int().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const originError = enforceAdminMutationGuard(req);
    if (originError) return originError;

    await requireAdmin(req);
    const { id } = await params;

    const body = await req.json();
    const data = updateSchema.parse(body);

    const updated = await prisma.celebration.update({
      where: { id },
      data: {
        ...data,
        startsAt: data.startsAt === undefined ? undefined : data.startsAt ? new Date(data.startsAt) : null,
        endsAt: data.endsAt === undefined ? undefined : data.endsAt ? new Date(data.endsAt) : null,
      },
    });

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error: any) {
    console.error("[ADMIN UPDATE CELEBRATION ERROR]", error);
    if (error?.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const originError = enforceAdminMutationGuard(req);
    if (originError) return originError;

    await requireAdmin(req);
    const { id } = await params;

    await prisma.celebration.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("[ADMIN DELETE CELEBRATION ERROR]", error);
    if (error?.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
