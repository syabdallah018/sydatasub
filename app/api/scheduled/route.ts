import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { z } from "zod";
import { processDueScheduledTopUps } from "@/lib/scheduled-processor";

export const dynamic = "force-dynamic";

const createScheduleSchema = z.object({
  type: z.enum(["REMINDER", "AUTO_PURCHASE"]),
  category: z.enum(["DATA", "AIRTIME"]),
  network: z.string().min(1, "Network is required"),
  phone: z.string().regex(/^0[0-9]{10}$/, "Invalid 11-digit phone number"),
  planId: z.string().nullish(),
  airtimeAmount: z
    .union([z.number(), z.string()])
    .nullish()
    .transform((val) => {
      if (val === null || val === undefined || val === "") return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    }),
  scheduledAt: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid scheduled date/time"),
});

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Process any due schedules immediately
    await processDueScheduledTopUps().catch((err) =>
      console.error("[SCHEDULE GET PROCESS ERROR]", err)
    );

    const scheduledTopUps = await prisma.scheduledTopUp.findMany({
      where: { userId: sessionUser.userId },
      orderBy: { scheduledAt: "desc" },
    });

    return NextResponse.json({ success: true, scheduledTopUps }, { status: 200 });
  } catch (error) {
    console.error("[SCHEDULED TOPUPS GET ERROR]", error);
    return NextResponse.json({ error: "Failed to fetch scheduled top-ups" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type, category, network, phone, planId, airtimeAmount, scheduledAt } =
      createScheduleSchema.parse(body);

    const targetDate = new Date(scheduledAt);
    if (targetDate.getTime() <= Date.now() + 60 * 1000) {
      return NextResponse.json(
        { error: "Schedule time must be at least 1 minute in the future" },
        { status: 400 }
      );
    }

    if (category === "DATA" && !planId) {
      return NextResponse.json({ error: "Data plan is required for data schedule" }, { status: 400 });
    }

    if (category === "AIRTIME" && (!airtimeAmount || airtimeAmount < 50)) {
      return NextResponse.json({ error: "Airtime amount must be at least ₦50" }, { status: 400 });
    }

    const item = await prisma.scheduledTopUp.create({
      data: {
        userId: sessionUser.userId,
        type,
        category,
        network: network.toUpperCase(),
        phone,
        planId: planId || null,
        airtimeAmount: airtimeAmount || null,
        scheduledAt: targetDate,
        status: "PENDING",
      },
    });

    return NextResponse.json({ success: true, scheduledTopUp: item }, { status: 201 });
  } catch (error: any) {
    console.error("[SCHEDULED TOPUP POST ERROR]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create scheduled top-up" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Schedule ID required" }, { status: 400 });
    }

    await prisma.scheduledTopUp.updateMany({
      where: { id, userId: sessionUser.userId, status: "PENDING" },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json({ success: true, message: "Scheduled top-up cancelled" }, { status: 200 });
  } catch (error) {
    console.error("[SCHEDULED TOPUP DELETE ERROR]", error);
    return NextResponse.json({ error: "Failed to cancel scheduled top-up" }, { status: 500 });
  }
}
