import { NextRequest, NextResponse } from "next/server";

export async function POST(_req: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      message: "Manual payment verification is temporarily unavailable while payment gateway migration is in progress.",
      status: "UNAVAILABLE",
    },
    { status: 503 }
  );
}
