"use client";

import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Skeleton className="h-80 rounded-lg" />
        </div>
        <div>
          <Skeleton className="h-80 rounded-lg" />
        </div>
      </div>

      {/* Table */}
      <Skeleton className="h-96 rounded-lg" />
    </div>
  );
}
