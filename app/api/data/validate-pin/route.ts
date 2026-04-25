import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Logging helper - LOGS TO VERCEL IN PRODUCTION + DEVELOPMENT
const log = (step: string, data: any) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[VALIDATE_PIN] ${timestamp} ${step}: ${JSON.stringify(data, null, 2)}`;
  console.log(logMessage);  // Always logs - visible in Vercel
  console.error(`[VALIDATE_PIN_LOG] ${step}`, JSON.stringify(data, null, 2));
};

export async function POST(request: NextRequest) {
  try {
    log("REQUEST", { timestamp: new Date().toISOString() });

    // 1. Authenticate user
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      log("AUTH_FAILED", { reason: "No session" });
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { 
          status: 401,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        }
      );
    }

    log("AUTH_SUCCESS", { userId: sessionUser.userId });

    // 2. Parse request body
    const body = await request.json();
    const { pin } = body;
    log("REQUEST_BODY", { pinProvided: !!pin });

    if (!pin || typeof pin !== "string") {
      log("VALIDATION_ERROR", { reason: "PIN is required" });
      return NextResponse.json(
        { error: "PIN is required" },
        { 
          status: 400,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        }
      );
    }

    // 3. Fetch user from DB
    const user = await queryOne<{ pin: string | null }>(
      "SELECT pin FROM \"User\" WHERE id = $1",
      [sessionUser.userId]
    );

    if (!user) {
      log("USER_NOT_FOUND", { userId: sessionUser.userId });
      return NextResponse.json(
        { error: "User not found" },
        { 
          status: 404,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        }
      );
    }

    // 4. Check if PIN is set
    if (!user.pin) {
      log("PIN_NOT_SET", { userId: sessionUser.userId });
      return NextResponse.json(
        { error: "PIN not set. Please set your PIN first." },
        { 
          status: 400,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        }
      );
    }

    // 5. Verify PIN with bcrypt
    const isValid = await bcrypt.compare(pin, user.pin);
    log("PIN_VALIDATION", { isValid });

    if (!isValid) {
      log("PIN_INVALID", { userId: sessionUser.userId });
      return NextResponse.json(
        { error: "Incorrect PIN." },
        { 
          status: 401,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        }
      );
    }

    // 6. Return success
    log("RESPONSE_200", { message: "PIN validated successfully" });
    return NextResponse.json(
      { message: "PIN validated successfully", valid: true },
      { 
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      }
    );
  } catch (error: any) {
    log("ERROR_500", { error: error.message, stack: error.stack });
    return NextResponse.json(
      { error: "PIN validation failed", details: error.message },
      { 
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      }
    );
  }
}
