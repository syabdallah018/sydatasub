import { NextRequest } from "next/server";
import { clearAdminSessionResponse } from "@/lib/adminAuth";
import { rejectCrossSiteMutation } from "@/lib/security";

export async function POST(req: NextRequest) {
  const originError = rejectCrossSiteMutation(req, { requireOrigin: true });
  if (originError) return originError;

  return clearAdminSessionResponse();
}
