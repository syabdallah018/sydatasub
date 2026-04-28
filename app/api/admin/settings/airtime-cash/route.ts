import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceAdminMutationGuard, logAdminAction, requireAdmin } from "@/lib/adminAuth";
import { getAirtimeCashFeePercent, setAirtimeCashFeePercent } from "@/lib/airtime-cash-config";

const updateSchema = z.object({
  feePercent: z.number().min(0).max(100),
});

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const feePercent = await getAirtimeCashFeePercent();
    return NextResponse.json(
      { success: true, data: { feePercent, payoutPercent: 100 - feePercent } },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[ADMIN AIRTIME CASH GET ERROR]", error);
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const guardError = enforceAdminMutationGuard(req);
    if (guardError) return guardError;

    await requireAdmin(req);
    const body = await req.json();
    const { feePercent } = updateSchema.parse(body);
    const updated = await setAirtimeCashFeePercent(feePercent);

    logAdminAction(req, "airtime_cash_fee_update", {
      feePercent: updated,
      payoutPercent: 100 - updated,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Airtime-to-cash fee updated successfully",
        data: { feePercent: updated, payoutPercent: 100 - updated },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[ADMIN AIRTIME CASH PATCH ERROR]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid payload" }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
