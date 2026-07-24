import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { z } from "zod";

const beneficiarySchema = z.object({
  name: z.string().min(1, "Beneficiary name is required"),
  phone: z.string().regex(/^0[0-9]{10}$/, "Invalid 11-digit phone number"),
  network: z.string().min(1, "Network is required"),
});

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const beneficiaries = await prisma.beneficiary.findMany({
      where: { userId: sessionUser.userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, beneficiaries }, { status: 200 });
  } catch (error) {
    console.error("[BENEFICIARIES GET ERROR]", error);
    return NextResponse.json({ error: "Failed to fetch beneficiaries" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, phone, network } = beneficiarySchema.parse(body);

    const existing = await prisma.beneficiary.findUnique({
      where: {
        userId_phone: {
          userId: sessionUser.userId,
          phone,
        },
      },
    });

    if (existing) {
      const updated = await prisma.beneficiary.update({
        where: { id: existing.id },
        data: { name, network },
      });
      return NextResponse.json({ success: true, beneficiary: updated, isUpdate: true }, { status: 200 });
    }

    const beneficiary = await prisma.beneficiary.create({
      data: {
        userId: sessionUser.userId,
        name,
        phone,
        network: network.toUpperCase(),
      },
    });

    return NextResponse.json({ success: true, beneficiary }, { status: 201 });
  } catch (error: any) {
    console.error("[BENEFICIARIES POST ERROR]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to save beneficiary" }, { status: 500 });
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
      return NextResponse.json({ error: "Beneficiary ID required" }, { status: 400 });
    }

    await prisma.beneficiary.deleteMany({
      where: { id, userId: sessionUser.userId },
    });

    return NextResponse.json({ success: true, message: "Beneficiary deleted" }, { status: 200 });
  } catch (error) {
    console.error("[BENEFICIARIES DELETE ERROR]", error);
    return NextResponse.json({ error: "Failed to delete beneficiary" }, { status: 500 });
  }
}
