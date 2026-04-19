"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Package,
  Users,
  CreditCard,
  Bell,
  LogOut,
  Menu,
  X,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAppStore } from "@/store/appStore";

interface AdminInfo {
  fullName: string;
  phone: string;
}

const NAV_ITEMS = [
  { icon: BarChart3, label: "Analytics", href: "/admin/analytics" },
  { icon: Package, label: "Data Plans", href: "/admin/plans" },
  { icon: CreditCard, label: "Pricing", href: "/admin/pricing" },
  { icon: Users, label: "Users", href: "/admin/users" },
  { icon: CreditCard, label: "Transactions", href: "/admin/transactions" },
  { icon: Bell, label: "Notices", href: "/admin/notices" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { logout } = useAppStore();

  useEffect(() => {
    // Fetch admin info from backend
    const fetchAdminInfo = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const data = await response.json();
          setAdminInfo(data);
        }
      } catch (error) {
        console.error("Failed to fetch admin info:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdminInfo();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      logout();
      router.push("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo & Title */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900">Admin</h1>
            <p className="text-xs text-slate-500">Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <button
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-blue-500 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            </Link>
          );
        })}
      </nav>

      {/* Admin Info & Logout */}
      <div className="border-t border-slate-200 p-4 space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-4 bg-slate-200 rounded w-20" />
            <div className="h-3 bg-slate-200 rounded w-24" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                {adminInfo?.fullName?.charAt(0).toUpperCase() || "A"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {adminInfo?.fullName || "Admin"}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {adminInfo?.phone || "no phone"}
                </p>
              </div>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="w-full gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </>
        )}
      </div>
    </div>
  );

  // Desktop sidebar
  return (
    <>
      {/* Desktop Sidebar - Hidden on mobile, visible on md+ */}
      <div className="hidden md:flex md:w-64 bg-white border-r border-slate-200 flex-col">
        <SidebarContent />
      </div>

      {/* Mobile Menu Sheet */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Sheet>
          <SheetTrigger>
            <Button size="icon" variant="outline">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
