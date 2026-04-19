"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, TrendingUp, Users, DollarSign, Activity } from "lucide-react";

interface Stats {
  totalUsers: number;
  totalTransactions: number;
  totalRevenue: number;
  todayRevenue: number;
}

interface ChartData {
  transactionTrend: Array<{ date: string; count: number }>;
  revenueByNetwork: Array<{ name: string; value: number }>;
  topPlans: Array<{ name: string; count: number }>;
}

interface RecentTx {
  id: string;
  reference: string;
  type: string;
  status: string;
  amount: number;
  phone: string;
  createdAt: string;
  userName: string;
  planName: string;
}

interface AnalyticsData {
  stats: Stats;
  chartData: ChartData;
  recentTransactions: RecentTx[];
}

const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b"];

const getStatusColor = (status: string) => {
  switch (status) {
    case "SUCCESS":
      return "bg-green-100 text-green-800";
    case "FAILED":
      return "bg-red-100 text-red-800";
    case "PENDING":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch("/api/admin/analytics");
        if (!response.ok) {
          throw new Error("Failed to fetch analytics");
        }
        const analytics = await response.json();
        setData(analytics);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg p-6 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-20 mb-3" />
              <div className="h-8 bg-slate-200 rounded w-32" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-red-900">Error</h3>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { stats, chartData, recentTransactions } = data;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Users</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">
                {stats.totalUsers.toLocaleString()}
              </p>
            </div>
            <Users className="w-12 h-12 text-blue-300" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">
                Total Transactions
              </p>
              <p className="text-3xl font-bold text-purple-900 mt-2">
                {stats.totalTransactions.toLocaleString()}
              </p>
            </div>
            <Activity className="w-12 h-12 text-purple-300" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">
                Total Revenue
              </p>
              <p className="text-3xl font-bold text-green-900 mt-2">
                ₦{(stats.totalRevenue / 1000).toFixed(0)}K
              </p>
            </div>
            <DollarSign className="w-12 h-12 text-green-300" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">
                Today's Revenue
              </p>
              <p className="text-3xl font-bold text-orange-900 mt-2">
                ₦{stats.todayRevenue.toLocaleString()}
              </p>
            </div>
            <TrendingUp className="w-12 h-12 text-orange-300" />
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart */}
        <Card className="lg:col-span-2 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Transactions Over Last 7 Days
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData.transactionTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#3b82f6"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Pie Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Revenue by Network
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData.revenueByNetwork}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent = 0 }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.revenueByNetwork.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Bar Chart */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Top 5 Plans by Sales Volume
        </h3>
        {chartData.topPlans && chartData.topPlans.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.topPlans}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12 text-slate-500">
            No plan data available yet
          </div>
        )}
      </Card>

      {/* Recent Transactions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Recent Transactions
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 font-semibold text-slate-700">
                  Reference
                </th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">
                  User
                </th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">
                  Type
                </th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">
                  Plan
                </th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">
                  Amount
                </th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">
                  Status
                </th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((tx) => (
                <tr
                  key={tx.id}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="py-3 px-4 font-mono text-xs text-slate-600">
                    {tx.reference.slice(0, 12)}...
                  </td>
                  <td className="py-3 px-4">{tx.userName}</td>
                  <td className="py-3 px-4">
                    <Badge variant="outline">{tx.type}</Badge>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{tx.planName}</td>
                  <td className="py-3 px-4 font-semibold">₦{tx.amount.toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <Badge className={getStatusColor(tx.status)}>
                      {tx.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-500">
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
