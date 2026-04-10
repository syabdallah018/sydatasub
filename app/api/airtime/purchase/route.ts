import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { purchaseAirtime } from "@/lib/saiful"
import { z } from "zod"
import bcryptjs from "bcryptjs"

const purchaseSchema = z.object({
  buyerPhone: z.string().regex(/^0[0-9]{10}$/, "Invalid buyer phone"),
  recipientPhone: z.string().regex(/^0[0-9]{10}$/, "Invalid recipient phone number"),
  amount: z.number().min(50, "Minimum amount is ₦50").max(50000, "Maximum amount is ₦50,000"),
  network: z.string().min(1, "Select network"),
  pin: z.string().regex(/^\d{6}$/, "Invalid PIN"),
})

export async function POST(req: NextRequest) {
  try {
    console.log("[AIRTIME PURCHASE] Starting purchase request");
    
    const body = await req.json()
    console.log("[AIRTIME PURCHASE] Request body received:", { buyerPhone: body.buyerPhone, recipientPhone: body.recipientPhone, amount: body.amount, network: body.network });
    
    const { buyerPhone, recipientPhone, amount, network, pin } = purchaseSchema.parse(body)

    // DIRECT AUTH: Look up user by buyerPhone
    console.log("[AIRTIME PURCHASE] Looking up buyer by phone:", buyerPhone);
    const userData = await prisma.user.findUnique({
      where: { phone: buyerPhone },
    })

    if (!userData) {
      console.error("[AIRTIME PURCHASE] ❌ User not found by phone:", buyerPhone);
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      )
    }

    console.log("[AIRTIME PURCHASE] ✅ User found:", { userId: userData.id, phone: userData.phone });

    if (userData.isBanned) {
      console.error("[AIRTIME PURCHASE] ❌ Account banned:", userData.id);
      return NextResponse.json(
        { success: false, error: "Account is banned" },
        { status: 403 }
      )
    }

    // Verify PIN
    if (!userData.pinHash) {
      console.error("[AIRTIME PURCHASE] ❌ PIN not set for user:", userData.id);
      return NextResponse.json(
        { success: false, error: "PIN not set" },
        { status: 400 }
      )
    }

    console.log("[AIRTIME PURCHASE] Verifying PIN...");
    const isPinValid = await bcryptjs.compare(pin, userData.pinHash)
    
    if (!isPinValid) {
      console.error("[AIRTIME PURCHASE] ❌ Invalid PIN for user:", userData.id);
      return NextResponse.json(
        { success: false, error: "Invalid PIN" },
        { status: 401 }
      )
    }

    console.log("[AIRTIME PURCHASE] ✅ PIN verified successfully");

    // Check balance (convert naira to kobo)
    const amountInKobo = amount * 100
    console.log("[AIRTIME PURCHASE] Balance check:", { userBalance: userData.balance, amountNeeded: amountInKobo, sufficient: userData.balance >= amountInKobo });
    
    if (userData.balance < amountInKobo) {
      console.error("[AIRTIME PURCHASE] ❌ Insufficient balance:", { have: userData.balance, need: amountInKobo });
      return NextResponse.json(
        { success: false, error: "Insufficient balance" },
        { status: 400 }
      )
    }

    // Deduct balance and create transaction atomically
    const reference = `AIRTIME-${userData.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    await prisma.$transaction(async (tx) => {
      // Deduct balance (in kobo)
      await tx.user.update({
        where: { id: userData.id },
        data: { balance: { decrement: amountInKobo } },
      })

      // Create transaction (amount in naira for consistency with data purchase)
      await tx.transaction.create({
        data: {
          userId: userData.id,
          type: "AIRTIME_PURCHASE",
          amount: amount,  // Store in naira, not kobo
          status: "PENDING",
          reference,
          description: `Airtime: ₦${amount} to ${recipientPhone}`,
          phone: recipientPhone,
        },
      })
    })

    // Map network names to IDs
    const networkIds: { [key: string]: number } = {
      "mtn": 1,
      "glo": 2,
      "9mobile": 3,
      "airtel": 4,
    }

    // Call airtime provider API
    let apiResult
    try {
      console.log("[AIRTIME PURCHASE] Calling provider API...");
      apiResult = await purchaseAirtime({
        mobileNumber: recipientPhone,
        amount,
        network: networkIds[network.toLowerCase()] || 1,
      })

      if (apiResult.success) {
        // Update transaction to success
        await prisma.transaction.updateMany({
          where: { reference },
          data: { status: "SUCCESS" },
        })

        console.log("[AIRTIME PURCHASE] ✅ SUCCESS:", { userId: userData.id, recipientPhone, amount, reference });

        return NextResponse.json(
          {
            success: true,
            message: "Airtime purchased successfully",
            reference,
          },
          { status: 200 }
        )
      } else {
        // API failed, refund balance
        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: userData.id },
            data: { balance: { increment: amountInKobo } },
          })

          await tx.transaction.updateMany({
            where: { reference },
            data: { status: "FAILED" },
          })
        })

        console.error("[AIRTIME PURCHASE] ❌ API FAILED:", { error: apiResult.message });

        return NextResponse.json(
          { success: false, error: apiResult.message || "Purchase failed" },
          { status: 400 }
        )
      }
    } catch (error) {
      console.error("[AIRTIME PURCHASE API ERROR]", error)

      // Refund on API error
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userData.id },
          data: { balance: { increment: amountInKobo } },
        })

        await tx.transaction.updateMany({
          where: { reference },
          data: { status: "FAILED" },
        })
      })

      console.error("[AIRTIME PURCHASE] ❌ API exception, balance refunded:", { userId: userData.id });
      return NextResponse.json(
        { success: false, error: "Purchase failed. Balance refunded." },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("[AIRTIME PURCHASE ERROR]", error);
    if (error instanceof z.ZodError) {
      console.error("[AIRTIME PURCHASE] ❌ Validation error:", error.issues[0].message);
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      )
    }
    console.error("[AIRTIME PURCHASE] ❌ Unhandled error:", { error: error instanceof Error ? error.message : error });
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    )
  }
}
