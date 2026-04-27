import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

function toInt(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), min), max);
}

function isMissingWebhookEventsTable(error: unknown) {
  if (typeof error !== "object" || error === null) return false;
  if (!("code" in error) || (error as { code?: string }).code !== "P2021") return false;
  const table = String((error as { meta?: { table?: string } }).meta?.table || "");
  return table.includes("payment_webhook_events");
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);

    const page = toInt(req.nextUrl.searchParams.get("page"), 1, 1, 5000);
    const limit = toInt(req.nextUrl.searchParams.get("limit"), 50, 1, 200);
    const statusFilter = (req.nextUrl.searchParams.get("status") || "ALL").toUpperCase();
    const providerFilter = (req.nextUrl.searchParams.get("provider") || "BILLSTACK").toUpperCase();

    const where: {
      provider?: string;
      status?: string;
    } = {};
    if (providerFilter !== "ALL") where.provider = providerFilter;
    if (statusFilter !== "ALL") where.status = statusFilter;

    const [total, events, processedCount, receivedCount, failedCount] = await prisma.$transaction([
      prisma.paymentWebhookEvent.count({ where }),
      prisma.paymentWebhookEvent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.paymentWebhookEvent.count({
        where: {
          ...(providerFilter === "ALL" ? {} : { provider: providerFilter }),
          status: "PROCESSED",
        },
      }),
      prisma.paymentWebhookEvent.count({
        where: {
          ...(providerFilter === "ALL" ? {} : { provider: providerFilter }),
          status: "RECEIVED",
        },
      }),
      prisma.paymentWebhookEvent.count({
        where: {
          ...(providerFilter === "ALL" ? {} : { provider: providerFilter }),
          status: "FAILED",
        },
      }),
    ]);

    const txIds = events
      .map((evt) => evt.transactionId)
      .filter((value): value is string => Boolean(value));

    const transactions = txIds.length
      ? await prisma.transaction.findMany({
          where: { id: { in: txIds } },
          select: {
            id: true,
            reference: true,
            phone: true,
            amount: true,
            status: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                fullName: true,
                phone: true,
              },
            },
          },
        })
      : [];

    const txMap = new Map(transactions.map((tx) => [tx.id, tx]));
    const data = events.map((evt) => {
      const linkedTx = evt.transactionId ? txMap.get(evt.transactionId) : undefined;
      return {
        id: evt.id,
        provider: evt.provider,
        eventType: evt.eventType,
        status: evt.status,
        transactionReference: evt.transactionReference,
        interbankReference: evt.interbankReference,
        merchantReference: evt.merchantReference,
        amount: evt.amount,
        createdAt: evt.createdAt,
        processedAt: evt.processedAt,
        payload: evt.payload,
        signatureAccepted: true,
        credited: Boolean(linkedTx),
        linkedTransaction: linkedTx
          ? {
              id: linkedTx.id,
              reference: linkedTx.reference,
              phone: linkedTx.phone,
              amount: linkedTx.amount,
              status: linkedTx.status,
              createdAt: linkedTx.createdAt,
              userId: linkedTx.user?.id || null,
              userName: linkedTx.user?.fullName || null,
              userPhone: linkedTx.user?.phone || null,
            }
          : null,
      };
    });

    return NextResponse.json(
      {
        success: true,
        data,
        pagination: {
          page,
          limit,
          total,
          pages: Math.max(1, Math.ceil(total / limit)),
        },
        summary: {
          total,
          credited: data.filter((item) => item.credited).length,
          processed: processedCount || 0,
          received: receivedCount || 0,
          failed: failedCount || 0,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[ADMIN WEBHOOKS ERROR]", error);
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (isMissingWebhookEventsTable(error)) {
      return NextResponse.json(
        {
          success: true,
          data: [],
          pagination: { page: 1, limit: 50, total: 0, pages: 1 },
          summary: { total: 0, credited: 0, processed: 0, received: 0, failed: 0 },
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
