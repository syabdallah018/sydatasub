import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { purchaseAirtime } from "@/lib/saiful"
import { z } from "zod"

const purchaseSchema = z.object({
  phone: z.string().regex(/^0[0-9]{10}$/, "Invalid phone number"),
  amount: z.number().min(50, "Minimum amount is ₦50").max(50000, "Maximum amount is ₦50,000"),
  network: z.string().min(1, "Select network"),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req)

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { phone, amount, network } = purchaseSchema.parse(body)

    // Get user data
    const userData = await prisma.user.findUnique({
      where: { id: user.userId },
    })

    if (!userData) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      )
    }

    // Check balance (convert naira to kobo)
    const amountInKobo = amount * 100
    if (userData.balance < amountInKobo) {
      return NextResponse.json(
        { success: false, error: "Insufficient balance" },
        { status: 400 }
      )
    }

    // Deduct balance and create transaction atomically
    const reference = `AIRTIME-${user.userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    await prisma.$transaction(async (tx) => {
      // Deduct balance (in kobo)
      await tx.user.update({
        where: { id: user.userId },
        data: { balance: { decrement: amountInKobo } },
      })

      // Create transaction (amount in kobo for consistency)
      await tx.transaction.create({
        data: {
          userId: user.userId,
          type: "AIRTIME_PURCHASE",
          amount: amountInKobo,
          status: "PENDING",
          reference,
          description: `${amount} Airtime to ${phone}`,
          phone,
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
      apiResult = await purchaseAirtime({
        mobileNumber: phone,
        amount,
        network: networkIds[network.toLowerCase()] || 1,
      })

      if (apiResult.success) {
        // Update transaction to success
        await prisma.transaction.updateMany({
          where: { reference },
          data: { status: "SUCCESS" },
        })

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
            where: { id: user.userId },
            data: { balance: { increment: amountInKobo } },
          })

          await tx.transaction.updateMany({
            where: { reference },
            data: { status: "FAILED" },
          })
        })

        return NextResponse.json(
          { success: false, error: apiResult.message || "Airtime purchase failed" },
          { status: 400 }
        )
      }
    } catch (error) {
      console.error("[AIRTIME PURCHASE API ERROR]", error)

      // Refund on API error
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.userId },
          data: { balance: { increment: amountInKobo } },
        })

        await tx.transaction.updateMany({
          where: { reference },
          data: { status: "FAILED" },
        })
      })

      return NextResponse.json(
        { success: false, error: "Purchase failed. Balance refunded." },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("[AIRTIME PURCHASE ERROR]", error)
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    )
  }
}
