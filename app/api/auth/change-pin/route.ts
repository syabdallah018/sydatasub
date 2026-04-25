import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const log = (step: string, data: any) => {
  if (process.env.NODE_ENV === "development") {
    console.log(`[CHANGE_PIN] ${step}:`, JSON.stringify(data, null, 2));
  }
};

export async function POST(request: NextRequest) {
  try {
    log("REQUEST_START", { timestamp: new Date().toISOString() });

    // 1. AUTHENTICATE USER
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      log("AUTH_FAILED", { reason: "No session user" });
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    const userId = sessionUser.userId;
    log("AUTH_SUCCESS", { userId });

    // 2. PARSE REQUEST BODY
    const body = await request.json();
    const { currentPin, newPin } = body;
    log("REQUEST_BODY", { currentPinProvided: !!currentPin, newPinProvided: !!newPin });

    // 3. VALIDATE INPUTS
    if (!currentPin || !newPin) {
      log("VALIDATION_ERROR", { missingFields: { currentPin: !currentPin, newPin: !newPin } });
      return NextResponse.json(
        { message: "Current PIN and new PIN are required" },
        { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    if (currentPin.length !== 6 || newPin.length !== 6) {
      log("VALIDATION_ERROR", { reason: "PIN must be exactly 6 digits" });
      return NextResponse.json(
        { message: "PIN must be exactly 6 digits" },
        { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    if (currentPin === newPin) {
      log("VALIDATION_ERROR", { reason: "New PIN must be different from current PIN" });
      return NextResponse.json(
        { message: "New PIN must be different from current PIN" },
        { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    // 4. FETCH USER AND VERIFY CURRENT PIN
    const user = await queryOne<{ pin: string | null }>(
      `SELECT pin FROM "User" WHERE id = $1`,
      [userId]
    );

    if (!user) {
      log("USER_NOT_FOUND", { userId });
      return NextResponse.json(
        { message: "User not found" },
        { status: 404, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    log("USER_FETCHED", { userId, hasPinSet: !!user.pin });

    // 5. VERIFY CURRENT PIN
    if (!user.pin) {
      log("PIN_NOT_SET", { userId });
      return NextResponse.json(
        { message: "No PIN currently set. Please set one first." },
        { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    const isPinValid = await bcrypt.compare(currentPin, user.pin);
    if (!isPinValid) {
      log("PIN_VERIFICATION_FAILED", { userId });
      return NextResponse.json(
        { message: "Incorrect current PIN" },
        { status: 401, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    log("PIN_VERIFIED", { userId });

    // 6. HASH NEW PIN
    const hashedNewPin = await bcrypt.hash(newPin, 10);
    log("NEW_PIN_HASHED", { userId });

    // 7. UPDATE PIN IN DATABASE
    const updated = await queryOne<{ id: string }>(
      `UPDATE "User"
       SET pin = $1, "updatedAt" = NOW()
       WHERE id = $2
       RETURNING id`,
      [hashedNewPin, userId]
    );

    if (!updated) {
      log("UPDATE_FAILED", { userId });
      throw new Error("Failed to update PIN");
    }

    log("PIN_UPDATED_SUCCESS", { userId });

    // 8. RETURN SUCCESS
    return NextResponse.json(
      { message: "PIN changed successfully" },
      { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  } catch (error: any) {
    log("ERROR_500", { error: error.message, stack: error.stack });
    return NextResponse.json(
      { message: "Failed to change PIN", details: error.message },
      { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }
}
