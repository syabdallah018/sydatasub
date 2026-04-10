"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Copy, Check, Eye, EyeOff, Loader2, LogOut, Zap, Phone, Gift, CreditCard, X, ChevronLeft, Settings } from "lucide-react";
import { toast } from "sonner";

const fontStyle = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&family=DM+Mono:wght@400;500&display=swap');
`;

const T = {
  bg: "#ffffff",
  surface: "#f8f9fc",
  card: "#ffffff",
  border: "#e5e7eb",
  blueLight: "#dbeafe",
  blue: "#2563eb",
  blueShadow: "0 12px 30px rgba(37, 99, 235, 0.15)",
  blueBorder: "rgba(37, 99, 235, 0.2)",
  gold: "#fbbf24",
  green: "#10b981",
  amber: "#f59e0b",
  purple: "#8b5cf6",
  text: "#1f2937",
  textMid: "#6b7280",
  textDim: "#9ca3af",
  font: "'DM Sans', sans-serif",
  mono: "'DM Mono', monospace",
};

interface User {
  id: string;
  fullName: string;
  phone: string;
  balance: number;
  tier: "user" | "agent";
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

const NETWORKS = [
  { id: "mtn", name: "MTN", color: "#FFCC00", bg: "#fef9c3", logo: "/mtn.jpg" },
  { id: "airtel", name: "Airtel", color: "#FF3333", bg: "#fee2e2", logo: "/airtel.jpg" },
  { id: "glo", name: "Glo", color: "#22C55E", bg: "#dcfce7", logo: "/glo.jpg" },
  { id: "9mobile", name: "9mobile", color: "#00A859", bg: "#d1fae5", logo: "/9mobile.jpg" },
];

const AIRTIME_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

const getPriceForTier = (plan: DataPlan, tier: string = "user"): number => {
  if (tier === "agent" && plan.agent_price > 0) return plan.agent_price;
  return plan.user_price > 0 ? plan.user_price : plan.price;
};

function BottomSheet({ open, onClose, title, accentColor = T.blue, children }: any) {
  return (
    <motion.div key={open ? "open" : "closed"} initial={{ opacity: 0 }} animate={{ opacity: open ? 1 : 0 }} style={{ position: "fixed", inset: 0, zIndex: 50, background: open ? "rgba(0,0,0,0.5)" : "transparent", backdropFilter: "blur(6px)", display: "flex", alignItems: "flex-end", justifyContent: "center", pointerEvents: open ? "auto" : "none", transition: "opacity 0.2s" }} onClick={onClose}>
      <motion.div initial={{ y: "100%" }} animate={{ y: open ? 0 : "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} style={{ background: T.card, borderRadius: "28px 28px 0 0", width: "100%", maxWidth: 520, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", border: `2px solid ${T.blueBorder}`, boxShadow: T.blueShadow }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "center", padding: "14px 0 6px" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: T.border }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px 16px", borderBottom: `2px solid ${T.blueBorder}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 5, height: 24, borderRadius: 3, background: accentColor }} />
            <h2 style={{ fontFamily: T.font, fontWeight: 700, fontSize: 20, color: T.text, margin: 0 }}>{title}</h2>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 12, background: T.surface, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={18} color={T.textMid} />
          </button>
        </div>
        <div style={{ overflowY: "auto", padding: "24px", flex: 1 }}>
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}

function NetworkPill({ net, selected, onSelect }: any) {
  const [imageError, setImageError] = useState(false);
  return (
    <motion.button 
      whileTap={{ scale: 0.95 }} 
      onClick={onSelect} 
      style={{ 
        padding: "14px 12px", 
        borderRadius: 16, 
        border: `2.5px solid ${selected ? net.color : T.border}`, 
        background: selected ? net.bg : T.surface, 
        fontFamily: T.font, 
        fontWeight: 700, 
        fontSize: 15, 
        color: selected ? net.color : T.textMid, 
        cursor: "pointer", 
        transition: "all 0.2s",
        width: "100%",
        boxShadow: selected ? `0 8px 20px ${net.color}40` : "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        flexDirection: "column"
      }} 
    >
      {net.logo && !imageError ? (
        <img src={net.logo} alt={net.name} style={{ height: 36, maxWidth: 64, objectFit: "contain" }} onError={() => setImageError(true)} />
      ) : (
        <div style={{ width: 16, height: 16, borderRadius: "50%", background: net.color }} />
      )}
      <span>{net.name}</span>
    </motion.button>
  );
}

function ActionTile({ icon, label, sub, color, dimColor, onClick }: any) {
  return (
    <motion.button whileHover={{ y: -4, boxShadow: `0 16px 24px ${color}20` }} whileTap={{ scale: 0.97 }} onClick={onClick} style={{ background: T.card, border: `1.5px solid ${T.blueBorder}`, borderRadius: 20, padding: "20px 16px", cursor: "pointer", textAlign: "left", width: "100%", display: "flex", flexDirection: "column", gap: 12, position: "relative", overflow: "hidden", transition: "all 0.3s", boxShadow: `0 4px 12px ${color}15` }}>
      <div style={{ width: 44, height: 44, borderRadius: 14, background: dimColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon}
      </div>
      <div>
        <p style={{ fontFamily: T.font, fontWeight: 700, fontSize: 15, color: T.text, margin: "0 0 3px" }}>{label}</p>
        <p style={{ fontFamily: T.font, fontWeight: 400, fontSize: 12, color: T.textDim, margin: 0 }}>{sub}</p>
      </div>
    </motion.button>
  );
}

function TransactionHistory() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const res = await fetch("/api/transactions", { credentials: "include" });
        const data = await res.json();
        
        console.log("[TXN] API Response:", data);
        
        if (res.ok && data?.success) {
          const txList = data.transactions || data.data || [];
          setTransactions(Array.isArray(txList) ? txList : []);
        } else {
          console.error("[TXN] API Error:", data?.error);
          setTransactions([]);
        }
      } catch (error: any) {
        console.error("[TXN] Fetch Error:", error);
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTransactions();
  }, []);

  const getTransactionIcon = (type: string) => {
    if (type === "DATA_PURCHASE") return "📱";
    if (type === "AIRTIME_PURCHASE") return "☎️";
    if (type === "WALLET_FUNDING") return "💰";
    if (type === "REWARD_CREDIT") return "🎁";
    return "💳";
  };

  const getTransactionTitle = (type: string) => {
    if (type === "DATA_PURCHASE") return "Data Purchase";
    if (type === "AIRTIME_PURCHASE") return "Airtime Purchase";
    if (type === "WALLET_FUNDING") return "Wallet Funding";
    if (type === "REWARD_CREDIT") return "Reward Credit";
    return type;
  };

  const getStatusColor = (status: string) => {
    if (status === "SUCCESS") return { bg: "rgba(16,185,129,0.15)", text: T.green };
    if (status === "PENDING") return { bg: "rgba(245,158,11,0.15)", text: T.amber };
    if (status === "FAILED") return { bg: "rgba(239,68,68,0.15)", text: "#ef4444" };
    return { bg: "rgba(107,114,128,0.15)", text: T.textMid };
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
      <h3 style={{ fontFamily: T.font, fontWeight: 700, fontSize: 18, color: T.text, marginBottom: 20 }}>📊 Transaction History</h3>
      
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 20px" }}>
          <Loader2 size={32} className="animate-spin" color={T.blue} />
        </div>
      ) : transactions.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", background: T.surface, borderRadius: 16, border: `2px dashed ${T.border}` }}>
          <p style={{ fontFamily: T.font, fontSize: 32, margin: "0 0 12px" }}>📭</p>
          <p style={{ fontFamily: T.font, color: T.textDim, fontSize: 14, margin: 0, fontWeight: 600 }}>No transactions yet</p>
          <p style={{ fontFamily: T.font, color: T.textDim, fontSize: 12, margin: "6px 0 0", fontWeight: 400 }}>Start by purchasing data or airtime</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {transactions.map((tx, idx) => {
            const statusColors = getStatusColor(tx.status);
            const icon = getTransactionIcon(tx.type);
            const title = getTransactionTitle(tx.type);
            
            return (
              <motion.div 
                key={tx.id} 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ delay: idx * 0.05 }}
                whileHover={{ scale: 1.02, boxShadow: `0 8px 20px ${T.blue}15` }}
                onClick={() => { setSelectedTx(tx); setReceiptOpen(true); }}
                style={{ 
                  background: T.surface, 
                  borderRadius: 14, 
                  padding: "16px", 
                  border: `2px solid ${T.border}`, 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center",
                  transition: "all 0.2s",
                  cursor: "pointer"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                  <div style={{ fontSize: 20, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", background: T.blueLight, borderRadius: 10 }}>
                    {icon}
                  </div>
                  <div>
                    <p style={{ fontFamily: T.font, fontWeight: 700, fontSize: 14, color: T.text, margin: "0 0 4px" }}>
                      {title}
                    </p>
                    <p style={{ fontFamily: T.font, fontSize: 12, color: T.textDim, margin: 0 }}>
                      {tx.description ? tx.description : tx.phone} • {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontFamily: T.mono, fontWeight: 800, fontSize: 15, color: T.blue, margin: "0 0 6px" }}>
                    ₦{tx.amount?.toLocaleString() || "0"}
                  </p>
                  <span style={{ fontFamily: T.font, fontSize: 10, fontWeight: 700, padding: "5px 10px", borderRadius: 6, background: statusColors.bg, color: statusColors.text, textTransform: "uppercase", display: "inline-block", letterSpacing: "0.05em" }}>
                    {tx.status}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <TransactionReceipt open={receiptOpen} onClose={() => setReceiptOpen(false)} transaction={selectedTx} />
    </motion.div>
  );
}

function TransactionReceipt({ open, onClose, transaction }: any) {
  if (!transaction) return null;

  const getTransactionTitle = (type: string) => {
    if (type === "DATA_PURCHASE") return "Data Purchase";
    if (type === "AIRTIME_PURCHASE") return "Airtime Purchase";
    if (type === "WALLET_FUNDING") return "Wallet Funding";
    if (type === "REWARD_CREDIT") return "Reward Credit";
    return type;
  };

  const getStatusIcon = (status: string) => {
    if (status === "SUCCESS") return "✅";
    if (status === "PENDING") return "⏳";
    if (status === "FAILED") return "❌";
    return "ℹ️";
  };

  const getStatusColor = (status: string) => {
    if (status === "SUCCESS") return { bg: "rgba(16,185,129,0.2)", border: T.green, text: T.green };
    if (status === "PENDING") return { bg: "rgba(245,158,11,0.2)", border: T.amber, text: T.amber };
    if (status === "FAILED") return { bg: "rgba(239,68,68,0.2)", border: "#ef4444", text: "#ef4444" };
    return { bg: "rgba(100,116,139,0.2)", border: T.textMid, text: T.textMid };
  };

  const statusColor = getStatusColor(transaction.status);

  return (
    <motion.div key={open ? "open" : "closed"} initial={{ opacity: 0 }} animate={{ opacity: open ? 1 : 0 }} style={{ position: "fixed", inset: 0, zIndex: 60, background: open ? "rgba(0,0,0,0.5)" : "transparent", backdropFilter: "blur(6px)", display: "flex", alignItems: "flex-end", justifyContent: "center", pointerEvents: open ? "auto" : "none", transition: "opacity 0.2s" }} onClick={onClose}>
      <motion.div initial={{ y: "100%" }} animate={{ y: open ? 0 : "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} style={{ background: T.card, borderRadius: "28px 28px 0 0", width: "100%", maxWidth: 520, padding: 24, boxShadow: T.blueShadow, border: `2px solid ${T.blueBorder}`, maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingBottom: 16, borderBottom: `2px solid ${T.blueBorder}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 5, height: 24, borderRadius: 3, background: T.blue }} />
            <h2 style={{ fontFamily: T.font, fontWeight: 700, fontSize: 20, color: T.text, margin: 0 }}>📄 Receipt</h2>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 12, background: T.surface, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
            <X size={18} color={T.textMid} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Status */}
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }} style={{ background: statusColor.bg, border: `2px solid ${statusColor.border}`, borderRadius: 14, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 40, margin: "0 0 12px" }}>{getStatusIcon(transaction.status)}</div>
            <p style={{ fontFamily: T.font, fontWeight: 800, fontSize: 18, color: statusColor.text, margin: "0 0 4px", textTransform: "uppercase" }}>{transaction.status}</p>
            <p style={{ fontFamily: T.font, fontSize: 12, color: T.textDim, margin: 0 }}>Transaction {transaction.status.toLowerCase()} on {new Date(transaction.createdAt).toLocaleDateString()}</p>
          </motion.div>

          {/* Transaction Details */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: T.surface, borderRadius: 12, padding: 14 }}>
              <p style={{ fontFamily: T.font, fontSize: 11, fontWeight: 700, color: T.textDim, margin: "0 0 6px", textTransform: "uppercase" }}>Transaction Type</p>
              <p style={{ fontFamily: T.font, fontSize: 15, fontWeight: 700, color: T.text, margin: 0 }}>{getTransactionTitle(transaction.type)}</p>
            </div>

            <div style={{ background: T.surface, borderRadius: 12, padding: 14 }}>
              <p style={{ fontFamily: T.font, fontSize: 11, fontWeight: 700, color: T.textDim, margin: "0 0 6px", textTransform: "uppercase" }}>Amount</p>
              <p style={{ fontFamily: T.mono, fontSize: 18, fontWeight: 800, color: T.blue, margin: 0 }}>₦{transaction.amount?.toLocaleString() || "0"}</p>
            </div>

            {transaction.phone && (
              <div style={{ background: T.surface, borderRadius: 12, padding: 14 }}>
                <p style={{ fontFamily: T.font, fontSize: 11, fontWeight: 700, color: T.textDim, margin: "0 0 6px", textTransform: "uppercase" }}>Phone Number</p>
                <p style={{ fontFamily: T.mono, fontSize: 15, fontWeight: 700, color: T.text, margin: 0 }}>{transaction.phone}</p>
              </div>
            )}

            {transaction.description && (
              <div style={{ background: T.surface, borderRadius: 12, padding: 14 }}>
                <p style={{ fontFamily: T.font, fontSize: 11, fontWeight: 700, color: T.textDim, margin: "0 0 6px", textTransform: "uppercase" }}>Description</p>
                <p style={{ fontFamily: T.font, fontSize: 14, color: T.text, margin: 0 }}>{transaction.description}</p>
              </div>
            )}

            <div style={{ background: T.surface, borderRadius: 12, padding: 14 }}>
              <p style={{ fontFamily: T.font, fontSize: 11, fontWeight: 700, color: T.textDim, margin: "0 0 6px", textTransform: "uppercase" }}>Reference</p>
              <p style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 600, color: T.textMid, margin: 0, wordBreak: "break-all" }}>{transaction.reference}</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ background: T.surface, borderRadius: 12, padding: 14 }}>
                <p style={{ fontFamily: T.font, fontSize: 11, fontWeight: 700, color: T.textDim, margin: "0 0 6px", textTransform: "uppercase" }}>Date</p>
                <p style={{ fontFamily: T.font, fontSize: 13, fontWeight: 700, color: T.text, margin: 0 }}>{new Date(transaction.createdAt).toLocaleDateString()}</p>
              </div>

              <div style={{ background: T.surface, borderRadius: 12, padding: 14 }}>
                <p style={{ fontFamily: T.font, fontSize: 11, fontWeight: 700, color: T.textDim, margin: "0 0 6px", textTransform: "uppercase" }}>Time</p>
                <p style={{ fontFamily: T.font, fontSize: 13, fontWeight: 700, color: T.text, margin: 0 }}>{new Date(transaction.createdAt).toLocaleTimeString()}</p>
              </div>
            </div>
          </div>

          <motion.button whileTap={{ scale: 0.95 }} onClick={onClose} style={{ width: "100%", padding: 14, borderRadius: 12, background: T.blue, border: "none", color: "#fff", fontFamily: T.font, fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: T.blueShadow, transition: "all 0.2s" }}>
            Close Receipt
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function RewardsTab() {
  const [rewards, setRewards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userTier, setUserTier] = useState("user");

  useEffect(() => {
    Promise.all([
      fetch("/api/rewards").then(r => r.json()),
      fetch("/api/auth/me").then(r => r.json())
    ])
    .then(([rewardsData, userData]) => {
      if (Array.isArray(rewardsData)) {
        setRewards(rewardsData);
      }
      if (userData?.success && userData?.data) {
        setUserTier(userData.data.tier);
      }
    })
    .catch(e => console.error("Error fetching data:", e))
    .finally(() => setLoading(false));
  }, []);

  const getTierInfo = () => {
    if (userTier === "agent") return { name: "Agent", color: T.purple, icon: "🚀" };
    return { name: "User", color: T.amber, icon: "⭐" };
  };
  const tierInfo = getTierInfo();

  const claimedRewards = rewards.filter(r => r.status === "CLAIMED");
  const inProgressRewards = rewards.filter(r => r.status === "IN_PROGRESS");

  const getRewardTitle = (type: string) => {
    if (type === "SIGNUP_BONUS") return "Signup Bonus";
    if (type === "DEPOSIT_2K") return "₦2K Deposit";
    if (type === "DEPOSIT_10K") return "₦10K Deposit";
    if (type === "REFERRAL") return "Referral Bonus";
    return type;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
      <h3 style={{ fontFamily: T.font, fontWeight: 700, fontSize: 18, color: T.text, marginBottom: 16 }}>Rewards & Points</h3>
      
      <motion.div style={{ background: `linear-gradient(135deg, ${tierInfo.color}20, rgba(139,92,246,0.1))`, borderRadius: 16, padding: "24px", border: `2px solid ${tierInfo.color}30`, marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ fontFamily: T.font, fontSize: 12, color: T.textDim, margin: "0 0 8px", fontWeight: 600, textTransform: "uppercase" }}>Current Tier</p>
          <p style={{ fontFamily: T.font, fontWeight: 800, fontSize: 24, color: tierInfo.color, margin: "0 0 4px" }}>{tierInfo.icon} {tierInfo.name}</p>
          <p style={{ fontFamily: T.font, fontSize: 11, color: T.textDim, margin: 0 }}>Unlock more rewards</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontFamily: T.font, fontSize: 11, fontWeight: 600, color: T.textDim, margin: "0 0 4px", textTransform: "uppercase" }}>Claimed</p>
          <p style={{ fontFamily: T.mono, fontWeight: 800, fontSize: 32, color: T.green, margin: 0 }}>{claimedRewards.length}</p>
        </div>
      </motion.div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
        <div style={{ background: T.blueLight, borderRadius: 12, padding: 14, textAlign: "center" }}>
          <p style={{ fontFamily: T.font, fontSize: 11, fontWeight: 600, color: T.textDim, margin: "0 0 4px" }}>Total Rewards</p>
          <p style={{ fontFamily: T.mono, fontWeight: 800, fontSize: 24, color: T.blue, margin: 0 }}>{rewards.length}</p>
        </div>
        <div style={{ background: "rgba(16,185,129,0.15)", borderRadius: 12, padding: 14, textAlign: "center" }}>
          <p style={{ fontFamily: T.font, fontSize: 11, fontWeight: 600, color: T.green, margin: "0 0 4px" }}>Claimed</p>
          <p style={{ fontFamily: T.mono, fontWeight: 800, fontSize: 24, color: T.green, margin: 0 }}>{claimedRewards.length}</p>
        </div>
        <div style={{ background: "rgba(245,158,11,0.15)", borderRadius: 12, padding: 14, textAlign: "center" }}>
          <p style={{ fontFamily: T.font, fontSize: 11, fontWeight: 600, color: T.amber, margin: "0 0 4px" }}>In Progress</p>
          <p style={{ fontFamily: T.mono, fontWeight: 800, fontSize: 24, color: T.amber, margin: 0 }}>{inProgressRewards.length}</p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
          <Loader2 size={28} className="animate-spin" color={T.blue} />
        </div>
      ) : rewards.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", background: T.surface, borderRadius: 16 }}>
          <p style={{ fontFamily: T.font, color: T.textDim, fontSize: 14, margin: 0 }}>Complete transactions to unlock rewards</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {rewards.map((reward) => {
            const isClaimed = reward.status === "CLAIMED";
            return (
              <motion.div key={reward.id} whileHover={{ scale: 1.02 }} style={{ background: isClaimed ? "rgba(16,185,129,0.1)" : T.surface, borderRadius: 14, padding: "16px", border: `2px solid ${isClaimed ? "rgba(16,185,129,0.3)" : T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontFamily: T.font, fontWeight: 700, fontSize: 14, color: T.text, margin: "0 0 4px" }}>
                    {isClaimed ? "✅" : "⏳"} {getRewardTitle(reward.type)}
                  </p>
                  <p style={{ fontFamily: T.font, fontSize: 12, color: T.textDim, margin: 0 }}>
                    {isClaimed ? `Claimed on ${new Date(reward.claimedAt).toLocaleDateString()}` : "Pending claim"}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontFamily: T.mono, fontWeight: 800, fontSize: 16, color: isClaimed ? T.green : T.amber, margin: 0 }}>+{reward.amount || "100"}</p>
                  <span style={{ fontFamily: T.font, fontSize: 10, fontWeight: 700, color: isClaimed ? T.green : T.amber, textTransform: "uppercase" }}>₦ Naira</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

function BenefitCard({ icon, title, subtitle }: any) {
  return (
    <motion.div whileHover={{ scale: 1.05 }} style={{ background: T.surface, borderRadius: 14, padding: "16px", border: `1px solid ${T.border}`, textAlign: "center", cursor: "pointer", transition: "all 0.2s" }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
      <p style={{ fontFamily: T.font, fontWeight: 700, fontSize: 13, color: T.text, margin: "0 0 4px" }}>{title}</p>
      <p style={{ fontFamily: T.font, fontSize: 11, color: T.textDim, margin: 0 }}>{subtitle}</p>
    </motion.div>
  );
}

function SettingsTab() {
  const [profileOpen, setProfileOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
      <h3 style={{ fontFamily: T.font, fontWeight: 700, fontSize: 18, color: T.text, marginBottom: 20 }}>Account Settings</h3>
      
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <motion.button whileTap={{ scale: 0.98 }} onClick={() => setProfileOpen(true)} style={{ background: T.surface, borderRadius: 14, padding: "16px", border: `1px solid ${T.border}`, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left", fontFamily: T.font, fontSize: 14, transition: "all 0.2s" }}>
          <div>
            <p style={{ fontFamily: T.font, fontWeight: 700, fontSize: 14, color: T.text, margin: 0 }}>👤 Profile</p>
            <p style={{ fontFamily: T.font, fontSize: 12, color: T.textDim, margin: "4px 0 0" }}>View account information</p>
          </div>
          <ChevronLeft size={20} color={T.textDim} style={{ transform: "rotate(180deg)" }} />
        </motion.button>

        <motion.button whileTap={{ scale: 0.98 }} onClick={() => setSecurityOpen(true)} style={{ background: T.surface, borderRadius: 14, padding: "16px", border: `1px solid ${T.border}`, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left", fontFamily: T.font, fontSize: 14, transition: "all 0.2s" }}>
          <div>
            <p style={{ fontFamily: T.font, fontWeight: 700, fontSize: 14, color: T.text, margin: 0 }}>🔒 Security</p>
            <p style={{ fontFamily: T.font, fontSize: 12, color: T.textDim, margin: "4px 0 0" }}>Change your PIN</p>
          </div>
          <ChevronLeft size={20} color={T.textDim} style={{ transform: "rotate(180deg)" }} />
        </motion.button>

        <motion.button whileTap={{ scale: 0.98 }} onClick={() => setHelpOpen(true)} style={{ background: T.surface, borderRadius: 14, padding: "16px", border: `1px solid ${T.border}`, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left", fontFamily: T.font, fontSize: 14, transition: "all 0.2s" }}>
          <div>
            <p style={{ fontFamily: T.font, fontWeight: 700, fontSize: 14, color: T.text, margin: 0 }}>📞 Help & Support</p>
            <p style={{ fontFamily: T.font, fontSize: 12, color: T.textDim, margin: "4px 0 0" }}>Contact support team</p>
          </div>
          <ChevronLeft size={20} color={T.textDim} style={{ transform: "rotate(180deg)" }} />
        </motion.button>
      </div>

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      <SecurityModal open={securityOpen} onClose={() => setSecurityOpen(false)} />
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </motion.div>
  );
}

function ProfileModal({ open, onClose }: any) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetch("/api/auth/me")
        .then(r => r.json())
        .then(d => d?.data && setUser(d.data))
        .finally(() => setLoading(false));
    }
  }, [open]);

  if (!user && loading) {
    return (
      <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: open ? 1 : 0 }} style={{ position: "fixed", inset: 0, zIndex: 60, background: open ? "rgba(0,0,0,0.5)" : "transparent", backdropFilter: "blur(6px)", display: "flex", alignItems: "flex-end", justifyContent: "center", pointerEvents: open ? "auto" : "none", transition: "opacity 0.2s" }} onClick={onClose}>
        <motion.div initial={{ y: "100%" }} animate={{ y: open ? 0 : "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} style={{ background: T.card, borderRadius: "28px 28px 0 0", width: "100%", maxWidth: 520, padding: 24, boxShadow: T.blueShadow, border: `2px solid ${T.blueBorder}` }} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: "flex", justifyContent: "center", padding: "60px 20px" }}>
            <Loader2 size={32} className="animate-spin" color={T.blue} />
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div key={open ? "open" : "closed"} initial={{ opacity: 0 }} animate={{ opacity: open ? 1 : 0 }} style={{ position: "fixed", inset: 0, zIndex: 60, background: open ? "rgba(0,0,0,0.5)" : "transparent", backdropFilter: "blur(6px)", display: "flex", alignItems: "flex-end", justifyContent: "center", pointerEvents: open ? "auto" : "none", transition: "opacity 0.2s" }} onClick={onClose}>
      <motion.div initial={{ y: "100%" }} animate={{ y: open ? 0 : "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} style={{ background: T.card, borderRadius: "28px 28px 0 0", width: "100%", maxWidth: 520, padding: 24, boxShadow: T.blueShadow, border: `2px solid ${T.blueBorder}`, maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontFamily: T.font, fontWeight: 700, fontSize: 20, color: T.text, margin: 0 }}>👤 Your Profile</h2>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: T.surface, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={16} color={T.textMid} />
          </button>
        </div>

        {user && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: T.blueLight, borderRadius: 14, padding: 16 }}>
              <p style={{ fontFamily: T.font, fontSize: 12, fontWeight: 700, color: T.textDim, margin: "0 0 6px", textTransform: "uppercase" }}>Full Name</p>
              <p style={{ fontFamily: T.font, fontSize: 16, fontWeight: 700, color: T.text, margin: 0 }}>{user.fullName}</p>
            </div>

            <div style={{ background: T.blueLight, borderRadius: 14, padding: 16 }}>
              <p style={{ fontFamily: T.font, fontSize: 12, fontWeight: 700, color: T.textDim, margin: "0 0 6px", textTransform: "uppercase" }}>Phone</p>
              <p style={{ fontFamily: T.mono, fontSize: 16, fontWeight: 700, color: T.text, margin: 0 }}>{user.phone}</p>
            </div>

            <div style={{ background: T.blueLight, borderRadius: 14, padding: 16 }}>
              <p style={{ fontFamily: T.font, fontSize: 12, fontWeight: 700, color: T.textDim, margin: "0 0 6px", textTransform: "uppercase" }}>Account Number</p>
              <p style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>{user.virtualAccount?.accountNumber}</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ background: T.blueLight, borderRadius: 14, padding: 14 }}>
                <p style={{ fontFamily: T.font, fontSize: 11, fontWeight: 700, color: T.textDim, margin: "0 0 6px", textTransform: "uppercase" }}>Account Tier</p>
                <p style={{ fontFamily: T.font, fontSize: 15, fontWeight: 700, color: T.blue, margin: 0 }}>{user.tier === "agent" ? "🚀 Agent" : "⭐ User"}</p>
              </div>
              <div style={{ background: T.blueLight, borderRadius: 14, padding: 14 }}>
                <p style={{ fontFamily: T.font, fontSize: 11, fontWeight: 700, color: T.textDim, margin: "0 0 6px", textTransform: "uppercase" }}>Balance</p>
                <p style={{ fontFamily: T.mono, fontSize: 15, fontWeight: 700, color: T.blue, margin: 0 }}>₦{(user.balance / 100).toLocaleString()}</p>
              </div>
            </div>

            <div style={{ background: T.blueLight, borderRadius: 14, padding: 16 }}>
              <p style={{ fontFamily: T.font, fontSize: 12, fontWeight: 700, color: T.textDim, margin: "0 0 6px", textTransform: "uppercase" }}>Date Joined</p>
              <p style={{ fontFamily: T.font, fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>{user.joinedAt ? new Date(user.joinedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"}</p>
            </div>

            <div style={{ background: T.blueLight, borderRadius: 14, padding: 16 }}>
              <p style={{ fontFamily: T.font, fontSize: 12, fontWeight: 700, color: T.textDim, margin: "0 0 6px", textTransform: "uppercase" }}>Account Status</p>
              <p style={{ fontFamily: T.font, fontSize: 14, fontWeight: 700, color: user.isActive ? T.green : "#ef4444", margin: 0 }}>{user.isActive ? "✅ Active" : "❌ Inactive"}</p>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function SecurityModal({ open, onClose }: any) {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const currentPinRef = useRef<HTMLInputElement>(null);
  const newPinRef = useRef<HTMLInputElement>(null);
  const confirmPinRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && status === "idle") {
      setTimeout(() => currentPinRef.current?.focus(), 100);
    }
  }, [open, status]);

  const handlePinInput = (value: string, setter: any, nextRef?: any) => {
    const digits = value.slice(0, 6);
    setter(digits);
    if (digits.length === 6 && nextRef) {
      setTimeout(() => nextRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: any, nextRef?: any) => {
    if (e.key === "Enter" && e.target.value.length === 6 && nextRef) {
      nextRef.current?.focus();
    }
  };

  const handleChangePin = async () => {
    if (currentPin.length !== 6) {
      setStatus("error");
      setMessage("Current PIN must be 6 digits");
      currentPinRef.current?.focus();
      return;
    }

    if (newPin.length !== 6) {
      setStatus("error");
      setMessage("New PIN must be 6 digits");
      newPinRef.current?.focus();
      return;
    }

    if (confirmPin.length !== 6) {
      setStatus("error");
      setMessage("Confirm PIN must be 6 digits");
      confirmPinRef.current?.focus();
      return;
    }

    if (newPin !== confirmPin) {
      setStatus("error");
      setMessage("New PINs don't match");
      confirmPinRef.current?.focus();
      return;
    }

    if (currentPin === newPin) {
      setStatus("error");
      setMessage("New PIN must be different from current PIN");
      newPinRef.current?.focus();
      return;
    }

    setLoading(true);
    setStatus("idle");

    try {
      const res = await fetch("/api/auth/change-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPin, newPin }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage("PIN changed successfully! 🎉");
        setTimeout(() => {
          setCurrentPin("");
          setNewPin("");
          setConfirmPin("");
          setStatus("idle");
          onClose();
        }, 2500);
      } else {
        setStatus("error");
        setMessage(data.error || "Failed to change PIN. Please try again.");
        currentPinRef.current?.focus();
      }
    } catch (error) {
      setStatus("error");
      setMessage("Connection error. Please check your internet and try again.");
      currentPinRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div key={open ? "open" : "closed"} initial={{ opacity: 0 }} animate={{ opacity: open ? 1 : 0 }} style={{ position: "fixed", inset: 0, zIndex: 60, background: open ? "rgba(0,0,0,0.5)" : "transparent", backdropFilter: "blur(6px)", display: "flex", alignItems: "flex-end", justifyContent: "center", pointerEvents: open ? "auto" : "none", transition: "opacity 0.2s" }} onClick={onClose}>
      <motion.div initial={{ y: "100%" }} animate={{ y: open ? 0 : "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} style={{ background: T.card, borderRadius: "28px 28px 0 0", width: "100%", maxWidth: 520, padding: 24, boxShadow: T.blueShadow, border: `2px solid ${T.blueBorder}`, maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingBottom: 12, borderBottom: `2px solid ${T.blueBorder}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 5, height: 24, borderRadius: 3, background: T.blue }} />
            <h2 style={{ fontFamily: T.font, fontWeight: 700, fontSize: 20, color: T.text, margin: 0 }}>🔒 Change PIN</h2>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 12, background: T.surface, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
            <X size={18} color={T.textMid} />
          </button>
        </div>

        {status === "success" ? (
          <motion.div initial={{ scale: 0.8, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 400, damping: 20 }} style={{ textAlign: "center", padding: "50px 20px" }}>
            <motion.div 
              animate={{ scale: [1, 1.1, 1] }} 
              transition={{ duration: 0.6, repeat: 1 }}
              style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(16,185,129,0.2)", border: `3px solid ${T.green}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: 40 }}
            >
              ✓
            </motion.div>
            <p style={{ fontFamily: T.font, fontWeight: 800, fontSize: 24, color: T.green, margin: "0 0 8px" }}>PIN Changed!</p>
            <p style={{ fontFamily: T.font, fontSize: 14, color: T.textMid, margin: 0 }}>{message}</p>
            <p style={{ fontFamily: T.font, fontSize: 12, color: T.textDim, margin: "16px 0 0" }}>Closing in a moment...</p>
          </motion.div>
        ) : status === "error" ? (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring" }} style={{ background: "rgba(239,68,68,0.15)", border: `2px solid #ef4444`, borderRadius: 14, padding: 16, marginBottom: 20, display: "flex", gap: 12 }}>
            <div style={{ fontSize: 20 }}>❌</div>
            <div>
              <p style={{ fontFamily: T.font, fontSize: 13, fontWeight: 700, color: "#dc2626", margin: 0 }}>{message}</p>
            </div>
          </motion.div>
        ) : null}

        {status !== "success" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label style={{ display: "block", fontFamily: T.font, fontSize: 12, fontWeight: 700, color: T.textDim, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Current PIN</label>
              <input 
                ref={currentPinRef}
                type="password" 
                maxLength={6} 
                placeholder="••••••" 
                disabled={loading}
                value={currentPin} 
                onChange={(e) => handlePinInput(e.target.value, setCurrentPin, newPinRef)}
                onKeyDown={(e) => handleKeyDown(e, newPinRef)}
                onFocus={(e) => e.target.select()}
                style={{ 
                  width: "100%", 
                  padding: "16px 16px", 
                  borderRadius: 12, 
                  border: `2.5px solid ${status === "error" && currentPin.length < 6 ? "#ef4444" : T.blue}`, 
                  fontFamily: T.mono, 
                  fontSize: 20, 
                  letterSpacing: "0.3em", 
                  outline: "none", 
                  textAlign: "center", 
                  transition: "all 0.2s",
                  background: T.surface,
                  opacity: loading ? 0.6 : 1,
                  cursor: loading ? "not-allowed" : "text"
                }} 
              />
            </div>

            <div>
              <label style={{ display: "block", fontFamily: T.font, fontSize: 12, fontWeight: 700, color: T.textDim, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>New PIN</label>
              <input 
                ref={newPinRef}
                type="password" 
                maxLength={6} 
                placeholder="••••••" 
                disabled={loading}
                value={newPin} 
                onChange={(e) => handlePinInput(e.target.value, setNewPin, confirmPinRef)}
                onKeyDown={(e) => handleKeyDown(e, confirmPinRef)}
                onFocus={(e) => e.target.select()}
                style={{ 
                  width: "100%", 
                  padding: "16px 16px", 
                  borderRadius: 12, 
                  border: `2.5px solid ${status === "error" && newPin !== confirmPin ? "#ef4444" : T.blue}`, 
                  fontFamily: T.mono, 
                  fontSize: 20, 
                  letterSpacing: "0.3em", 
                  outline: "none", 
                  textAlign: "center", 
                  transition: "all 0.2s",
                  background: T.surface,
                  opacity: loading ? 0.6 : 1,
                  cursor: loading ? "not-allowed" : "text"
                }} 
              />
            </div>

            <div>
              <label style={{ display: "block", fontFamily: T.font, fontSize: 12, fontWeight: 700, color: T.textDim, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Confirm New PIN</label>
              <input 
                ref={confirmPinRef}
                type="password" 
                maxLength={6} 
                placeholder="••••••" 
                disabled={loading}
                value={confirmPin} 
                onChange={(e) => handlePinInput(e.target.value, setConfirmPin)}
                onKeyDown={(e) => e.key === "Enter" && handleChangePin()}
                onFocus={(e) => e.target.select()}
                style={{ 
                  width: "100%", 
                  padding: "16px 16px", 
                  borderRadius: 12, 
                  border: `2.5px solid ${status === "error" && newPin !== confirmPin ? "#ef4444" : T.blue}`, 
                  fontFamily: T.mono, 
                  fontSize: 20, 
                  letterSpacing: "0.3em", 
                  outline: "none", 
                  textAlign: "center", 
                  transition: "all 0.2s",
                  background: T.surface,
                  opacity: loading ? 0.6 : 1,
                  cursor: loading ? "not-allowed" : "text"
                }} 
              />
            </div>

            <motion.button 
              whileTap={{ scale: loading ? 1 : 0.96 }} 
              onClick={handleChangePin} 
              disabled={loading || currentPin.length < 6 || newPin.length < 6 || confirmPin.length < 6}
              style={{ 
                width: "100%", 
                padding: 16, 
                borderRadius: 14, 
                background: loading ? T.blue : T.blue, 
                border: "none", 
                color: "#fff", 
                fontFamily: T.font, 
                fontWeight: 700, 
                fontSize: 16, 
                cursor: (loading || currentPin.length < 6) ? "not-allowed" : "pointer", 
                boxShadow: T.blueShadow, 
                transition: "all 0.3s",
                opacity: (loading || currentPin.length < 6 || newPin.length < 6 || confirmPin.length < 6) ? 0.6 : 1, 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                gap: 10,
                letterSpacing: "0.05em"
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Processing PIN...
                </>
              ) : (
                <>
                  🔐 Change PIN
                </>
              )}
            </motion.button>

            <p style={{ fontFamily: T.font, fontSize: 12, color: T.textDim, margin: "8px 0 0", textAlign: "center" }}>
              💡 Tip: PIN must be 6 digits and different from current PIN
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function HelpModal({ open, onClose }: any) {
  return (
    <motion.div key={open ? "open" : "closed"} initial={{ opacity: 0 }} animate={{ opacity: open ? 1 : 0 }} style={{ position: "fixed", inset: 0, zIndex: 60, background: open ? "rgba(0,0,0,0.5)" : "transparent", backdropFilter: "blur(6px)", display: "flex", alignItems: "flex-end", justifyContent: "center", pointerEvents: open ? "auto" : "none", transition: "opacity 0.2s" }} onClick={onClose}>
      <motion.div initial={{ y: "100%" }} animate={{ y: open ? 0 : "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} style={{ background: T.card, borderRadius: "28px 28px 0 0", width: "100%", maxWidth: 520, padding: 24, boxShadow: T.blueShadow, border: `2px solid ${T.blueBorder}` }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontFamily: T.font, fontWeight: 700, fontSize: 20, color: T.text, margin: 0 }}>📞 Help & Support</h2>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: T.surface, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={16} color={T.textMid} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <motion.div whileHover={{ scale: 1.02 }} onClick={() => window.location.href = "mailto:syabdallah018@gmail.com"} style={{ background: `linear-gradient(135deg, ${T.blue}20, ${T.blue}10)`, borderRadius: 14, padding: 16, border: `2px solid ${T.blue}30`, cursor: "pointer", transition: "all 0.2s" }}>
            <p style={{ fontFamily: T.font, fontWeight: 700, fontSize: 14, color: T.blue, margin: "0 0 8px" }}>✉️ Email Support</p>
            <p style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 600, color: T.textMid, margin: 0 }}>syabdallah018@gmail.com</p>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} onClick={() => window.location.href = "tel:+2349061338534"} style={{ background: `linear-gradient(135deg, ${T.green}20, ${T.green}10)`, borderRadius: 14, padding: 16, border: `2px solid ${T.green}30`, cursor: "pointer", transition: "all 0.2s" }}>
            <p style={{ fontFamily: T.font, fontWeight: 700, fontSize: 14, color: T.green, margin: "0 0 8px" }}>📱 Call Us</p>
            <p style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 600, color: T.textMid, margin: 0 }}>+234 906 133 8534</p>
          </motion.div>

          <div style={{ background: T.blueLight, borderRadius: 12, padding: 14, textAlign: "center" }}>
            <p style={{ fontFamily: T.font, fontSize: 12, fontWeight: 600, color: T.textDim, margin: "0 0 4px" }}>Average Response Time</p>
            <p style={{ fontFamily: T.font, fontWeight: 700, fontSize: 14, color: T.blue, margin: 0 }}>⚡ 2-4 hours</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}


export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [buyDataOpen, setBuyDataOpen] = useState(false);
  const [buyDataStep, setBuyDataStep] = useState(1);
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);
  const [dataPlans, setDataPlans] = useState<DataPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<DataPlan | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [purchasingData, setPurchasingData] = useState(false);
  const [plansLoading, setPlansLoading] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [airtimeOpen, setAirtimeOpen] = useState(false);
  const [airtimeNetwork, setAirtimeNetwork] = useState<string | null>(null);
  const [airtimeAmount, setAirtimeAmount] = useState<number | null>(null);
  const [airtimePhone, setAirtimePhone] = useState("");
  const [purchasingAirtime, setPurchasingAirtime] = useState(false);
  const [activeTab, setActiveTab] = useState<"home" | "rewards" | "history" | "settings">("home");
  const [syncingBalance, setSyncingBalance] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => { if (d?.success && d?.data) setUser(d.data); else router.push("/app/auth"); }).catch(() => router.push("/app/auth")).finally(() => setLoading(false));
  }, [router]);

  const formatBalance = (kobo: number) => {
    const naira = kobo / 100;
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(naira);
  };

  const handleCopy = () => {
    const acc = user?.virtualAccount?.accountNumber;
    if (!acc) return;
    navigator.clipboard.writeText(acc);
    setCopied(true);
    toast.success("Account number copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = async () => {
    try {
      // Clear localStorage completely
      if (typeof window !== "undefined") {
        localStorage.clear();
        sessionStorage.clear();
      }
      // Call logout endpoint
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      // Hard redirect to login
      window.location.href = "/app/auth";
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = "/app/auth";
    }
  };

  const handleSyncBalance = async () => {
    setSyncingBalance(true);
    try {
      console.log("[SYNC] Fetching latest balance...");
      const res = await fetch("/api/auth/me", { credentials: "include" });
      const data = await res.json();
      
      if (res.ok && data.success && data.data) {
        setUser(data.data);
        toast.success("✅ Balance synced successfully!");
        console.log("[SYNC] Balance updated:", {
          oldBalance: user?.balance,
          newBalance: data.data.balance,
          timestamp: new Date().toISOString()
        });
      } else {
        toast.error("Failed to sync balance");
        console.error("[SYNC] Error:", data?.error);
      }
    } catch (error) {
      toast.error("Error syncing balance");
      console.error("[SYNC] Exception:", error);
    } finally {
      setSyncingBalance(false);
    }
  };

  const handleNetworkSelect = async (networkId: string) => {
    setSelectedNetwork(networkId);
    setPlansLoading(true);
    try {
      const res = await fetch(`/api/data/plans?network=${networkId}`);
      const data = await res.json();
      setDataPlans(data.data || []);
      setBuyDataStep(2);
    } catch {
      toast.error("Failed to load plans");
    } finally {
      setPlansLoading(false);
    }
  };

  const handlePlanSelect = (plan: DataPlan) => {
    setSelectedPlan(plan);
    setBuyDataStep(3);
  };

  const handleDataPurchase = async () => {
    if (!selectedPlan || !phoneNumber || pin.some((p) => !p)) {
      toast.error("Complete all fields");
      return;
    }

    setPurchasingData(true);
    try {
      const res = await fetch("/api/data/purchase", { 
        method: "POST", 
        credentials: "include",
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ planId: selectedPlan.id, phone: phoneNumber, pin: pin.join("") }) 
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessData({
          type: "data",
          plan: selectedPlan.sizeLabel,
          network: selectedPlan.network,
          amount: getPriceForTier(selectedPlan, user?.tier || "user"),
          phone: phoneNumber,
          validity: selectedPlan.validity
        });
        setSuccessModalOpen(true);
        setBuyDataOpen(false);
        fetch("/api/auth/me").then((r) => r.json()).then((d) => d.success && setUser(d.data));
      } else { toast.error(data.error || "Purchase failed"); }
    } finally { setPurchasingData(false); }
  };

  const handleAirtimePurchase = async () => {
    if (!airtimeNetwork || !airtimeAmount || !airtimePhone) { toast.error("Complete all fields"); return; }
    if (airtimePhone.length !== 11) { toast.error("Enter valid 11-digit phone"); return; }
    setPurchasingAirtime(true);
    try {
      const res = await fetch("/api/airtime/purchase", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ network: airtimeNetwork, amount: airtimeAmount, phone: airtimePhone }) });
      const data = await res.json();
      if (data.success) {
        toast.success("Airtime purchased successfully!");
        setAirtimeOpen(false);
        fetch("/api/auth/me", { credentials: "include" }).then((r) => r.json()).then((d) => d.success && setUser(d.data));
      } else { 
        toast.error(data.error || "Purchase failed");
        console.error("[AIRTIME PURCHASE ERROR]", res.status, data);
      }
    } catch (error) {
      toast.error("Network error. Please try again.");
      console.error("[AIRTIME PURCHASE EXCEPTION]", error);
    } finally { setPurchasingAirtime(false); }
  };

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: T.bg }}><Loader2 size={28} className="animate-spin" color={T.blue} /></div>;
  if (!user) return null;

  const initials = user.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <>
      <style>{fontStyle}</style>
      
      
      <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font, paddingBottom: 40 }}>
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ position: "sticky", top: 0, zIndex: 40, background: `rgba(255,255,255,0.9)`, backdropFilter: "blur(12px)", borderBottom: `1px solid ${T.blueBorder}`, boxShadow: `0 4px 12px ${T.blue}15` }}>
          <div style={{ maxWidth: 480, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 14, background: `linear-gradient(135deg, ${T.blue}, ${T.gold})`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.font, fontWeight: 800, fontSize: 15, color: "#fff", boxShadow: T.blueShadow, flexShrink: 0 }}>{initials}</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: T.font, fontSize: 11, color: T.textDim, margin: 0, fontWeight: 600, textTransform: "uppercase" }}>Welcome</p>
                <p style={{ fontFamily: T.font, fontSize: 15, fontWeight: 700, color: T.text, margin: "2px 0" }}>{user.fullName}</p>
                <span style={{ fontFamily: T.font, fontSize: 10, fontWeight: 700, color: T.blue, background: T.blueLight, padding: "3px 6px", borderRadius: 4, textTransform: "uppercase", display: "inline-block", marginTop: "3px" }}>{user.tier}</span>
              </div>
            </div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 11, background: T.surface, border: `1.5px solid ${T.blueBorder}`, fontFamily: T.font, fontWeight: 600, fontSize: 12, color: T.blue, cursor: "pointer", transition: "all 0.2s" }}>
              <LogOut size={14} /> Logout
            </motion.button>
          </div>
        </motion.div>

        <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 20px" }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} style={{ background: `linear-gradient(135deg, #f0f9ff 0%, #eff6ff 100%)`, borderRadius: 24, padding: "28px 22px", marginBottom: 24, border: `2px solid ${T.blueBorder}`, boxShadow: T.blueShadow }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <p style={{ fontFamily: T.font, fontSize: 12, color: T.textDim, margin: "0 0 8px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Available Balance</p>
                <motion.h2 key={showBalance ? "shown" : "hidden"} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} style={{ fontFamily: T.mono, fontWeight: 800, fontSize: 32, color: T.blue, margin: 0, letterSpacing: "-0.02em" }}>
                  {showBalance ? formatBalance(user.balance) : "••••••"}
                </motion.h2>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowBalance(!showBalance)} style={{ width: 40, height: 40, borderRadius: 12, background: T.blueLight, border: `2px solid ${T.blue}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                  {showBalance ? <Eye size={18} color={T.blue} /> : <EyeOff size={18} color={T.blue} />}
                </motion.button>
                <motion.button 
                  whileTap={{ scale: 0.9 }}
                  animate={syncingBalance ? { rotate: 360 } : { rotate: 0 }}
                  transition={syncingBalance ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
                  onClick={handleSyncBalance}
                  disabled={syncingBalance}
                  style={{ width: 40, height: 40, borderRadius: 12, background: T.blueLight, border: `2px solid ${T.blue}`, cursor: syncingBalance ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", opacity: syncingBalance ? 0.7 : 1 }}
                  title="Sync balance"
                >
                  <Zap size={18} color={T.blue} />
                </motion.button>
              </div>
            </div>

            <div style={{ height: 2, background: T.blueBorder, marginBottom: 20 }} />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontFamily: T.font, fontSize: 11, color: T.textDim, margin: "0 0 5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{user.virtualAccount?.bankName || "Virtual Account"}</p>
                <p style={{ fontFamily: T.mono, fontSize: 18, color: T.text, margin: 0, fontWeight: 600, letterSpacing: "0.08em" }}>
                  {user.virtualAccount?.accountNumber ? user.virtualAccount.accountNumber.replace(/(\d{4})(\d{3})(\d{4})/, "$1 $2 $3") : "  "}
                </p>
              </div>
              <motion.button whileTap={{ scale: 0.9 }} onClick={handleCopy} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", borderRadius: 11, background: copied ? "rgba(16,185,129,0.15)" : T.blueLight, border: `2px solid ${copied ? T.green : T.blue}`, fontFamily: T.font, fontWeight: 600, fontSize: 12, color: copied ? T.green : T.blue, cursor: "pointer", transition: "all 0.2s" }}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy"}
              </motion.button>
            </div>
          </motion.div>

          {activeTab === "home" ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
              <ActionTile icon={<Zap size={22} color={T.blue} />} label="Buy Data" sub="All networks" color={T.blue} dimColor="rgba(37,99,235,0.12)" onClick={() => setBuyDataOpen(true)} />
              <ActionTile icon={<Phone size={22} color={T.green} />} label="Buy Airtime" sub="All networks" color={T.green} dimColor="rgba(16,185,129,0.12)" onClick={() => setAirtimeOpen(true)} />
              <ActionTile icon={<Gift size={22} color={T.amber} />} label="Rewards" sub="Earn points" color={T.amber} dimColor="rgba(245,158,11,0.12)" onClick={() => setActiveTab("rewards")} />
              <ActionTile icon={<CreditCard size={22} color={T.purple} />} label="History" sub="Transactions" color={T.purple} dimColor="rgba(139,92,246,0.12)" onClick={() => setActiveTab("history")} />
              <ActionTile icon={<Settings size={22} color={T.gold} />} label="Settings" sub="Account" color={T.gold} dimColor="rgba(251,191,36,0.12)" onClick={() => setActiveTab("settings")} />
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <button onClick={() => setActiveTab("home")} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: T.font, fontWeight: 700, fontSize: 14, color: T.blue, background: "none", border: "none", cursor: "pointer", marginBottom: 20, padding: 0 }}>
                <ChevronLeft size={18} /> Back to Home
              </button>

              {activeTab === "history" && <TransactionHistory />}
              {activeTab === "rewards" && <RewardsTab />}
              {activeTab === "settings" && <SettingsTab />}
            </motion.div>
          )}
        </div>

        <BottomSheet open={buyDataOpen} onClose={() => { setBuyDataOpen(false); setBuyDataStep(1); setSelectedNetwork(null); setSelectedPlan(null); }} title="Buy Data" accentColor={T.blue}>
          {buyDataStep === 1 && (
            <div>
              <p style={{ fontFamily: T.font, fontSize: 14, color: T.textMid, marginBottom: 20, fontWeight: 500 }}>Select your network provider</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {NETWORKS.slice(0, 4).map((net) => (
                  <NetworkPill key={net.id} net={net} selected={selectedNetwork === net.id} onSelect={() => handleNetworkSelect(net.id)} />
                ))}
              </div>
            </div>
          )}
          {buyDataStep === 2 && (
            <div>
              <button onClick={() => setBuyDataStep(1)} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: T.font, fontWeight: 700, fontSize: 14, color: T.blue, background: "none", border: "none", cursor: "pointer", marginBottom: 20, padding: 0 }}>
                <ChevronLeft size={18} /> Back to Networks
              </button>
              {plansLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
                  <Loader2 size={28} className="animate-spin" color={T.blue} />
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {dataPlans.map((plan) => (
                    <motion.button key={plan.id} whileTap={{ scale: 0.98 }} onClick={() => handlePlanSelect(plan)} style={{ width: "100%", padding: "18px 20px", textAlign: "left", background: T.surface, border: `2px solid ${T.blueBorder}`, borderRadius: 16, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all 0.2s", boxShadow: `0 4px 12px ${T.blue}12` }}>
                      <div>
                        <p style={{ fontFamily: T.font, fontWeight: 700, fontSize: 16, color: T.text, margin: "0 0 4px" }}>{plan.sizeLabel}</p>
                        <p style={{ fontFamily: T.font, fontSize: 13, color: T.textDim, margin: 0, fontWeight: 500 }}>{plan.validity}</p>
                      </div>
                      <div style={{ background: T.blueLight, border: `2px solid ${T.blue}`, borderRadius: 12, padding: "8px 16px" }}>
                        <p style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 16, color: T.blue, margin: 0 }}>₦{getPriceForTier(plan, user.tier).toLocaleString()}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          )}
          {buyDataStep === 3 && (
            <div>
              <button onClick={() => setBuyDataStep(2)} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: T.font, fontWeight: 700, fontSize: 14, color: T.blue, background: "none", border: "none", cursor: "pointer", marginBottom: 20, padding: 0 }}>
                <ChevronLeft size={18} /> Back to Plans
              </button>
              {selectedPlan && (
                <div style={{ background: T.blueLight, border: `2px solid ${T.blueBorder}`, borderRadius: 16, padding: "18px", marginBottom: 24 }}>
                  <p style={{ fontFamily: T.font, fontSize: 13, color: T.textDim, margin: "0 0 6px", fontWeight: 600, textTransform: "uppercase" }}>Selected Plan</p>
                  <p style={{ fontFamily: T.font, fontWeight: 700, fontSize: 18, color: T.text, margin: 0 }}>{selectedPlan.sizeLabel} • {selectedPlan.validity}</p>
                  <p style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 20, color: T.blue, margin: "10px 0 0" }}>₦{getPriceForTier(selectedPlan, user.tier).toLocaleString()}</p>
                </div>
              )}

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontFamily: T.font, fontSize: 12, fontWeight: 700, color: T.textDim, marginBottom: 8, textTransform: "uppercase" }}>Phone Number</label>
                <input
                  type="tel"
                  maxLength={11}
                  placeholder="08012345678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                  style={{ width: "100%", padding: "14px 16px", borderRadius: 12, border: `2px solid ${T.border}`, fontFamily: T.mono, fontSize: 16, color: T.text, background: T.surface, outline: "none", boxSizing: "border-box", transition: "all 0.2s" }}
                  onFocus={(e) => {
                    (e.target as HTMLInputElement).style.borderColor = T.blue;
                    (e.target as HTMLInputElement).style.boxShadow = T.blueShadow;
                  }}
                  onBlur={(e) => {
                    (e.target as HTMLInputElement).style.borderColor = T.border;
                    (e.target as HTMLInputElement).style.boxShadow = "none";
                  }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontFamily: T.font, fontSize: 12, fontWeight: 700, color: T.textDim, marginBottom: 8, textTransform: "uppercase" }}>Transaction PIN</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {pin.map((d, i) => (
                    <input
                      key={i}
                      id={`pin-${i}`}
                      type="password"
                      maxLength={1}
                      value={d}
                      onChange={(e) => {
                        const np = [...pin];
                        np[i] = e.target.value;
                        setPin(np);
                        if (e.target.value && i < 5) document.getElementById(`pin-${i + 1}`)?.focus();
                      }}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        padding: "12px 0",
                        textAlign: "center",
                        borderRadius: 12,
                        background: d ? T.blueLight : T.surface,
                        border: `2px solid ${d ? T.blue : T.border}`,
                        fontFamily: T.mono,
                        fontSize: 20,
                        fontWeight: 700,
                        color: T.text,
                        outline: "none",
                        transition: "all 0.2s",
                        boxSizing: "border-box",
                      }}
                    />
                  ))}
                </div>
              </div>

              <motion.button
                onClick={() => handleDataPurchase()}
                disabled={purchasingData}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  width: "100%",
                  padding: "16px",
                  borderRadius: 14,
                  background: T.blue,
                  border: "none",
                  color: "#fff",
                  fontFamily: T.font,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: purchasingData ? "not-allowed" : "pointer",
                  opacity: purchasingData ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  boxShadow: T.blueShadow,
                  transition: "all 0.3s",
                }}
              >
                {purchasingData && <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />}
                {purchasingData ? "Processing..." : "Confirm Purchase"}
              </motion.button>
            </div>
          )}
        </BottomSheet>

        <BottomSheet open={airtimeOpen} onClose={() => { setAirtimeOpen(false); setAirtimeNetwork(null); setAirtimeAmount(null); setAirtimePhone(""); }} title="Buy Airtime" accentColor={T.green}>
          <div>
            <p style={{ fontFamily: T.font, fontSize: 14, color: T.textMid, marginBottom: 20, fontWeight: 500 }}>Select network and amount</p>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontFamily: T.font, fontSize: 12, fontWeight: 700, color: T.textDim, marginBottom: 12, textTransform: "uppercase" }}>Network</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {NETWORKS.map((net) => (
                  <NetworkPill key={net.id} net={net} selected={airtimeNetwork === net.id} onSelect={() => setAirtimeNetwork(net.id)} />
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontFamily: T.font, fontSize: 12, fontWeight: 700, color: T.textDim, marginBottom: 12, textTransform: "uppercase" }}>Amount</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {AIRTIME_AMOUNTS.map((amount) => (
                  <motion.button
                    key={amount}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setAirtimeAmount(amount)}
                    style={{
                      padding: "14px 12px",
                      borderRadius: 12,
                      border: `2px solid ${airtimeAmount === amount ? T.green : T.border}`,
                      background: airtimeAmount === amount ? "rgba(16,185,129,0.15)" : T.surface,
                      fontFamily: T.mono,
                      fontWeight: 700,
                      fontSize: 15,
                      color: airtimeAmount === amount ? T.green : T.textMid,
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    ₦{amount}
                  </motion.button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontFamily: T.font, fontSize: 12, fontWeight: 700, color: T.textDim, marginBottom: 8, textTransform: "uppercase" }}>Phone Number</label>
              <input
                type="tel"
                maxLength={11}
                placeholder="08012345678"
                value={airtimePhone}
                onChange={(e) => setAirtimePhone(e.target.value.replace(/\D/g, ""))}
                style={{ width: "100%", padding: "14px 16px", borderRadius: 12, border: `2px solid ${T.border}`, fontFamily: T.mono, fontSize: 16, color: T.text, background: T.surface, outline: "none", boxSizing: "border-box", transition: "all 0.2s" }}
                onFocus={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = T.green;
                  (e.target as HTMLInputElement).style.boxShadow = `0 12px 30px rgba(16, 185, 129, 0.15)`;
                }}
                onBlur={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = T.border;
                  (e.target as HTMLInputElement).style.boxShadow = "none";
                }}
              />
            </div>

            <motion.button
              onClick={() => handleAirtimePurchase()}
              disabled={purchasingAirtime}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                width: "100%",
                padding: "16px",
                borderRadius: 14,
                background: T.green,
                border: "none",
                color: "#fff",
                fontFamily: T.font,
                fontSize: 15,
                fontWeight: 700,
                cursor: purchasingAirtime ? "not-allowed" : "pointer",
                opacity: purchasingAirtime ? 0.7 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                boxShadow: `0 12px 30px rgba(16, 185, 129, 0.15)`,
                transition: "all 0.3s",
              }}
            >
              {purchasingAirtime && <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />}
              {purchasingAirtime ? "Processing..." : "Buy Airtime"}
            </motion.button>
          </div>
        </BottomSheet>

        {/* Success Modal */}
        <motion.div key={successModalOpen ? "open" : "closed"} initial={{ opacity: 0 }} animate={{ opacity: successModalOpen ? 1 : 0 }} style={{ position: "fixed", inset: 0, zIndex: 50, background: successModalOpen ? "rgba(0,0,0,0.5)" : "transparent", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: successModalOpen ? "auto" : "none", transition: "opacity 0.3s" }} onClick={() => setSuccessModalOpen(false)}>
          <motion.div initial={{ scale: 0.8, y: 50 }} animate={{ scale: successModalOpen ? 1 : 0.8, y: successModalOpen ? 0 : 50 }} transition={{ type: "spring", damping: 20, stiffness: 300 }} style={{ background: T.card, borderRadius: 24, padding: "40px 24px", maxWidth: 320, width: "90%", textAlign: "center", border: `2px solid ${T.blueBorder}`, boxShadow: T.blueShadow }} onClick={(e) => e.stopPropagation()}>
            <motion.div initial={{ scale: 0 }} animate={{ scale: successModalOpen ? 1 : 0 }} transition={{ delay: 0.3, type: "spring", damping: 15 }} style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(16, 185, 129, 0.15)", border: `2px solid ${T.green}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 40 }}>
              ✓
            </motion.div>
            <h2 style={{ fontFamily: T.font, fontWeight: 700, fontSize: 20, color: T.text, margin: "0 0 8px" }}>Success!</h2>
            <p style={{ fontFamily: T.font, fontSize: 14, color: T.textMid, margin: "0 0 24px", lineHeight: 1.5 }}>{successData?.type === "data" ? `Data purchased successfully` : "Airtime bought successfully"}</p>
            
            <div style={{ background: T.blueLight, borderRadius: 12, padding: "16px", marginBottom: 20, textAlign: "left" }}>
              {successData?.type === "data" && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 13 }}>
                    <span style={{ color: T.textDim, fontWeight: 600 }}>Plan:</span>
                    <span style={{ color: T.text, fontWeight: 700 }}>{successData?.plan}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 13 }}>
                    <span style={{ color: T.textDim, fontWeight: 600 }}>Network:</span>
                    <span style={{ color: T.text, fontWeight: 700 }}>{successData?.network}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 13 }}>
                    <span style={{ color: T.textDim, fontWeight: 600 }}>Phone:</span>
                    <span style={{ color: T.text, fontFamily: T.mono, fontWeight: 700 }}>{successData?.phone}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: T.textDim, fontWeight: 600 }}>Amount:</span>
                    <span style={{ color: T.blue, fontFamily: T.mono, fontWeight: 800 }}>₦{successData?.amount?.toLocaleString()}</span>
                  </div>
                </>
              )}
            </div>

            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setSuccessModalOpen(false)} style={{ width: "100%", padding: "12px", borderRadius: 12, background: T.blue, border: "none", color: "#fff", fontFamily: T.font, fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: T.blueShadow, transition: "all 0.2s" }}>
              Done
            </motion.button>
          </motion.div>
        </motion.div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
