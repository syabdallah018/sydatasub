import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deliverGuestData } from "@/lib/data-delivery";
import { checkAndAwardRewards } from "@/lib/rewards";
import { secureCompare } from "@/lib/security";

export async function OPTIONS() {
  return new NextResponse(null, { status: 405 });
}

export async function GET() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("verif-hash");
    const secret = process.env.FLUTTERWAVE_WEBHOOK_SECRET;

    if (!secret) {
      console.error("[WEBHOOK] Missing FLUTTERWAVE_WEBHOOK_SECRET");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
    }

    if (!signature || !secureCompare(signature, secret)) {
      console.warn("[WEBHOOK] Invalid webhook signature");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawBody = await req.text();
    const payload = JSON.parse(rawBody);
    const event = payload?.event;
    const eventData = payload?.data;

    if (event !== "charge.completed" || !eventData?.flw_ref || !eventData?.tx_ref) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    if (String(eventData.status || "").toLowerCase() !== "successful") {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const amount = Number(eventData.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const existingSuccess = await prisma.transaction.findFirst({
      where: {
        OR: [{ flwRef: eventData.flw_ref }, { reference: eventData.tx_ref }],
        status: "SUCCESS",
      },
    });

    if (existingSuccess) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    let transaction = null as Awaited<ReturnType<typeof prisma.transaction.findFirst>>;

    if (String(eventData.tx_ref).startsWith("SYDATA-GUEST-")) {
      transaction = await prisma.transaction.findFirst({
        where: { reference: eventData.tx_ref },
      });

      if (!transaction) {
        return NextResponse.json({ received: true }, { status: 200 });
      }

      if (transaction.amount !== amount) {
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: "FAILED",
            description: `Amount mismatch: expected ${transaction.amount}, received ${amount}`,
            flwRef: eventData.flw_ref,
          },
        });

        return NextResponse.json({ received: true }, { status: 200 });
      }

      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { flwRef: eventData.flw_ref },
      });

      await deliverGuestData(transaction);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const virtualAccount = await prisma.virtualAccount.findFirst({
      where: { orderRef: eventData.tx_ref },
    });

    if (!virtualAccount) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    if (
      eventData.account_number &&
      String(eventData.account_number) !== virtualAccount.accountNumber
    ) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const accountUser = await prisma.user.findUnique({
      where: { id: virtualAccount.userId },
      select: { id: true, phone: true },
    });

    if (!accountUser) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    transaction = await prisma.transaction.findFirst({
      where: {
        userId: accountUser.id,
        type: "WALLET_FUNDING",
        reference: eventData.tx_ref,
      },
    });

    if (!transaction) {
      transaction = await prisma.transaction.create({
        data: {
          userId: accountUser.id,
          phone: accountUser.phone,
          type: "WALLET_FUNDING",
          status: "PENDING",
          amount,
          reference: eventData.tx_ref,
          description: "Wallet top-up via Flutterwave",
        },
      });
    }

    await prisma.$transaction(async (tx) => {
      const currentUser = await tx.user.findUnique({
        where: { id: accountUser.id },
        select: { balance: true },
      });

      if (!currentUser) {
        throw new Error("Wallet funding user not found");
      }

      const amountInKobo = amount * 100;
      const updatedUser = await tx.user.update({
        where: { id: accountUser.id },
        data: { balance: { increment: amountInKobo } },
      });

      await tx.transaction.update({
        where: { id: transaction!.id },
        data: {
          status: "SUCCESS",
          flwRef: eventData.flw_ref,
          balanceBefore: transaction!.balanceBefore ?? currentUser.balance,
          balanceAfter: updatedUser.balance,
          description: "Wallet top-up via Flutterwave",
        },
      });
    });

    await checkAndAwardRewards(accountUser.id, amount, "DEPOSIT");

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("[WEBHOOK ERROR]", error instanceof Error ? error.message : error);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
