import { NextResponse } from "next/server";
import { getAirtimeCashFeePercent } from "@/lib/airtime-cash-config";

export async function GET() {
  try {
    const feePercent = await getAirtimeCashFeePercent();
    return NextResponse.json(
      {
        success: true,
        data: {
          feePercent,
          payoutPercent: 100 - feePercent,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET AIRTIME CASH SETTINGS ERROR]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
