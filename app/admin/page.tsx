"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Loader2, LogOut, BarChart3, Database, Users, Phone, Tv, Zap, Megaphone } from "lucide-react";
import { toast } from "sonner";
import AnalyticsTab from "./_components/AnalyticsTab";
import DataPlansTab from "./_components/DataPlansTab";
import UsersTab from "./_components/UsersTab";
import AirtimeTab from "./_components/AirtimeTab";
import CableTab from "./_components/CableTab";
import BroadcastsTab from "./_components/BroadcastsTab";
import PowerTab from "./_components/PowerTab";
// Design tokens
const T = {
  bg:         "#07090F",
  bgCard:     "#0F1320",
  bgElevated: "#161B2E",
  blue:       "#3B82F6",
  violet:     "#8B5CF6",
  textPrimary:   "#F1F5FF",
  textSecondary: "#8B93B0",
  textMuted:     "#4B5370",
  border:     "rgba(255,255,255,0.07)",
  green:      "#10B981",
  red:        "#EF4444",
};

const font = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Helvetica, Arial, sans-serif';

export default function AdminDashboard() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"analytics" | "broadcasts" | "plans" | "users" | "airtime" | "cable" | "power">("analytics");

  // Check if already authenticated via JWT/session
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/admin/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({}),
        });

        if (res.ok) {
          setAuthenticated(true);
          sessionStorage.setItem("admin-authenticated", "true");
        }
      } catch (error) {
        // Not authenticated
        sessionStorage.removeItem("admin-authenticated");
      }
    };

    const isAuth = sessionStorage.getItem("admin-authenticated") === "true";
    if (isAuth) {
      setAuthenticated(true);
    } else {
      checkAuth();
    }
  }, []);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // In JWT-based auth, this should verify admin status
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        setAuthenticated(true);
        sessionStorage.setItem("admin-authenticated", "true");
        setPassword("");
        toast.success("Authentication successful");
      } else {
        toast.error("Admin access denied");
        setPassword("");
      }
    } catch (error) {
      toast.error("Authentication failed");
      setPassword("");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    // Clear the admin session
    setAuthenticated(false);
    setPassword("");
    sessionStorage.removeItem("admin-authenticated");
    // Redirect to home
    router.push("/");
  };

  // Password entry screen
  if (!authenticated) {
    return (
      <div style={{
        background: T.bg,
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: font,
        padding: "20px",
      }}>
        <div style={{
          background: T.bgCard,
          border: `1px solid ${T.border}`,
          borderRadius: 24,
          padding: 40,
          maxWidth: 400,
          width: "100%",
        }}>
          <h1 style={{
            margin: "0 0 12px",
            fontSize: 28,
            fontWeight: 800,
            color: T.textPrimary,
            letterSpacing: "-0.6px",
          }}>
            Admin Access
          </h1>
          
          <p style={{
            margin: "0 0 28px",
            fontSize: 14,
            color: T.textSecondary,
            lineHeight: 1.6,
          }}>
            Enter the admin password to access the dashboard.
          </p>

          <form onSubmit={handlePasswordSubmit}>
            <div style={{ marginBottom: 20 }}>
              <input
                type="password"
                placeholder="Admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: T.bgElevated,
                  border: `1.5px solid ${T.border}`,
                  color: T.textPrimary,
                  fontSize: 16,
                  fontFamily: font,
                  boxSizing: "border-box",
                  transition: "all 150ms ease",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !password}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 12,
                background: password && !loading ? T.blue : T.bgElevated,
                border: "none",
                color: "#fff",
                fontSize: 16,
                fontWeight: 600,
                cursor: password && !loading ? "pointer" : "not-allowed",
                opacity: password && !loading ? 1 : 0.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                fontFamily: font,
                transition: "all 150ms ease",
              }}
            >
              {loading && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
              {loading ? "Verifying..." : "Access Dashboard"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Admin dashboard screen

  const TABS = [
    { id: "analytics" as const, label: "Analytics", icon: BarChart3 },
    { id: "broadcasts" as const, label: "Broadcasts", icon: Megaphone },
    { id: "plans" as const, label: "Data Plans", icon: Database },
    { id: "users" as const, label: "Users", icon: Users },
    { id: "airtime" as const, label: "Airtime", icon: Phone },
    { id: "cable" as const, label: "Cable TV", icon: Tv },
    { id: "power" as const, label: "Power", icon: Zap },
  ];

  return (
    <div style={{
      background: T.bg,
      color: T.textPrimary,
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      fontFamily: font,
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 20px",
        borderBottom: `1px solid ${T.border}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexShrink: 0,
      }}>
        <div>
          <h1 style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 800,
            color: T.textPrimary,
            letterSpacing: "-0.6px",
          }}>
            Admin Panel
          </h1>
          <p style={{
            margin: "4px 0 0",
            fontSize: 13,
            color: T.textSecondary,
          }}>
            Manage your platform
          </p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            borderRadius: 8,
            background: T.bgElevated,
            border: `1px solid ${T.border}`,
            color: T.textSecondary,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: font,
          }}
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>

      {/* Tab navigation */}
      <div style={{
        padding: "16px 20px",
        borderBottom: `1px solid ${T.border}`,
        display: "flex",
        gap: 8,
        overflowX: "auto",
        flexShrink: 0,
      }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
              borderRadius: 8,
              background: activeTab === id ? T.bgElevated : "transparent",
              border: `1px solid ${activeTab === id ? T.blue : T.border}`,
              color: activeTab === id ? T.blue : T.textSecondary,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
              fontFamily: font,
              whiteSpace: "nowrap",
            }}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "20px",
      }}>
        {activeTab === "analytics" && <AnalyticsTab />}
        {activeTab === "broadcasts" && <BroadcastsTab />}
        {activeTab === "plans" && <DataPlansTab />}
        {activeTab === "users" && <UsersTab />}
        {activeTab === "airtime" && <AirtimeTab />}
        {activeTab === "cable" && <CableTab />}
        {activeTab === "power" && <PowerTab />}
      </div>
    </div>
  );
}
