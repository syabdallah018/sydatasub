"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { AdminSidebar } from "@/components/admin/sidebar";
import { Loader2 } from "lucide-react";

// Note: metadata must be in a separate non-client component
// This layout is marked as client to handle interactivity

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data?.success && data?.data?.role === "ADMIN") {
          setIsAdmin(true);
        } else {
          router.replace("/app");
        }
      })
      .catch(() => router.replace("/app"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

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
