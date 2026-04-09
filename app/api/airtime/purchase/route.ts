import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { purchaseAirtime } from "@/lib/saiful";
import bcryptjs from "bcryptjs";
import { z } from "zod";

const purchaseSchema = z.object({
  phone: z.string().regex(/^0[0-9]{10}$/, "Invalid phone number"),
  amount: z.number().min(50, "Minimum amount is ₦50").max(50000, "Maximum amount is ₦50,000"),
  network: z.enum(["MTN", "GLO", "AIRTEL", "NINEMOBILE"]),
  pin: z.string().regex(/^\d{6}$/, "Invalid PIN"),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { phone, amount, network, pin } = purchaseSchema.parse(body);

    // Get user data
    const userData = await prisma.user.findUnique({
      where: { id: user.userId },
    });

    if (!userData) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (userData.isBanned) {
      return NextResponse.json(
        { error: "Account is banned" },
        { status: 403 }
      );
    }

    // Verify PIN
    if (!userData.pinHash) {
      return NextResponse.json(
        { error: "PIN not set" },
        { status: 400 }
      );
    }
    const isPinValid = await bcryptjs.compare(pin, userData.pinHash);
    if (!isPinValid) {
      return NextResponse.json(
        { error: "Invalid PIN" },
        { status: 401 }
      );
    }

    // Check balance (convert naira to kobo)
    const amountInKobo = amount * 100;
    if (userData.balance < amountInKobo) {
      return NextResponse.json(
        { error: "Insufficient balance" },
        { status: 400 }
      );
    }

    // Deduct balance and create transaction atomically
    const reference = `AIRTIME-${user.userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await prisma.$transaction(async (tx) => {
      // Deduct balance (in kobo)
      await tx.user.update({
        where: { id: user.userId },
        data: { balance: { decrement: amountInKobo } },
      });

      // Create transaction (amount in naira)
      await tx.transaction.create({
        data: {
          userId: user.userId,
          type: "AIRTIME_PURCHASE",
          amount,
          status: "PENDING",
          reference,
          description: `${amount} Airtime → ${phone}`,
          phone,
        },
      });
    });

    // Call API B airtime endpoint
    let apiResult;
    try {
      const networkIds: { [key: string]: number } = {
        MTN: 1,
        GLO: 2,
        NINEMOBILE: 3,
        AIRTEL: 4,
      };

      apiResult = await purchaseAirtime({
        mobileNumber: phone,
        amount,
        network: networkIds[network],
      });

      if (apiResult.success) {
        // Update transaction to success
        await prisma.transaction.updateMany({
          where: { reference },
          data: { status: "SUCCESS" },
        });

        return NextResponse.json(
          {
            success: true,
            message: apiResult.message,
            reference,
          },
          { status: 200 }
        );
      } else {
        // API failed, refund balance
        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: user.userId },
            data: { balance: { increment: amountInKobo } },
          });

          await tx.transaction.updateMany({
            where: { reference },
            data: { status: "FAILED" },
          });
        });

        return NextResponse.json(
          { error: apiResult.message || "Airtime purchase failed" },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error("[AIRTIME PURCHASE API ERROR]", error);

      // Refund on API error
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.userId },
          data: { balance: { increment: amountInKobo } },
        });

        await tx.transaction.updateMany({
          where: { reference },
          data: { status: "FAILED" },
        });
      });

      return NextResponse.json(
        { error: "Airtime purchase failed, balance refunded" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[AIRTIME PURCHASE ERROR]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
