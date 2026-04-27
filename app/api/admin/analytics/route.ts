import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { subDays, startOfDay, endOfDay } from "date-fns";

/**
 * GET /api/admin/analytics
 * Returns comprehensive analytics for admin dashboard
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);

    // Get total users
    const totalUsers = await prisma.user.count();

    // Total transactions should include all statuses for accurate dashboard volume.
    const totalTransactions = await prisma.transaction.count();

    // Get total revenue (successful data/airtime purchases in naira)
    const totalRevenueData = await prisma.transaction.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        status: "SUCCESS",
        type: { in: ["DATA_PURCHASE", "AIRTIME_PURCHASE"] },
      },
    });

    const totalRevenue = totalRevenueData._sum.amount || 0;

    // Get today's revenue
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    const todayRevenueData = await prisma.transaction.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        status: "SUCCESS",
        type: { in: ["DATA_PURCHASE", "AIRTIME_PURCHASE"] },
        createdAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    const todayRevenue = todayRevenueData._sum.amount || 0;

    // Get last 7 days transaction counts (for line chart)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const count = await prisma.transaction.count({
        where: {
          status: "SUCCESS",
          createdAt: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
      });

      last7Days.push({
        date: date.toLocaleDateString("en-US", { 
          weekday: "short", 
          month: "short", 
          day: "numeric" 
        }),
        count,
      });
    }

    // Get revenue by network through raw SQL
    const networkRevenue = await prisma.$queryRaw<
      Array<{ network: string; total: number }>
    >`
      SELECT 
        p.network,
        CAST(SUM(t.amount) AS INTEGER) as total
      FROM transactions t
      LEFT JOIN plans p ON t."planId" = p.id
      WHERE t.status = 'SUCCESS' 
        AND t.type IN ('DATA_PURCHASE', 'AIRTIME_PURCHASE')
      GROUP BY p.network
    `;

    const pieChartData = [
      { name: "MTN", value: 0 },
      { name: "GLO", value: 0 },
      { name: "AIRTEL", value: 0 },
      { name: "NINEMOBILE", value: 0 },
    ];

    networkRevenue.forEach((item: any) => {
      const idx = pieChartData.findIndex((d) => d.name === item.network);
      if (idx !== -1) {
        pieChartData[idx].value = item.total;
      }
    });

    // Get top 5 plans by sales volume
    const topPlans = await prisma.$queryRaw<
      Array<{ name: string; count: number }>
    >`
      SELECT 
        p.name,
        COUNT(t.id) as count
      FROM transactions t
      LEFT JOIN plans p ON t."planId" = p.id
      WHERE t.status = 'SUCCESS' AND t.type = 'DATA_PURCHASE'
      GROUP BY p.id, p.name
      ORDER BY count DESC
      LIMIT 5
    `;

    const topPlansData = (topPlans || []).map((plan: any) => ({
      name: plan.name || "Unknown",
      count: Number(plan.count) || 0,
    }));

    // Get recent 20 transactions
    const recentTransactions = await prisma.transaction.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        reference: true,
        type: true,
        status: true,
        amount: true,
        phone: true,
        createdAt: true,
        user: {
          select: {
            fullName: true,
          },
        },
        plan: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        stats: {
          totalUsers,
          totalTransactions,
          totalRevenue,
          todayRevenue,
        },
        chartData: {
          transactionTrend: last7Days,
          revenueByNetwork: pieChartData,
          topPlans: topPlansData,
        },
        recentTransactions: recentTransactions.map((tx) => ({
          ...tx,
          userName: tx.user?.fullName || "Guest",
          planName: tx.plan?.name || "N/A",
        })),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[ADMIN ANALYTICS ERROR]", error);

    if (error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
