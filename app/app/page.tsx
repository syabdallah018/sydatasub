"use client";

import { useEffect, useState } from "react";
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
      await fetch("/api/auth/logout", { method: "POST" });
      // Hard redirect to login
      window.location.href = "/app/auth";
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = "/app/auth";
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
      const res = await fetch("/api/data/purchase", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId: selectedPlan.id, phone: phoneNumber, pin: pin.join("") }) });
      const data = await res.json();
      if (data.success) {
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
        fetch("/api/auth/me").then((r) => r.json()).then((d) => d.success && setUser(d.data));
      } else { toast.error(data.error || "Purchase failed"); }
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
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 14, background: `linear-gradient(135deg, ${T.blue}, ${T.gold})`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.font, fontWeight: 800, fontSize: 15, color: "#fff", boxShadow: T.blueShadow }}>{initials}</div>
              <div>
                <p style={{ fontFamily: T.font, fontSize: 11, color: T.textDim, margin: 0, fontWeight: 600, textTransform: "uppercase" }}>Welcome</p>
                <p style={{ fontFamily: T.font, fontSize: 15, fontWeight: 700, color: T.text, margin: 0 }}>{user.fullName}</p>
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
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowBalance(!showBalance)} style={{ width: 40, height: 40, borderRadius: 12, background: T.blueLight, border: `2px solid ${T.blue}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                {showBalance ? <Eye size={18} color={T.blue} /> : <EyeOff size={18} color={T.blue} />}
              </motion.button>
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

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
            <ActionTile icon={<Zap size={22} color={T.blue} />} label="Buy Data" sub="All networks" color={T.blue} dimColor="rgba(37,99,235,0.12)" onClick={() => setBuyDataOpen(true)} />
            <ActionTile icon={<Phone size={22} color={T.green} />} label="Buy Airtime" sub="All networks" color={T.green} dimColor="rgba(16,185,129,0.12)" onClick={() => setAirtimeOpen(true)} />
            <ActionTile icon={<Gift size={22} color={T.amber} />} label="Rewards" sub="Earn points" color={T.amber} dimColor="rgba(245,158,11,0.12)" onClick={() => router.push("/app/dashboard/rewards")} />
            <ActionTile icon={<CreditCard size={22} color={T.purple} />} label="History" sub="Transactions" color={T.purple} dimColor="rgba(139,92,246,0.12)" onClick={() => router.push("/app/dashboard/transactions")} />
            <ActionTile icon={<Settings size={22} color={T.gold} />} label="Settings" sub="Account" color={T.gold} dimColor="rgba(251,191,36,0.12)" onClick={() => router.push("/app/dashboard/settings")} />
          </motion.div>
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
