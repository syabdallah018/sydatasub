"use client";

import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { AdminSidebar } from "@/components/admin/sidebar";

// Note: metadata must be in a separate non-client component
// This layout is marked as client to handle interactivity

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <div className="flex h-screen bg-slate-50">
        {/* Sidebar */}
        <AdminSidebar />

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="min-h-screen flex flex-col">
            {/* Top Bar */}
            <div className="bg-white border-b border-slate-200 px-6 py-4">
              <h1 className="text-2xl font-bold text-slate-900">Admin Panel</h1>
              <p className="text-sm text-slate-500">Manage plans, users, and transactions</p>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto p-6">
              {children}
            </div>
          </div>
        </div>
      </div>
    </Providers>
  );
}
