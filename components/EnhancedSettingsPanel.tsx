"use client";

import { useState, useEffect } from "react";
import { Loader2, TrendingUp, ShoppingCart, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const T = {
  bgCard: "#0F1320",
  bgElevated: "#161B2E",
  blue: "#3B82F6",
  violet: "#8B5CF6",
  cyan: "#06B6D4",
  textPrimary: "#F1F5FF",
  textSecondary: "#8B93B0",
  textMuted: "#4B5370",
  border: "rgba(255,255,255,0.07)",
  green: "#10B981",
  red: "#EF4444",
  amber: "#F59E0B",
};

const font = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Helvetica, Arial, sans-serif';

interface Analytics {
  balance: number;
  totalSpend: number;
  spendBreakdown: {
    data: number;
    airtime: number;
    cable: number;
    power: number;
  };
  transactionCounts: {
    data: number;
    airtime: number;
    cable: number;
    power: number;
  };
  successCounts: {
    data: number;
    airtime: number;
    cable: number;
    power: number;
  };
}

export default function EnhancedSettingsPanel({
  user,
  onClose,
  onPinChangeClick,
  onLogoutClick,
}: {
  user: any;
  onClose: () => void;
  onPinChangeClick: () => void;
  onLogoutClick: () => void;
}) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "analytics">("overview");

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch("/api/user/analytics", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch analytics");
        const data = await res.json();
        setAnalytics(data);
      } catch (error) {
        console.error("Analytics error:", error);
      } finally {
        setAnalyticsLoading(false);
      }
    };

    if (activeTab === "analytics") {
      fetchAnalytics();
    }
  }, [activeTab]);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  // ── Overview Tab ──
  if (activeTab === "overview") {
    return (
      <div style={{ fontFamily: font }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.textPrimary }}>
            Account Settings
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: T.textSecondary,
              fontSize: 24,
            }}
          >
            ✕
          </button>
        </div>

        {/* User Card */}
        <div
          style={{
            background: `linear-gradient(135deg, ${T.bgElevated}, ${T.bgCard})`,
            border: `1px solid ${T.border}`,
            borderRadius: 16,
            padding: 20,
            marginBottom: 24,
            display: "flex",
            gap: 16,
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: `linear-gradient(135deg, ${T.blue}, ${T.violet})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              fontWeight: 800,
              color: "white",
              flexShrink: 0,
            }}
          >
            {getInitials(user.fullName)}
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: T.textPrimary }}>
              {user.fullName}
            </h3>
            <p style={{ margin: "0 0 8px", fontSize: 13, color: T.textMuted }}>
              {user.phone}
            </p>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.6px",
                color: user.tier === "agent" ? T.amber : T.blue,
                background: user.tier === "agent" ? "rgba(245,158,11,0.12)" : "rgba(59,130,246,0.12)",
                borderRadius: 8,
                padding: "4px 12px",
                display: "inline-block",
              }}
            >
              {user.tier} account
            </span>
          </div>
        </div>

        {/* Information Section */}
        <h4 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: T.textMuted, textTransform: "uppercase" }}>
          Account Information
        </h4>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
          {[
            { label: "Full Name", value: user.fullName },
            { label: "Phone Number", value: user.phone },
            { label: "Account Type", value: user.tier },
          ].map((row) => (
            <div
              key={row.label}
              style={{
                background: T.bgElevated,
                borderRadius: 12,
                padding: "14px 16px",
                border: `1px solid ${T.border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 13, color: T.textMuted, fontWeight: 600 }}>
                {row.label}
              </span>
              <span
                style={{
                  fontSize: 14,
                  color: T.textPrimary,
                  fontWeight: 700,
                  textTransform: row.label === "Account Type" ? "capitalize" : "none",
                }}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <button
            onClick={() => setActiveTab("overview")}
            style={{
              flex: 1,
              padding: "10px 16px",
              borderRadius: 12,
              background: activeTab === "overview" ? T.blue : T.bgElevated,
              border: activeTab === "overview" ? "none" : `1px solid ${T.border}`,
              color: activeTab === "overview" ? "white" : T.textPrimary,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: font,
              transition: "all 150ms ease",
            }}
          >
            Settings
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            style={{
              flex: 1,
              padding: "10px 16px",
              borderRadius: 12,
              background: (activeTab as string) === "analytics" ? T.blue : T.bgElevated,
              border: (activeTab as string) === "analytics" ? "none" : `1px solid ${T.border}`,
              color: (activeTab as string) === "analytics" ? "white" : T.textPrimary,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: font,
              transition: "all 150ms ease",
            }}
          >
            Analytics
          </button>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <button
            onClick={onPinChangeClick}
            style={{
              width: "100%",
              padding: 14,
              borderRadius: 14,
              background: `linear-gradient(135deg, ${T.blue}, ${T.blue})`,
              border: "none",
              color: "white",
              fontWeight: 700,
              fontSize: 15,
              cursor: "pointer",
              fontFamily: font,
              boxShadow: `0 8px 24px rgba(59,130,246,0.3)`,
            }}
          >
            Change PIN
          </button>
          <button
            onClick={onLogoutClick}
            style={{
              width: "100%",
              padding: 14,
              borderRadius: 14,
              background: "linear-gradient(135deg, #EF4444, #DC2626)",
              border: "none",
              color: "white",
              fontWeight: 700,
              fontSize: 15,
              cursor: "pointer",
              fontFamily: font,
              boxShadow: "0 8px 24px rgba(239,68,68,0.3)",
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // ── Analytics Tab ──
  return (
    <div style={{ fontFamily: font }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.textPrimary }}>
          Spending Summary
        </h2>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: T.textSecondary,
            fontSize: 24,
          }}
        >
          ✕
        </button>
      </div>

      {analyticsLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px 20px" }}>
          <Loader2 size={32} style={{ color: T.blue, animation: "spin 1s linear infinite" }} />
        </div>
      ) : analytics ? (
        <>
          {/* Balance Card */}
          <div
            style={{
              background: `linear-gradient(135deg, ${T.blue}, ${T.cyan})`,
              borderRadius: 16,
              padding: 24,
              marginBottom: 24,
              color: "white",
            }}
          >
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, opacity: 0.9, marginBottom: 8 }}>
              WALLET BALANCE
            </p>
            <h3 style={{ margin: 0, fontSize: 32, fontWeight: 800, letterSpacing: "-0.5px" }}>
              ₦{analytics.balance.toLocaleString()}
            </h3>
          </div>

          {/* Total Spend Card */}
          <div
            style={{
              background: T.bgElevated,
              border: `1px solid ${T.border}`,
              borderRadius: 16,
              padding: 20,
              marginBottom: 24,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: `${T.blue}20`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <TrendingUp size={20} style={{ color: T.blue }} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 12, color: T.textMuted, fontWeight: 600 }}>
                  TOTAL SPEND
                </p>
                <h3 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: T.textPrimary, letterSpacing: "-0.3px" }}>
                  ₦{analytics.totalSpend.toLocaleString()}
                </h3>
              </div>
            </div>
          </div>

          {/* Spend Breakdown */}
          <h4 style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 700, color: T.textMuted, textTransform: "uppercase" }}>
            Spending by Service
          </h4>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Data", value: analytics.spendBreakdown.data, color: T.blue, icon: "📱" },
              { label: "Airtime", value: analytics.spendBreakdown.airtime, color: T.red, icon: "📞" },
              { label: "Cable TV", value: analytics.spendBreakdown.cable, color: T.violet, icon: "📺" },
              { label: "Electricity", value: analytics.spendBreakdown.power, color: T.amber, icon: "⚡" },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  background: T.bgElevated,
                  border: `1px solid ${T.border}`,
                  borderRadius: 12,
                  padding: 16,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 20 }}>{item.icon}</span>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, color: T.textPrimary, fontWeight: 600 }}>
                      {item.label}
                    </p>
                    <p
                      style={{
                        margin: "2px 0 0",
                        fontSize: 11,
                        color: T.textMuted,
                      }}
                    >
                      {
                        analytics.transactionCounts[
                          item.label.toLowerCase().replace(" ", "") as keyof typeof analytics.transactionCounts
                        ]
                      }{" "}
                      transactions
                    </p>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: item.color }}>
                  ₦{item.value.toLocaleString()}
                </p>
              </div>
            ))}
          </div>

          {/* Tabs for back */}
          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            <button
              onClick={() => setActiveTab("overview")}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: 12,
                background: T.bgElevated,
                border: `1px solid ${T.border}`,
                color: T.textPrimary,
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: font,
                transition: "all 150ms ease",
              }}
            >
              Back to Settings
            </button>
          </div>
        </>
      ) : (
        <div
          style={{
            background: T.bgElevated,
            borderRadius: 12,
            padding: 20,
            textAlign: "center",
            color: T.textSecondary,
          }}
        >
          Failed to load analytics
        </div>
      )}
    </div>
  );
}
