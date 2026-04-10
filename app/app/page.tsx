"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, Eye, EyeOff, Loader2, LogOut, Zap, Phone, Gift, CreditCard, X, ChevronLeft, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";

// ─── Google Fonts injected via style tag ──────────────────────────────────────
const fontStyle = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&family=DM+Mono:wght@400;500&display=swap');
`;

// ─── Design tokens (all inline — no globals dependency) ──────────────────────
const T = {
  bg: "#0A0D14",
  surface: "#111520",
  card: "#141927",
  border: "#1E2535",
  borderLight: "#252D40",
  gold: "#D4A843",
  goldLight: "#F2C96E",
  goldDim: "rgba(212,168,67,0.12)",
  blue: "#3B6FFF",
  blueLight: "#5B8AFF",
  blueDim: "rgba(59,111,255,0.12)",
  green: "#22C55E",
  greenDim: "rgba(34,197,94,0.12)",
  amber: "#F59E0B",
  amberDim: "rgba(245,158,11,0.12)",
  purple: "#A855F7",
  purpleDim: "rgba(168,85,247,0.12)",
  text: "#F0F4FF",
  textMid: "#8B95B0",
  textDim: "#4A5268",
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

interface Transaction {
  id: string;
  type: string;
  status: string;
  amount: number;
  description: string;
  createdAt: string;
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
  { id: "mtn", name: "MTN", color: "#FFCC00", bg: "rgba(255,204,0,0.12)" },
  { id: "airtel", name: "Airtel", color: "#FF3333", bg: "rgba(255,51,51,0.12)" },
  { id: "glo", name: "Glo", color: "#22C55E", bg: "rgba(34,197,94,0.12)" },
  { id: "9mobile", name: "9mobile", color: "#00A859", bg: "rgba(0,168,89,0.12)" },
];

const AIRTIME_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

const getPriceForTier = (plan: DataPlan, tier: string = "user"): number => {
  if (tier === "agent" && plan.agent_price > 0) return plan.agent_price;
  return plan.user_price > 0 ? plan.user_price : plan.price;
};

// ─── Reusable bottom-sheet modal ─────────────────────────────────────────────
function BottomSheet({ open, onClose, title, accentColor = T.blue, children }: {
  open: boolean; onClose: () => void; title: string; accentColor?: string; children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            style={{ background: T.surface, borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 480, maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet handle */}
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: T.border }} />
            </div>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px 16px", borderBottom: `1px solid ${T.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 4, height: 20, borderRadius: 2, background: accentColor }} />
                <h2 style={{ fontFamily: T.font, fontWeight: 700, fontSize: 17, color: T.text, margin: 0 }}>{title}</h2>
              </div>
              <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: T.border, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={16} color={T.textMid} />
              </button>
            </div>
            {/* Body */}
            <div style={{ overflowY: "auto", padding: "20px", flex: 1 }}>
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Network selector pill ────────────────────────────────────────────────────
function NetworkPill({ net, selected, onSelect }: { net: typeof NETWORKS[0]; selected: boolean; onSelect: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onSelect}
      style={{
        padding: "10px 0", borderRadius: 14, border: `1.5px solid ${selected ? net.color : T.border}`,
        background: selected ? net.bg : T.card, fontFamily: T.font, fontWeight: 700,
        fontSize: 13, color: selected ? net.color : T.textMid, cursor: "pointer",
        transition: "all 0.2s", width: "100%",
      }}
    >
      {net.name}
    </motion.button>
  );
}

// ─── Action tile ──────────────────────────────────────────────────────────────
function ActionTile({ icon, label, sub, color, dimColor, onClick }: {
  icon: React.ReactNode; label: string; sub: string; color: string; dimColor: string; onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ y: -2, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      style={{
        background: T.card, border: `1px solid ${T.border}`, borderRadius: 20,
        padding: "18px 16px", cursor: "pointer", textAlign: "left", width: "100%",
        display: "flex", flexDirection: "column", gap: 12, position: "relative", overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, borderRadius: "0 20px 0 80px", background: dimColor, opacity: 0.6 }} />
      <div style={{ width: 40, height: 40, borderRadius: 13, background: dimColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon}
      </div>
      <div>
        <p style={{ fontFamily: T.font, fontWeight: 700, fontSize: 14, color: T.text, margin: "0 0 2px" }}>{label}</p>
        <p style={{ fontFamily: T.font, fontWeight: 400, fontSize: 11, color: T.textDim, margin: 0 }}>{sub}</p>
      </div>
      <div style={{ position: "absolute", top: 14, right: 14 }}>
        <ArrowUpRight size={14} color={color} />
      </div>
    </motion.button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
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
  const [airtimeOpen, setAirtimeOpen] = useState(false);
  const [airtimeNetwork, setAirtimeNetwork] = useState<string | null>(null);
  const [airtimeAmount, setAirtimeAmount] = useState<number | null>(null);
  const [airtimePhone, setAirtimePhone] = useState("");
  const [purchasingAirtime, setPurchasingAirtime] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data?.success && data?.data) setUser(data.data);
        else router.replace("/app");
      })
      .catch(() => router.replace("/app"))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/transactions?limit=10")
      .then((r) => r.json())
      .then((data) => { if (data?.success) setTransactions(data.data.transactions || []); });
  }, [user]);

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
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/app");
  };

  const handleNetworkSelect = async (networkId: string) => {
    setSelectedNetwork(networkId);
    setPlansLoading(true);
    try {
      const res = await fetch(`/api/data/plans?network=${networkId}`);
      const data = await res.json();
      if (data.success) { setDataPlans(data.data || []); setBuyDataStep(2); }
    } catch { toast.error("Error loading plans"); }
    finally { setPlansLoading(false); }
  };

  const handlePlanSelect = (plan: DataPlan) => {
    setSelectedPlan(plan);
    setPhoneNumber("");
    setPin(["", "", "", "", "", ""]);
    setBuyDataStep(3);
  };

  const handlePurchaseData = async () => {
    if (!phoneNumber || phoneNumber.length !== 11) { toast.error("Enter valid 11-digit phone number"); return; }
    if (pin.some((p) => !p)) { toast.error("Enter complete PIN"); return; }
    if (!selectedPlan) { toast.error("No plan selected"); return; }
    setPurchasingData(true);
    try {
      const res = await fetch("/api/data/purchase", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selectedPlan.id, phone: phoneNumber, pin: pin.join("") }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Data purchased successfully!");
        setBuyDataOpen(false); setBuyDataStep(1); setSelectedNetwork(null); setSelectedPlan(null);
        fetch("/api/auth/me").then((r) => r.json()).then((d) => d.success && setUser(d.data));
      } else { toast.error(data.error || "Purchase failed"); }
    } finally { setPurchasingData(false); }
  };

  const handlePurchaseAirtime = async () => {
    if (!airtimeNetwork || !airtimeAmount || !airtimePhone) { toast.error("Complete all fields"); return; }
    if (airtimePhone.length !== 11) { toast.error("Enter valid 11-digit phone"); return; }
    setPurchasingAirtime(true);
    try {
      const res = await fetch("/api/airtime/purchase", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ network: airtimeNetwork, amount: airtimeAmount, phone: airtimePhone }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Airtime purchased successfully!");
        setAirtimeOpen(false);
        fetch("/api/auth/me").then((r) => r.json()).then((d) => d.success && setUser(d.data));
      } else { toast.error(data.error || "Purchase failed"); }
    } finally { setPurchasingAirtime(false); }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: T.bg }}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
          <Loader2 size={28} color={T.gold} />
        </motion.div>
      </div>
    );
  }

  if (!user) return null;

  const initials = user.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <>
      <style>{fontStyle}</style>
      <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font, paddingBottom: 40 }}>

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            position: "sticky", top: 0, zIndex: 40, background: "rgba(10,13,20,0.85)",
            backdropFilter: "blur(20px)", borderBottom: `1px solid ${T.border}`,
          }}
        >
          <div style={{ maxWidth: 480, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 14, background: `linear-gradient(135deg, ${T.gold}, ${T.goldLight})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: T.font, fontWeight: 800, fontSize: 15, color: "#0A0D14",
                boxShadow: `0 4px 16px ${T.goldDim}`,
              }}>
                {initials}
              </div>
              <div>
                <p style={{ fontFamily: T.font, fontSize: 11, color: T.textDim, margin: 0, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>Welcome back</p>
                <p style={{ fontFamily: T.font, fontSize: 15, fontWeight: 700, color: T.text, margin: 0 }}>{user.fullName}</p>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
                borderRadius: 12, background: T.card, border: `1px solid ${T.border}`,
                fontFamily: T.font, fontWeight: 600, fontSize: 13, color: T.textMid, cursor: "pointer",
              }}
            >
              <LogOut size={14} /> Sign out
            </motion.button>
          </div>
        </motion.div>

        <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 20px 0" }}>

          {/* ── Wallet Card ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            style={{
              background: `linear-gradient(145deg, #0D1730 0%, #0F2040 50%, #091525 100%)`,
              borderRadius: 24, padding: "24px 22px 20px", marginBottom: 20,
              border: `1px solid rgba(212,168,67,0.2)`,
              boxShadow: `0 0 0 1px rgba(255,255,255,0.04), 0 20px 60px rgba(0,0,0,0.5), 0 0 80px rgba(59,111,255,0.08)`,
              position: "relative", overflow: "hidden",
            }}
          >
            {/* Card background decoration */}
            <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(212,168,67,0.04)" }} />
            <div style={{ position: "absolute", bottom: -30, left: -20, width: 120, height: 120, borderRadius: "50%", background: "rgba(59,111,255,0.06)" }} />

            {/* Top row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, position: "relative" }}>
              <div>
                <p style={{ fontFamily: T.font, fontSize: 11, color: "rgba(212,168,67,0.7)", margin: "0 0 6px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>Available Balance</p>
                <motion.h2
                  key={showBalance ? "shown" : "hidden"}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ fontFamily: T.font, fontWeight: 800, fontSize: 30, color: "#FFFFFF", margin: 0, letterSpacing: "-0.02em" }}
                >
                  {showBalance ? formatBalance(user.balance) : "••••••••"}
                </motion.h2>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowBalance(!showBalance)}
                style={{ width: 36, height: 36, borderRadius: 11, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                {showBalance ? <Eye size={16} color="rgba(255,255,255,0.5)" /> : <EyeOff size={16} color="rgba(255,255,255,0.5)" />}
              </motion.button>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(212,168,67,0.2), transparent)", marginBottom: 16 }} />

            {/* Account info */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontFamily: T.font, fontSize: 10, color: "rgba(255,255,255,0.35)", margin: "0 0 3px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {user.virtualAccount?.bankName || "Virtual Account"}
                </p>
                <p style={{ fontFamily: T.mono, fontSize: 17, color: "rgba(255,255,255,0.85)", margin: 0, fontWeight: 500, letterSpacing: "0.06em" }}>
                  {user.virtualAccount?.accountNumber
                    ? user.virtualAccount.accountNumber.replace(/(\d{4})(\d{3})(\d{4})/, "$1 $2 $3")
                    : "— — —"}
                </p>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleCopy}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
                  borderRadius: 11, background: copied ? "rgba(34,197,94,0.15)" : "rgba(212,168,67,0.1)",
                  border: `1px solid ${copied ? "rgba(34,197,94,0.3)" : "rgba(212,168,67,0.2)"}`,
                  fontFamily: T.font, fontWeight: 600, fontSize: 12, color: copied ? T.green : T.gold,
                  cursor: "pointer", transition: "all 0.2s",
                }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? "Copied" : "Copy"}
              </motion.button>
            </div>
          </motion.div>

          {/* ── Action Tiles ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}
          >
            <ActionTile icon={<Zap size={20} color={T.blue} />} label="Buy Data" sub="All networks" color={T.blue} dimColor={T.blueDim} onClick={() => setBuyDataOpen(true)} />
            <ActionTile icon={<Phone size={20} color={T.green} />} label="Buy Airtime" sub="All networks" color={T.green} dimColor={T.greenDim} onClick={() => setAirtimeOpen(true)} />
            <ActionTile icon={<Gift size={20} color={T.amber} />} label="Rewards" sub="Earn points" color={T.amber} dimColor={T.amberDim} onClick={() => router.push("/app/dashboard/rewards")} />
            <ActionTile icon={<CreditCard size={20} color={T.purple} />} label="History" sub="View transactions" color={T.purple} dimColor={T.purpleDim} onClick={() => router.push("/app/dashboard/transactions")} />
          </motion.div>

          {/* ── Recent Transactions ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 20, overflow: "hidden" }}
          >
            <div style={{ padding: "18px 20px 14px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontFamily: T.font, fontWeight: 700, fontSize: 15, color: T.text, margin: 0 }}>Recent Activity</p>
              <button
                onClick={() => router.push("/app/dashboard/transactions")}
                style={{ fontFamily: T.font, fontWeight: 600, fontSize: 12, color: T.blue, background: "none", border: "none", cursor: "pointer" }}
              >
                See all
              </button>
            </div>
            {transactions.length === 0 ? (
              <div style={{ padding: "32px 20px", textAlign: "center" }}>
                <p style={{ fontFamily: T.font, fontSize: 13, color: T.textDim, margin: 0 }}>No transactions yet</p>
              </div>
            ) : (
              <div>
                {transactions.slice(0, 5).map((tx, i) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.18 + i * 0.04 }}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "14px 20px", borderBottom: i < Math.min(transactions.length, 5) - 1 ? `1px solid ${T.border}` : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 12, background: T.border, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <ArrowUpRight size={16} color={T.textDim} />
                      </div>
                      <div>
                        <p style={{ fontFamily: T.font, fontWeight: 600, fontSize: 13, color: T.text, margin: "0 0 2px" }}>{tx.description}</p>
                        <p style={{ fontFamily: T.font, fontSize: 11, color: T.textDim, margin: 0 }}>
                          {new Date(tx.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <p style={{ fontFamily: T.mono, fontWeight: 600, fontSize: 13, color: "#FF6B6B", margin: 0 }}>
                      -₦{tx.amount.toLocaleString()}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* ── BUY DATA SHEET ── */}
        <BottomSheet open={buyDataOpen} onClose={() => { setBuyDataOpen(false); setBuyDataStep(1); setSelectedNetwork(null); setSelectedPlan(null); }} title="Buy Data" accentColor={T.blue}>
          <AnimatePresence mode="wait">
            {buyDataStep === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <p style={{ fontFamily: T.font, fontSize: 13, color: T.textMid, marginBottom: 16, fontWeight: 500 }}>Select your network provider</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {NETWORKS.map((net) => (
                    <NetworkPill key={net.id} net={net} selected={selectedNetwork === net.id} onSelect={() => handleNetworkSelect(net.id)} />
                  ))}
                </div>
              </motion.div>
            )}
            {buyDataStep === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <button onClick={() => setBuyDataStep(1)} style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: T.font, fontWeight: 600, fontSize: 13, color: T.blue, background: "none", border: "none", cursor: "pointer", marginBottom: 16, padding: 0 }}>
                  <ChevronLeft size={16} /> Back
                </button>
                {plansLoading ? (
                  <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                      <Loader2 size={24} color={T.blue} />
                    </motion.div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {dataPlans.map((plan) => (
                      <motion.button
                        key={plan.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handlePlanSelect(plan)}
                        style={{
                          width: "100%", padding: "14px 16px", textAlign: "left",
                          background: T.card, border: `1px solid ${T.border}`, borderRadius: 14,
                          cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
                        }}
                      >
                        <div>
                          <p style={{ fontFamily: T.font, fontWeight: 700, fontSize: 14, color: T.text, margin: "0 0 3px" }}>{plan.sizeLabel}</p>
                          <p style={{ fontFamily: T.font, fontSize: 12, color: T.textDim, margin: 0 }}>{plan.validity}</p>
                        </div>
                        <div style={{ background: T.blueDim, borderRadius: 10, padding: "6px 12px" }}>
                          <p style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 14, color: T.blueLight, margin: 0 }}>₦{getPriceForTier(plan, user.tier).toLocaleString()}</p>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
            {buyDataStep === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <button onClick={() => setBuyDataStep(2)} style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: T.font, fontWeight: 600, fontSize: 13, color: T.blue, background: "none", border: "none", cursor: "pointer", marginBottom: 20, padding: 0 }}>
                  <ChevronLeft size={16} /> Back
                </button>
                {selectedPlan && (
                  <div style={{ background: T.blueDim, border: `1px solid rgba(59,111,255,0.2)`, borderRadius: 14, padding: "12px 16px", marginBottom: 20, display: "flex", justifyContent: "space-between" }}>
                    <div>
                      <p style={{ fontFamily: T.font, fontWeight: 700, fontSize: 15, color: T.blueLight, margin: "0 0 2px" }}>{selectedPlan.sizeLabel}</p>
                      <p style={{ fontFamily: T.font, fontSize: 12, color: T.textMid, margin: 0 }}>{selectedPlan.validity}</p>
                    </div>
                    <p style={{ fontFamily: T.mono, fontWeight: 800, fontSize: 18, color: T.blueLight, margin: 0 }}>₦{getPriceForTier(selectedPlan, user.tier).toLocaleString()}</p>
                  </div>
                )}
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontFamily: T.font, fontSize: 12, color: T.textMid, margin: "0 0 8px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Phone Number</p>
                  <input
                    type="tel" maxLength={11} placeholder="08012345678" value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                    style={{ width: "100%", padding: "13px 16px", borderRadius: 14, background: T.card, border: `1px solid ${T.border}`, fontFamily: T.mono, fontSize: 15, color: T.text, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ marginBottom: 24 }}>
                  <p style={{ fontFamily: T.font, fontSize: 12, color: T.textMid, margin: "0 0 10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Transaction PIN</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    {pin.map((d, i) => (
                      <input
                        key={i} id={`p${i}`} type="password" maxLength={1} value={d}
                        onChange={(e) => {
                          const np = [...pin]; np[i] = e.target.value; setPin(np);
                          if (e.target.value && i < 5) document.getElementById(`p${i + 1}`)?.focus();
                        }}
                        style={{
                          flex: 1, padding: "14px 0", textAlign: "center", borderRadius: 14,
                          background: d ? T.blueDim : T.card, border: `1.5px solid ${d ? T.blue : T.border}`,
                          fontFamily: T.mono, fontSize: 20, color: T.text, outline: "none",
                          transition: "all 0.15s",
                        }}
                      />
                    ))}
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handlePurchaseData}
                  disabled={purchasingData}
                  style={{
                    width: "100%", padding: "15px", borderRadius: 16,
                    background: purchasingData ? T.border : `linear-gradient(135deg, ${T.blue}, ${T.blueLight})`,
                    border: "none", fontFamily: T.font, fontWeight: 700, fontSize: 15, color: "#fff",
                    cursor: purchasingData ? "not-allowed" : "pointer",
                    boxShadow: purchasingData ? "none" : `0 8px 24px rgba(59,111,255,0.35)`,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                >
                  {purchasingData ? <><Loader2 size={18} className="animate-spin" /> Processing…</> : "Confirm Purchase"}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </BottomSheet>

        {/* ── BUY AIRTIME SHEET ── */}
        <BottomSheet open={airtimeOpen} onClose={() => setAirtimeOpen(false)} title="Buy Airtime" accentColor={T.green}>
          <p style={{ fontFamily: T.font, fontSize: 13, color: T.textMid, marginBottom: 16, fontWeight: 500 }}>Select network</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
            {NETWORKS.map((net) => (
              <NetworkPill key={net.id} net={net} selected={airtimeNetwork === net.id} onSelect={() => setAirtimeNetwork(net.id)} />
            ))}
          </div>

          <p style={{ fontFamily: T.font, fontSize: 12, color: T.textMid, margin: "0 0 12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Amount</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 20 }}>
            {AIRTIME_AMOUNTS.map((amt) => (
              <motion.button
                key={amt}
                whileTap={{ scale: 0.95 }}
                onClick={() => setAirtimeAmount(amt)}
                style={{
                  padding: "11px 0", borderRadius: 12,
                  border: `1.5px solid ${airtimeAmount === amt ? T.green : T.border}`,
                  background: airtimeAmount === amt ? T.greenDim : T.card,
                  fontFamily: T.mono, fontWeight: 700, fontSize: 13,
                  color: airtimeAmount === amt ? T.green : T.textMid, cursor: "pointer",
                }}
              >
                ₦{amt.toLocaleString()}
              </motion.button>
            ))}
          </div>

          <p style={{ fontFamily: T.font, fontSize: 12, color: T.textMid, margin: "0 0 8px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Phone Number</p>
          <input
            type="tel" maxLength={11} placeholder="08012345678" value={airtimePhone}
            onChange={(e) => setAirtimePhone(e.target.value.replace(/\D/g, ""))}
            style={{ width: "100%", padding: "13px 16px", borderRadius: 14, background: T.card, border: `1px solid ${T.border}`, fontFamily: T.mono, fontSize: 15, color: T.text, outline: "none", boxSizing: "border-box", marginBottom: 20 }}
          />

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handlePurchaseAirtime}
            disabled={purchasingAirtime}
            style={{
              width: "100%", padding: "15px", borderRadius: 16,
              background: purchasingAirtime ? T.border : `linear-gradient(135deg, #16A34A, ${T.green})`,
              border: "none", fontFamily: T.font, fontWeight: 700, fontSize: 15, color: "#fff",
              cursor: purchasingAirtime ? "not-allowed" : "pointer",
              boxShadow: purchasingAirtime ? "none" : `0 8px 24px rgba(34,197,94,0.3)`,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            {purchasingAirtime ? <><Loader2 size={18} className="animate-spin" /> Processing…</> : "Buy Airtime"}
          </motion.button>
        </BottomSheet>
      </div>
    </>
  );
}
