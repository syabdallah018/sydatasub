import { NextRequest, NextResponse } from "next/server"
import { clearUserSessionCookie } from "@/lib/auth";
import { rejectCrossSiteMutation } from "@/lib/security";

export async function POST(req: NextRequest) {
  const originError = rejectCrossSiteMutation(req);
  if (originError) return originError;

  const response = NextResponse.json({ success: true })
  clearUserSessionCookie(response)
  return response
}
