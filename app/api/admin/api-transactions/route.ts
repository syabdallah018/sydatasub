import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { dispatchDeveloperWebhook } from "@/lib/webhook-dispatcher";

/**
 * GET /api/admin/api-transactions
 * List API transactions with filters, search, metrics, and pagination
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const network = searchParams.get("network");
    const developerId = searchParams.get("developerId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const skip = (page - 1) * limit;

    // Build where clause for API transactions
    // Filter transactions associated with a user having a developer profile or description starting with 'Developer API'
    const where: any = {
      OR: [
        { description: { startsWith: "Developer API" } },
        { user: { developerProfile: { isNot: null } } },
      ],
    };

    if (developerId && developerId !== "ALL") {
      where.userId = developerId;
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (network && network !== "ALL") {
      where.plan = {
        network: network,
      };
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (search) {
      where.AND = [
        {
          OR: [
            { phone: { contains: search, mode: "insensitive" } },
            { reference: { contains: search, mode: "insensitive" } },
            { externalReference: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
            {
              user: {
                OR: [
                  { fullName: { contains: search, mode: "insensitive" } },
                  { phone: { contains: search, mode: "insensitive" } },
                  { email: { contains: search, mode: "insensitive" } },
                ],
              },
            },
          ],
        },
      ];
    }

    // Aggregate overall metrics for API transactions
    const [
      totalCount,
      successCount,
      failedCount,
      pendingCount,
      volumeAggregate,
      transactions,
      developersList,
    ] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.count({ where: { ...where, status: "SUCCESS" } }),
      prisma.transaction.count({ where: { ...where, status: "FAILED" } }),
      prisma.transaction.count({ where: { ...where, status: "PENDING" } }),
      prisma.transaction.aggregate({
        where,
        _sum: { amount: true },
      }),
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          reference: true,
          externalReference: true,
          type: true,
          status: true,
          amount: true,
          phone: true,
          description: true,
          apiUsed: true,
          balanceBefore: true,
          balanceAfter: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              email: true,
              balance: true,
              developerProfile: {
                select: {
                  id: true,
                  apiKey: true,
                  webhookUrl: true,
                  status: true,
                },
              },
            },
          },
          plan: {
            select: {
              id: true,
              name: true,
              sizeLabel: true,
              network: true,
              price: true,
              user_price: true,
              agent_price: true,
              apiSource: true,
            },
          },
        },
      }),
      prisma.developerProfile.findMany({
        select: {
          userId: true,
          apiKey: true,
          webhookUrl: true,
          status: true,
          user: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const formattedTransactions = transactions.map((tx) => ({
      ...tx,
      userName: tx.user?.fullName || "Guest",
      userPhone: tx.user?.phone || "N/A",
      userEmail: tx.user?.email || "N/A",
      devApiKey: tx.user?.developerProfile?.apiKey || null,
      devWebhookUrl: tx.user?.developerProfile?.webhookUrl || null,
      planName: tx.plan?.name || "N/A",
      planSize: tx.plan?.sizeLabel || "",
      network: tx.plan?.network || "",
    }));

    return NextResponse.json(
      {
        success: true,
        transactions: formattedTransactions,
        developers: developersList.map((d) => ({
          userId: d.userId,
          fullName: d.user?.fullName,
          phone: d.user?.phone,
          email: d.user?.email,
          status: d.status,
          webhookUrl: d.webhookUrl,
        })),
        metrics: {
          totalCount,
          successCount,
          failedCount,
          pendingCount,
          totalVolume: volumeAggregate._sum.amount || 0,
        },
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit) || 1,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[ADMIN GET API TRANSACTIONS ERROR]", error);
    if (error.message?.includes("Unauthorized")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

const createApiTxSchema = z.object({
  userId: z.string().min(1, "Developer user ID is required"),
  phone: z.string().regex(/^0\d{10}$/, "Invalid recipient phone number"),
  planId: z.string().min(1, "Plan ID is required"),
  reference: z.string().min(3, "Reference must be at least 3 characters"),
  status: z.enum(["SUCCESS", "PENDING", "FAILED"]).default("SUCCESS"),
  externalReference: z.string().optional(),
  description: z.string().optional(),
  dispatchWebhook: z.boolean().default(true),
});

/**
 * POST /api/admin/api-transactions
 * Create / simulate an API transaction record
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);

    const body = await req.json().catch(() => ({}));
    const parsed = createApiTxSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { userId, phone, planId, reference, status, externalReference, description, dispatchWebhook } = parsed.data;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { developerProfile: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "Target user not found" }, { status: 404 });
    }

    // Check duplicate reference
    const existingTx = await prisma.transaction.findUnique({
      where: { reference },
    });
    if (existingTx) {
      return NextResponse.json({ success: false, error: "Duplicate transaction reference detected" }, { status: 409 });
    }

    // Find plan
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    });
    if (!plan) {
      return NextResponse.json({ success: false, error: "Data plan not found" }, { status: 404 });
    }

    const txAmount = plan.price;
    const finalDescription = description || `Developer API: ${plan.name} -> ${phone}`;

    const createdTx = await prisma.transaction.create({
      data: {
        userId: user.id,
        type: "DATA_PURCHASE",
        status,
        amount: txAmount,
        phone,
        planId: plan.id,
        reference,
        externalReference: externalReference || null,
        description: finalDescription,
        balanceBefore: user.balance,
        balanceAfter: user.balance,
        apiUsed: plan.apiSource,
      },
      include: {
        user: {
          select: {
            fullName: true,
            phone: true,
            email: true,
            developerProfile: true,
          },
        },
        plan: true,
      },
    });

    if (dispatchWebhook && user.developerProfile?.webhookUrl) {
      dispatchDeveloperWebhook(user.id, createdTx);
    }

    return NextResponse.json({ success: true, transaction: createdTx }, { status: 201 });
  } catch (error: any) {
    console.error("[ADMIN POST API TRANSACTION ERROR]", error);
    if (error.message?.includes("Unauthorized")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 });
  }
}
