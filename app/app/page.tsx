"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Bolt,
  Check,
  ChevronLeft,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  Home,
  Loader2,
  LogOut,
  Moon,
  Phone,
  Receipt,
  Sparkles,
  User,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { getFriendlyMessage } from "@/lib/user-feedback";

const fontStyle = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&family=DM+Mono:wght@400;500&display=swap');
`;

const T = {
  bg: "#fbfbfd",
  surface: "#f4f7fb",
  card: "#ffffff",
  border: "#e6ebf2",
  borderStrong: "#d5ddea",
  blueLight: "#e8f0ff",
  blue: "#2463eb",
  blueDark: "#17357d",
  blueShadow: "0 18px 40px rgba(36, 99, 235, 0.14)",
  green: "#16a34a",
  amber: "#d97706",
  rose: "#e11d48",
  text: "#111827",
  textMid: "#667085",
  textDim: "#98a2b3",
  font: "'DM Sans', sans-serif",
  mono: "'DM Mono', monospace",
};

type AppTab = "home" | "transactions" | "profile";

interface UserData {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  balance: number;
  rewardBalance?: number;
  tier: "user" | "agent";
  isActive?: boolean;
  joinedAt?: string;
  agentRequestStatus?: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
  virtualAccount?: { accountNumber: string; bankName: string } | null;
}

interface DataPlan {
  id: string;
  name: string;
  price: number;
  user_price: number;
  agent_price: number;
  sizeLabel: string;
  validity: string;
  network: string;
}

interface TransactionItem {
  id: string;
  type: string;
  status: string;
  amount: number;
  description?: string | null;
  phone?: string | null;
  createdAt: string;
  reference: string;
}

interface RewardItem {
  id: string;
  type: string;
  title: string;
  description: string;
  amount: number;
  claimed: boolean;
  claimable: boolean;
  status: "CLAIMED" | "IN_PROGRESS" | "MISSED";
  progressValue: number;
  targetValue: number;
  progressPercent: number;
  unit: "NGN" | "GB";
  claimedAt: string | null;
  isActive: boolean;
}

interface RewardSnapshot {
  rewardBalance: number;
  earnedTotal: number;
  items: RewardItem[];
}

interface BroadcastNotice {
  id: string;
  title?: string;
  message: string;
  severity: string;
}

const NETWORKS = [
  { id: "mtn", name: "MTN", color: "#FFCC00", bg: "#fff7cc", logo: "/mtn.jpg" },
  { id: "airtel", name: "Airtel", color: "#FF3333", bg: "#ffe2e2", logo: "/airtel.jpg" },
  { id: "glo", name: "Glo", color: "#16a34a", bg: "#dcfce7", logo: "/glo.jpg" },
  { id: "9mobile", name: "9mobile", color: "#00A859", bg: "#d1fae5", logo: "/9mobile.jpg" },
];

const AIRTIME_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

const getPriceForTier = (plan: DataPlan, tier: string = "user"): number => {
  if (tier === "agent" && plan.agent_price > 0) return plan.agent_price;
  return plan.user_price > 0 ? plan.user_price : plan.price;
};

function BottomSheet({
  open,
  onClose,
  title,
  accentColor = T.blue,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  accentColor?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      key={open ? "open" : "closed"}
      initial={{ opacity: 0 }}
      animate={{ opacity: open ? 1 : 0 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 70,
        background: open ? "rgba(15,23,42,0.45)" : "transparent",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        pointerEvents: open ? "auto" : "none",
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: open ? 0 : "100%" }}
        transition={{ type: "spring", damping: 24, stiffness: 260 }}
        style={{
          width: "100%",
          maxWidth: 520,
          maxHeight: "90vh",
          background: T.card,
          borderRadius: "30px 30px 0 0",
          overflow: "hidden",
          border: `1px solid ${T.borderStrong}`,
          boxShadow: T.blueShadow,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "center", padding: "14px 0 4px" }}>
          <div style={{ width: 44, height: 5, borderRadius: 999, background: T.borderStrong }} />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 22px 18px",
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 5, height: 24, borderRadius: 999, background: accentColor }} />
            <h2 style={{ fontFamily: T.font, fontSize: 20, fontWeight: 800, color: T.text, margin: 0 }}>
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 38,
              height: 38,
              borderRadius: 14,
              border: "none",
              background: T.surface,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={18} color={T.textMid} />
          </button>
        </div>
        <div style={{ padding: 22, overflowY: "auto", maxHeight: "calc(90vh - 86px)" }}>{children}</div>
      </motion.div>
    </motion.div>
  );
}

function NetworkPill({
  net,
  selected,
  onSelect,
}: {
  net: (typeof NETWORKS)[number];
  selected: boolean;
  onSelect: () => void;
}) {
  const [imageError, setImageError] = useState(false);

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onSelect}
      style={{
        width: "100%",
        padding: "14px 10px",
        borderRadius: 18,
        border: `2px solid ${selected ? net.color : T.border}`,
        background: selected ? net.bg : T.card,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        cursor: "pointer",
      }}
    >
      {net.logo && !imageError ? (
        <img
          src={net.logo}
          alt={net.name}
          style={{ height: 34, maxWidth: 62, objectFit: "contain" }}
          onError={() => setImageError(true)}
        />
      ) : (
        <div style={{ width: 14, height: 14, borderRadius: "50%", background: net.color }} />
      )}
      <span
        style={{
          fontFamily: T.font,
          fontWeight: 700,
          fontSize: 13,
          color: selected ? T.text : T.textMid,
        }}
      >
        {net.name}
      </span>
    </motion.button>
  );
}

function HomeActionCard({
  icon,
  title,
  subtitle,
  color,
  background,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color: string;
  background: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      style={{
        border: "none",
        background: T.card,
        borderRadius: 16,
        padding: "12px 10px",
        minHeight: 84,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "space-between",
        cursor: "pointer",
        boxShadow: "0 8px 18px rgba(15,23,42,0.06)",
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 12,
          background,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>
      <div style={{ textAlign: "left" }}>
        <p style={{ fontFamily: T.font, fontWeight: 800, fontSize: 12, color: T.text, margin: "0 0 2px" }}>
          {title}
        </p>
        <p style={{ fontFamily: T.font, fontSize: 10, color: color, margin: 0 }}>{subtitle}</p>
      </div>
    </motion.button>
  );
}

function BroadcastBanner({
  notice,
  onDismiss,
}: {
  notice: BroadcastNotice | null;
  onDismiss: () => void;
}) {
  if (!notice) return null;

  const tone =
    notice.severity === "ERROR" || notice.severity === "WARNING"
      ? { bg: "#fff4e5", border: "#f5c27a", accent: T.amber }
      : notice.severity === "SUCCESS"
        ? { bg: "#ecfdf3", border: "#86efac", accent: T.green }
        : { bg: "#eef5ff", border: "#bfd4ff", accent: T.blue };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        marginBottom: 16,
        borderRadius: 20,
        border: `1px solid ${tone.border}`,
        background: tone.bg,
        padding: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <p style={{ fontFamily: T.font, fontWeight: 800, fontSize: 14, color: T.text, margin: "0 0 6px" }}>
            {notice.title || "Update"}
          </p>
          <p style={{ fontFamily: T.font, fontSize: 13, color: T.textMid, margin: 0, lineHeight: 1.5 }}>
            {notice.message}
          </p>
        </div>
        <button
          onClick={onDismiss}
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: tone.accent,
            fontFamily: T.font,
            fontWeight: 800,
            fontSize: 12,
          }}
        >
          Dismiss
        </button>
      </div>
    </motion.div>
  );
}

function RewardsScreen({
  rewardSnapshot,
  onBack,
}: {
  rewardSnapshot: RewardSnapshot | null;
  onBack: () => void;
}) {
  const items = rewardSnapshot?.items || [];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <button
        onClick={onBack}
        style={{ border: "none", background: "transparent", color: T.blue, fontFamily: T.font, fontWeight: 800, cursor: "pointer", padding: 0, marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}
      >
        <ChevronLeft size={16} />
        Back
      </button>

      <div
        style={{
          background: "linear-gradient(135deg, #fff8eb 0%, #ffffff 100%)",
          borderRadius: 24,
          border: `1px solid ${T.borderStrong}`,
          padding: 22,
          marginBottom: 18,
        }}
      >
        <p style={{ fontFamily: T.font, fontSize: 12, fontWeight: 800, color: T.textDim, margin: "0 0 8px", textTransform: "uppercase" }}>
          Earned Rewards
        </p>
        <p style={{ fontFamily: T.mono, fontSize: 28, fontWeight: 800, color: T.text, margin: "0 0 6px" }}>
          ₦{((rewardSnapshot?.rewardBalance || 0) / 100).toLocaleString()}
        </p>
        <p style={{ fontFamily: T.font, fontSize: 13, color: T.textMid, margin: 0 }}>
          Reward balance can be used for data purchases only.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {!items.length ? (
          <div
            style={{
              borderRadius: 20,
              border: `1px solid ${T.border}`,
              background: T.card,
              padding: 18,
            }}
          >
            <p style={{ fontFamily: T.font, fontSize: 14, fontWeight: 800, color: T.text, margin: "0 0 6px" }}>
              Rewards will show here
            </p>
            <p style={{ fontFamily: T.font, fontSize: 12, color: T.textMid, margin: 0, lineHeight: 1.5 }}>
              Ahh, sorry, your reward progress is not ready yet. Please refresh in a moment after your latest activity is recorded.
            </p>
          </div>
        ) : null}
        {items.map((item) => {
          const tone =
            item.status === "CLAIMED"
              ? { label: "Claimed", color: T.green, bg: "rgba(22,163,74,0.12)" }
              : item.status === "MISSED"
                ? { label: "Missed", color: T.rose, bg: "rgba(225,29,72,0.12)" }
                : { label: item.claimable ? "Ready" : "In progress", color: T.blue, bg: T.blueLight };

          return (
            <div
              key={item.id}
              style={{
                borderRadius: 20,
                border: `1px solid ${T.border}`,
                background: T.card,
                padding: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                <div>
                  <p style={{ fontFamily: T.font, fontSize: 15, fontWeight: 800, color: T.text, margin: "0 0 6px" }}>
                    {item.title}
                  </p>
                  <p style={{ fontFamily: T.font, fontSize: 12, color: T.textMid, margin: 0, lineHeight: 1.5 }}>
                    {item.description}
                  </p>
                </div>
                <span
                  style={{
                    borderRadius: 999,
                    padding: "5px 10px",
                    background: tone.bg,
                    color: tone.color,
                    fontFamily: T.font,
                    fontSize: 11,
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                  }}
                >
                  {tone.label}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <p style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 800, color: T.text, margin: 0 }}>
                  ₦{item.amount.toLocaleString()}
                </p>
                <p style={{ fontFamily: T.font, fontSize: 12, color: T.textDim, margin: 0 }}>
                  {item.progressValue.toLocaleString()} / {item.targetValue.toLocaleString()} {item.unit}
                </p>
              </div>

              <div style={{ width: "100%", height: 10, borderRadius: 999, background: T.surface, overflow: "hidden", marginBottom: 8 }}>
                <div
                  style={{
                    width: `${item.progressPercent}%`,
                    height: "100%",
                    borderRadius: 999,
                    background: item.status === "MISSED" ? T.rose : item.status === "CLAIMED" ? T.green : T.blue,
                  }}
                />
              </div>

              <p style={{ fontFamily: T.font, fontSize: 11, color: T.textDim, margin: 0 }}>
                {item.claimedAt ? `Claimed on ${new Date(item.claimedAt).toLocaleDateString()}` : "One-time reward"}
              </p>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function TransactionReceipt({
  open,
  onClose,
  transaction,
}: {
  open: boolean;
  onClose: () => void;
  transaction: TransactionItem | null;
}) {
  if (!transaction) return null;

  const statusTone =
    transaction.status === "SUCCESS"
      ? { bg: "rgba(22,163,74,0.12)", border: T.green, text: T.green, icon: "✓" }
      : transaction.status === "FAILED"
        ? { bg: "rgba(225,29,72,0.12)", border: T.rose, text: T.rose, icon: "!" }
        : { bg: "rgba(217,119,6,0.12)", border: T.amber, text: T.amber, icon: "…" };

  return (
    <BottomSheet open={open} onClose={onClose} title="Receipt" accentColor={T.blue}>
      <div
        style={{
          background: statusTone.bg,
          border: `1px solid ${statusTone.border}`,
          borderRadius: 18,
          padding: 18,
          textAlign: "center",
          marginBottom: 18,
        }}
      >
        <div
          style={{
            width: 68,
            height: 68,
            borderRadius: "50%",
            margin: "0 auto 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: T.card,
            color: statusTone.text,
            fontFamily: T.font,
            fontWeight: 800,
            fontSize: 28,
          }}
        >
          {statusTone.icon}
        </div>
        <p style={{ fontFamily: T.font, fontWeight: 800, fontSize: 18, color: statusTone.text, margin: "0 0 4px" }}>
          {transaction.status}
        </p>
        <p style={{ fontFamily: T.font, fontSize: 12, color: T.textMid, margin: 0 }}>
          {new Date(transaction.createdAt).toLocaleString()}
        </p>
      </div>

      {[
        ["Type", transaction.type.replace(/_/g, " ")],
        ["Amount", `₦${transaction.amount.toLocaleString()}`],
        ["Phone", transaction.phone || "—"],
        ["Description", transaction.description || "—"],
        ["Reference", transaction.reference],
      ].map(([label, value]) => (
        <div
          key={label}
          style={{
            background: T.surface,
            borderRadius: 14,
            padding: 14,
            marginBottom: 12,
            border: `1px solid ${T.border}`,
          }}
        >
          <p style={{ fontFamily: T.font, fontSize: 11, fontWeight: 700, color: T.textDim, margin: "0 0 6px", textTransform: "uppercase" }}>
            {label}
          </p>
          <p
            style={{
              fontFamily: label === "Reference" ? T.mono : T.font,
              fontSize: 14,
              fontWeight: 700,
              color: T.text,
              margin: 0,
              wordBreak: "break-word",
            }}
          >
            {value}
          </p>
        </div>
      ))}
    </BottomSheet>
  );
}

function SecurityModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (currentPin.length !== 6 || newPin.length !== 6 || confirmPin.length !== 6) {
      toast.error("Each PIN entry must be 6 digits.");
      return;
    }

    if (newPin !== confirmPin) {
      toast.error("Your new PIN entries do not match yet.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/change-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPin, newPin, confirmPin }),
      });
      const payload = await response.json();

      if (!response.ok) {
        toast.error(getFriendlyMessage(payload.error, "We could not change your PIN right now."));
        return;
      }

      toast.success("Your PIN has been updated.");
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      onClose();
    } catch {
      toast.error("We could not change your PIN right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Change PIN" accentColor={T.blue}>
      {[
        ["Current PIN", currentPin, setCurrentPin],
        ["New PIN", newPin, setNewPin],
        ["Confirm PIN", confirmPin, setConfirmPin],
      ].map(([label, value, setter]) => (
        <div key={label as string} style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontFamily: T.font, fontSize: 12, fontWeight: 700, color: T.textDim, marginBottom: 8, textTransform: "uppercase" }}>
            {label as string}
          </label>
          <input
            type="password"
            maxLength={6}
            value={value as string}
            onChange={(event) => (setter as React.Dispatch<React.SetStateAction<string>>)(event.target.value.replace(/\D/g, "").slice(0, 6))}
            style={{
              width: "100%",
              padding: "15px 16px",
              borderRadius: 14,
              border: `1px solid ${T.borderStrong}`,
              background: T.surface,
              fontFamily: T.mono,
              fontSize: 18,
              letterSpacing: "0.25em",
              boxSizing: "border-box",
              outline: "none",
              textAlign: "center",
            }}
          />
        </div>
      ))}

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={submit}
        disabled={loading}
        style={{
          width: "100%",
          border: "none",
          borderRadius: 16,
          padding: 16,
          background: T.blue,
          color: "#fff",
          fontFamily: T.font,
          fontWeight: 800,
          fontSize: 15,
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "Updating PIN..." : "Update PIN"}
      </motion.button>
    </BottomSheet>
  );
}

function InfiniteTransactionFeed({
  compact = false,
  title,
}: {
  compact?: boolean;
  title?: string;
}) {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionItem | null>(null);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  const fetchPage = async (cursor?: string | null) => {
    const params = new URLSearchParams({
      limit: compact ? "8" : "20",
    });
    if (cursor) params.set("cursor", cursor);

    const response = await fetch(`/api/transactions?${params.toString()}`, {
      credentials: "include",
      cache: "no-store",
    });
    const payload = await response.json();

    if (!response.ok || !payload.success) {
      throw new Error(payload.error || "Failed to load transactions");
    }

    return payload as { transactions: TransactionItem[]; nextCursor: string | null };
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const payload = await fetchPage();
        if (cancelled) return;
        setTransactions(payload.transactions);
        setNextCursor(payload.nextCursor);
        setHasMore(Boolean(payload.nextCursor));
      } catch {
        if (!cancelled) toast.error("Transactions could not load right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [compact]);

  useEffect(() => {
    if (!hasMore || !loaderRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (!firstEntry.isIntersecting || loadingMore || !nextCursor) return;

        setLoadingMore(true);
        fetchPage(nextCursor)
          .then((payload) => {
            setTransactions((current) => [...current, ...payload.transactions]);
            setNextCursor(payload.nextCursor);
            setHasMore(Boolean(payload.nextCursor));
          })
          .catch(() => toast.error("More transactions could not load right now."))
          .finally(() => setLoadingMore(false));
      },
      { threshold: 0.25 }
    );

    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, nextCursor]);

  const getStatusTone = (status: string) => {
    if (status === "SUCCESS") return { bg: "rgba(22,163,74,0.12)", color: T.green };
    if (status === "FAILED") return { bg: "rgba(225,29,72,0.12)", color: T.rose };
    return { bg: "rgba(217,119,6,0.12)", color: T.amber };
  };

  return (
    <>
      {title ? (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div />
          <p style={{ fontFamily: T.font, fontSize: compact ? 12 : 13, fontWeight: 700, color: T.textMid, margin: 0 }}>
            {title}
          </p>
        </div>
      ) : null}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: compact ? "28px 0" : "60px 0" }}>
          <Loader2 size={24} className="animate-spin" color={T.blue} />
        </div>
      ) : transactions.length === 0 ? (
        <div
          style={{
            background: T.surface,
            border: `1px dashed ${T.borderStrong}`,
            borderRadius: 18,
            padding: compact ? 18 : 24,
            textAlign: "center",
          }}
        >
          <p style={{ fontFamily: T.font, fontSize: 13, fontWeight: 700, color: T.textMid, margin: 0 }}>
            No transactions yet
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: compact ? 10 : 12 }}>
          {transactions.map((transaction) => {
            const tone = getStatusTone(transaction.status);
            return (
              <motion.button
                key={transaction.id}
                whileTap={{ scale: 0.99 }}
                onClick={() => setSelectedTransaction(transaction)}
                style={{
                  width: "100%",
                  border: `1px solid ${T.border}`,
                  background: T.card,
                  borderRadius: compact ? 16 : 18,
                  padding: compact ? "14px 14px" : "16px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <div
                    style={{
                      width: compact ? 38 : 42,
                      height: compact ? 38 : 42,
                      borderRadius: 14,
                      background: T.blueLight,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: T.blue,
                    }}
                  >
                    {transaction.type === "DATA_PURCHASE" ? <Bolt size={18} /> : transaction.type === "AIRTIME_PURCHASE" ? <Phone size={18} /> : <Wallet size={18} />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontFamily: T.font, fontWeight: 700, fontSize: compact ? 13 : 14, color: T.text, margin: "0 0 4px" }}>
                      {transaction.type.replace(/_/g, " ")}
                    </p>
                    <p style={{ fontFamily: T.font, fontSize: compact ? 11 : 12, color: T.textDim, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: compact ? 180 : 240 }}>
                      {transaction.description || transaction.phone || "Transaction"} • {new Date(transaction.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <p style={{ fontFamily: T.mono, fontWeight: 700, fontSize: compact ? 13 : 14, color: T.text, margin: "0 0 6px" }}>
                    ₦{transaction.amount.toLocaleString()}
                  </p>
                  <span
                    style={{
                      display: "inline-block",
                      borderRadius: 999,
                      padding: "4px 8px",
                      background: tone.bg,
                      color: tone.color,
                      fontFamily: T.font,
                      fontSize: 10,
                      fontWeight: 800,
                    }}
                  >
                    {transaction.status}
                  </span>
                </div>
              </motion.button>
            );
          })}
          {hasMore ? (
            <div ref={loaderRef} style={{ display: "flex", justifyContent: "center", padding: "8px 0 4px" }}>
              {loadingMore ? <Loader2 size={20} className="animate-spin" color={T.blue} /> : <span style={{ fontFamily: T.font, fontSize: 11, color: T.textDim }}>Loading more…</span>}
            </div>
          ) : null}
        </div>
      )}

      <TransactionReceipt
        open={Boolean(selectedTransaction)}
        onClose={() => setSelectedTransaction(null)}
        transaction={selectedTransaction}
      />
    </>
  );
}

function HomeTab({
  user,
  showBalance,
  syncingBalance,
  copied,
  rewardBalance,
  onToggleBalance,
  onSyncBalance,
  onCopyAccount,
  onOpenData,
  onOpenAirtime,
  onOpenRewards,
}: {
  user: UserData;
  showBalance: boolean;
  syncingBalance: boolean;
  copied: boolean;
  rewardBalance: number;
  onToggleBalance: () => void;
  onSyncBalance: () => void;
  onCopyAccount: () => void;
  onOpenData: () => void;
  onOpenAirtime: () => void;
  onOpenRewards: () => void;
}) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: "linear-gradient(135deg, #eef5ff 0%, #ffffff 100%)",
          borderRadius: 26,
          padding: "18px 18px",
          border: `1px solid ${T.borderStrong}`,
          boxShadow: T.blueShadow,
          marginBottom: 22,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: T.font, fontSize: 11, fontWeight: 800, color: T.textDim, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Wallet Balance
            </p>
            <p style={{ display: "none", fontFamily: T.mono, fontSize: 28, fontWeight: 800, color: T.blueDark, margin: "0 0 8px" }}>
              {showBalance ? new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(user.balance / 100) : "••••••"}
            </p>
            <p style={{ display: "none", fontFamily: T.font, fontSize: 12, fontWeight: 700, color: T.textMid, margin: 0 }}>
              {user.virtualAccount?.bankName || "Virtual Account"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={onToggleBalance}
              style={{
                width: 40,
                height: 40,
                borderRadius: 14,
                border: `1px solid ${T.borderStrong}`,
                background: T.card,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              {showBalance ? <Eye size={17} color={T.blue} /> : <EyeOff size={17} color={T.blue} />}
            </button>
            <button
              onClick={onSyncBalance}
              style={{
                width: 40,
                height: 40,
                borderRadius: 14,
                border: `1px solid ${T.borderStrong}`,
                background: T.card,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              {syncingBalance ? <Loader2 size={17} className="animate-spin" color={T.blue} /> : <Sparkles size={17} color={T.blue} />}
            </button>
          </div>
        </div>

        <p style={{ fontFamily: T.mono, fontSize: 28, fontWeight: 800, color: T.blueDark, margin: "0 0 10px" }}>
          {showBalance ? new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(user.balance / 100) : "••••••"}
        </p>

        <div
          style={{
            border: `1px solid ${T.border}`,
            borderRadius: 18,
            padding: "10px 12px",
            background: "rgba(255,255,255,0.82)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div>
              <p style={{ display: "none", fontFamily: T.font, fontSize: 11, fontWeight: 800, color: T.textDim, margin: "0 0 6px", textTransform: "uppercase" }}>
                Funding Account
              </p>
              <p style={{ fontFamily: T.mono, fontSize: 15, fontWeight: 700, color: T.text, margin: 0 }}>
                {user.virtualAccount?.accountNumber || "Unavailable"} {user.virtualAccount?.bankName ? `• ${user.virtualAccount.bankName}` : ""}
              </p>
            </div>
            <button
              onClick={onCopyAccount}
              style={{
                border: "none",
                borderRadius: 14,
                padding: "10px 12px",
                background: copied ? "rgba(22,163,74,0.12)" : T.blueLight,
                color: copied ? T.green : T.blue,
                fontFamily: T.font,
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        style={{
          border: `1px solid ${T.borderStrong}`,
          borderRadius: 22,
          background: T.surface,
          padding: 12,
          marginBottom: 20,
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          <HomeActionCard
            icon={<Bolt size={16} color={T.blue} />}
            title="Data"
            subtitle="Buy now"
            color={T.blue}
            background={T.blueLight}
            onClick={onOpenData}
          />
          <HomeActionCard
            icon={<Phone size={16} color={T.green} />}
            title="Airtime"
            subtitle="Recharge"
            color={T.green}
            background="rgba(22,163,74,0.12)"
            onClick={onOpenAirtime}
          />
          <HomeActionCard
            icon={<Sparkles size={16} color={T.amber} />}
            title="Rewards"
            subtitle={`₦${rewardBalance.toLocaleString()}`}
            color={T.amber}
            background="rgba(217,119,6,0.12)"
            onClick={onOpenRewards}
          />
        </div>
      </motion.div>

      <InfiniteTransactionFeed compact title="Recent transaction" />
    </>
  );
}

function TransactionsTab() {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontFamily: T.font, fontSize: 12, fontWeight: 800, color: T.textDim, margin: "0 0 6px", textTransform: "uppercase" }}>
          Transactions
        </p>
        <h2 style={{ fontFamily: T.font, fontSize: 26, fontWeight: 800, color: T.text, margin: 0 }}>
          All Activity
        </h2>
      </div>
      <InfiniteTransactionFeed />
    </motion.div>
  );
}

function ProfileTab({
  user,
  onLogout,
}: {
  user: UserData;
  onLogout: () => void;
}) {
  const [securityOpen, setSecurityOpen] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [darkThemeEnabled, setDarkThemeEnabled] = useState(false);
  const [metrics, setMetrics] = useState({ volume: 0, count: 0 });

  useEffect(() => {
    fetch("/api/transactions?limit=100", { credentials: "include", cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        const transactions = Array.isArray(payload?.transactions) ? payload.transactions : [];
        setMetrics({
          volume: transactions.reduce((sum: number, tx: TransactionItem) => sum + Number(tx.amount || 0), 0),
          count: transactions.length,
        });
      })
      .catch(() => setMetrics({ volume: 0, count: 0 }));
  }, []);

  const toggleHaptics = () => {
    setHapticsEnabled((value) => !value);
    toast.success(`Haptics ${hapticsEnabled ? "disabled" : "enabled"}.`);
  };

  const toggleTheme = () => {
    setDarkThemeEnabled((value) => !value);
    toast.info("Theme preference saved on this device.");
  };

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontFamily: T.font, fontSize: 12, fontWeight: 800, color: T.textDim, margin: "0 0 6px", textTransform: "uppercase" }}>
            Profile
          </p>
          <h2 style={{ fontFamily: T.font, fontSize: 26, fontWeight: 800, color: T.text, margin: 0 }}>
            User Details
          </h2>
        </div>

        {[
          ["Name", user.fullName],
          ["Email", user.email || "No email on file"],
          ["Phone", user.phone],
          ["Date joined", user.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : "—"],
          ["Bank", user.virtualAccount?.bankName || "Unavailable"],
          ["Account number", user.virtualAccount?.accountNumber || "Unavailable"],
          ["Transaction volume", `₦${metrics.volume.toLocaleString()}`],
          ["Transaction count", metrics.count.toString()],
        ].map(([label, value]) => (
          <div
            key={label}
            style={{
              background: T.card,
              borderRadius: 18,
              border: `1px solid ${T.border}`,
              padding: "14px 16px",
              marginBottom: 12,
            }}
          >
            <p style={{ fontFamily: T.font, fontSize: 11, fontWeight: 800, color: T.textDim, margin: "0 0 6px", textTransform: "uppercase" }}>
              {label}
            </p>
            <p style={{ fontFamily: label === "Account number" ? T.mono : T.font, fontSize: 15, fontWeight: 700, color: T.text, margin: 0 }}>
              {value}
            </p>
          </div>
        ))}

        <div
          style={{
            background: T.surface,
            border: `1px solid ${T.borderStrong}`,
            borderRadius: 22,
            padding: 16,
            marginTop: 18,
          }}
        >
          <p style={{ fontFamily: T.font, fontSize: 12, fontWeight: 800, color: T.textDim, margin: "0 0 14px", textTransform: "uppercase" }}>
            Settings
          </p>

          {[
            {
              label: "Haptics",
              sub: hapticsEnabled ? "Enabled" : "Disabled",
              action: toggleHaptics,
              icon: <Sparkles size={16} color={T.blue} />,
            },
            {
              label: "Theme",
              sub: darkThemeEnabled ? "Dark preference saved" : "Light preference saved",
              action: toggleTheme,
              icon: <Moon size={16} color={T.blue} />,
            },
            {
              label: "Change PIN",
              sub: "Update your transaction PIN",
              action: () => setSecurityOpen(true),
              icon: <CreditCard size={16} color={T.blue} />,
            },
            {
              label: "Sign out",
              sub: "Log out from this device",
              action: onLogout,
              icon: <LogOut size={16} color={T.rose} />,
            },
          ].map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              style={{
                width: "100%",
                border: "none",
                background: T.card,
                borderRadius: 16,
                padding: "14px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 12,
                    background: T.blueLight,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {item.icon}
                </div>
                <div>
                  <p style={{ fontFamily: T.font, fontSize: 14, fontWeight: 700, color: T.text, margin: "0 0 4px" }}>
                    {item.label}
                  </p>
                  <p style={{ fontFamily: T.font, fontSize: 11, color: T.textDim, margin: 0 }}>{item.sub}</p>
                </div>
              </div>
              <ChevronLeft size={16} color={T.textDim} style={{ transform: "rotate(180deg)" }} />
            </button>
          ))}
        </div>
      </motion.div>

      <SecurityModal open={securityOpen} onClose={() => setSecurityOpen(false)} />
    </>
  );
}

function TabBar({
  activeTab,
  onChange,
}: {
  activeTab: AppTab;
  onChange: (tab: AppTab) => void;
}) {
  const items = [
    { id: "home" as const, label: "Home", icon: Home },
    { id: "transactions" as const, label: "Transactions", icon: Receipt },
    { id: "profile" as const, label: "Profile", icon: User },
  ];

  return (
    <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 60, display: "flex", justifyContent: "center", padding: "0 14px 16px" }}>
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          borderRadius: 26,
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(18px)",
          border: `1px solid ${T.borderStrong}`,
          boxShadow: T.blueShadow,
          padding: 10,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
        }}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              style={{
                border: "none",
                borderRadius: 18,
                padding: "10px 6px",
                background: isActive ? T.blueLight : "transparent",
                color: isActive ? T.blue : T.textMid,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                cursor: "pointer",
                fontFamily: T.font,
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              <Icon size={18} />
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AppTab>("home");
  const [showRewards, setShowRewards] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [syncingBalance, setSyncingBalance] = useState(false);
  const [rewardSnapshot, setRewardSnapshot] = useState<RewardSnapshot | null>(null);
  const [broadcasts, setBroadcasts] = useState<BroadcastNotice[]>([]);

  const [buyDataOpen, setBuyDataOpen] = useState(false);
  const [buyDataStep, setBuyDataStep] = useState(1);
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);
  const [dataPlans, setDataPlans] = useState<DataPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<DataPlan | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pin, setPin] = useState("");
  const [purchasingData, setPurchasingData] = useState(false);
  const [plansLoading, setPlansLoading] = useState(false);

  const [airtimeOpen, setAirtimeOpen] = useState(false);
  const [airtimeNetwork, setAirtimeNetwork] = useState<string | null>(null);
  const [airtimeAmount, setAirtimeAmount] = useState<number | null>(null);
  const [airtimePhone, setAirtimePhone] = useState("");
  const [airtimePin, setAirtimePin] = useState("");
  const [purchasingAirtime, setPurchasingAirtime] = useState(false);

  useEffect(() => {
    const cacheBuster = `_cb=${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    fetch(`/api/auth/me?${cacheBuster}`, { credentials: "include", cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (payload?.success && payload?.data) {
          setUser(payload.data);
          return;
        }
        router.push("/app/auth");
      })
      .catch(() => router.push("/app/auth"))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    fetch("/api/notices/active", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (!Array.isArray(payload?.data)) return;
        const dismissed = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("dismissed_notices") || "[]") : [];
        setBroadcasts(
          payload.data.filter((notice: BroadcastNotice) => !dismissed.includes(notice.id)).slice(0, 3)
        );
      })
      .catch(() => undefined);
  }, []);

  const refreshUser = async () => {
    const cacheBuster = `_cb=${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const response = await fetch(`/api/auth/me?${cacheBuster}`, { credentials: "include", cache: "no-store" });
    const payload = await response.json();
    if (payload?.success && payload?.data) setUser(payload.data);
  };

  const refreshRewards = async () => {
    const response = await fetch("/api/rewards", { credentials: "include", cache: "no-store" });
    const payload = await response.json();
    if (response.ok && payload?.success) {
      setRewardSnapshot(payload.data);
      return;
    }
    throw new Error(payload?.error || "Could not load rewards");
  };

  useEffect(() => {
    if (!user) return;
    refreshRewards().catch(() => undefined);
  }, [user?.id]);

  const dismissBroadcast = (id: string) => {
    setBroadcasts((current) => current.filter((item) => item.id !== id));
    if (typeof window !== "undefined") {
      const dismissed = JSON.parse(localStorage.getItem("dismissed_notices") || "[]");
      localStorage.setItem("dismissed_notices", JSON.stringify([...new Set([...dismissed, id])]));
    }
  };

  const handleCopy = () => {
    const accountNumber = user?.virtualAccount?.accountNumber;
    if (!accountNumber) {
      toast.error("Ahh, sorry, your funding account is not ready yet.");
      return;
    }
    navigator.clipboard.writeText(accountNumber);
    setCopied(true);
    toast.success("Account number copied.");
    setTimeout(() => setCopied(false), 1800);
  };

  const handleSyncBalance = async () => {
    setSyncingBalance(true);
    try {
      await refreshUser();
      await refreshRewards().catch(() => undefined);
      toast.success("Your balance is up to date.");
    } catch {
      toast.error("Ahh, sorry, your balance could not refresh just now.");
    } finally {
      setSyncingBalance(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } finally {
      if (typeof window !== "undefined") {
        localStorage.clear();
        sessionStorage.clear();
      }
      window.location.href = "/app/auth";
    }
  };

  const handleNetworkSelect = async (networkId: string) => {
    setSelectedNetwork(networkId);
    setPlansLoading(true);
    try {
      const response = await fetch(`/api/data/plans?network=${networkId}`, { cache: "no-store" });
      const payload = await response.json();
      setDataPlans(payload.data || []);
      setBuyDataStep(2);
    } catch {
      toast.error("Ahh, sorry, plans could not load right now. Please try again shortly.");
    } finally {
      setPlansLoading(false);
    }
  };

  const handleDataPurchase = async () => {
    if (!selectedPlan || phoneNumber.length !== 11 || pin.length !== 6 || !user) {
      toast.error("Ahh, sorry, please complete the phone number and PIN before continuing.");
      return;
    }

    setPurchasingData(true);
    try {
      const payload = {
        planId: selectedPlan.id,
        buyerPhone: user.phone,
        recipientPhone: phoneNumber,
        pin,
      };

      let response = await fetch("/api/data/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      let result = await response.json();

      if (response.status === 409 && result?.requiresConfirmation) {
        const shouldContinue = window.confirm("Ahh, sorry, a similar data request was noticed. Do you still want to continue?");
        if (!shouldContinue) return;

        response = await fetch("/api/data/purchase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, confirmDuplicate: true }),
        });
        result = await response.json();
      }

      if (!response.ok || !result.success) {
        toast.error(getFriendlyMessage(result.error, "We could not complete that data purchase right now."));
        return;
      }

      toast.success(result.message || "Your data purchase was successful.");
      setBuyDataOpen(false);
      setBuyDataStep(1);
      setSelectedNetwork(null);
      setSelectedPlan(null);
      setPhoneNumber("");
      setPin("");
      await refreshUser();
      await refreshRewards().catch(() => undefined);
    } catch {
      toast.error("Ahh, sorry, we could not complete that data purchase right now.");
    } finally {
      setPurchasingData(false);
    }
  };

  const handleAirtimePurchase = async () => {
    if (!airtimeNetwork || !airtimeAmount || airtimePhone.length !== 11 || airtimePin.length !== 6 || !user) {
      toast.error("Ahh, sorry, please complete the phone number and PIN before continuing.");
      return;
    }

    setPurchasingAirtime(true);
    try {
      const payload = {
        buyerPhone: user.phone,
        recipientPhone: airtimePhone,
        amount: airtimeAmount,
        network: airtimeNetwork,
        pin: airtimePin,
      };

      let response = await fetch("/api/airtime/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      let result = await response.json();

      if (response.status === 409 && result?.requiresConfirmation) {
        const shouldContinue = window.confirm("Ahh, sorry, a similar airtime request was noticed. Do you still want to continue?");
        if (!shouldContinue) return;

        response = await fetch("/api/airtime/purchase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, confirmDuplicate: true }),
        });
        result = await response.json();
      }

      if (!response.ok || !result.success) {
        toast.error(getFriendlyMessage(result.error, "We could not complete that airtime purchase right now."));
        return;
      }

      toast.success(result.message || "Your airtime purchase was successful.");
      setAirtimeOpen(false);
      setAirtimeNetwork(null);
      setAirtimeAmount(null);
      setAirtimePhone("");
      setAirtimePin("");
      await refreshUser();
      await refreshRewards().catch(() => undefined);
    } catch {
      toast.error("Ahh, sorry, we could not complete that airtime purchase right now.");
    } finally {
      setPurchasingAirtime(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg }}>
        <Loader2 size={28} className="animate-spin" color={T.blue} />
      </div>
    );
  }

  if (!user) return null;

  const initials = user.fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <style>{fontStyle}</style>

      <div style={{ minHeight: "100vh", background: T.bg, paddingBottom: 108 }}>
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 40,
            background: "rgba(251,251,253,0.92)",
            backdropFilter: "blur(16px)",
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <div
            style={{
              maxWidth: 520,
              margin: "0 auto",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 16,
                  background: "linear-gradient(135deg, #2463eb 0%, #4f8cff 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontFamily: T.font,
                  fontWeight: 800,
                  fontSize: 15,
                }}
              >
                {initials}
              </div>
              <div>
                <p style={{ fontFamily: T.font, fontSize: 11, fontWeight: 800, color: T.textDim, margin: "0 0 4px", textTransform: "uppercase" }}>
                  SY Data Sub
                </p>
                <p style={{ fontFamily: T.font, fontSize: 15, fontWeight: 800, color: T.text, margin: 0 }}>
                  {user.fullName}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                border: "none",
                borderRadius: 14,
                padding: "10px 12px",
                background: T.card,
                color: T.textMid,
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontFamily: T.font,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              <LogOut size={14} />
              Exit
            </button>
          </div>
        </div>

        <main style={{ maxWidth: 520, margin: "0 auto", padding: "20px 20px 0" }}>
          <BroadcastBanner notice={broadcasts[0] || null} onDismiss={() => broadcasts[0] && dismissBroadcast(broadcasts[0].id)} />

          {showRewards ? (
            <RewardsScreen rewardSnapshot={rewardSnapshot} onBack={() => setShowRewards(false)} />
          ) : activeTab === "home" ? (
            <HomeTab
              user={user}
              showBalance={showBalance}
              syncingBalance={syncingBalance}
              copied={copied}
              rewardBalance={Math.round((rewardSnapshot?.rewardBalance || user.rewardBalance || 0) / 100)}
              onToggleBalance={() => setShowBalance((value) => !value)}
              onSyncBalance={handleSyncBalance}
              onCopyAccount={handleCopy}
              onOpenData={() => setBuyDataOpen(true)}
              onOpenAirtime={() => setAirtimeOpen(true)}
              onOpenRewards={() => setShowRewards(true)}
            />
          ) : activeTab === "transactions" ? (
            <TransactionsTab />
          ) : (
            <ProfileTab user={user} onLogout={handleLogout} />
          )}
        </main>

        <TabBar
          activeTab={activeTab}
          onChange={(tab) => {
            setShowRewards(false);
            setActiveTab(tab);
          }}
        />
      </div>

      <BottomSheet
        open={buyDataOpen}
        onClose={() => {
          setBuyDataOpen(false);
          setBuyDataStep(1);
          setSelectedNetwork(null);
          setSelectedPlan(null);
          setPhoneNumber("");
          setPin("");
        }}
        title="Buy Data"
        accentColor={T.blue}
      >
        {buyDataStep === 1 && (
          <>
            <p style={{ fontFamily: T.font, fontSize: 14, color: T.textMid, margin: "0 0 18px" }}>
              Select a network to continue
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {NETWORKS.map((network) => (
                <NetworkPill
                  key={network.id}
                  net={network}
                  selected={selectedNetwork === network.id}
                  onSelect={() => handleNetworkSelect(network.id)}
                />
              ))}
            </div>
          </>
        )}

        {buyDataStep === 2 && (
          <>
            <button
              onClick={() => setBuyDataStep(1)}
              style={{ border: "none", background: "transparent", color: T.blue, fontFamily: T.font, fontWeight: 800, cursor: "pointer", padding: 0, marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}
            >
              <ChevronLeft size={16} />
              Back
            </button>

            {plansLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "50px 0" }}>
                <Loader2 size={24} className="animate-spin" color={T.blue} />
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {dataPlans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => {
                      setSelectedPlan(plan);
                      setBuyDataStep(3);
                    }}
                    style={{
                      border: `1px solid ${T.border}`,
                      borderRadius: 18,
                      background: T.card,
                      padding: "16px 16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ textAlign: "left" }}>
                      <p style={{ fontFamily: T.font, fontSize: 15, fontWeight: 800, color: T.text, margin: "0 0 4px" }}>{plan.sizeLabel}</p>
                      <p style={{ fontFamily: T.font, fontSize: 12, color: T.textDim, margin: 0 }}>{plan.validity}</p>
                    </div>
                    <p style={{ fontFamily: T.mono, fontSize: 15, fontWeight: 800, color: T.blue, margin: 0 }}>
                      ₦{getPriceForTier(plan, user.tier).toLocaleString()}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {buyDataStep === 3 && selectedPlan && (
          <>
            <button
              onClick={() => setBuyDataStep(2)}
              style={{ border: "none", background: "transparent", color: T.blue, fontFamily: T.font, fontWeight: 800, cursor: "pointer", padding: 0, marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}
            >
              <ChevronLeft size={16} />
              Back
            </button>

            <div style={{ background: T.blueLight, borderRadius: 18, padding: 16, marginBottom: 18 }}>
              <p style={{ fontFamily: T.font, fontSize: 12, color: T.textDim, margin: "0 0 6px", textTransform: "uppercase", fontWeight: 800 }}>
                Selected plan
              </p>
              <p style={{ fontFamily: T.font, fontSize: 16, fontWeight: 800, color: T.text, margin: "0 0 8px" }}>
                {selectedPlan.sizeLabel} • {selectedPlan.validity}
              </p>
              <p style={{ fontFamily: T.mono, fontSize: 18, fontWeight: 800, color: T.blue, margin: 0 }}>
                ₦{getPriceForTier(selectedPlan, user.tier).toLocaleString()}
              </p>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontFamily: T.font, fontSize: 12, fontWeight: 800, color: T.textDim, marginBottom: 8, textTransform: "uppercase" }}>
                Phone number
              </label>
              <input
                type="tel"
                maxLength={11}
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value.replace(/\D/g, ""))}
                style={{
                  width: "100%",
                  padding: "15px 16px",
                  borderRadius: 16,
                  border: `1px solid ${T.borderStrong}`,
                  background: T.surface,
                  fontFamily: T.mono,
                  fontSize: 16,
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontFamily: T.font, fontSize: 12, fontWeight: 800, color: T.textDim, marginBottom: 8, textTransform: "uppercase" }}>
                Transaction PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
                style={{
                  width: "100%",
                  padding: "15px 16px",
                  textAlign: "center",
                  borderRadius: 14,
                  border: `1px solid ${pin ? T.blue : T.borderStrong}`,
                  background: pin ? T.blueLight : T.surface,
                  fontFamily: T.mono,
                  fontSize: 18,
                  fontWeight: 800,
                  outline: "none",
                  boxSizing: "border-box",
                  letterSpacing: "0.18em",
                }}
              />
            </div>

            <button
              onClick={handleDataPurchase}
              disabled={purchasingData}
              style={{
                width: "100%",
                border: "none",
                borderRadius: 16,
                padding: 16,
                background: T.blue,
                color: "#fff",
                fontFamily: T.font,
                fontWeight: 800,
                fontSize: 15,
                cursor: purchasingData ? "not-allowed" : "pointer",
                opacity: purchasingData ? 0.7 : 1,
              }}
            >
              {purchasingData ? "Processing..." : "Confirm Purchase"}
            </button>
          </>
        )}
      </BottomSheet>

      <BottomSheet
        open={airtimeOpen}
        onClose={() => {
          setAirtimeOpen(false);
          setAirtimeNetwork(null);
          setAirtimeAmount(null);
          setAirtimePhone("");
          setAirtimePin("");
        }}
        title="Buy Airtime"
        accentColor={T.green}
      >
        <div style={{ marginBottom: 18 }}>
          <p style={{ fontFamily: T.font, fontSize: 12, fontWeight: 800, color: T.textDim, margin: "0 0 10px", textTransform: "uppercase" }}>
            Choose network
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {NETWORKS.map((network) => (
              <NetworkPill
                key={network.id}
                net={network}
                selected={airtimeNetwork === network.id}
                onSelect={() => setAirtimeNetwork(network.id)}
              />
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <p style={{ fontFamily: T.font, fontSize: 12, fontWeight: 800, color: T.textDim, margin: "0 0 10px", textTransform: "uppercase" }}>
            Amount
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {AIRTIME_AMOUNTS.map((amount) => (
              <button
                key={amount}
                onClick={() => setAirtimeAmount(amount)}
                style={{
                  border: `1px solid ${airtimeAmount === amount ? T.green : T.border}`,
                  borderRadius: 14,
                  padding: "12px 10px",
                  background: airtimeAmount === amount ? "rgba(22,163,74,0.12)" : T.card,
                  cursor: "pointer",
                  fontFamily: T.mono,
                  fontWeight: 800,
                  color: T.text,
                }}
              >
                ₦{amount}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontFamily: T.font, fontSize: 12, fontWeight: 800, color: T.textDim, marginBottom: 8, textTransform: "uppercase" }}>
            Phone number
          </label>
          <input
            type="tel"
            maxLength={11}
            value={airtimePhone}
            onChange={(event) => setAirtimePhone(event.target.value.replace(/\D/g, ""))}
            style={{
              width: "100%",
              padding: "15px 16px",
              borderRadius: 16,
              border: `1px solid ${T.borderStrong}`,
              background: T.surface,
              fontFamily: T.mono,
              fontSize: 16,
              boxSizing: "border-box",
              outline: "none",
            }}
          />
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontFamily: T.font, fontSize: 12, fontWeight: 800, color: T.textDim, marginBottom: 8, textTransform: "uppercase" }}>
            Transaction PIN
          </label>
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={airtimePin}
            onChange={(event) => setAirtimePin(event.target.value.replace(/\D/g, "").slice(0, 6))}
            style={{
              width: "100%",
              padding: "15px 16px",
              textAlign: "center",
              borderRadius: 14,
              border: `1px solid ${airtimePin ? T.green : T.borderStrong}`,
              background: airtimePin ? "rgba(22,163,74,0.12)" : T.surface,
              fontFamily: T.mono,
              fontSize: 18,
              fontWeight: 800,
              outline: "none",
              boxSizing: "border-box",
              letterSpacing: "0.18em",
            }}
          />
        </div>

        <button
          onClick={handleAirtimePurchase}
          disabled={purchasingAirtime}
          style={{
            width: "100%",
            border: "none",
            borderRadius: 16,
            padding: 16,
            background: T.green,
            color: "#fff",
            fontFamily: T.font,
            fontWeight: 800,
            fontSize: 15,
            cursor: purchasingAirtime ? "not-allowed" : "pointer",
            opacity: purchasingAirtime ? 0.7 : 1,
          }}
        >
          {purchasingAirtime ? "Processing..." : "Buy Airtime"}
        </button>
      </BottomSheet>
    </>
  );
}
