"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Providers } from "@/components/providers";
import { Loader2, BarChart3, Users, Database, LogOut, Bell, Gift, Receipt, UserCheck, Webhook, Phone, Send, Terminal, ShieldCheck, Cpu, Settings, KeyRound } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const SIDEBAR_ITEMS = [
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/plans", label: "Data Plans", icon: Database },
  { href: "/admin/sim-config", label: "SIM Config", icon: Cpu },
  { href: "/admin/pricing", label: "Pricing Tiers", icon: Database },
  { href: "/admin/transactions", label: "Transactions", icon: Receipt },
  { href: "/admin/api-transactions", label: "API Transactions", icon: Terminal },
  { href: "/admin/agents", label: "Agent Apps", icon: UserCheck },
  { href: "/admin/developers", label: "Developers", icon: Terminal },
  { href: "/admin/rewards", label: "Rewards", icon: Gift },
  { href: "/admin/airtime-cash", label: "Airtime Cash", icon: Phone },
  { href: "/admin/notices", label: "Broadcasts", icon: Bell },
  { href: "/admin/push", label: "Push Broadcast", icon: Send },
  { href: "/admin/settings", label: "Settings", icon: Settings },
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
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (data.success) {
        setAuthenticated(true);
        toast.success("Admin access confirmed. Welcome back!");
      } else {
        toast.error(data.error || "Admin sign-in failed. Please check your password.");
        setPassword("");
      }
    } catch {
      toast.error("Admin sign-in could not be completed right now.");
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
      toast.error("Admin sign-out could not finish right now.");
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
            <div className="mb-6 text-center bg-white rounded-2xl shadow-2xl p-6">
              <img 
                src="/logo.jpeg" 
                alt="SY DATA" 
                className="h-28 w-28 mx-auto object-contain mb-2"
              />
              <h2 className="text-xl font-black text-slate-900 tracking-tight">SY DATA SUB</h2>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-0.5">Admin Management Portal</p>
            </div>

            {/* Login Card */}
            <div className="w-full bg-white rounded-2xl shadow-2xl p-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Admin Sign In</h1>
                  <p className="text-slate-500 text-xs">Enter your password to access the dashboard</p>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-5 mt-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Admin Password
                  </label>
                  <input
                    type="password"
                    placeholder="Enter admin password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={authAttempted}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
                    autoFocus
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={!password || authAttempted}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition shadow-lg text-sm"
                >
                  {authAttempted ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={18} className="animate-spin" />
                      Verifying Password...
                    </span>
                  ) : (
                    "Access Admin Dashboard"
                  )}
                </button>
              </form>

              <p className="text-center text-xs text-slate-400 mt-6 flex items-center justify-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                Secure password-only admin access
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
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto max-h-[calc(100vh-200px)] scrollbar-thin scrollbar-thumb-slate-700">
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
          <div className="flex-1 overflow-auto p-8 flex flex-col justify-between">
            <div className="flex-1">
              {children}
            </div>
            
            {/* Premium Admin Footer */}
            <footer className="mt-12 pt-6 border-t border-slate-200/60 text-slate-400 text-xs font-semibold flex flex-col sm:flex-row justify-between items-center gap-3 select-none">
              <span>© {new Date().getFullYear()} SY DATA SUB. All rights reserved.</span>
              <span className="flex items-center gap-1.5 text-[10px] text-blue-600 bg-blue-50/70 border border-blue-100 px-3 py-1 rounded-xl uppercase tracking-wider font-bold">
                <ShieldCheck size={12} /> Secure Admin Session Verified
              </span>
            </footer>
          </div>
        </div>
      </div>
    </Providers>
  );
}
