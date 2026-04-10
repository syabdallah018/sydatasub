"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Providers } from "@/components/providers";
import { Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [authAttempted, setAuthAttempted] = useState(false);

  useEffect(() => {
    // Check if already authenticated via sessionStorage
    const adminAuth = sessionStorage.getItem("adminAuthenticated");
    if (adminAuth === "true") {
      setAuthenticated(true);
      setLoading(false);
    } else {
      setLoading(false);
    }
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
        sessionStorage.setItem("adminAuthenticated", "true");
        setAuthenticated(true);
        toast.success("Admin authenticated");
      } else {
        toast.error("Invalid password");
        setPassword("");
      }
    } catch {
      toast.error("Authentication failed");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-700 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Admin Panel</h1>
          <p className="text-slate-600 mb-8">Enter your admin password to continue</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="Admin Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!password || authAttempted}
              className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold transition"
            >
              {authAttempted ? "Verifying..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <Providers>
      <div className="flex h-screen bg-slate-50">
        {/* Main Content - Simple Table Layout */}
        <div className="flex-1 overflow-auto">
          <div className="min-h-screen flex flex-col">
            {/* Top Bar */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
                <p className="text-sm text-slate-500">Manage your application</p>
              </div>
              <button
                onClick={() => {
                  sessionStorage.removeItem("adminAuthenticated");
                  setAuthenticated(false);
                  setPassword("");
                }}
                className="px-4 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-medium transition"
              >
                Logout
              </button>
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
