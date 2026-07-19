import { NextRequest, NextResponse } from "next/server";
import { verifyDeveloperRequest } from "@/lib/developer-auth";

export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyDeveloperRequest(req);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const { user } = authResult;

    // Convert balance from Kobo to Naira
    const balanceInNaira = user.balance / 100;

    return NextResponse.json(
      {
        success: true,
        balance: balanceInNaira,
        balanceKobo: user.balance,
        currency: "NGN",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[DEV BALANCE API ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
