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
  surface: "#f3f4f6",
  card: "#ffffff",
  border: "#e5e7eb",
  gold: "#fbbf24",
  blue: "#2563eb",
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
  { id: "mtn", name: "MTN", color: "#FFCC00", bg: "#fef9c3" },
  { id: "airtel", name: "Airtel", color: "#FF3333", bg: "#fee2e2" },
  { id: "glo", name: "Glo", color: "#22C55E", bg: "#dcfce7" },
  { id: "9mobile", name: "9mobile", color: "#00A859", bg: "#d1fae5" },
];

const AIRTIME_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

const getPriceForTier = (plan: DataPlan, tier: string = "user"): number => {
  if (tier === "agent" && plan.agent_price > 0) return plan.agent_price;
  return plan.user_price > 0 ? plan.user_price : plan.price;
};

function BottomSheet({ open, onClose, title, accentColor = T.blue, children }: any) {
  return (
    <motion.div key={open ? "open" : "closed"} initial={{ opacity: 0 }} animate={{ opacity: open ? 1 : 0 }} style={{ position: "fixed", inset: 0, zIndex: 50, background: open ? "rgba(0,0,0,0.4)" : "transparent", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end", justifyContent: "center", pointerEvents: open ? "auto" : "none", transition: "opacity 0.2s" }} onClick={onClose}>
      <motion.div initial={{ y: "100%" }} animate={{ y: open ? 0 : "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} style={{ background: T.card, borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 480, maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column", border: `1px solid ${T.border}` }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: T.border }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px 16px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 4, height: 20, borderRadius: 2, background: accentColor }} />
            <h2 style={{ fontFamily: T.font, fontWeight: 700, fontSize: 17, color: T.text, margin: 0 }}>{title}</h2>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: T.surface, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={16} color={T.textMid} />
          </button>
        </div>
        <div style={{ overflowY: "auto", padding: "20px", flex: 1 }}>
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}

function NetworkPill({ net, selected, onSelect }: any) {
  return (
    <motion.button whileTap={{ scale: 0.95 }} onClick={onSelect} style={{ padding: "10px 0", borderRadius: 14, border: `1.5px solid ${selected ? net.color : T.border}`, background: selected ? net.bg : T.surface, fontFamily: T.font, fontWeight: 700, fontSize: 13, color: selected ? net.color : T.textMid, cursor: "pointer", transition: "all 0.2s", width: "100%" }} />
  );
}

function ActionTile({ icon, label, sub, color, dimColor, onClick }: any) {
  return (
    <motion.button whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={onClick} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 20, padding: "18px 16px", cursor: "pointer", textAlign: "left", width: "100%", display: "flex", flexDirection: "column", gap: 12, position: "relative", overflow: "hidden" }}>
      <div style={{ width: 40, height: 40, borderRadius: 13, background: dimColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon}
      </div>
      <div>
        <p style={{ fontFamily: T.font, fontWeight: 700, fontSize: 14, color: T.text, margin: "0 0 2px" }}>{label}</p>
        <p style={{ fontFamily: T.font, fontWeight: 400, fontSize: 11, color: T.textDim, margin: 0 }}>{sub}</p>
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
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/app/auth");
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
      const res = await fetch("/api/data/purchase", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId: selectedPlan.id, phone: phoneNumber, pin: pin.join("") }) });
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
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ position: "sticky", top: 0, zIndex: 40, background: `rgba(255,255,255,0.8)`, backdropFilter: "blur(10px)", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ maxWidth: 480, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: `linear-gradient(135deg, ${T.blue}, ${T.gold})`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.font, fontWeight: 800, fontSize: 14, color: "#fff" }}>{initials}</div>
              <div>
                <p style={{ fontFamily: T.font, fontSize: 11, color: T.textDim, margin: 0, fontWeight: 500, textTransform: "uppercase" }}>Welcome back</p>
                <p style={{ fontFamily: T.font, fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>{user.fullName}</p>
              </div>
            </div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 10, background: T.surface, border: `1px solid ${T.border}`, fontFamily: T.font, fontWeight: 600, fontSize: 12, color: T.textMid, cursor: "pointer" }}>
              <LogOut size={14} /> Logout
            </motion.button>
          </div>
        </motion.div>

        <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 20px" }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} style={{ background: `linear-gradient(135deg, #f0f9ff 0%, #eff6ff 100%)`, borderRadius: 24, padding: "24px 20px", marginBottom: 20, border: `1px solid ${T.border}`, boxShadow: "0 4px 6px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <p style={{ fontFamily: T.font, fontSize: 11, color: T.textDim, margin: "0 0 6px", fontWeight: 600, textTransform: "uppercase" }}>Available Balance</p>
                <motion.h2 key={showBalance ? "shown" : "hidden"} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} style={{ fontFamily: T.font, fontWeight: 800, fontSize: 28, color: T.text, margin: 0 }}>
                  {showBalance ? formatBalance(user.balance) : ""}
                </motion.h2>
              </div>
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowBalance(!showBalance)} style={{ width: 36, height: 36, borderRadius: 10, background: T.surface, border: `1px solid ${T.border}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {showBalance ? <Eye size={16} color={T.textMid} /> : <EyeOff size={16} color={T.textMid} />}
              </motion.button>
            </div>

            <div style={{ height: 1, background: T.border, marginBottom: 16 }} />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontFamily: T.font, fontSize: 10, color: T.textDim, margin: "0 0 4px", fontWeight: 600, textTransform: "uppercase" }}>{user.virtualAccount?.bankName || "Virtual Account"}</p>
                <p style={{ fontFamily: T.mono, fontSize: 16, color: T.text, margin: 0, fontWeight: 500, letterSpacing: "0.06em" }}>
                  {user.virtualAccount?.accountNumber ? user.virtualAccount.accountNumber.replace(/(\d{4})(\d{3})(\d{4})/, "$1 $2 $3") : "  "}
                </p>
              </div>
              <motion.button whileTap={{ scale: 0.9 }} onClick={handleCopy} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 10, background: copied ? "rgba(16,185,129,0.1)" : T.surface, border: `1px solid ${copied ? T.green : T.border}`, fontFamily: T.font, fontWeight: 600, fontSize: 11, color: copied ? T.green : T.blue, cursor: "pointer", transition: "all 0.2s" }}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? "Copied" : "Copy"}
              </motion.button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
            <ActionTile icon={<Zap size={20} color={T.blue} />} label="Buy Data" sub="All networks" color={T.blue} dimColor="rgba(37,99,235,0.1)" onClick={() => setBuyDataOpen(true)} />
            <ActionTile icon={<Phone size={20} color={T.green} />} label="Buy Airtime" sub="All networks" color={T.green} dimColor="rgba(16,185,129,0.1)" onClick={() => setAirtimeOpen(true)} />
            <ActionTile icon={<Gift size={20} color={T.amber} />} label="Rewards" sub="Earn points" color={T.amber} dimColor="rgba(245,158,11,0.1)" onClick={() => router.push("/app/dashboard/rewards")} />
            <ActionTile icon={<CreditCard size={20} color={T.purple} />} label="History" sub="View transactions" color={T.purple} dimColor="rgba(139,92,246,0.1)" onClick={() => router.push("/app/dashboard/transactions")} />
            <ActionTile icon={<Settings size={20} color={T.gold} />} label="Settings" sub="Account & security" color={T.gold} dimColor="rgba(251,191,36,0.1)" onClick={() => router.push("/app/dashboard/settings")} />
          </motion.div>
        </div>

        <BottomSheet open={buyDataOpen} onClose={() => { setBuyDataOpen(false); setBuyDataStep(1); setSelectedNetwork(null); setSelectedPlan(null); }} title="Buy Data" accentColor={T.blue}>
          {buyDataStep === 1 && (
            <div>
              <p style={{ fontFamily: T.font, fontSize: 13, color: T.textMid, marginBottom: 16 }}>Select your network provider</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {NETWORKS.slice(0, 4).map((net) => (
                  <NetworkPill key={net.id} net={net} selected={selectedNetwork === net.id} onSelect={() => handleNetworkSelect(net.id)} />
                ))}
              </div>
            </div>
          )}
          {buyDataStep === 2 && (
            <div>
              <button onClick={() => setBuyDataStep(1)} style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: T.font, fontWeight: 600, fontSize: 13, color: T.blue, background: "none", border: "none", cursor: "pointer", marginBottom: 16, padding: 0 }}>
                <ChevronLeft size={16} /> Back
              </button>
              {plansLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
                  <Loader2 size={24} className="animate-spin" color={T.blue} />
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {dataPlans.map((plan) => (
                    <motion.button key={plan.id} whileTap={{ scale: 0.98 }} onClick={() => handlePlanSelect(plan)} style={{ width: "100%", padding: "14px 16px", textAlign: "left", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p style={{ fontFamily: T.font, fontWeight: 700, fontSize: 14, color: T.text, margin: "0 0 3px" }}>{plan.sizeLabel}</p>
                        <p style={{ fontFamily: T.font, fontSize: 12, color: T.textDim, margin: 0 }}>{plan.validity}</p>
                      </div>
                      <div style={{ background: "rgba(37,99,235,0.1)", borderRadius: 8, padding: "6px 12px" }}>
                        <p style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 14, color: T.blue, margin: 0 }}>{getPriceForTier(plan, user.tier).toLocaleString()}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          )}
          {buyDataStep === 3 && (
            <div>
              <button onClick={() => setBuyDataStep(2)} style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: T.font, fontWeight: 600, fontSize: 13, color: T.blue, background: "none", border: "none", cursor: "pointer", marginBottom: 20, padding: 0 }}>
                <ChevronLeft size={16} /> Back
              </button>
              {selectedPlan && (
                <div style={{ background: "rgba(37,99,235,0.08)", border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 16px", marginBottom: 20, display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ fontFamily: T.font, fontWeight: 700, fontSize: 14, color: T.blue, margin: "0 0 2px" }}>{selectedPlan.sizeLabel}</p>
                    <p style={{ fontFamily: T.font, fontSize: 12, color: T.textDim, margin: 0 }}>{selectedPlan.validity}</p>
                  </div>
                  <p style={{ fontFamily: T.mono, fontWeight: 800, fontSize: 16, color: T.blue, margin: 0 }}>{getPriceForTier(selectedPlan, user.tier).toLocaleString()}</p>
                </div>
              )}
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontFamily: T.font, fontSize: 11, color: T.textDim, margin: "0 0 8px", fontWeight: 600, textTransform: "uppercase" }}>Phone Number</p>
                <input type="tel" maxLength={11} placeholder="08012345678" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))} style={{ width: "100%", padding: "11px 12px", borderRadius: 10, background: T.surface, border: `1px solid ${T.border}`, fontFamily: T.mono, fontSize: 14, color: T.text, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontFamily: T.font, fontSize: 11, color: T.textDim, margin: "0 0 8px", fontWeight: 600, textTransform: "uppercase" }}>Transaction PIN</p>
                <div style={{ display: "flex", gap: 6 }}>
                  {pin.map((d, i) => (
                    <input key={i} id={`p${i}`} type="password" maxLength={1} value={d} onChange={(e) => { const np = [...pin]; np[i] = e.target.value; setPin(np); if (e.target.value && i < 5) document.getElementById(`p${i + 1}`)?.focus(); }} style={{ flex: 1, padding: "10px 0", textAlign: "center", borderRadius: 10, background: d ? "rgba(37,99,235,0.1)" : T.surface, border: `1px solid ${d ? T.blue : T.border}`, fontFamily: T.mono, fontSize: 16, color: T.text, outline: "none", transition: "all 0.15s" }} />
                  ))}
                </div>
              </div>
              <motion.button whileTap={{ scale: 0.98 }} onClick={handlePurchaseData} disabled={purchasingData} style={{ width: "100%", padding: "12px", borderRadius: 12, background: purchasingData ? T.border : T.blue, border: "none", fontFamily: T.font, fontWeight: 700, fontSize: 14, color: "#fff", cursor: purchasingData ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {purchasingData ? <><Loader2 size={16} className="animate-spin" /> Processing</> : "Confirm Purchase"}
              </motion.button>
            </div>
          )}
        </BottomSheet>

        <BottomSheet open={airtimeOpen} onClose={() => setAirtimeOpen(false)} title="Buy Airtime" accentColor={T.green}>
          <p style={{ fontFamily: T.font, fontSize: 13, color: T.textMid, marginBottom: 16 }}>Select network</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
            {NETWORKS.slice(0, 4).map((net) => (
              <NetworkPill key={net.id} net={net} selected={airtimeNetwork === net.id} onSelect={() => setAirtimeNetwork(net.id)} />
            ))}
          </div>

          <p style={{ fontFamily: T.font, fontSize: 11, color: T.textDim, margin: "0 0 10px", fontWeight: 600, textTransform: "uppercase" }}>Amount</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 18 }}>
            {AIRTIME_AMOUNTS.map((amt) => (
              <motion.button key={amt} whileTap={{ scale: 0.95 }} onClick={() => setAirtimeAmount(amt)} style={{ padding: "10px 0", borderRadius: 10, border: `1px solid ${airtimeAmount === amt ? T.green : T.border}`, background: airtimeAmount === amt ? "rgba(16,185,129,0.1)" : T.surface, fontFamily: T.mono, fontWeight: 700, fontSize: 12, color: airtimeAmount === amt ? T.green : T.textMid, cursor: "pointer" }}>
                {amt.toLocaleString()}
              </motion.button>
            ))}
          </div>

          <p style={{ fontFamily: T.font, fontSize: 11, color: T.textDim, margin: "0 0 8px", fontWeight: 600, textTransform: "uppercase" }}>Phone Number</p>
          <input type="tel" maxLength={11} placeholder="08012345678" value={airtimePhone} onChange={(e) => setAirtimePhone(e.target.value.replace(/\D/g, ""))} style={{ width: "100%", padding: "11px 12px", borderRadius: 10, background: T.surface, border: `1px solid ${T.border}`, fontFamily: T.mono, fontSize: 14, color: T.text, outline: "none", boxSizing: "border-box", marginBottom: 18 }} />

          <motion.button whileTap={{ scale: 0.98 }} onClick={handlePurchaseAirtime} disabled={purchasingAirtime} style={{ width: "100%", padding: "12px", borderRadius: 12, background: purchasingAirtime ? T.border : T.green, border: "none", fontFamily: T.font, fontWeight: 700, fontSize: 14, color: "#fff", cursor: purchasingAirtime ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {purchasingAirtime ? <><Loader2 size={16} className="animate-spin" /> Processing</> : "Buy Airtime"}
          </motion.button>
        </BottomSheet>
      </div>
    </>
  );
}
