"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

const T = {
  bg: "#07090F",
  bgCard: "#0F1320",
  bgElevated: "#161B2E",
  blue: "#3B82F6",
  green: "#10B981",
  red: "#EF4444",
  textPrimary: "#F1F5FF",
  textSecondary: "#8B93B0",
  border: "rgba(255,255,255,0.07)",
};

const font = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Helvetica, Arial, sans-serif';

type RewardRule = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  triggerType: "SIGNUP" | "DEPOSIT";
  thresholdAmount: number | null;
  maxThresholdAmount: number | null;
  rewardAmount: number;
  isActive: boolean;
  displayOrder: number;
};

export default function RewardSettingsTab() {
  const [rules, setRules] = useState<RewardRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/settings/rewards", { credentials: "include" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load reward settings");
        setRules(Array.isArray(data.rules) ? data.rules : []);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load reward settings");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const saveRules = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/admin/settings/rewards", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save reward settings");
      setRules(Array.isArray(data.rules) ? data.rules : []);
      toast.success("Reward settings updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save reward settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "56px 20px" }}>
        <Loader2 size={28} style={{ color: T.blue, animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, fontFamily: font }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <div>
          <h2 style={{ margin: 0, color: T.textPrimary, fontSize: 24, fontWeight: 800 }}>Reward Settings</h2>
          <p style={{ margin: "6px 0 0", color: T.textSecondary, fontSize: 14 }}>
            Configure one-time signup and deposit reward rules. Claimed rewards only apply to data purchases.
          </p>
        </div>
        <button
          onClick={saveRules}
          disabled={saving}
          style={{
            border: "none",
            borderRadius: 12,
            padding: "12px 16px",
            background: saving ? T.bgElevated : T.green,
            color: "#fff",
            fontWeight: 700,
            cursor: saving ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={16} />}
          {saving ? "Saving..." : "Save Rules"}
        </button>
      </div>

      {rules.map((rule, index) => (
        <div key={rule.id} style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 20, padding: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr 120px", gap: 12, alignItems: "end" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ color: T.textSecondary, fontSize: 12, fontWeight: 700 }}>Title</span>
              <input
                value={rule.title}
                onChange={(e) => {
                  const next = [...rules];
                  next[index] = { ...rule, title: e.target.value };
                  setRules(next);
                }}
                style={{ background: T.bgElevated, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 14px", color: T.textPrimary }}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ color: T.textSecondary, fontSize: 12, fontWeight: 700 }}>Reward Amount</span>
              <input
                type="number"
                value={rule.rewardAmount}
                onChange={(e) => {
                  const next = [...rules];
                  next[index] = { ...rule, rewardAmount: Number(e.target.value || 0) };
                  setRules(next);
                }}
                style={{ background: T.bgElevated, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 14px", color: T.textPrimary }}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ color: T.textSecondary, fontSize: 12, fontWeight: 700 }}>
                {rule.triggerType === "DEPOSIT" ? "Min Threshold" : "Threshold"}
              </span>
              <input
                type="number"
                value={rule.thresholdAmount ?? 0}
                disabled={rule.triggerType !== "DEPOSIT"}
                onChange={(e) => {
                  const next = [...rules];
                  next[index] = { ...rule, thresholdAmount: Number(e.target.value || 0) };
                  setRules(next);
                }}
                style={{
                  background: rule.triggerType === "DEPOSIT" ? T.bgElevated : "rgba(255,255,255,0.03)",
                  border: `1px solid ${T.border}`,
                  borderRadius: 12,
                  padding: "12px 14px",
                  color: T.textPrimary,
                }}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ color: T.textSecondary, fontSize: 12, fontWeight: 700 }}>Max Threshold</span>
              <input
                type="number"
                value={rule.maxThresholdAmount ?? ""}
                disabled={rule.triggerType !== "DEPOSIT"}
                onChange={(e) => {
                  const next = [...rules];
                  next[index] = {
                    ...rule,
                    maxThresholdAmount: e.target.value ? Number(e.target.value) : null,
                  };
                  setRules(next);
                }}
                style={{
                  background: rule.triggerType === "DEPOSIT" ? T.bgElevated : "rgba(255,255,255,0.03)",
                  border: `1px solid ${T.border}`,
                  borderRadius: 12,
                  padding: "12px 14px",
                  color: T.textPrimary,
                }}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ color: T.textSecondary, fontSize: 12, fontWeight: 700 }}>Active</span>
              <button
                onClick={() => {
                  const next = [...rules];
                  next[index] = { ...rule, isActive: !rule.isActive };
                  setRules(next);
                }}
                style={{
                  border: "none",
                  borderRadius: 12,
                  padding: "12px 14px",
                  background: rule.isActive ? T.green : T.red,
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {rule.isActive ? "Enabled" : "Disabled"}
              </button>
            </label>
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            <span style={{ color: T.textSecondary, fontSize: 12, fontWeight: 700 }}>Description</span>
            <textarea
              value={rule.description || ""}
              onChange={(e) => {
                const next = [...rules];
                next[index] = { ...rule, description: e.target.value };
                setRules(next);
              }}
              rows={2}
              style={{ background: T.bgElevated, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 14px", color: T.textPrimary, resize: "vertical" }}
            />
          </label>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, color: T.textSecondary, fontSize: 12 }}>
            <span>Code: {rule.code}</span>
            <span>Trigger: {rule.triggerType}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
