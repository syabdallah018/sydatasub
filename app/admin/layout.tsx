"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Providers } from "@/components/providers";
import { Loader2, BarChart3, Users, Database, LogOut, Bell, Gift, Receipt, UserCheck, Webhook } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const SIDEBAR_ITEMS = [
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/plans", label: "Data Plans", icon: Database },
  { href: "/admin/pricing", label: "Pricing Tiers", icon: Database },
  { href: "/admin/transactions", label: "Transactions", icon: Receipt },
  { href: "/admin/agents", label: "Agent Apps", icon: UserCheck },
  { href: "/admin/rewards", label: "Rewards", icon: Gift },
  { href: "/admin/notices", label: "Broadcasts", icon: Bell },
  { href: "/admin/webhooks", label: "Webhooks", icon: Webhook },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [authAttempted, setAuthAttempted] = useState(false);

  useEffect(() => {
    const verifyAdmin = async () => {
      try {
        const res = await fetch("/api/admin/verify");
        setAuthenticated(res.ok);
      } catch {
        setAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    verifyAdmin();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthAttempted(true);

    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (data.success) {
        setAuthenticated(true);
        toast.success("Ahh, nice. Admin access confirmed.");
      } else {
        toast.error("Ahh, sorry, that admin password did not match.");
        setPassword("");
      }
    } catch {
      toast.error("Ahh, sorry, admin sign-in could not be completed right now.");
    } finally {
      setAuthAttempted(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      setAuthenticated(false);
      setPassword("");
      toast.success("You have been signed out of admin.");
    } catch {
      toast.error("Ahh, sorry, admin sign-out could not finish right now.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <Loader2 className="animate-spin text-blue-400" size={40} />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <Providers>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-slate-900 p-4">
          <div className="w-full max-w-md">
            {/* Logo Card */}
            <div className="mb-8 text-center bg-white rounded-2xl shadow-2xl p-8">
              <img 
                src="/logo.jpeg" 
                alt="SY DATA" 
                className="h-32 w-32 mx-auto object-contain mb-4"
              />
            </div>

            {/* Login Card */}
            <div className="w-full bg-white rounded-2xl shadow-2xl p-8">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Admin Panel</h1>
              <p className="text-slate-600 mb-8">Enter admin password to access dashboard</p>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Admin Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={authAttempted}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={!password || authAttempted}
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition shadow-lg"
                >
                  {authAttempted ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={18} className="animate-spin" />
                      Verifying...
                    </span>
                  ) : (
                    "Access Dashboard"
                  )}
                </button>
              </form>

              <p className="text-center text-xs text-slate-500 mt-6">
                Secure admin access • Password protected
              </p>
            </div>
          </div>
        </div>
      </Providers>
    );
  }

  return (
    <Providers>
      <div className="flex h-screen bg-slate-50">
        {/* Sidebar */}
        <div className="w-64 bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700 flex flex-col">
          {/* Logo Section */}
          <div className="p-6 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <img 
                src="/logo.jpeg" 
                alt="SY DATA" 
                className="h-12 w-12 object-contain"
              />
              <div>
                <h2 className="text-lg font-bold text-white">SY DATA</h2>
                <p className="text-xs text-slate-400">Admin Panel</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {SIDEBAR_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    isActive
                      ? "bg-blue-600 text-white shadow-lg"
                      : "text-slate-300 hover:bg-slate-700/50"
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-slate-700">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 font-medium transition"
            >
              <LogOut size={20} />
              Logout
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto flex flex-col">
          {/* Top Bar */}
          <div className="bg-white border-b border-slate-200 px-8 py-4 shadow-sm">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {SIDEBAR_ITEMS.find((item) => pathname === item.href || pathname.startsWith(item.href))?.label ||
                    "Dashboard"}
                </h1>
                <p className="text-sm text-slate-500 mt-1">Manage your SY DATA application</p>
              </div>
              <div className="text-sm text-slate-600">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-auto p-8">
            {children}
          </div>
        </div>
      </div>
    </Providers>
  );
}
