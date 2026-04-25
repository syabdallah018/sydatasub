"use client";

import { Gift, Loader2, Sparkles, Trophy } from "lucide-react";

type RewardItem = {
  id: string;
  title: string;
  description?: string | null;
  rewardAmount: number;
  thresholdAmount?: number | null;
  claimedAt?: string | null;
  createdAt?: string;
};

type RewardProgressItem = {
  code: string;
  title: string;
  description?: string | null;
  thresholdAmount: number;
  rewardAmount: number;
  currentAmount: number;
  percentage: number;
  remainingAmount: number;
};

type RewardsDashboard = {
  rewardBalance: number;
  availableRewards: RewardItem[];
  claimedRewards: RewardItem[];
  progress: RewardProgressItem[];
  stats: {
    maxDeposit: number;
    totalAvailableAmount: number;
    totalClaimedAmount: number;
    totalClaimedCount: number;
  };
};

const T = {
  bgCard: "#ffffff",
  bgElevated: "#fbfbfd",
  blue: "#0071E3",
  cyan: "#06B6D4",
  green: "#16A34A",
  amber: "#D97706",
  textPrimary: "#111827",
  textSecondary: "#4B5563",
  textMuted: "#8A8A8F",
  border: "rgba(15,23,42,0.08)",
  shadow: "0 18px 44px rgba(15,23,42,0.08)",
};

const font = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Helvetica, Arial, sans-serif';

const naira = (value: number) => `₦${value.toLocaleString()}`;

export default function RewardsPanel({
  rewards,
  loading,
  claiming,
  onBack,
  onClaimAll,
  onClaimOne,
}: {
  rewards: RewardsDashboard | null;
  loading: boolean;
  claiming: boolean;
  onBack: () => void;
  onClaimAll: () => void;
  onClaimOne: (rewardId: string) => void;
}) {
  return (
    <div style={{ padding: "20px 20px 120px", fontFamily: font }}>
      <button
        onClick={onBack}
        style={{
          background: T.bgElevated,
          border: `1px solid ${T.border}`,
          borderRadius: 12,
          padding: "10px 16px",
          color: T.blue,
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          marginBottom: 24,
        }}
      >
        Back
      </button>

      <div
        style={{
          background: "linear-gradient(135deg, rgba(0,113,227,0.10), rgba(6,182,212,0.12))",
          border: `1px solid rgba(0,113,227,0.16)`,
          borderRadius: 28,
          padding: 24,
          boxShadow: T.shadow,
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 18,
              background: "rgba(0,113,227,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Gift size={24} color={T.blue} />
          </div>
          <div>
            <div style={{ fontSize: 13, color: T.textSecondary, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Reward Wallet
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: T.textPrimary }}>{naira(rewards?.rewardBalance || 0)}</div>
          </div>
        </div>
        <p style={{ margin: 0, color: T.textSecondary, fontSize: 14, lineHeight: 1.6 }}>
          Reward credits can only be used when buying data plans. Claim available rewards below to move them into your reward wallet.
        </p>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "56px 20px" }}>
          <Loader2 size={28} style={{ color: T.blue, animation: "spin 1s linear infinite" }} />
        </div>
      ) : !rewards ? (
        <div style={{ textAlign: "center", color: T.textMuted, padding: "32px 0" }}>Rewards are unavailable right now.</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 20, padding: 18 }}>
              <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 8 }}>Available to Claim</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: T.textPrimary }}>{naira(rewards.stats.totalAvailableAmount)}</div>
            </div>
            <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 20, padding: 18 }}>
              <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 8 }}>Claimed Rewards</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: T.textPrimary }}>{rewards.stats.totalClaimedCount}</div>
            </div>
          </div>

          <section style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T.textPrimary }}>Available Rewards</h2>
              <button
                onClick={onClaimAll}
                disabled={claiming || rewards.availableRewards.length === 0}
                style={{
                  border: "none",
                  borderRadius: 12,
                  padding: "10px 14px",
                  background: claiming || rewards.availableRewards.length === 0 ? "rgba(15,23,42,0.08)" : T.blue,
                  color: "#fff",
                  fontWeight: 700,
                  cursor: claiming || rewards.availableRewards.length === 0 ? "not-allowed" : "pointer",
                  opacity: claiming || rewards.availableRewards.length === 0 ? 0.5 : 1,
                }}
              >
                {claiming ? "Claiming..." : "Claim All"}
              </button>
            </div>

            {rewards.availableRewards.length === 0 ? (
              <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 20, padding: 20, color: T.textSecondary }}>
                No rewards are ready to claim yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {rewards.availableRewards.map((reward) => (
                  <div key={reward.id} style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 20, padding: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: T.textPrimary, marginBottom: 6 }}>{reward.title}</div>
                        <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.6 }}>{reward.description}</div>
                      </div>
                      <div style={{ textAlign: "right", minWidth: 110 }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: T.green, marginBottom: 10 }}>{naira(reward.rewardAmount)}</div>
                        <button
                          onClick={() => onClaimOne(reward.id)}
                          disabled={claiming}
                          style={{
                            border: "none",
                            borderRadius: 10,
                            padding: "9px 12px",
                            background: T.green,
                            color: "#fff",
                            fontWeight: 700,
                            cursor: claiming ? "not-allowed" : "pointer",
                            opacity: claiming ? 0.6 : 1,
                          }}
                        >
                          Claim
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Sparkles size={18} color={T.cyan} />
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T.textPrimary }}>Progress to Next Rewards</h2>
            </div>

            {rewards.progress.length === 0 ? (
              <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 20, padding: 20, color: T.textSecondary }}>
                You have unlocked every active reward rule.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {rewards.progress.map((item) => (
                  <div key={item.code} style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 20, padding: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: T.textPrimary }}>{item.title}</div>
                        <div style={{ fontSize: 13, color: T.textSecondary }}>{item.description}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: T.amber }}>{naira(item.rewardAmount)}</div>
                        <div style={{ fontSize: 12, color: T.textMuted }}>Target {naira(item.thresholdAmount)}</div>
                      </div>
                    </div>
                    <div style={{ width: "100%", height: 10, background: "rgba(15,23,42,0.08)", borderRadius: 999, overflow: "hidden", marginBottom: 8 }}>
                      <div style={{ width: `${item.percentage}%`, height: "100%", background: "linear-gradient(90deg, #06B6D4, #0071E3)" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.textSecondary }}>
                      <span>{naira(item.currentAmount)} progress</span>
                      <span>{naira(item.remainingAmount)} remaining</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Trophy size={18} color={T.amber} />
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T.textPrimary }}>Claimed Rewards</h2>
            </div>

            {rewards.claimedRewards.length === 0 ? (
              <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 20, padding: 20, color: T.textSecondary }}>
                You have not claimed any rewards yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {rewards.claimedRewards.map((reward) => (
                  <div key={reward.id} style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 20, padding: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: T.textPrimary, marginBottom: 6 }}>{reward.title}</div>
                        <div style={{ fontSize: 13, color: T.textSecondary }}>{reward.description}</div>
                        <div style={{ fontSize: 12, color: T.textMuted, marginTop: 8 }}>
                          Claimed {reward.claimedAt ? new Date(reward.claimedAt).toLocaleString("en-NG") : "recently"}
                        </div>
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: T.green }}>{naira(reward.rewardAmount)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
