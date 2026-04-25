"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import {
  Wifi, Phone, Tv, Zap, BookOpen, Home, History, Settings as SettingsIcon,
  Eye, EyeOff, Copy, Loader2, ChevronRight, X, ArrowLeft, Check, Mail, Landmark, Megaphone, Gift,
} from "lucide-react";
import { toast } from "sonner";
import PinInput from "@/components/PinInput";
import SuccessCheck from "@/components/SuccessCheck";
import EnhancedSettingsPanel from "@/components/EnhancedSettingsPanel";
import RewardsPanel from "@/components/RewardsPanel";

// ---
const T = {
  // Backgrounds
  bg:        "#f5f5f7",
  bgCard:    "#ffffff",
  bgElevated:"#fbfbfd",
  bgGlass:   "rgba(255,255,255,0.72)",

  // Brand
  blue:      "#0071E3",
  blueMid:   "#5E5CE6",
  blueLight: "#4DA3FF",
  violet:    "#7C3AED",
  cyan:      "#06B6D4",

  // Text
  textPrimary:   "#111827",
  textSecondary: "#4B5563",
  textMuted:     "#8A8A8F",

  // Borders
  border:      "rgba(15,23,42,0.08)",
  borderStrong:"rgba(15,23,42,0.14)",

  // Depth
  shadowSoft:  "0 10px 30px rgba(15,23,42,0.06)",
  shadowCard:  "0 18px 44px rgba(15,23,42,0.08)",
  shadowFloat: "0 26px 60px rgba(0,113,227,0.14)",
  scrim:       "rgba(244,246,251,0.78)",

  // Status
  green:  "#16A34A",
  red:    "#DC2626",
  amber:  "#D97706",

  // Service accent palette
  services: {
    data:        { icon: "#0071E3", glow: "rgba(0,113,227,0.18)",  bg: "rgba(0,113,227,0.09)"  },
    airtime:     { icon: "#FF3B30", glow: "rgba(255,59,48,0.16)",  bg: "rgba(255,59,48,0.08)"  },
    cable:       { icon: "#5E5CE6", glow: "rgba(94,92,230,0.18)",  bg: "rgba(94,92,230,0.08)"  },
    electricity: { icon: "#FF9F0A", glow: "rgba(255,159,10,0.18)", bg: "rgba(255,159,10,0.08)" },
    exampin:     { icon: "#34C759", glow: "rgba(52,199,89,0.18)",  bg: "rgba(52,199,89,0.08)"  },
    contact:     { icon: "#06B6D4", glow: "rgba(6,182,212,0.16)",  bg: "rgba(6,182,212,0.08)"  },
  },
};

const font = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Helvetica, Arial, sans-serif';

// ---
interface User {
  id: string;
  fullName: string;
  phone: string;
  balance: number;
  rewardBalance: number;
  tier: "user" | "agent";
  accountNumber?: string;
  bankName?: string;
  accountName?: string;
}

interface RewardSummaryItem {
  id: string;
  title: string;
  description?: string | null;
  rewardAmount: number;
  thresholdAmount?: number | null;
  claimedAt?: string | null;
  createdAt?: string;
}

interface RewardProgressItem {
  code: string;
  title: string;
  description?: string | null;
  thresholdAmount: number;
  rewardAmount: number;
  currentAmount: number;
  percentage: number;
  remainingAmount: number;
}

interface RewardsDashboard {
  rewardBalance: number;
  availableRewards: RewardSummaryItem[];
  claimedRewards: RewardSummaryItem[];
  progress: RewardProgressItem[];
  stats: {
    maxDeposit: number;
    totalAvailableAmount: number;
    totalClaimedAmount: number;
    totalClaimedCount: number;
  };
}

interface ReservedAccount {
  id: string;
  providerReference?: string | null;
  accountNumber: string;
  accountName?: string | null;
  bankName?: string | null;
  bankId: string;
  isPrimary: boolean;
  createdAt?: string | null;
}

interface BroadcastMessage {
  id: string;
  message: string;
  createdAt: string;
}

interface AirtimeNetwork {
  id: number;
  name: string;
  prefix: RegExp;
  color: string;
  hexColor: string;
}

const VALIDITY_SECTIONS = [
  { key: "daily", label: "Daily Plans" },
  { key: "weekly", label: "Weekly Plans" },
  { key: "monthly", label: "Monthly Plans" },
] as const;

const normalizeValidity = (value: string | null | undefined) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "daily";
  if (raw === "daily" || raw.includes("day") || raw.includes("24hr")) return "daily";
  if (raw === "weekly" || raw.includes("week") || raw.includes("7 days")) return "weekly";
  if (raw === "monthly" || raw.includes("month") || raw.includes("30 days")) return "monthly";
  return raw;
};

const formatValidityLabel = (value: string | null | undefined) => {
  const normalized = normalizeValidity(value);
  if (normalized === "daily") return "Daily";
  if (normalized === "weekly") return "Weekly";
  if (normalized === "monthly") return "Monthly";
  return String(value || "");
};

const detectDataNetworkId = (msisdn: string): number | null => {
  if (!msisdn || msisdn.length < 4) return null;
  const prefix = msisdn.slice(0, 4);

  // Matches /api/data/networks ids: 1=MTN, 2=Glo, 3=9mobile, 4=Airtel.
  const MTN = /^(0803|0806|0703|0706|0810|0813|0814|0816|0903|0906|0913|0916)/;
  const GLO = /^(0805|0807|0811|0815|0705|0905|0915)/;
  const NINEMOBILE = /^(0809|0817|0818|0908|0909)/;
  const AIRTEL = /^(0801|0802|0808|0812|0701|0708|0902|0904|0907|0912)/;

  if (MTN.test(prefix)) return 1;
  if (GLO.test(prefix)) return 2;
  if (NINEMOBILE.test(prefix)) return 3;
  if (AIRTEL.test(prefix)) return 4;
  return null;
};

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

const formatMoney = (value: number) =>
  value.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const ACCOUNT_SERVICES = [
  { id: "accounts",     label: "Accounts",      icon: Landmark },
  { id: "rewards",      label: "Rewards",       icon: Gift },
  { id: "transactions", label: "Transactions",  icon: History },
  { id: "settings",    label: "Settings",       icon: SettingsIcon },
];

const SUPPORT_PHONE = "09000000000";
const SUPPORT_LOCATION = "Damaturu, Yobe State";
const ANJAL_URL = "https://anjalventures.com";

// ---
export default function TwoGoDataApp() {
  const router = useRouter();
  const [user, setUser]                         = useState<User | null>(null);
  const [activeTab, setActiveTab]               = useState("home");
  const [balanceVisible, setBalanceVisible]     = useState(true);
  const [loading, setLoading]                   = useState(true);
  const [transactions, setTransactions]         = useState<any[]>([]);
  const [accounts, setAccounts]                 = useState<ReservedAccount[]>([]);
  const [accountsLoading, setAccountsLoading]   = useState(false);
  const [creatingVirtualAccount, setCreatingVirtualAccount] = useState(false);
  const [rewards, setRewards]                   = useState<RewardsDashboard | null>(null);
  const [rewardsLoading, setRewardsLoading]     = useState(false);
  const [claimingRewards, setClaimingRewards]   = useState(false);
  const [broadcasts, setBroadcasts]             = useState<BroadcastMessage[]>([]);
  const [broadcastsLoading, setBroadcastsLoading] = useState(false);
  const [dismissingBroadcastId, setDismissingBroadcastId] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal]         = useState(false);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [showPinChangeModal, setShowPinChangeModal]       = useState(false);
  const [pinChangeLoading, setPinChangeLoading]           = useState(false);
  const [pinForm, setPinForm]                             = useState({ oldPin: "", newPin: "", confirmPin: "" });
  const [pinError, setPinError]                           = useState("");

  // Buy-Data Flow State
  const [buyDataStage, setBuyDataStage] = useState(1);
  const [networks, setNetworks] = useState<any[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<any | null>(null);
  const [phone, setPhone] = useState("");
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [pinInput, setPinInput] = useState(["", "", "", "", "", ""]);
  const [buyDataLoading, setBuyDataLoading] = useState(false);
  const [buyDataError, setBuyDataError] = useState("");
  const [successData, setSuccessData] = useState<any | null>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  // Buy-Airtime Flow State
  const [buyAirtimeStage, setBuyAirtimeStage] = useState(1);
  const [airtimeNetwork, setAirtimeNetwork] = useState<AirtimeNetwork | null>(null);
  const [airtimePhone, setAirtimePhone] = useState("");
  const [airtimeAmount, setAirtimeAmount] = useState("");
  const [airtimePinInput, setAirtimePinInput] = useState(["", "", "", "", "", ""]);
  const [buyAirtimeLoading, setBuyAirtimeLoading] = useState(false);
  const [buyAirtimeError, setBuyAirtimeError] = useState("");
  const [airtimeSuccessData, setAirtimeSuccessData] = useState<any | null>(null);
  const [showNetworkWarning, setShowNetworkWarning] = useState(false);
  const airtimePhoneInputRef = useRef<HTMLInputElement>(null);

  // Buy-Cable Flow State
  const [buyCableStage, setBuyCableStage] = useState(1);
  const [cableProvider, setCableProvider] = useState<any | null>(null);
  const [smartCardNumber, setSmartCardNumber] = useState("");
  const [cablePlans, setCablePlans] = useState<any[]>([]);
  const [selectedCablePlan, setSelectedCablePlan] = useState<any | null>(null);
  const [cablePinInput, setCablePinInput] = useState(["", "", "", "", "", ""]);
  const [buyCableLoading, setBuyCableLoading] = useState(false);
  const [buyCableError, setBuyCableError] = useState("");
  const [cableSuccessData, setCableSuccessData] = useState<any | null>(null);

  // Buy-Power Flow State
  const [buyPowerStage, setBuyPowerStage] = useState(1);
  const [meterType, setMeterType] = useState<"PREPAID" | "POSTPAID" | null>(null);
  const [meterNumber, setMeterNumber] = useState("");
  const [powerProvider, setPowerProvider] = useState<any | null>(null);
  const [powerPlans, setPowerPlans] = useState<any[]>([]);
  const [selectedPowerPlan, setSelectedPowerPlan] = useState<any | null>(null);
  const [powerPinInput, setPowerPinInput] = useState(["", "", "", "", "", ""]);
  const [buyPowerLoading, setBuyPowerLoading] = useState(false);
  const [buyPowerError, setBuyPowerError] = useState("");
  const [powerSuccessData, setPowerSuccessData] = useState<any | null>(null);

  // ---
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (!res.ok) return router.push("/app/auth");
        const data = await res.json();
        setUser(data);
        toast.success(`Welcome, ${data.fullName.split(" ")[0]}!`);
      } catch {
        router.push("/app/auth");
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  // ---
  useEffect(() => {
    if (activeTab !== "home" || !user) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
      } catch (error) {
        // Silent fail on refresh - don't show errors
      }
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [activeTab, user]);

  useEffect(() => {
    if (!showTransactionsModal) return;
    (async () => {
      try {
        const res = await fetch("/api/transactions", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setTransactions(Array.isArray(data.transactions) ? data.transactions : []);
        }
      } catch {}
    })();
  }, [showTransactionsModal]);

  const fetchBroadcasts = async () => {
    try {
      setBroadcastsLoading(true);
      const res = await fetch("/api/broadcasts", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch broadcasts");
      const data = await res.json();
      setBroadcasts(Array.isArray(data.broadcasts) ? data.broadcasts : []);
    } catch {
      setBroadcasts([]);
    } finally {
      setBroadcastsLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      setAccountsLoading(true);
      const res = await fetch("/api/accounts", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch accounts");
      const data = await res.json();
      setAccounts(Array.isArray(data.accounts) ? data.accounts : []);
    } catch {
      toast.error("Failed to load reserved accounts");
      setAccounts([]);
    } finally {
      setAccountsLoading(false);
    }
  };

  const fetchRewards = async () => {
    try {
      setRewardsLoading(true);
      const res = await fetch("/api/rewards", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch rewards");
      const data = await res.json();
      setRewards(data);
    } catch {
      toast.error("Failed to load rewards");
      setRewards(null);
    } finally {
      setRewardsLoading(false);
    }
  };

  const claimRewards = async (rewardIds?: string[]) => {
    try {
      setClaimingRewards(true);
      const res = await fetch("/api/rewards/claim", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rewardIds?.length ? { rewardIds } : {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to claim rewards");
      if (data.dashboard) {
        setRewards(data.dashboard);
      } else {
        await fetchRewards();
      }
      const meRes = await fetch("/api/auth/me", { credentials: "include" });
      if (meRes.ok) {
        const me = await meRes.json();
        setUser(me);
      }
      toast.success(data.message || "Rewards claimed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to claim rewards");
    } finally {
      setClaimingRewards(false);
    }
  };

  const createVirtualAccount = async () => {
    try {
      setCreatingVirtualAccount(true);
      const res = await fetch("/api/accounts", { method: "POST", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to create virtual account");

      if (Array.isArray(data.accounts)) setAccounts(data.accounts);
      toast.success(data.message || "Virtual account created");

      // Refresh wallet card details.
      const meRes = await fetch("/api/auth/me", { credentials: "include" });
      if (meRes.ok) {
        const me = await meRes.json();
        setUser(me);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create virtual account");
    } finally {
      setCreatingVirtualAccount(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchBroadcasts();
  }, [user?.id]);

  useEffect(() => {
    if (activeTab !== "accounts") return;
    fetchAccounts();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "rewards") return;
    fetchRewards();
  }, [activeTab]);

  // Load networks when data tab is accessed
  useEffect(() => {
    if (activeTab !== "data") return;

    if (networks.length === 0) {
      (async () => {
        try {
          const res = await fetch("/api/data/networks");
          if (res.ok) {
            const data = await res.json();
            setNetworks(data);
          }
        } catch (error) {
          toast.error("Failed to load networks");
        }
      })();
    }
  }, [activeTab, networks.length]);

  // ---
  // CRITICAL: NO CACHING - Always fetch plans fresh from database
  // ---
  useEffect(() => {
    // Clear plans if not in plan-loading stage
    if (buyDataStage !== 2) {
      if (plans.length > 0) setPlans([]);
      return;
    }

    // Must have network selected
    if (!selectedNetwork) {
      if (plans.length > 0) setPlans([]);
      return;
    }

    // ALWAYS FETCH FRESH - NO CACHING (add timestamp to bust cache)
    setBuyDataLoading(true);
    (async () => {
      try {
        const timestamp = Date.now();
        const url = `/api/data/plans?networkId=${selectedNetwork.id}&t=${timestamp}`;
        
        const res = await fetch(url, {
          cache: 'no-store',  // Disable Next.js caching
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        });

        if (!res.ok) throw new Error("Failed to fetch plans");
        
        const data = await res.json();
        
        // Deduplicate plans
        const uniquePlans = Array.isArray(data) 
          ? data.reduce((unique: any[], plan: any) => {
              const isDuplicate = unique.some(
                (p) => 
                  p.networkId === plan.networkId &&
                  p.sizeLabel === plan.sizeLabel &&
                  normalizeValidity(p.validity) === normalizeValidity(plan.validity) &&
                  p.price === plan.price
              );
              return isDuplicate
                ? unique
                : [...unique, { ...plan, validity: normalizeValidity(plan.validity) }];
            }, [])
          : [];
        
        setPlans(uniquePlans);
      } catch (error) {
        toast.error("Couldn't load plans. Check your connection.");
        setBuyDataStage(1);
        setPlans([]);
      } finally {
        setBuyDataLoading(false);
      }
    })();
  }, [buyDataStage, selectedNetwork?.id]);

  // Load cable plans when buying cable
  useEffect(() => {
    if (buyCableStage !== 2 || cablePlans.length > 0 || !cableProvider) return;

    (async () => {
      setBuyCableLoading(true);
      try {
        const res = await fetch(`/api/admin/cable/plans?provider=${cableProvider.id}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setCablePlans(Array.isArray(data) ? data : data.plans || []);
      } catch {
        toast.error("Couldn't load cable plans. Check your connection.");
        setBuyCableStage(1);
      } finally {
        setBuyCableLoading(false);
      }
    })();
  }, [buyCableStage, cableProvider, cablePlans.length]);

  // Load power plans when buying power
  useEffect(() => {
    if (buyPowerStage !== 3 || powerPlans.length > 0 || !powerProvider) return;

    (async () => {
      setBuyPowerLoading(true);
      try {
        const res = await fetch(`/api/admin/power/plans?provider=${powerProvider.id}&meterType=${meterType}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setPowerPlans(Array.isArray(data) ? data : data.plans || []);
      } catch {
        toast.error("Couldn't load power plans. Check your connection.");
        setBuyPowerStage(2);
      } finally {
        setBuyPowerLoading(false);
      }
    })();
  }, [buyPowerStage, powerProvider, meterType, powerPlans.length]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      router.push("/app/auth");
    } catch {
      toast.error("Logout failed");
    }
  };

  const dismissBroadcast = async (broadcastId: string) => {
    try {
      setDismissingBroadcastId(broadcastId);
      const res = await fetch(`/api/broadcasts/${broadcastId}/dismiss`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to dismiss broadcast");
      setBroadcasts((current) => current.filter((item) => item.id !== broadcastId));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to dismiss broadcast");
    } finally {
      setDismissingBroadcastId(null);
    }
  };

  // ---
  if (loading || !user) {
    return (
      <div style={{
        background: T.bg, minHeight: "100vh",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 20,
        fontFamily: font,
      }}>
        {/* Pulsing brand circle */}
        <div
          style={{
            width: 80, height: 80, borderRadius: 24,
            background: `linear-gradient(135deg, ${T.blue}, ${T.violet})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 40px ${T.services.data.glow}`,
            animation: "pulse 1.8s ease-in-out infinite",
          }}
        >
          <Loader2 size={36} color="white" style={{ animation: "spin 1s linear infinite" }} />
        </div>
        <p style={{ color: T.textSecondary, fontSize: 14, margin: 0, fontFamily: font }}>
          Securing your session...
        </p>
      </div>
    );
  }

  const SERVICES = [
    { id: "data",        label: "Data",        icon: Wifi,     sc: T.services.data        },
    { id: "airtime",     label: "Airtime",      icon: Phone,    sc: T.services.airtime     },
    { id: "cable",       label: "Cable TV",     icon: Tv,       sc: T.services.cable       },
    { id: "electricity", label: "Power",        icon: Zap,      sc: T.services.electricity },
    { id: "exampin",     label: "Exams",        icon: BookOpen, sc: T.services.exampin     },
    { id: "contact",     label: "Support",      icon: Mail,     sc: T.services.contact     },
  ];

  const NAV = [
    { id: "home",         icon: Home,           label: "Home"         },
    { id: "rewards",      icon: Gift,           label: "Rewards"      },
    { id: "accounts",     icon: Landmark,       label: "Accounts"     },
    { id: "transactions", icon: History,         label: "Transactions" },
    { id: "settings",     icon: SettingsIcon,    label: "Settings"     },
  ];

  // ---

  // Modal wrapper
  const Modal = ({
    show, onClose, children,
  }: { show: boolean; onClose: () => void; children: React.ReactNode }) => (
    <>
      {show && (
        <div
          onClick={onClose}
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: T.scrim, backdropFilter: "blur(18px)",
            display: "flex", alignItems: "flex-end",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: T.bgCard,
              border: `1px solid ${T.borderStrong}`,
              borderRadius: "28px 28px 0 0",
              padding: "32px 20px calc(env(safe-area-inset-bottom, 16px) + 24px)",
              width: "100%",
              maxHeight: "88vh",
              overflowY: "auto",
              fontFamily: font,
            }}
          >
            {children}
          </div>
        </div>
      )}
    </>
  );

  // Modal header row
  const ModalHeader = ({ title, onClose }: { title: string; onClose: () => void }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: T.textPrimary, letterSpacing: "-0.5px" }}>
        {title}
      </h2>
      <button
        onClick={onClose}
        style={{
          background: T.bgElevated, border: `1px solid ${T.border}`,
          borderRadius: 12, width: 38, height: 38,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: T.textSecondary,
        }}
      >
        <X size={18} />
      </button>
    </div>
  );

  // Coming-soon view for service tabs
  const ComingSoon = ({
    icon: Icon, label, color,
  }: { icon: any; label: string; color: string }) => (
    <div
      style={{ padding: "20px 20px 120px", fontFamily: font }}
    >
      <button
        onClick={() => setActiveTab("home")}
        style={{
          background: T.bgElevated, border: `1px solid ${T.border}`,
          borderRadius: 12, padding: "10px 16px",
          display: "flex", alignItems: "center", gap: 8,
          color: T.blue, fontSize: 14, fontWeight: 600,
          cursor: "pointer", marginBottom: 40, fontFamily: font,
        }}
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <div
          style={{
            width: 96, height: 96, borderRadius: 28, margin: "0 auto 32px",
            background: `radial-gradient(circle, ${color}22, ${color}08)`,
            border: `1.5px solid ${color}33`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 40px ${color}22`,
            animation: "pulse 2.5s ease-in-out infinite",
          }}
        >
          <Icon size={44} color={color} strokeWidth={1.5} />
        </div>
        <h2 style={{
          margin: "0 0 12px", fontSize: 26, fontWeight: 800,
          color: T.textPrimary, letterSpacing: "-0.6px",
        }}>
          {label} Coming Soon
        </h2>
        <p style={{
          margin: 0, fontSize: 15, color: T.textSecondary, lineHeight: 1.6, maxWidth: 280, marginInline: "auto",
        }}>
          We're crafting something exceptional. Check back shortly!
        </p>
        <div style={{
          marginTop: 40, display: "inline-flex", alignItems: "center", gap: 8,
          background: T.bgElevated, border: `1px solid ${T.border}`,
          borderRadius: 100, padding: "10px 20px",
        }}>
          <div
            style={{ width: 8, height: 8, borderRadius: "50%", background: color, animation: "pulse 1.5s ease-in-out infinite" }}
          />
          <span style={{ fontSize: 13, color: T.textSecondary, fontWeight: 600 }}>In development</span>
        </div>
      </div>
    </div>
  );

  // ---
  // never unmounts/remounts it on parent re-renders, keeping the keyboard alive.
  // The plans-loading useEffect has been moved up to TwoGoDataApp above.
  const BuyDataCard = () => {
    // Progress indicator component
    const ProgressIndicator = () => (
      <div style={{
        display: "flex", gap: 6, justifyContent: "center", marginBottom: 24,
      }}>
        {[1, 2, 3, 4].map((stage) => (
          <div
            key={stage}
            style={{
              width: 8, height: 8, borderRadius: "50%",
              background: stage < buyDataStage ? T.blue : stage === buyDataStage ? T.blue : T.border,
              cursor: "pointer", opacity: stage <= buyDataStage ? 1 : 0.3,
              transform: stage === buyDataStage ? "scale(1.2)" : "scale(1)",
              transition: "all 0.2s ease-out",
            }}
            onClick={() => {
              if (stage < buyDataStage) setBuyDataStage(stage);
            }}
            aria-label={`Step ${stage} of 4`}
          />
        ))}
      </div>
    );

    // Skeleton loader for plan cards
    const PlanSkeleton = () => (
      <div
        style={{
          padding: 16,
          borderRadius: 16,
          background: T.bgElevated,
          border: `1px solid ${T.border}`,
          height: 100,
          animation: "pulse 1.5s ease-in-out infinite",
        }}
      />
    );

    // Stage 1: Network + Phone Input
    if (buyDataStage === 1) {
      const phoneIsValid = phone.length === 11 && /^\d{11}$/.test(phone);
      const canContinue = selectedNetwork !== null && phoneIsValid;
      const detectedNetworkName = networks.find((n) => n.id === detectDataNetworkId(phone))?.name;

      return (
        <div
          style={{
            padding: "20px 20px 120px",
            fontFamily: font,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <ProgressIndicator />

          <h2 style={{
            margin: "0 0 20px", fontSize: 22, fontWeight: 800,
            color: T.textPrimary, letterSpacing: "-0.5px",
          }}>
            Select Network
          </h2>

          {/* Network selector - 2x2 grid */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28,
          }}>
            {networks.map((net) => {
              const isSelected = selectedNetwork?.id === net.id;
              return (
                <button
                  key={net.id}
                  onClick={() => setSelectedNetwork(net)}
                  style={{
                    position: "relative",
                    padding: 16,
                    borderRadius: 20,
                    background: isSelected
                      ? "linear-gradient(135deg, rgba(0,113,227,0.14), rgba(255,255,255,0.98))"
                      : "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(251,251,253,0.94))",
                    border: `1.5px solid ${isSelected ? "rgba(0,113,227,0.30)" : T.border}`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    transition: "all 150ms ease",
                    fontFamily: font,
                    boxShadow: isSelected ? "0 18px 34px rgba(0,113,227,0.12)" : "none",
                  }}
                  role="radio"
                  aria-checked={isSelected}
                >
                  <div style={{ position: "relative", width: 28, height: 28 }}>
                    <Image
                      src={net.logo}
                      alt={net.name}
                      fill
                      className="object-contain"
                      sizes="28px"
                      priority
                      onError={(e) => {
                        // Fallback if image fails to load
                        (e.target as any).style.display = "none";
                      }}
                    />
                  </div>
                  <span style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: T.textPrimary,
                    textAlign: "center",
                  }}>
                    {net.name}
                  </span>

                  {/* Checkmark badge */}
                  {isSelected && (
                    <div
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background: T.blue,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Check size={14} color="#fff" strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <h2 style={{
            margin: "0 0 16px", fontSize: 16, fontWeight: 700,
            color: T.textPrimary,
          }}>
            Recipient Phone Number
          </h2>
          {phone.length >= 4 && detectedNetworkName && (
            <div style={{
              margin: "-8px 0 16px",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.88)",
              border: `1px solid ${T.border}`,
              fontSize: 12,
              color: T.textSecondary,
              fontWeight: 700,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: T.green }} />
              Detected network: {detectedNetworkName}
            </div>
          )}

          {/* Phone input with counter */}
          <div style={{ position: "relative", marginBottom: 24 }}>
            <input
              ref={phoneInputRef}
              type="tel"
              inputMode="numeric"
              maxLength={11}
              placeholder="e.g. 08012345678"
              value={phone}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
                setPhone(digits);

                const detectedId = detectDataNetworkId(digits);
                if (detectedId) {
                  const detectedNet = networks.find((n) => n.id === detectedId) || null;
                  if (detectedNet && detectedNet.id !== selectedNetwork?.id) {
                    setSelectedNetwork(detectedNet);
                  }
                }
              }}
              onKeyDown={(e) => {
                const isDigit = /^\d$/.test(e.key);
                const isControlKey = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key);
                
                if (!isDigit && !isControlKey && e.key !== "Enter" && !e.ctrlKey && !e.metaKey) {
                  e.preventDefault();
                }
              }}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              style={{
                width: "100%",
                padding: "12px 40px 12px 14px",
                borderRadius: 12,
                background: T.bgCard,
                border: `1.5px solid ${phoneIsValid ? T.green : T.border}`,
                color: T.textPrimary,
                fontSize: 16,
                fontFamily: font,
                boxSizing: "border-box",
                transition: "all 150ms ease",
              }}
            />

            {/* Checkmark icon when valid */}
            <div
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                opacity: phoneIsValid ? 1 : 0,
                transition: "opacity 150ms ease",
                pointerEvents: phoneIsValid ? "auto" : "none",
              }}
            >
              <Check size={20} color={T.green} strokeWidth={3} />
            </div>

            {/* Character counter */}
            <div style={{
              fontSize: 12,
              color: phoneIsValid ? T.green : T.textMuted,
              textAlign: "right",
              marginTop: 6,
              fontWeight: 500,
              transition: "color 150ms ease",
            }}>
              {phone.length}/11
            </div>
          </div>

          {/* Continue button */}
          <button
            onClick={() => canContinue && setBuyDataStage(2)}
            disabled={!canContinue}
            style={{
              width: "100%",
              padding: 14,
              borderRadius: 12,
              background: canContinue ? T.blue : T.bgElevated,
              border: `1.5px solid ${canContinue ? T.blue : T.border}`,
              color: canContinue ? "#fff" : T.textMuted,
              fontSize: 16,
              fontWeight: 600,
              cursor: canContinue ? "pointer" : "not-allowed",
              opacity: canContinue ? 1 : 0.5,
              fontFamily: font,
              transition: "all 150ms ease",
            }}
            aria-disabled={!canContinue}
          >
            Continue
          </button>
        </div>
      );
    }

    // Stage 2: Plan Selection
    if (buyDataStage === 2) {
      return (
        <div
          style={{
            padding: "20px 20px 120px",
            fontFamily: font,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <ProgressIndicator />

          {/* Back button */}
          <button
            onClick={() => setBuyDataStage(1)}
            style={{
              background: T.bgElevated,
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: T.blue,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: 24,
              fontFamily: font,
            }}
          >
            <ArrowLeft size={16} /> Back
          </button>

          <h2 style={{
            margin: "0 0 20px",
            fontSize: 22,
            fontWeight: 800,
            color: T.textPrimary,
            letterSpacing: "-0.5px",
          }}>
            Select Plan
          </h2>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 18,
              padding: "14px 16px",
              borderRadius: 18,
              background: T.bgElevated,
              border: `1px solid ${T.border}`,
            }}
          >
            <div>
              <div style={{ fontSize: 12, color: T.textMuted, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
                Shopping for
              </div>
              <div style={{ fontSize: 15, color: T.textPrimary, fontWeight: 700 }}>
                {selectedNetwork?.name} • {phone}
              </div>
            </div>
            <div style={{ fontSize: 12, color: T.textSecondary, fontWeight: 700 }}>
              {plans.length} plan{plans.length === 1 ? "" : "s"}
            </div>
          </div>

          {buyDataLoading ? (
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}>
              {[...Array(4)].map((_, i) => (
                <PlanSkeleton key={i} />
              ))}
            </div>
          ) : plans.length === 0 ? (
            <div style={{
              textAlign: "center",
              padding: "60px 20px",
              color: T.textSecondary,
            }}>
              <svg
                width="80"
                height="80"
                viewBox="0 0 80 80"
                fill="none"
                style={{ margin: "0 auto 16px", opacity: 0.5 }}
              >
                <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="2" />
                <path d="M 30 35 L 50 45 L 30 55" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
              </svg>
              <p style={{ fontSize: 15, margin: "0 0 8px", fontWeight: 500 }}>
                No plans available
              </p>
              <p style={{ fontSize: 13, margin: 0, color: T.textMuted }}>
                for {selectedNetwork?.name} right now.
              </p>
            </div>
                    ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {VALIDITY_SECTIONS.map((section) => {
                const sectionPlans = plans.filter(
                  (plan) => normalizeValidity(plan.validity) === section.key
                );

                if (sectionPlans.length === 0) return null;

                return (
                  <div key={section.key} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{
                      fontSize: 13,
                      fontWeight: 800,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      color: T.textSecondary,
                    }}>
                      {section.label}
                    </div>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                    }}>
                      {sectionPlans.map((plan) => (
                        <button
                          key={plan.id}
                          onClick={() => {
                            setSelectedPlan(plan);
                            setBuyDataStage(3);
                          }}
                          style={{
                            padding: 16,
                            borderRadius: 20,
                            background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.95))",
                            border: `1.5px solid ${T.border}`,
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                            cursor: "pointer",
                            transition: "all 150ms ease",
                            fontFamily: font,
                            textAlign: "left",
                            boxShadow: "0 8px 18px rgba(15,23,42,0.04)",
                          }}
                          role="radio"
                        >
                          <div style={{
                            fontSize: 16,
                            fontWeight: 800,
                            color: T.textPrimary,
                            letterSpacing: "-0.3px",
                          }}>
                            {plan.sizeLabel}
                          </div>
                          <div style={{
                            fontSize: 12,
                            color: T.textMuted,
                            fontWeight: 500,
                          }}>
                            {formatValidityLabel(plan.validity)}
                          </div>
                          <div style={{
                            fontSize: 18,
                            fontWeight: 700,
                            color: T.blue,
                            marginTop: 4,
                          }}>
                            ₦{(plan.price || 0).toLocaleString()}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // Stage 3: PIN Confirmation & Summary
    if (buyDataStage === 3) {
      const pinFull = pinInput.every((d) => d !== "");

      const handlePinSubmit = async () => {
        if (!pinFull) return;

        setBuyDataLoading(true);
        setBuyDataError("");

        try {
          // Validate PIN
          const validateRes = await fetch("/api/data/validate-pin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ pin: pinInput.join("") }),
          });

          if (!validateRes.ok) {
            const error = await validateRes.json();
            setBuyDataError(error.error || "Incorrect PIN. Please try again.");
            setPinInput(["", "", "", "", "", ""]);
            setBuyDataLoading(false);
            return;
          }

          // PIN valid, now purchase
          const purchaseRes = await fetch("/api/data/purchase", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              planId: selectedPlan.id,
              phone,
              pin: pinInput.join(""),
            }),
          });

          if (!purchaseRes.ok) {
            const error = await purchaseRes.json();
            if (error.error?.includes("Insufficient balance")) {
              setBuyDataError("Insufficient balance. Please fund your wallet.");
            } else if (error.error?.includes("refunded")) {
              toast.error("Delivery failed. Your balance has been refunded.");
              setBuyDataError("Delivery failed. Your balance has been refunded.");
            } else {
              toast.error("Something went wrong. Please try again.");
              setBuyDataError(error.error || "Purchase failed");
            }
            setPinInput(["", "", "", "", "", ""]);
            setBuyDataLoading(false);
            return;
          }

          const data = await purchaseRes.json();
          toast.success(`₦${(data.amount || 0).toLocaleString()} - ${selectedPlan.sizeLabel} sent to ${phone} `);
          setSuccessData(data);
          setPinInput(["", "", "", "", "", ""]);
          setBuyDataStage(4);
        } catch (error: any) {
          toast.error("Something went wrong. Please try again.");
          setBuyDataError(error.message || "An error occurred");
          setPinInput(["", "", "", "", "", ""]);
        } finally {
          setBuyDataLoading(false);
        }
      };

      return (
        <div
          style={{
            padding: "20px 20px 120px",
            fontFamily: font,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <ProgressIndicator />

          {/* Back button */}
          <button
            onClick={() => {
              setBuyDataStage(2);
              setPinInput(["", "", "", "", "", ""]);
              setBuyDataError("");
            }}
            style={{
              background: T.bgElevated,
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: T.blue,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: 24,
              fontFamily: font,
            }}
          >
            <ArrowLeft size={16} /> Back
          </button>

          <h2 style={{
            margin: "0 0 20px",
            fontSize: 22,
            fontWeight: 800,
            color: T.textPrimary,
            letterSpacing: "-0.5px",
          }}>
            Confirm Purchase
          </h2>

          {/* Summary receipt */}
          <div style={{
            background: "linear-gradient(135deg, rgba(0,113,227,0.08), rgba(255,255,255,0.96))",
            borderRadius: 16,
            padding: 16,
            marginBottom: 24,
            border: `1px solid ${T.border}`,
          }}>
            <div style={{ fontSize: 12, color: T.blue, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>
              Final check
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 14 }}>
              <span style={{ color: T.textSecondary, fontWeight: 500 }}>Phone</span>
              <span style={{ color: T.textPrimary, fontWeight: 600 }}>{phone}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 14 }}>
              <span style={{ color: T.textSecondary, fontWeight: 500 }}>Network</span>
              <span style={{ color: T.textPrimary, fontWeight: 600 }}>{selectedNetwork?.name}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 14 }}>
              <span style={{ color: T.textSecondary, fontWeight: 500 }}>Plan</span>
              <span style={{ color: T.textPrimary, fontWeight: 600 }}>{selectedPlan?.sizeLabel}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 14 }}>
              <span style={{ color: T.textSecondary, fontWeight: 500 }}>Validity</span>
              <span style={{ color: T.textPrimary, fontWeight: 600 }}>{formatValidityLabel(selectedPlan?.validity)}</span>
            </div>

            {/* Divider */}
            <div style={{
              height: 1,
              background: T.border,
              margin: "16px 0",
            }} />

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: T.textSecondary, fontWeight: 600, fontSize: 14 }}>Amount</span>
              <span style={{ color: T.green, fontWeight: 700, fontSize: 18 }}>
                ₦{(selectedPlan?.price || 0).toLocaleString()}
              </span>
            </div>
          </div>

          {/* PIN Input */}
          <label style={{
            display: "block",
            fontSize: 14,
            fontWeight: 600,
            color: T.textSecondary,
            marginBottom: 12,
          }}>
            Enter your 6-digit PIN
          </label>

          <div style={{ marginBottom: 16 }}>
            <PinInput
              value={pinInput}
              onChange={setPinInput}
              error={buyDataError.length > 0}
              disabled={buyDataLoading}
              bgColor={T.bgCard}
              bgElevated={T.bgElevated}
              borderColor={T.border}
              borderStrong={T.borderStrong}
              textPrimary={T.textPrimary}
              textSecondary={T.textSecondary}
              errorColor={T.red}
              blueColor={T.blue}
            />
          </div>

          {/* Error display */}
          <div
            style={{
              background: `${T.red}20`,
              border: `1px solid ${T.red}50`,
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
              color: T.red,
              fontSize: 13,
              fontWeight: 500,
              opacity: buyDataError ? 1 : 0,
              maxHeight: buyDataError ? "100%" : "0",
              overflow: "hidden",
              transition: "opacity 150ms ease, max-height 150ms ease",
              pointerEvents: buyDataError ? "auto" : "none",
            }}
            role="alert"
          >
            {buyDataError}
          </div>

          {/* Confirm & Pay button */}
          <button
            onClick={handlePinSubmit}
            disabled={!pinFull || buyDataLoading}
            style={{
              width: "100%",
              padding: 14,
              borderRadius: 12,
              background: pinFull && !buyDataLoading ? T.blue : T.bgElevated,
              border: "none",
              color: "#fff",
              fontSize: 16,
              fontWeight: 600,
              cursor: pinFull && !buyDataLoading ? "pointer" : "not-allowed",
              opacity: pinFull && !buyDataLoading ? 1 : 0.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontFamily: font,
              transition: "all 150ms ease",
            }}
            aria-disabled={!pinFull || buyDataLoading}
          >
            {buyDataLoading && (
              <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            )}
            {buyDataLoading ? "Processing..." : "Confirm & Pay"}
          </button>
        </div>
      );
    }

    // Stage 4: Success
    if (buyDataStage === 4) {
      return (
        <div
          style={{
            padding: "20px 20px 120px",
            fontFamily: font,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <ProgressIndicator />

          <div style={{ textAlign: "center" }}>
            <SuccessCheck greenColor={T.green} size={80} />

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                margin: "14px 0 12px",
                padding: "9px 14px",
                borderRadius: 999,
                background: "rgba(22,163,74,0.10)",
                border: "1px solid rgba(22,163,74,0.16)",
                color: T.green,
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Delivery confirmed
            </div>

            <h2 style={{
              margin: "0 0 12px",
              fontSize: 26,
              fontWeight: 800,
              color: T.textPrimary,
              letterSpacing: "-0.6px",
            }}>
              Data Delivered!
            </h2>
            <p style={{
              margin: "0 0 28px",
              fontSize: 14,
              color: T.textSecondary,
              lineHeight: 1.6,
            }}>
              Your {selectedPlan?.sizeLabel} has been sent to {phone}
            </p>

            {/* Receipt summary */}
            <div style={{
              background: T.bgElevated,
              borderRadius: 16,
              padding: 20,
              marginBottom: 28,
              border: `1px solid ${T.border}`,
              textAlign: "left",
            }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 4, fontWeight: 500 }}>
                  Reference
                </div>
                <div style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: T.textPrimary,
                  fontFamily: "monospace",
                  wordBreak: "break-all",
                }}>
                  {successData?.reference}
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 4, fontWeight: 500 }}>
                  Amount Paid
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: T.green }}>
                  ₦{(successData?.amount || 0).toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 4, fontWeight: 500 }}>
                  Date
                </div>
                <div style={{ fontSize: 14, color: T.textPrimary, fontWeight: 600 }}>
                  {new Date().toLocaleDateString("en-NG", {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </div>
            </div>

            {/* Done button */}
            <button
              onClick={() => {
                setBuyDataStage(1);
                setSelectedNetwork(null);
                setPhone("");
                setSelectedPlan(null);
                setPinInput(["", "", "", "", "", ""]);
                setBuyDataError("");
                setSuccessData(null);
                setPlans([]);
                setActiveTab("home");
              }}
              style={{
                width: "100%",
                padding: 14,
                borderRadius: 12,
                background: T.blue,
                border: "none",
                color: "#fff",
                fontSize: 16,
                fontWeight: 600,
                cursor: "pointer",
                marginBottom: 12,
                fontFamily: font,
              }}
            >
              Done
            </button>

            {/* Buy Again button */}
            <button
              onClick={() => {
                setBuyDataStage(1);
                setSelectedPlan(null);
                setPinInput(["", "", "", "", "", ""]);
                setBuyDataError("");
                setSuccessData(null);
                setPlans([]);
              }}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 12,
                background: "transparent",
                border: `1.5px solid ${T.blue}`,
                color: T.blue,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: font,
              }}
            >
              Buy Again
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  const AIRTIME_NETWORKS: AirtimeNetwork[] = [
    { id: 1, name: "MTN", prefix: /^(0803|0806|0703|0706|0810|0813|0814|0816|0903|0906|0913|0916)/, color: "#FFD700", hexColor: "#ffd700" },
    { id: 2, name: "Airtel", prefix: /^(0801|0802|0808|0812|0701|0708|0902|0904|0907|0912)/, color: "#DC143C", hexColor: "#dc143c" },
    { id: 3, name: "Glo", prefix: /^(0805|0807|0811|0815|0705|0905|0915)/, color: "#228B22", hexColor: "#228b22" },
    { id: 4, name: "9mobile", prefix: /^(0809|0817|0818|0908|0909)/, color: "#006400", hexColor: "#006400" },
  ];

  const CABLE_PROVIDERS = [
    { id: "dstv", name: "DSTV", logo: "" },
    { id: "gotv", name: "GOTV", logo: "" },
    { id: "startimes", name: "Startimes", logo: "" },
  ];

  const POWER_PROVIDERS = [
    { id: "ekedc", name: "EKEDC", logo: "" },
    { id: "ibadanelectricity", name: "Ibadan Electricity", logo: "" },
    { id: "enugu", name: "Enugu Electricity", logo: "" },
    { id: "kano", name: "Kano Electricity", logo: "" },
    { id: "kaduna", name: "Kaduna Electricity", logo: "" },
  ];

  const METER_TYPES = [
    { id: "PREPAID", label: "Prepaid Meter", description: "Buy credit upfront" },
    { id: "POSTPAID", label: "Postpaid Meter", description: "Pay after usage" },
  ];

  const BuyAirtimeCard = () => {
    // Detect which network a phone prefix belongs to
    const detectNetwork = (phone: string) => {
      if (!phone || phone.length < 4) return null;
      const prefix = phone.slice(0, 4);
      return AIRTIME_NETWORKS.find(net => net.prefix.test(prefix)) || null;
    };

    // Progress indicator
    const ProgressIndicator = () => (
      <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 24 }}>
        {[1, 2, 3, 4].map((s) => (
          <div key={s} style={{
            width: 8, height: 8, borderRadius: "50%",
            background: s <= buyAirtimeStage ? T.blue : T.border,
            opacity: s <= buyAirtimeStage ? 1 : 0.3,
            transform: s === buyAirtimeStage ? "scale(1.2)" : "scale(1)",
            transition: "all 0.2s ease-out", cursor: "pointer",
          }} onClick={() => s < buyAirtimeStage && setBuyAirtimeStage(s)} />
        ))}
      </div>
    );

    // STAGE 1: Combined Network + Phone + Amount Selection
    if (buyAirtimeStage === 1) {
      const PRESETS = [50, 100, 200, 500, 1000];
      const phoneValid = airtimePhone.length === 11 && /^0\d{10}$/.test(airtimePhone);
      const amountNum = parseInt(airtimeAmount) || 0;
      const amountValid = amountNum >= 50 && amountNum <= 5000;
      const selectedPreset = PRESETS.includes(amountNum) ? amountNum : null;
      const detectedNet = detectNetwork(airtimePhone);
      const networkMismatch = phoneValid && detectedNet && detectedNet.id !== airtimeNetwork?.id;
      const allValid = airtimeNetwork && phoneValid && amountValid;

      return (
        <div style={{ padding: "20px 20px 120px", fontFamily: font }}>
          <ProgressIndicator />

          <div
            style={{
              padding: 20,
              borderRadius: 24,
              background: "linear-gradient(135deg, rgba(255,59,48,0.10), rgba(255,255,255,0.96) 58%)",
              border: `1px solid ${T.border}`,
              boxShadow: T.shadowSoft,
              marginBottom: 22,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 800, color: "#FF3B30", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
              Airtime Express
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.05em", color: T.textPrimary, marginBottom: 8 }}>
              Pick a line and top up in one sweep.
            </div>
            <div style={{ fontSize: 14, color: T.textSecondary, lineHeight: 1.7 }}>
              Select the network or let the number choose it automatically. Then lock the purchase with your PIN.
            </div>
          </div>

          {/* Network Selection */}
          <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.5px" }}>Network</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 20 }}>
            {AIRTIME_NETWORKS.map((net) => (
              <button key={net.id} onClick={() => { setAirtimeNetwork(net); setShowNetworkWarning(false); setBuyAirtimeError(""); }}
                style={{
                  padding: 12, borderRadius: 18,
                  background: airtimeNetwork?.id === net.id
                    ? `linear-gradient(135deg, ${net.color}16, rgba(255,255,255,0.98))`
                    : "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(251,251,253,0.94))",
                  border: `1.5px solid ${airtimeNetwork?.id === net.id ? `${net.color}66` : T.border}`, cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 6, transition: "all 150ms",
                  fontFamily: font,
                  boxShadow: airtimeNetwork?.id === net.id ? `0 18px 34px ${net.color}18` : "none",
                }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: net.color, opacity: 0.3 }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: T.textPrimary }}>{net.name}</span>
              </button>
            ))}
          </div>

          {/* Phone Input */}
          {airtimeNetwork && (
            <>
              <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.5px" }}>Phone Number</h3>
              <input type="tel" inputMode="numeric" maxLength={11} placeholder="08012345678" value={airtimePhone}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
                  const detected = detectNetwork(digits);
                  setAirtimePhone(digits);
                  setShowNetworkWarning(false);
                  setBuyAirtimeError("");
                  if (detected) {
                    setAirtimeNetwork(detected);
                  }
                }}
                ref={airtimePhoneInputRef}
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: 12, background: T.bgCard,
                  border: `1.5px solid ${phoneValid ? T.green : T.border}`, color: T.textPrimary, fontSize: 15,
                  fontFamily: font, boxSizing: "border-box", transition: "all 150ms", marginBottom: 6,
                }} />
              {detectedNet && (
                <div style={{
                  marginBottom: 10,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.88)",
                  border: `1px solid ${T.border}`,
                  fontSize: 12,
                  color: T.textSecondary,
                  fontWeight: 700,
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: detectedNet.hexColor }} />
                  Detected network: {detectedNet.name}
                </div>
              )}
              <div style={{ fontSize: 12, color: phoneValid ? T.green : T.textMuted, marginBottom: 16, fontWeight: 500 }}>
                {airtimePhone.length}/11 digits
              </div>

              {networkMismatch && !showNetworkWarning && (
                <div style={{
                  background: `${T.amber}20`, border: `1px solid ${T.amber}50`, borderRadius: 12, padding: 12,
                  marginBottom: 16, color: T.amber, fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 8,
                }}>
                  <span> Looks like {detectedNet?.name}, not {airtimeNetwork?.name}</span>
                  <button onClick={() => setShowNetworkWarning(true)} style={{ background: "transparent", border: "none", color: T.amber, cursor: "pointer", fontWeight: 600 }}>Use anyway </button>
                </div>
              )}
            </>
          )}

          {/* Amount Selection */}
          {phoneValid && (
            <>
              <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.5px" }}>Amount</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 12 }}>
                {PRESETS.map((amt) => (
                  <button key={amt} onClick={() => setAirtimeAmount(String(amt))}
                    style={{
                      padding: 10, borderRadius: 10, background: selectedPreset === amt ? T.blue : T.bgCard,
                      border: `1.5px solid ${selectedPreset === amt ? T.blue : T.border}`, color: selectedPreset === amt ? "#fff" : T.textPrimary,
                      fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: font, transition: "all 150ms",
                    }}>₦{amt.toLocaleString()}</button>
                ))}
              </div>

              <input type="number" inputMode="decimal" placeholder="Custom (₦50-₦5,000)" value={airtimeAmount}
                onChange={(e) => setAirtimeAmount(e.target.value.replace(/\D/g, ""))}
                min="50" max="5000"
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: 12, background: T.bgCard,
                  border: `1.5px solid ${amountValid && airtimeAmount ? T.green : T.border}`, color: T.textPrimary, fontSize: 14,
                  fontFamily: font, boxSizing: "border-box", transition: "all 150ms", marginBottom: 6,
                }} />
              {!amountValid && airtimeAmount && (
                <div style={{ fontSize: 12, color: T.red, marginBottom: 16 }}>
                  {amountNum < 50 ? "Minimum is ₦50" : "Maximum is ₦5,000"}
                </div>
              )}
              {amountValid && (
                <div style={{ fontSize: 12, color: T.green, marginBottom: 16, fontWeight: 600 }}> Valid amount</div>
              )}
            </>
          )}

          <button onClick={() => { if (showNetworkWarning) setShowNetworkWarning(false); setBuyAirtimeStage(2); }} disabled={!allValid}
            style={{
              width: "100%", padding: 14, borderRadius: 12, background: allValid ? T.blue : T.bgElevated,
              border: "none", color: allValid ? "#fff" : T.textMuted, fontSize: 16, fontWeight: 600,
              cursor: allValid ? "pointer" : "not-allowed", opacity: allValid ? 1 : 0.5,
              fontFamily: font, transition: "all 150ms", marginTop: 8,
            }}>{allValid ? "Review Order" : "Complete Selection"}</button>
        </div>
      );
    }

    // STAGE 2: Review Only - No Submission
    if (buyAirtimeStage === 2) {
      const amountNum = parseInt(airtimeAmount) || 0;

      return (
        <div style={{ padding: "20px 20px 120px", fontFamily: font }}>
          <ProgressIndicator />
          <button onClick={() => setBuyAirtimeStage(1)} style={{
            background: T.bgElevated, border: `1px solid ${T.border}`, borderRadius: 12, padding: "10px 16px",
            display: "flex", alignItems: "center", gap: 8, color: T.blue, fontSize: 12, fontWeight: 600,
            cursor: "pointer", marginBottom: 24, fontFamily: font,
          }}><ArrowLeft size={14} /> Back</button>

          <h2 style={{ margin: "0 0 20px", fontSize: 22, fontWeight: 800, color: T.textPrimary }}>Review & Confirm</h2>

          <div style={{
            background: "linear-gradient(135deg, rgba(255,59,48,0.08), rgba(255,255,255,0.96))", borderRadius: 16, padding: 20, marginBottom: 24, border: `1px solid ${T.border}`,
          }}>
            <div style={{ fontSize: 12, color: "#FF3B30", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
              Final check
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 4, fontWeight: 500 }}>Network</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.textPrimary }}>{airtimeNetwork?.name}</div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 4, fontWeight: 500 }}>Phone Number</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.textPrimary }}>{airtimePhone}</div>
            </div>
            <div style={{ height: 1, background: T.border, marginBottom: 16 }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 12, color: T.textMuted, fontWeight: 500 }}>Amount</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: T.green }}>₦{amountNum.toLocaleString()}</div>
            </div>
          </div>

          <button onClick={() => { setBuyAirtimeStage(3); setAirtimePinInput(["", "", "", "", "", ""]); setBuyAirtimeError(""); }}
            style={{
              width: "100%", padding: 14, borderRadius: 12, background: T.blue, border: "none",
              color: "#fff", fontSize: 16, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 8, fontFamily: font, transition: "all 150ms",
            }}>
            Continue to PIN
          </button>
        </div>
      );
    }

    // STAGE 3: PIN Confirmation
    if (buyAirtimeStage === 3) {
      const amountNum = parseInt(airtimeAmount) || 0;
      const pinFull = airtimePinInput.every((d) => d !== "");

      const handlePinSubmit = async () => {
        if (!pinFull) return;

        setBuyAirtimeLoading(true);
        setBuyAirtimeError("");

        try {
          const res = await fetch("/api/airtime", {
            method: "POST", headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ 
              network: airtimeNetwork?.id, 
              mobile_number: airtimePhone, 
              amount: amountNum,
              pin: airtimePinInput.join("")
            }),
          });

          const data = await res.json();

          if (!res.ok) {
            const errMsg = data?.errors?.amount?.[0] || data?.errors?.mobile_number?.[0] || data?.error || "Purchase failed";
            setBuyAirtimeError(errMsg);
            toast.error(errMsg);
            setAirtimePinInput(["", "", "", "", "", ""]);
            setBuyAirtimeLoading(false);
            return;
          }

          toast.success(`₦${amountNum.toLocaleString()} sent to ${airtimePhone} `);
          setAirtimeSuccessData(data);
          setAirtimePinInput(["", "", "", "", "", ""]);
          setBuyAirtimeStage(4);
        } catch (err: any) {
          const msg = err.message || "Network error. Please try again.";
          setBuyAirtimeError(msg);
          toast.error(msg);
          setAirtimePinInput(["", "", "", "", "", ""]);
        } finally {
          setBuyAirtimeLoading(false);
        }
      };

      return (
        <div style={{ padding: "20px 20px 120px", fontFamily: font, position: "relative", overflow: "hidden" }}>
          <ProgressIndicator />

          <button onClick={() => { setBuyAirtimeStage(2); setAirtimePinInput(["", "", "", "", "", ""]); setBuyAirtimeError(""); }}
            style={{
              background: T.bgElevated, border: `1px solid ${T.border}`, borderRadius: 12, padding: "10px 16px",
              display: "flex", alignItems: "center", gap: 8, color: T.blue, fontSize: 14, fontWeight: 600,
              cursor: "pointer", marginBottom: 24, fontFamily: font,
            }}>
            <ArrowLeft size={16} /> Back
          </button>

          <h2 style={{ margin: "0 0 20px", fontSize: 22, fontWeight: 800, color: T.textPrimary, letterSpacing: "-0.5px" }}>
            Confirm Purchase
          </h2>

          <div style={{ background: T.bgElevated, borderRadius: 16, padding: 16, marginBottom: 24, border: `1px solid ${T.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 14 }}>
              <span style={{ color: T.textSecondary, fontWeight: 500 }}>Network</span>
              <span style={{ color: T.textPrimary, fontWeight: 600 }}>{airtimeNetwork?.name}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 14 }}>
              <span style={{ color: T.textSecondary, fontWeight: 500 }}>Phone</span>
              <span style={{ color: T.textPrimary, fontWeight: 600 }}>{airtimePhone}</span>
            </div>
            <div style={{ height: 1, background: T.border, margin: "16px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: T.textSecondary, fontWeight: 600, fontSize: 14 }}>Amount</span>
              <span style={{ color: T.green, fontWeight: 700, fontSize: 18 }}>
                ₦{amountNum.toLocaleString()}
              </span>
            </div>
          </div>

          <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: T.textSecondary, marginBottom: 12 }}>
            Enter your 6-digit PIN
          </label>

          <div style={{ marginBottom: 16 }}>
            <PinInput
              value={airtimePinInput}
              onChange={setAirtimePinInput}
              error={buyAirtimeError.length > 0}
              disabled={buyAirtimeLoading}
              bgColor={T.bgCard}
              bgElevated={T.bgElevated}
              borderColor={T.border}
              borderStrong={T.borderStrong}
              textPrimary={T.textPrimary}
              textSecondary={T.textSecondary}
              errorColor={T.red}
              blueColor={T.blue}
            />
          </div>

          <div style={{
            background: `${T.red}20`, border: `1px solid ${T.red}50`, borderRadius: 12, padding: 12,
            marginBottom: 16, color: T.red, fontSize: 13, fontWeight: 500,
            opacity: buyAirtimeError ? 1 : 0, maxHeight: buyAirtimeError ? "100%" : "0",
            overflow: "hidden", transition: "opacity 150ms ease, max-height 150ms ease",
            pointerEvents: buyAirtimeError ? "auto" : "none",
          }} role="alert">
            {buyAirtimeError}
          </div>

          <button onClick={handlePinSubmit} disabled={!pinFull || buyAirtimeLoading}
            style={{
              width: "100%", padding: 14, borderRadius: 12, background: pinFull && !buyAirtimeLoading ? T.blue : T.bgElevated,
              border: "none", color: "#fff", fontSize: 16, fontWeight: 600,
              cursor: pinFull && !buyAirtimeLoading ? "pointer" : "not-allowed",
              opacity: pinFull && !buyAirtimeLoading ? 1 : 0.5, display: "flex", alignItems: "center",
              justifyContent: "center", gap: 8, fontFamily: font, transition: "all 150ms ease",
            }} aria-disabled={!pinFull || buyAirtimeLoading}>
            {buyAirtimeLoading && <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />}
            {buyAirtimeLoading ? "Processing..." : "Confirm & Pay"}
          </button>
        </div>
      );
    }

    // STAGE 4: Success
    if (buyAirtimeStage === 4) {
      return (
        <div style={{ padding: "20px 20px 120px", fontFamily: font, textAlign: "center" }}>
          <ProgressIndicator />
          <SuccessCheck greenColor={T.green} size={80} />
          <h2 style={{ margin: "16px 0 8px", fontSize: 24, fontWeight: 800, color: T.textPrimary }}>Airtime Sent!</h2>
          <p style={{ margin: "0 0 24px", fontSize: 14, color: T.textSecondary }}>
            ₦{(parseInt(airtimeAmount) || 0).toLocaleString()} to {airtimePhone}
          </p>

          <div style={{
            background: T.bgElevated, borderRadius: 16, padding: 16, marginBottom: 24, border: `1px solid ${T.border}`, textAlign: "left",
          }}>
            <div style={{ marginBottom: 12, fontSize: 13 }}>
              <div style={{ color: T.textMuted, fontWeight: 500, marginBottom: 2 }}>Reference</div>
              <div style={{ color: T.textPrimary, fontWeight: 600, fontFamily: "monospace" }}>{airtimeSuccessData?.reference || "--"}</div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={() => { setBuyAirtimeStage(1); setAirtimePhone(""); setAirtimeAmount(""); setAirtimeNetwork(null); setAirtimeSuccessData(null); setBuyAirtimeError(""); setShowNetworkWarning(false); setAirtimePinInput(["", "", "", "", "", ""]); }}
              style={{
                width: "100%", padding: 12, borderRadius: 12, background: T.blue, border: "none",
                color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: font,
              }}>Send Another</button>
          </div>
        </div>
      );
    }

    return null;
  };

  const BuyCableCard = () => {
    const ProgressIndicator = () => (
      <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 24 }}>
        {[1, 2, 3, 4].map((stage) => (
          <div
            key={stage}
            style={{
              width: 8, height: 8, borderRadius: "50%",
              background: stage < buyCableStage ? T.blue : stage === buyCableStage ? T.blue : T.border,
              cursor: "pointer", opacity: stage <= buyCableStage ? 1 : 0.3,
              transform: stage === buyCableStage ? "scale(1.2)" : "scale(1)",
              transition: "all 0.2s ease-out",
            }}
            onClick={() => stage < buyCableStage && setBuyCableStage(stage)}
          />
        ))}
      </div>
    );

    // Stage 1: Provider + Smart Card
    if (buyCableStage === 1) {
      const smartCardValid = smartCardNumber.length >= 10 && /^\d+$/.test(smartCardNumber);
      const canContinue = cableProvider !== null && smartCardValid;

      return (
        <div style={{ padding: "20px 20px 120px", fontFamily: font }}>
          <ProgressIndicator />
          <h2 style={{ margin: "0 0 20px", fontSize: 22, fontWeight: 800, color: T.textPrimary }}>Select Provider</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
            {CABLE_PROVIDERS.map((provider) => {
              const isSelected = cableProvider?.id === provider.id;
              return (
                <button
                  key={provider.id}
                  onClick={() => setCableProvider(provider)}
                  style={{
                    padding: 16,
                    borderRadius: 16,
                    background: isSelected ? `${T.blue}15` : T.bgCard,
                    border: `2px solid ${isSelected ? T.blue : T.border}`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    transition: "all 150ms ease",
                    fontFamily: font,
                  }}
                >
                  <div style={{ fontSize: 32 }}>{provider.logo}</div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary }}>{provider.name}</span>
                  {isSelected && (
                    <div style={{ position: "absolute", top: 8, right: 8, width: 24, height: 24, borderRadius: "50%", background: T.blue, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Check size={14} color="#fff" strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: T.textPrimary }}>Smart Card Number</h2>
          <div style={{ position: "relative", marginBottom: 24 }}>
            <input
              type="text"
              inputMode="numeric"
              maxLength={20}
              placeholder="e.g. 1234567890"
              value={smartCardNumber}
              onChange={(e) => setSmartCardNumber(e.target.value.replace(/\D/g, "").slice(0, 20))}
              style={{
                width: "100%",
                padding: "12px 40px 12px 14px",
                borderRadius: 12,
                background: T.bgCard,
                border: `1.5px solid ${smartCardValid ? T.green : T.border}`,
                color: T.textPrimary,
                fontSize: 16,
                fontFamily: font,
                boxSizing: "border-box",
                transition: "all 150ms ease",
              }}
            />
            <div style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              opacity: smartCardValid ? 1 : 0,
              transition: "opacity 150ms ease",
              pointerEvents: smartCardValid ? "auto" : "none",
            }}>
              <Check size={20} color={T.green} strokeWidth={3} />
            </div>
            <div style={{ fontSize: 12, color: smartCardValid ? T.green : T.textMuted, textAlign: "right", marginTop: 6, fontWeight: 500 }}>
              {smartCardNumber.length}/10
            </div>
          </div>

          <button
            onClick={() => canContinue && setBuyCableStage(2)}
            disabled={!canContinue}
            style={{
              width: "100%",
              padding: 14,
              borderRadius: 12,
              background: canContinue ? T.blue : T.bgElevated,
              border: `1.5px solid ${canContinue ? T.blue : T.border}`,
              color: canContinue ? "#fff" : T.textMuted,
              fontSize: 16,
              fontWeight: 600,
              cursor: canContinue ? "pointer" : "not-allowed",
              opacity: canContinue ? 1 : 0.5,
              fontFamily: font,
              transition: "all 150ms ease",
            }}
          >
            Continue
          </button>
        </div>
      );
    }

    // Stage 2: Plan Selection
    if (buyCableStage === 2) {
      return (
        <div style={{ padding: "20px 20px 120px", fontFamily: font }}>
          <ProgressIndicator />
          <button
            onClick={() => setBuyCableStage(1)}
            style={{
              background: T.bgElevated,
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: T.blue,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: 24,
              fontFamily: font,
            }}
          >
            <ArrowLeft size={16} /> Back
          </button>

          <h2 style={{ margin: "0 0 20px", fontSize: 22, fontWeight: 800, color: T.textPrimary }}>Select Plan</h2>

          {buyCableLoading ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} style={{ padding: 16, borderRadius: 16, background: T.bgElevated, border: `1px solid ${T.border}`, height: 80, animation: "pulse 1.5s ease-in-out infinite" }} />
              ))}
            </div>
          ) : cablePlans.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: T.textSecondary }}>
              <p style={{ fontSize: 15, margin: "0 0 8px", fontWeight: 500 }}>No plans available</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
              {cablePlans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => {
                    setSelectedCablePlan(plan);
                    setBuyCableStage(3);
                  }}
                  style={{
                    padding: 16,
                    borderRadius: 16,
                    background: T.bgCard,
                    border: `1.5px solid ${T.border}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                    transition: "all 150ms ease",
                    fontFamily: font,
                  }}
                >
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary }}>{plan.planName}</div>
                    <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4 }}>Plan Code: {plan.planCode}</div>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: T.blue }}>₦{(plan.price || 0).toLocaleString()}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Stage 3: PIN Confirmation
    if (buyCableStage === 3) {
      const pinFull = cablePinInput.every((d) => d !== "");

      const handlePinSubmit = async () => {
        if (!pinFull) return;

        setBuyCableLoading(true);
        setBuyCableError("");

        try {
          const validateRes = await fetch("/api/data/validate-pin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ pin: cablePinInput.join("") }),
          });

          if (!validateRes.ok) {
            const error = await validateRes.json();
            setBuyCableError(error.error || "Incorrect PIN");
            setCablePinInput(["", "", "", "", "", ""]);
            setBuyCableLoading(false);
            return;
          }

          const purchaseRes = await fetch("/api/cable/purchase", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              provider: cableProvider.id,
              smartCardNumber,
              planCode: selectedCablePlan.planCode,
              pin: cablePinInput.join(""),
            }),
          });

          if (!purchaseRes.ok) {
            const error = await purchaseRes.json();
            if (error.error?.includes("Insufficient balance")) {
              setBuyCableError("Insufficient balance. Please fund your wallet.");
            } else if (error.error?.includes("refunded")) {
              toast.error("Delivery failed. Your balance has been refunded.");
              setBuyCableError("Delivery failed. Your balance has been refunded.");
            } else {
              setBuyCableError(error.error || "Purchase failed");
            }
            setCablePinInput(["", "", "", "", "", ""]);
            setBuyCableLoading(false);
            return;
          }

          const data = await purchaseRes.json();
          toast.success(`₦${(data.amount || 0).toLocaleString()} - ${selectedCablePlan.planName} subscribed `);
          setCableSuccessData(data);
          setCablePinInput(["", "", "", "", "", ""]);
          setBuyCableStage(4);
        } catch (error: any) {
          toast.error("Something went wrong. Please try again.");
          setBuyCableError(error.message || "An error occurred");
          setCablePinInput(["", "", "", "", "", ""]);
        } finally {
          setBuyCableLoading(false);
        }
      };

      return (
        <div style={{ padding: "20px 20px 120px", fontFamily: font }}>
          <ProgressIndicator />
          <button
            onClick={() => {
              setBuyCableStage(2);
              setCablePinInput(["", "", "", "", "", ""]);
              setBuyCableError("");
            }}
            style={{
              background: T.bgElevated,
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: T.blue,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: 24,
              fontFamily: font,
            }}
          >
            <ArrowLeft size={16} /> Back
          </button>

          <h2 style={{ margin: "0 0 20px", fontSize: 22, fontWeight: 800, color: T.textPrimary }}>Confirm Purchase</h2>

          <div style={{
            background: T.bgElevated,
            borderRadius: 16,
            padding: 16,
            marginBottom: 24,
            border: `1px solid ${T.border}`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 14 }}>
              <span style={{ color: T.textSecondary, fontWeight: 500 }}>Provider</span>
              <span style={{ color: T.textPrimary, fontWeight: 600 }}>{cableProvider?.name}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 14 }}>
              <span style={{ color: T.textSecondary, fontWeight: 500 }}>Smart Card</span>
              <span style={{ color: T.textPrimary, fontWeight: 600 }}>{smartCardNumber}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 14 }}>
              <span style={{ color: T.textSecondary, fontWeight: 500 }}>Plan</span>
              <span style={{ color: T.textPrimary, fontWeight: 600 }}>{selectedCablePlan?.planName}</span>
            </div>
            <div style={{ height: 1, background: T.border, margin: "16px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: T.textSecondary, fontWeight: 600, fontSize: 14 }}>Amount</span>
              <span style={{ color: T.green, fontWeight: 700, fontSize: 18 }}>₦{(selectedCablePlan?.price || 0).toLocaleString()}</span>
            </div>
          </div>

          <label style={{
            display: "block",
            fontSize: 14,
            fontWeight: 600,
            color: T.textSecondary,
            marginBottom: 12,
          }}>
            Enter your 6-digit PIN
          </label>

          <div style={{ marginBottom: 16 }}>
            <PinInput
              value={cablePinInput}
              onChange={setCablePinInput}
              error={buyCableError.length > 0}
              disabled={buyCableLoading}
              bgColor={T.bgCard}
              bgElevated={T.bgElevated}
              borderColor={T.border}
              borderStrong={T.borderStrong}
              textPrimary={T.textPrimary}
              textSecondary={T.textSecondary}
              errorColor={T.red}
              blueColor={T.blue}
            />
          </div>

          <div
            style={{
              background: `${T.red}20`,
              border: `1px solid ${T.red}50`,
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
              color: T.red,
              fontSize: 13,
              fontWeight: 500,
              opacity: buyCableError ? 1 : 0,
              maxHeight: buyCableError ? "100%" : "0",
              overflow: "hidden",
              transition: "opacity 150ms ease, max-height 150ms ease",
              pointerEvents: buyCableError ? "auto" : "none",
            }}
            role="alert"
          >
            {buyCableError}
          </div>

          <button
            onClick={handlePinSubmit}
            disabled={!pinFull || buyCableLoading}
            style={{
              width: "100%",
              padding: 14,
              borderRadius: 12,
              background: pinFull && !buyCableLoading ? T.blue : T.bgElevated,
              border: "none",
              color: "#fff",
              fontSize: 16,
              fontWeight: 600,
              cursor: pinFull && !buyCableLoading ? "pointer" : "not-allowed",
              opacity: pinFull && !buyCableLoading ? 1 : 0.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontFamily: font,
              transition: "all 150ms ease",
            }}
          >
            {buyCableLoading && <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />}
            {buyCableLoading ? "Processing..." : "Confirm & Pay"}
          </button>
        </div>
      );
    }

    // Stage 4: Success
    if (buyCableStage === 4) {
      return (
        <div style={{ padding: "20px 20px 120px", fontFamily: font, textAlign: "center" }}>
          <ProgressIndicator />
          <SuccessCheck greenColor={T.green} size={80} />
          <h2 style={{ margin: "16px 0 8px", fontSize: 26, fontWeight: 800, color: T.textPrimary }}>Subscription Activated!</h2>
          <p style={{ margin: "0 0 28px", fontSize: 14, color: T.textSecondary }}>
            Your {selectedCablePlan?.planName} subscription is now active
          </p>

          <div style={{
            background: T.bgElevated,
            borderRadius: 16,
            padding: 20,
            marginBottom: 28,
            border: `1px solid ${T.border}`,
            textAlign: "left",
          }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 4, fontWeight: 500 }}>Reference</div>
              <div style={{
                fontSize: 15,
                fontWeight: 700,
                color: T.textPrimary,
                fontFamily: "monospace",
                wordBreak: "break-all",
              }}>
                {cableSuccessData?.reference || cableSuccessData?.ident}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 4, fontWeight: 500 }}>Amount Paid</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.green }}>
                ₦{(cableSuccessData?.amount || 0).toLocaleString()}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              onClick={() => {
                setBuyCableStage(1);
                setCableProvider(null);
                setSmartCardNumber("");
                setSelectedCablePlan(null);
                setCablePinInput(["", "", "", "", "", ""]);
                setBuyCableError("");
                setCableSuccessData(null);
                setCablePlans([]);
                setActiveTab("home");
              }}
              style={{
                width: "100%",
                padding: 14,
                borderRadius: 12,
                background: T.blue,
                border: "none",
                color: "#fff",
                fontSize: 16,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: font,
              }}
            >
              Done
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  const BuyPowerCard = () => {
    const ProgressIndicator = () => (
      <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 24 }}>
        {[1, 2, 3, 4].map((stage) => (
          <div
            key={stage}
            style={{
              width: 8, height: 8, borderRadius: "50%",
              background: stage < buyPowerStage ? T.blue : stage === buyPowerStage ? T.blue : T.border,
              cursor: "pointer", opacity: stage <= buyPowerStage ? 1 : 0.3,
              transform: stage === buyPowerStage ? "scale(1.2)" : "scale(1)",
              transition: "all 0.2s ease-out",
            }}
            onClick={() => stage < buyPowerStage && setBuyPowerStage(stage)}
          />
        ))}
      </div>
    );

    // Stage 1: Meter Type Selection
    if (buyPowerStage === 1) {
      return (
        <div style={{ padding: "20px 20px 120px", fontFamily: font }}>
          <ProgressIndicator />
          <h2 style={{ margin: "0 0 20px", fontSize: 22, fontWeight: 800, color: T.textPrimary }}>Select Meter Type</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12, marginBottom: 28 }}>
            {METER_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => {
                  setMeterType(type.id as "PREPAID" | "POSTPAID");
                  setBuyPowerStage(2);
                }}
                style={{
                  padding: 20,
                  borderRadius: 16,
                  background: T.bgCard,
                  border: `1.5px solid ${T.border}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  cursor: "pointer",
                  transition: "all 150ms ease",
                  fontFamily: font,
                  textAlign: "left",
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary }}>{type.label}</div>
                <div style={{ fontSize: 13, color: T.textSecondary }}>{type.description}</div>
              </button>
            ))}
          </div>
        </div>
      );
    }

    // Stage 2: Provider + Meter Number
    if (buyPowerStage === 2) {
      const meterValid = meterNumber.length >= 9 && /^\d+$/.test(meterNumber);
      const canContinue = powerProvider !== null && meterValid;

      return (
        <div style={{ padding: "20px 20px 120px", fontFamily: font }}>
          <ProgressIndicator />
          <button
            onClick={() => setBuyPowerStage(1)}
            style={{
              background: T.bgElevated,
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: T.blue,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: 24,
              fontFamily: font,
            }}
          >
            <ArrowLeft size={16} /> Back
          </button>

          <h2 style={{ margin: "0 0 20px", fontSize: 22, fontWeight: 800, color: T.textPrimary }}>Select Provider</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
            {POWER_PROVIDERS.map((provider) => {
              const isSelected = powerProvider?.id === provider.id;
              return (
                <button
                  key={provider.id}
                  onClick={() => setPowerProvider(provider)}
                  style={{
                    padding: 16,
                    borderRadius: 16,
                    background: isSelected ? `${T.blue}15` : T.bgCard,
                    border: `2px solid ${isSelected ? T.blue : T.border}`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    transition: "all 150ms ease",
                    fontFamily: font,
                  }}
                >
                  <div style={{ fontSize: 32 }}>{provider.logo}</div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.textPrimary, textAlign: "center" }}>{provider.name}</span>
                  {isSelected && (
                    <div style={{ position: "absolute", top: 8, right: 8, width: 24, height: 24, borderRadius: "50%", background: T.blue, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Check size={14} color="#fff" strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: T.textPrimary }}>Meter Number</h2>
          <div style={{ position: "relative", marginBottom: 24 }}>
            <input
              type="text"
              inputMode="numeric"
              maxLength={20}
              placeholder="e.g. 09123456789"
              value={meterNumber}
              onChange={(e) => setMeterNumber(e.target.value.replace(/\D/g, "").slice(0, 20))}
              style={{
                width: "100%",
                padding: "12px 40px 12px 14px",
                borderRadius: 12,
                background: T.bgCard,
                border: `1.5px solid ${meterValid ? T.green : T.border}`,
                color: T.textPrimary,
                fontSize: 16,
                fontFamily: font,
                boxSizing: "border-box",
                transition: "all 150ms ease",
              }}
            />
            <div style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              opacity: meterValid ? 1 : 0,
              transition: "opacity 150ms ease",
              pointerEvents: meterValid ? "auto" : "none",
            }}>
              <Check size={20} color={T.green} strokeWidth={3} />
            </div>
            <div style={{ fontSize: 12, color: meterValid ? T.green : T.textMuted, textAlign: "right", marginTop: 6, fontWeight: 500 }}>
              {meterNumber.length}/9
            </div>
          </div>

          <button
            onClick={() => canContinue && setBuyPowerStage(3)}
            disabled={!canContinue}
            style={{
              width: "100%",
              padding: 14,
              borderRadius: 12,
              background: canContinue ? T.blue : T.bgElevated,
              border: `1.5px solid ${canContinue ? T.blue : T.border}`,
              color: canContinue ? "#fff" : T.textMuted,
              fontSize: 16,
              fontWeight: 600,
              cursor: canContinue ? "pointer" : "not-allowed",
              opacity: canContinue ? 1 : 0.5,
              fontFamily: font,
              transition: "all 150ms ease",
            }}
          >
            Continue
          </button>
        </div>
      );
    }

    // Stage 3: Plan Selection
    if (buyPowerStage === 3) {
      return (
        <div style={{ padding: "20px 20px 120px", fontFamily: font }}>
          <ProgressIndicator />
          <button
            onClick={() => setBuyPowerStage(2)}
            style={{
              background: T.bgElevated,
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: T.blue,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: 24,
              fontFamily: font,
            }}
          >
            <ArrowLeft size={16} /> Back
          </button>

          <h2 style={{ margin: "0 0 20px", fontSize: 22, fontWeight: 800, color: T.textPrimary }}>Select Plan</h2>

          {buyPowerLoading ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} style={{ padding: 16, borderRadius: 16, background: T.bgElevated, border: `1px solid ${T.border}`, height: 80, animation: "pulse 1.5s ease-in-out infinite" }} />
              ))}
            </div>
          ) : powerPlans.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: T.textSecondary }}>
              <p style={{ fontSize: 15, margin: "0 0 8px", fontWeight: 500 }}>No plans available</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
              {powerPlans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => {
                    setSelectedPowerPlan(plan);
                    setBuyPowerStage(4);
                  }}
                  style={{
                    padding: 16,
                    borderRadius: 16,
                    background: T.bgCard,
                    border: `1.5px solid ${T.border}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                    transition: "all 150ms ease",
                    fontFamily: font,
                  }}
                >
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary }}>{plan.planName || "Electricity Plan"}</div>
                    <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4 }}>Amount: ₦{(plan.price || 0).toLocaleString()}</div>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: T.blue }}>₦{(plan.price || 0).toLocaleString()}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Stage 4: PIN Confirmation
    if (buyPowerStage === 4) {
      const pinFull = powerPinInput.every((d) => d !== "");

      const handlePinSubmit = async () => {
        if (!pinFull) return;

        setBuyPowerLoading(true);
        setBuyPowerError("");

        try {
          const validateRes = await fetch("/api/data/validate-pin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ pin: powerPinInput.join("") }),
          });

          if (!validateRes.ok) {
            const error = await validateRes.json();
            setBuyPowerError(error.error || "Incorrect PIN");
            setPowerPinInput(["", "", "", "", "", ""]);
            setBuyPowerLoading(false);
            return;
          }

          const purchaseRes = await fetch("/api/power/purchase", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              provider: powerProvider.id,
              meterType,
              meterNumber,
              amount: selectedPowerPlan.price,
              pin: powerPinInput.join(""),
            }),
          });

          if (!purchaseRes.ok) {
            const error = await purchaseRes.json();
            if (error.error?.includes("Insufficient balance")) {
              setBuyPowerError("Insufficient balance. Please fund your wallet.");
            } else if (error.error?.includes("refunded")) {
              toast.error("Delivery failed. Your balance has been refunded.");
              setBuyPowerError("Delivery failed. Your balance has been refunded.");
            } else {
              setBuyPowerError(error.error || "Purchase failed");
            }
            setPowerPinInput(["", "", "", "", "", ""]);
            setBuyPowerLoading(false);
            return;
          }

          const data = await purchaseRes.json();
          toast.success(`₦${(data.amount || 0).toLocaleString()} - Power credit loaded `);
          setPowerSuccessData(data);
          setPowerPinInput(["", "", "", "", "", ""]);
          setBuyPowerStage(5);
        } catch (error: any) {
          toast.error("Something went wrong. Please try again.");
          setBuyPowerError(error.message || "An error occurred");
          setPowerPinInput(["", "", "", "", "", ""]);
        } finally {
          setBuyPowerLoading(false);
        }
      };

      return (
        <div style={{ padding: "20px 20px 120px", fontFamily: font }}>
          <ProgressIndicator />
          <button
            onClick={() => {
              setBuyPowerStage(3);
              setPowerPinInput(["", "", "", "", "", ""]);
              setBuyPowerError("");
            }}
            style={{
              background: T.bgElevated,
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: T.blue,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: 24,
              fontFamily: font,
            }}
          >
            <ArrowLeft size={16} /> Back
          </button>

          <h2 style={{ margin: "0 0 20px", fontSize: 22, fontWeight: 800, color: T.textPrimary }}>Confirm Purchase</h2>

          <div style={{
            background: T.bgElevated,
            borderRadius: 16,
            padding: 16,
            marginBottom: 24,
            border: `1px solid ${T.border}`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 14 }}>
              <span style={{ color: T.textSecondary, fontWeight: 500 }}>Provider</span>
              <span style={{ color: T.textPrimary, fontWeight: 600 }}>{powerProvider?.name}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 14 }}>
              <span style={{ color: T.textSecondary, fontWeight: 500 }}>Meter Type</span>
              <span style={{ color: T.textPrimary, fontWeight: 600 }}>{meterType}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 14 }}>
              <span style={{ color: T.textSecondary, fontWeight: 500 }}>Meter Number</span>
              <span style={{ color: T.textPrimary, fontWeight: 600 }}>{meterNumber}</span>
            </div>
            <div style={{ height: 1, background: T.border, margin: "16px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: T.textSecondary, fontWeight: 600, fontSize: 14 }}>Amount</span>
              <span style={{ color: T.green, fontWeight: 700, fontSize: 18 }}>₦{(selectedPowerPlan?.price || 0).toLocaleString()}</span>
            </div>
          </div>

          <label style={{
            display: "block",
            fontSize: 14,
            fontWeight: 600,
            color: T.textSecondary,
            marginBottom: 12,
          }}>
            Enter your 6-digit PIN
          </label>

          <div style={{ marginBottom: 16 }}>
            <PinInput
              value={powerPinInput}
              onChange={setPowerPinInput}
              error={buyPowerError.length > 0}
              disabled={buyPowerLoading}
              bgColor={T.bgCard}
              bgElevated={T.bgElevated}
              borderColor={T.border}
              borderStrong={T.borderStrong}
              textPrimary={T.textPrimary}
              textSecondary={T.textSecondary}
              errorColor={T.red}
              blueColor={T.blue}
            />
          </div>

          <div
            style={{
              background: `${T.red}20`,
              border: `1px solid ${T.red}50`,
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
              color: T.red,
              fontSize: 13,
              fontWeight: 500,
              opacity: buyPowerError ? 1 : 0,
              maxHeight: buyPowerError ? "100%" : "0",
              overflow: "hidden",
              transition: "opacity 150ms ease, max-height 150ms ease",
              pointerEvents: buyPowerError ? "auto" : "none",
            }}
            role="alert"
          >
            {buyPowerError}
          </div>

          <button
            onClick={handlePinSubmit}
            disabled={!pinFull || buyPowerLoading}
            style={{
              width: "100%",
              padding: 14,
              borderRadius: 12,
              background: pinFull && !buyPowerLoading ? T.blue : T.bgElevated,
              border: "none",
              color: "#fff",
              fontSize: 16,
              fontWeight: 600,
              cursor: pinFull && !buyPowerLoading ? "pointer" : "not-allowed",
              opacity: pinFull && !buyPowerLoading ? 1 : 0.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontFamily: font,
              transition: "all 150ms ease",
            }}
          >
            {buyPowerLoading && <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />}
            {buyPowerLoading ? "Processing..." : "Confirm & Pay"}
          </button>
        </div>
      );
    }

    // Stage 5: Success
    if (buyPowerStage === 5) {
      return (
        <div style={{ padding: "20px 20px 120px", fontFamily: font, textAlign: "center" }}>
          <ProgressIndicator />
          <SuccessCheck greenColor={T.green} size={80} />
          <h2 style={{ margin: "16px 0 8px", fontSize: 26, fontWeight: 800, color: T.textPrimary }}>Payment Successful!</h2>
          <p style={{ margin: "0 0 28px", fontSize: 14, color: T.textSecondary }}>
            Power credit has been loaded to your meter
          </p>

          <div style={{
            background: T.bgElevated,
            borderRadius: 16,
            padding: 20,
            marginBottom: 28,
            border: `1px solid ${T.border}`,
            textAlign: "left",
          }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 4, fontWeight: 500 }}>Reference</div>
              <div style={{
                fontSize: 15,
                fontWeight: 700,
                color: T.textPrimary,
                fontFamily: "monospace",
                wordBreak: "break-all",
              }}>
                {powerSuccessData?.reference || powerSuccessData?.ident}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 4, fontWeight: 500 }}>Amount Paid</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.green }}>
                ₦{(powerSuccessData?.amount || 0).toLocaleString()}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              onClick={() => {
                setBuyPowerStage(1);
                setMeterType(null);
                setMeterNumber("");
                setPowerProvider(null);
                setSelectedPowerPlan(null);
                setPowerPinInput(["", "", "", "", "", ""]);
                setBuyPowerError("");
                setPowerSuccessData(null);
                setPowerPlans([]);
                setActiveTab("home");
              }}
              style={{
                width: "100%",
                padding: 14,
                borderRadius: 12,
                background: T.blue,
                border: "none",
                color: "#fff",
                fontSize: 16,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: font,
              }}
            >
              Done
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  // ---
  return (
    <div style={{
      background: T.bg,
      color: T.textPrimary,
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      fontFamily: font,
      overflowX: "hidden",
      position: "relative",
    }}>

      {/* --- */}
      <div style={{
        position: "fixed", top: -120, left: "50%", transform: "translateX(-50%)",
        width: 500, height: 300,
        background: `radial-gradient(ellipse, ${T.blue}18 0%, transparent 70%)`,
        pointerEvents: "none", zIndex: 0,
      }} />

      {/* --- */}
      <div style={{ height: "env(safe-area-inset-top, 16px)", flexShrink: 0 }} />

      {/* --- */}
      <div style={{
        padding: "16px 20px 20px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        position: "relative", zIndex: 10, flexShrink: 0,
      }}>
        {/* Left: greeting */}
        <div>
          <p style={{ margin: 0, fontSize: 13, color: T.textMuted, fontWeight: 500, letterSpacing: "0.2px" }}>
            Welcome to SY Data
          </p>
          <h1 style={{
            margin: "2px 0 0", fontSize: 22, fontWeight: 800,
            color: T.textPrimary, letterSpacing: "-0.6px", lineHeight: 1.2,
          }}>
            {user.fullName}
          </h1>
        </div>

        {/* Right: avatar + tier badge */}
        <button
          onClick={() => setShowSettingsModal(true)}
          style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            gap: 4, background: "transparent", border: "none", cursor: "pointer",
          }}
        >
          <div style={{
            width: 46, height: 46, borderRadius: 16,
            background: `linear-gradient(135deg, ${T.blue}, ${T.violet})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 4px 16px ${T.services.data.glow}`,
            fontSize: 15, fontWeight: 800, color: "white", letterSpacing: "-0.5px",
          }}>
            {getInitials(user.fullName)}
          </div>
          <span style={{
            fontSize: 9, fontWeight: 700, textTransform: "uppercase",
            letterSpacing: "0.6px",
            color: user.tier === "agent" ? T.amber : T.blue,
            background: user.tier === "agent" ? "rgba(245,158,11,0.12)" : "rgba(59,130,246,0.12)",
            borderRadius: 6, padding: "2px 6px",
          }}>
            {user.tier}
          </span>
        </button>
      </div>

      {!broadcastsLoading && broadcasts[0] && (
        <div
          style={{
            padding: "0 20px 14px",
            position: "relative",
            zIndex: 10,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              borderRadius: 18,
              border: `1px solid rgba(59,130,246,0.25)`,
              background: "linear-gradient(135deg, rgba(0,113,227,0.12), rgba(94,92,230,0.08))",
              boxShadow: T.shadowSoft,
              padding: "14px 16px",
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: "rgba(255,255,255,0.08)",
                border: `1px solid ${T.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Megaphone size={18} color={T.blueLight} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: T.blueLight, textTransform: "uppercase", letterSpacing: "1px" }}>
                  Announcement
                </p>
                <button
                  onClick={() => dismissBroadcast(broadcasts[0].id)}
                  disabled={dismissingBroadcastId === broadcasts[0].id}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: T.textSecondary,
                    cursor: dismissingBroadcastId === broadcasts[0].id ? "not-allowed" : "pointer",
                    fontSize: 12,
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontFamily: font,
                  }}
                >
                  {dismissingBroadcastId === broadcasts[0].id ? (
                    <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                  ) : (
                    <X size={14} />
                  )}
                  Dismiss
                </button>
              </div>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: T.textPrimary }}>
                {broadcasts[0].message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* --- */}
      <div style={{
        flex: 1, overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        position: "relative", zIndex: 5,
      }}>
        <>

          {/* --- */}
          {activeTab === "home" && (
            <div
              key="home"
              style={{ padding: "0 20px 120px" }}
            >

              {/* --- */}
              <div
                style={{
                  borderRadius: 28,
                  padding: "20px 24px",
                  marginBottom: 28,
                  overflow: "hidden",
                  position: "relative",
                  background: "linear-gradient(145deg, #ffffff 0%, #f4f8ff 38%, #eef5ff 72%, #f8fbff 100%)",
                  border: `1px solid rgba(0,113,227,0.12)`,
                  boxShadow: `${T.shadowCard}, inset 0 1px 0 rgba(255,255,255,0.9)`,
                }}
              >
                {/* Decorative orbs */}
                <div style={{
                  position: "absolute", top: -60, right: -60,
                  width: 220, height: 220, borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(0,113,227,0.16) 0%, transparent 72%)",
                  pointerEvents: "none",
                }} />
                <div style={{
                  position: "absolute", bottom: -80, left: -40,
                  width: 200, height: 200, borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(94,92,230,0.14) 0%, transparent 72%)",
                  pointerEvents: "none",
                }} />
                {/* Shine line */}
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 1,
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.95), transparent)",
                  pointerEvents: "none",
                }} />

                {/* Label */}
                <p style={{
                  margin: "0 0 12px", fontSize: 11, fontWeight: 700,
                  color: T.textMuted, textTransform: "uppercase",
                  letterSpacing: "1.5px", position: "relative",
                }}>
                  Available Balance
                </p>

                {/* Amount row */}
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "center", marginBottom: 18, position: "relative",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <span style={{
                      fontSize: 31, fontWeight: 700, color: T.blue,
                    }}>₦</span>
                    <span
                      key={balanceVisible ? "vis" : "hid"}
                      style={{
                        fontSize: 31, fontWeight: 900, color: T.textPrimary,
                        letterSpacing: "-1px",
                        fontVariantNumeric: "tabular-nums",
                        textShadow: "0 1px 0 rgba(255,255,255,0.85)",
                      }}
                    >
                      {balanceVisible ? formatMoney(user.balance) : "******"}
                    </span>
                  </div>


                </div>

                {/* Virtual Account Info Row */}
                <div style={{
                  borderTop: `1px solid ${T.border}`,
                  paddingTop: 14,
                  display: "flex", justifyContent: "space-between",
                  alignItems: "center", position: "relative",
                }}>
                  <div style={{ flex: 1 }}>
                    {user.accountNumber && user.bankName ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <div style={{ flex: 1 }}>
                          <p style={{
                            margin: "0 0 4px", fontSize: 10, fontWeight: 700,
                            color: T.textMuted, textTransform: "uppercase", letterSpacing: "1px",
                          }}>
                            Account Number  -  Bank
                          </p>
                          <div style={{
                            display: "flex", alignItems: "center", gap: 8,
                            fontSize: 14, fontWeight: 700, color: T.textPrimary,
                            letterSpacing: "0.5px",
                          }}>
                            <span style={{ fontFamily: "monospace" }}>{user.accountNumber}</span>
                            <span style={{ color: T.textMuted }}>•</span>
                            <span>{user.bankName}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(user.accountNumber!);
                            toast.success("Account number copied!");
                          }}
                          style={{
                            background: "rgba(255,255,255,0.82)",
                            border: `1px solid ${T.border}`,
                            borderRadius: 12, padding: "8px 12px",
                            color: T.textPrimary, fontWeight: 700, cursor: "pointer",
                            fontSize: 11, display: "flex", alignItems: "center",
                            gap: 4, backdropFilter: "blur(10px)",
                            boxShadow: T.shadowSoft,
                            flexShrink: 0,
                          }}
                        >
                          <Copy size={12} strokeWidth={2.5} />
                          Copy
                        </button>
                      </div>
                    ) : (
                      <p style={{
                        margin: 0, fontSize: 13, fontWeight: 500, color: T.textSecondary,
                      }}>
                        Virtual account not available. Please contact support.
                      </p>
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch("/api/auth/me", { credentials: "include" });
                        if (res.ok) {
                          const updatedUser = await res.json();
                          setUser(updatedUser);
                          toast.success("Wallet synced!");
                        }
                      } catch {
                        toast.error("Sync failed");
                      }
                    }}
                    style={{
                      background: "rgba(255,255,255,0.82)",
                      border: `1px solid ${T.border}`,
                      borderRadius: 12, padding: "8px 12px",
                      color: T.textPrimary, fontWeight: 700, cursor: "pointer",
                      fontSize: 11, display: "flex", alignItems: "center",
                      gap: 4, backdropFilter: "blur(10px)",
                      boxShadow: T.shadowSoft,
                      flexShrink: 0, marginLeft: 8,
                    }}
                  >
                    <Zap size={12} strokeWidth={2.5} />
                    Sync
                  </button>
                </div>
              </div>

              {/* --- */}
              <p style={{
                margin: "0 0 14px", fontSize: 13, fontWeight: 700,
                color: T.textMuted, textTransform: "uppercase",
                letterSpacing: "1px",
              }}>
                Quick Services
              </p>

              {/* --- */}
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
                gap: 12, marginBottom: 32,
              }}>
                {SERVICES.map((svc, i) => {
                  const Icon = svc.icon;
                  return (
                    <button
                      key={svc.id}
                      onClick={() => setActiveTab(svc.id)}
                      style={{
                        background: T.bgCard,
                        border: `1px solid ${T.border}`,
                        borderRadius: 20,
                        padding: "20px 10px",
                        display: "flex", flexDirection: "column",
                        alignItems: "center", gap: 10,
                        cursor: "pointer",
                        boxShadow: T.shadowSoft,
                        transition: "box-shadow 0.2s",
                      }}
                    >
                      {/* Icon bubble */}
                      <div style={{
                        width: 52, height: 52, borderRadius: 16,
                        background: svc.sc.bg,
                        border: `1px solid ${svc.sc.icon}22`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: `0 6px 20px ${svc.sc.glow}`,
                      }}>
                        <Icon size={26} color={svc.sc.icon} strokeWidth={2} />
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: T.textSecondary,
                        textAlign: "center", letterSpacing: "0.1px",
                      }}>
                        {svc.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* --- */}
              <p style={{
                margin: "0 0 12px", fontSize: 13, fontWeight: 700,
                color: T.textMuted, textTransform: "uppercase", letterSpacing: "1px",
              }}>
                Account
              </p>
              <div style={{
                background: T.bgCard, borderRadius: 20,
                border: `1px solid ${T.border}`,
                overflow: "hidden",
                boxShadow: T.shadowSoft,
              }}>
                {ACCOUNT_SERVICES.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.id === "accounts") setActiveTab("accounts");
                        else if (item.id === "rewards") setActiveTab("rewards");
                        else if (item.id === "transactions") setShowTransactionsModal(true);
                        else setShowSettingsModal(true);
                      }}
                      style={{
                        background: "transparent", border: "none",
                        borderBottom: idx < ACCOUNT_SERVICES.length - 1
                          ? `1px solid ${T.border}` : "none",
                        padding: "18px 16px",
                        display: "flex", alignItems: "center", gap: 14,
                        cursor: "pointer", width: "100%",
                      }}
                    >
                      <div style={{
                        width: 42, height: 42, borderRadius: 13,
                        background: T.bgElevated,
                        border: `1px solid ${T.border}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Icon size={18} color={T.blue} strokeWidth={2} />
                      </div>
                      <span style={{
                        flex: 1, textAlign: "left",
                        fontSize: 15, fontWeight: 600, color: T.textPrimary,
                      }}>
                        {item.label}
                      </span>
                      <ChevronRight size={18} color={T.textMuted} strokeWidth={2} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "accounts" && (
            <div style={{ padding: "20px 20px 120px", fontFamily: font }}>
              <button
                onClick={() => setActiveTab("home")}
                style={{
                  background: T.bgElevated, border: `1px solid ${T.border}`,
                  borderRadius: 12, padding: "10px 16px",
                  display: "flex", alignItems: "center", gap: 8,
                  color: T.blue, fontSize: 14, fontWeight: 600,
                  cursor: "pointer", marginBottom: 24, fontFamily: font,
                }}
              >
                <ArrowLeft size={16} /> Back
              </button>

              <div style={{ marginBottom: 20 }}>
                <h1 style={{
                  margin: "0 0 8px", fontSize: 28, fontWeight: 800,
                  color: T.textPrimary, letterSpacing: "-0.6px",
                }}>
                  Accounts
                </h1>
                <p style={{
                  margin: 0, fontSize: 14, color: T.textSecondary, lineHeight: 1.6,
                }}>
                  View your wallet account details here.
                </p>
              </div>
              {accountsLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "40px 20px" }}>
                  <Loader2 size={28} style={{ color: T.blue, animation: "spin 1s linear infinite" }} />
                </div>
              ) : accounts.length === 0 ? (
                <div style={{
                  background: T.bgCard,
                  borderRadius: 20,
                  border: `1px solid ${T.border}`,
                  padding: 24,
                  textAlign: "center",
                }}>
                  <p style={{ margin: 0, color: T.textSecondary, fontSize: 14 }}>
                    Your virtual account will appear here after signup.
                  </p>
                  {!user.accountNumber && (
                    <button
                      onClick={createVirtualAccount}
                      disabled={creatingVirtualAccount || accountsLoading}
                      style={{
                        marginTop: 14,
                        width: "100%",
                        padding: "12px 14px",
                        borderRadius: 12,
                        background: creatingVirtualAccount ? T.bgElevated : T.blue,
                        border: `1px solid ${creatingVirtualAccount ? T.border : T.blue}`,
                        color: creatingVirtualAccount ? T.textMuted : "#fff",
                        fontSize: 14,
                        fontWeight: 800,
                        cursor: creatingVirtualAccount ? "not-allowed" : "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        fontFamily: font,
                      }}
                    >
                      {creatingVirtualAccount && (
                        <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                      )}
                      {creatingVirtualAccount ? "Creating..." : "Create virtual account"}
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ display: "grid", gap: 14 }}>
                  {accounts.map((account) => (
                    <div
                      key={account.id}
                      style={{
                        background: T.bgCard,
                        borderRadius: 20,
                        border: `1px solid ${T.border}`,
                        padding: 18,
                        boxShadow: T.shadowSoft,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
                        <div>
                          <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "1px" }}>
                            {account.bankName || account.bankId}
                          </p>
                          <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.textPrimary, fontFamily: "monospace", letterSpacing: "0.5px" }}>
                            {account.accountNumber}
                          </p>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          {account.isPrimary && (
                            <span style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "6px 10px",
                              borderRadius: 999,
                              background: `${T.blue}20`,
                              border: `1px solid ${T.blue}40`,
                              color: T.blueLight,
                              fontSize: 11,
                              fontWeight: 700,
                            }}>
                              Primary
                            </span>
                          )}
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(account.accountNumber);
                              toast.success("Account number copied!");
                            }}
                            style={{
                              background: T.bgElevated,
                              border: `1px solid ${T.border}`,
                              borderRadius: 12,
                              padding: "8px 12px",
                              color: T.textPrimary,
                              fontWeight: 700,
                              cursor: "pointer",
                              fontSize: 12,
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <Copy size={14} />
                            Copy
                          </button>
                        </div>
                      </div>

                      <div style={{ display: "grid", gap: 10 }}>
                        <div>
                          <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.8px" }}>
                            Account Name
                          </p>
                          <p style={{ margin: 0, fontSize: 14, color: T.textPrimary, fontWeight: 600 }}>
                            {account.accountName || "Not available"}
                          </p>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                          <div>
                            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.8px" }}>
                              Bank ID
                            </p>
                            <p style={{ margin: 0, fontSize: 13, color: T.textSecondary, fontWeight: 600 }}>
                              {account.bankId}
                            </p>
                          </div>
                          <div>
                            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.8px" }}>
                              Reference
                            </p>
                            <p style={{ margin: 0, fontSize: 13, color: T.textSecondary, fontWeight: 600 }}>
                              {account.providerReference || "Not available"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "rewards" && (
            <RewardsPanel
              rewards={rewards}
              loading={rewardsLoading}
              claiming={claimingRewards}
              onBack={() => setActiveTab("home")}
              onClaimAll={() => claimRewards()}
              onClaimOne={(rewardId) => claimRewards([rewardId])}
            />
          )}

          {/* --- */}
          {/* FIX: Called as {BuyDataCard()} not <BuyDataCard /> so React does
              not treat it as a new component type on each render, preventing
              the unmount/remount that was dismissing the keyboard. */}
          {activeTab === "data" && BuyDataCard()}
          {activeTab === "airtime" && BuyAirtimeCard()}
          {activeTab === "cable" && BuyCableCard()}
          {activeTab === "electricity" && BuyPowerCard()}
          {activeTab === "exampin" && (
            <ComingSoon key="exam" icon={BookOpen} label="Exam PINs" color={T.services.exampin.icon} />
          )}
          {activeTab === "contact" && (
            <div style={{ padding: "20px 20px 120px", fontFamily: font }}>
              <button
                onClick={() => setActiveTab("home")}
                style={{
                  background: T.bgElevated, border: `1px solid ${T.border}`,
                  borderRadius: 12, padding: "10px 16px",
                  display: "flex", alignItems: "center", gap: 8,
                  color: T.blue, fontSize: 14, fontWeight: 600,
                  cursor: "pointer", marginBottom: 24, fontFamily: font,
                }}
              >
                <ArrowLeft size={16} /> Back
              </button>

              <div style={{ textAlign: "center", padding: "20px 20px" }}>
                <h1 style={{
                  margin: "0 0 8px", fontSize: 28, fontWeight: 800,
                  color: T.textPrimary, letterSpacing: "-0.6px",
                }}>
                  Contact Us
                </h1>
                <p style={{
                  margin: "0 0 32px", fontSize: 14, color: T.textSecondary,
                  lineHeight: 1.6,
                }}>
                  Need help or pitching support? Reach out using the details below.
                </p>

                {/* Contact Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16, maxWidth: 400, marginInline: "auto", marginBottom: 32 }}>
                  {/* Call */}
                  <div style={{
                    background: T.bgElevated, borderRadius: 16, padding: 20,
                    border: `1px solid ${T.border}`, textAlign: "left",
                  }}>
                    <p style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: T.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Call Us
                    </p>
                    <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: T.textPrimary }}>
                      {SUPPORT_PHONE}
                    </p>
                    <button
                      onClick={() => {
                        window.open(`tel:${SUPPORT_PHONE}`, "_blank");
                      }}
                      style={{
                        marginTop: 12, padding: "8px 16px", borderRadius: 8,
                        background: T.blue, border: "none", color: "#fff",
                        fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: font,
                      }}
                    >
                      Call Now
                    </button>
                  </div>

                  {/* Chat */}
                  <div style={{
                    background: T.bgElevated, borderRadius: 16, padding: 20,
                    border: `1px solid ${T.border}`, textAlign: "left",
                  }}>
                    <p style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: T.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      WhatsApp
                    </p>
                    <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: T.textPrimary }}>
                      {SUPPORT_PHONE}
                    </p>
                    <button
                      onClick={() => {
                        window.open("https://wa.me/2349000000000?text=Hello%20SY%20Data", "_blank");
                      }}
                      style={{
                        marginTop: 12, padding: "8px 16px", borderRadius: 8,
                        background: "#25D366", border: "none", color: "#fff",
                        fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: font,
                      }}
                    >
                      WhatsApp
                    </button>
                  </div>

                  {/* Location */}
                  <div style={{
                    background: T.bgElevated, borderRadius: 16, padding: 20,
                    border: `1px solid ${T.border}`, textAlign: "left",
                  }}>
                    <p style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: T.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Location
                    </p>
                    <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: T.textPrimary }}>
                      {SUPPORT_LOCATION}
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: T.textSecondary }}>
                      Nigeria
                    </p>
                  </div>
                </div>

                {/* Built By Section */}
                <div style={{
                  borderTop: `1px solid ${T.border}`,
                  paddingTop: 24, marginTop: 24,
                  textAlign: "center",
                }}>
                  <p style={{
                    margin: "0 0 12px", fontSize: 13, color: T.textSecondary,
                    fontWeight: 500,
                  }}>
                    Built by
                  </p>
                  <a
                    href={ANJAL_URL}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 8,
                      padding: "8px 16px", borderRadius: 12,
                      background: `${T.blue}15`, border: `1px solid ${T.blue}40`,
                      textDecoration: "none", cursor: "pointer",
                      transition: "all 150ms ease",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.background = `${T.blue}25`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.background = `${T.blue}15`;
                    }}
                  >
                    <span style={{ position: "relative", width: 28, height: 28, borderRadius: 8, overflow: "hidden", display: "inline-flex" }}>
                      <Image
                        src="/anjal-ventures-logo.png"
                        alt="Anjal Ventures"
                        fill
                        sizes="28px"
                        style={{ objectFit: "contain", background: "#fff" }}
                      />
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.blue }}>
                      Anjal Ventures
                    </span>
                  </a>
                </div>
              </div>
            </div>
          )}

        </>
      </div>

      {/* --- */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
        background: `rgba(7,9,15,0.88)`,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: `1px solid ${T.border}`,
        display: "flex", justifyContent: "space-around",
        paddingBottom: "env(safe-area-inset-bottom, 12px)",
        paddingTop: 10,
      }}>
        {NAV.map((tab) => {
          const Icon  = tab.icon;
          const isActive = tab.id === "home"
            ? activeTab === "home"
            : tab.id === "rewards"
              ? activeTab === "rewards"
            : tab.id === "accounts"
              ? activeTab === "accounts"
              : false;

          return (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === "home")         setActiveTab("home");
                if (tab.id === "rewards")      setActiveTab("rewards");
                if (tab.id === "accounts")     setActiveTab("accounts");
                if (tab.id === "transactions") setShowTransactionsModal(true);
                if (tab.id === "settings")     setShowSettingsModal(true);
              }}
              style={{
                background: "transparent", border: "none",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                cursor: "pointer", padding: "6px 20px",
                gap: 5, flex: 1, position: "relative",
              }}
            >
              {/* Active pill indicator */}
              {isActive && (
                <div
                  style={{
                    position: "absolute", top: -10, left: "50%",
                    transform: "translateX(-50%)",
                    width: 36, height: 3, borderRadius: 99,
                    background: `linear-gradient(90deg, ${T.blue}, ${T.violet})`,
                    boxShadow: `0 0 12px ${T.blue}`,
                  }}
                />
              )}
              <Icon
                size={22}
                color={isActive ? T.blue : T.textMuted}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span style={{
                fontSize: 10, fontWeight: isActive ? 700 : 500,
                color: isActive ? T.blue : T.textMuted,
                letterSpacing: "0.2px",
              }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* --- */}
      <Modal show={showTransactionsModal} onClose={() => setShowTransactionsModal(false)}>
        <ModalHeader title="Transactions" onClose={() => setShowTransactionsModal(false)} />

        {transactions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 20px" }}>
            <div style={{
              width: 72, height: 72, borderRadius: 22, margin: "0 auto 20px",
              background: T.bgElevated, border: `1px solid ${T.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <History size={32} color={T.textMuted} strokeWidth={1.5} />
            </div>
            <p style={{ margin: 0, color: T.textMuted, fontSize: 15, fontWeight: 500 }}>
              No transactions yet
            </p>
            <p style={{ margin: "6px 0 0", color: T.textMuted, fontSize: 13, opacity: 0.6 }}>
              Your transaction history will appear here
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {transactions.map((tx: any, idx: number) => {
              const isSuccess = tx.status === "SUCCESS";
              
              // Select icon based on transaction type
              let txIcon = History;
              let txEmoji = "TX";
              let txLabel = "Transaction";
              
              if (tx.type === "data") {
                txIcon = Wifi;
                txEmoji = "DATA";
                txLabel = "Data";
              } else if (tx.type === "airtime") {
                txIcon = Phone;
                txEmoji = "AIR";
                txLabel = "Airtime";
              } else if (tx.type === "cable") {
                txIcon = Tv;
                txEmoji = "CAB";
                txLabel = "Cable TV";
              } else if (tx.type === "power") {
                txIcon = Zap;
                txEmoji = "PWR";
                txLabel = "Power";
              }
              
              const TxIcon = txIcon;
              
              return (
                <div
                  key={idx}
                  style={{
                    background: T.bgElevated,
                    borderRadius: 16,
                    padding: "16px",
                    border: `1px solid ${T.border}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 13,
                      background: isSuccess ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <TxIcon size={18} color={isSuccess ? T.green : T.red} strokeWidth={2} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: "0 0 3px", fontSize: 14, fontWeight: 600, color: T.textPrimary }}>
                        {tx.planName || `${txLabel} ${txLabel === "Cable TV" ? "Subscription" : txLabel === "Power" ? "Payment" : ""}`}  -  {tx.networkName || "Network"}
                      </p>
                      <p style={{ margin: "0 0 3px", fontSize: 12, color: T.textSecondary }}>
                        {txEmoji} {tx.phone || "N/A"}
                      </p>
                      <p style={{ margin: 0, fontSize: 11, color: T.textMuted }}>
                        {new Date(tx.createdAt).toLocaleDateString("en-NG", {
                          day: "numeric", month: "short", year: "numeric",
                        })}  -  {new Date(tx.createdAt).toLocaleTimeString("en-NG", {
                          hour: "2-digit", minute: "2-digit", second: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{
                      margin: "0 0 3px", fontSize: 15, fontWeight: 700,
                      color: isSuccess ? T.green : T.textSecondary,
                    }}>
                      ₦{tx.amount.toLocaleString()}
                    </p>
                    <span style={{
                      fontSize: 11, fontWeight: 700, textTransform: "capitalize",
                      color: isSuccess ? T.green : T.red,
                      background: isSuccess ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                      borderRadius: 6, padding: "2px 8px",
                    }}>
                      {tx.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      {/* --- */}
      <Modal show={showSettingsModal} onClose={() => setShowSettingsModal(false)}>
        <EnhancedSettingsPanel
          user={user}
          onClose={() => setShowSettingsModal(false)}
          onPinChangeClick={() => {
            setPinForm({ oldPin: "", newPin: "", confirmPin: "" });
            setPinError("");
            setShowSettingsModal(false);
            setShowPinChangeModal(true);
          }}
          onLogoutClick={handleLogout}
        />
      </Modal>

      {/* --- */}
      <Modal show={showPinChangeModal} onClose={() => setShowPinChangeModal(false)}>
        <ModalHeader title="Change PIN" onClose={() => setShowPinChangeModal(false)} />

        <div style={{ padding: "0 0 20px" }}>
          {/* Current PIN */}
          <label style={{ display: "block", marginBottom: 16, fontFamily: font }}>
            <p style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600, color: T.textPrimary }}>Current PIN</p>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              autoFocus
              value={pinForm.oldPin}
              onChange={(e) => setPinForm({ ...pinForm, oldPin: e.target.value.replace(/\D/g, "") })}
              placeholder="******"
              style={{
                width: "100%", padding: "14px 14px", borderRadius: 14,
                border: `1px solid ${T.border}`, background: T.bgElevated,
                color: T.textPrimary, fontSize: 16, fontFamily: font,
                letterSpacing: "2px", textAlign: "center",
                fontWeight: 600,
              }}
            />
          </label>

          {/* New PIN */}
          <label style={{ display: "block", marginBottom: 16, fontFamily: font }}>
            <p style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600, color: T.textPrimary }}>New PIN</p>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pinForm.newPin}
              onChange={(e) => setPinForm({ ...pinForm, newPin: e.target.value.replace(/\D/g, "") })}
              placeholder="******"
              style={{
                width: "100%", padding: "14px 14px", borderRadius: 14,
                border: `1px solid ${T.border}`, background: T.bgElevated,
                color: T.textPrimary, fontSize: 16, fontFamily: font,
                letterSpacing: "2px", textAlign: "center",
                fontWeight: 600,
              }}
            />
          </label>

          {/* Confirm PIN */}
          <label style={{ display: "block", marginBottom: 16, fontFamily: font }}>
            <p style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600, color: T.textPrimary }}>Confirm PIN</p>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pinForm.confirmPin}
              onChange={(e) => setPinForm({ ...pinForm, confirmPin: e.target.value.replace(/\D/g, "") })}
              placeholder="******"
              style={{
                width: "100%", padding: "14px 14px", borderRadius: 14,
                border: `1px solid ${T.border}`, background: T.bgElevated,
                color: T.textPrimary, fontSize: 16, fontFamily: font,
                letterSpacing: "2px", textAlign: "center",
                fontWeight: 600,
              }}
            />
          </label>

          {/* Error message */}
          {pinError && (
            <div style={{
              padding: "12px 14px", borderRadius: 12,
              background: "rgba(239,68,68,0.1)", border: `1px solid rgba(239,68,68,0.3)`,
              marginBottom: 16,
            }}>
              <p style={{ margin: 0, fontSize: 13, color: T.red, fontWeight: 600 }}>{pinError}</p>
            </div>
          )}

          {/* Update PIN button */}
          <button
            onClick={async () => {
              if (!pinForm.oldPin || !pinForm.newPin || !pinForm.confirmPin) {
                setPinError("All fields are required");
                return;
              }
              if (pinForm.newPin.length !== 6 || pinForm.oldPin.length !== 6) {
                setPinError("PIN must be 6 digits");
                return;
              }
              if (pinForm.newPin !== pinForm.confirmPin) {
                setPinError("New PINs don't match");
                return;
              }
              if (pinForm.oldPin === pinForm.newPin) {
                setPinError("New PIN must be different from current PIN");
                return;
              }
              setPinChangeLoading(true);
              try {
                const res = await fetch("/api/auth/change-pin", {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ currentPin: pinForm.oldPin, newPin: pinForm.newPin }),
                });
                if (!res.ok) {
                  const data = await res.json();
                  setPinError(data.message || "Failed to change PIN");
                  return;
                }
                toast.success("PIN changed successfully");
                setShowPinChangeModal(false);
                setPinForm({ oldPin: "", newPin: "", confirmPin: "" });
                setPinError("");
              } catch (err) {
                setPinError("An error occurred. Please try again.");
              } finally {
                setPinChangeLoading(false);
              }
            }}
            disabled={pinChangeLoading}
            style={{
              width: "100%", border: "none", borderRadius: 18,
              padding: "15px",
              background: pinChangeLoading ? T.textMuted : `linear-gradient(135deg, ${T.green}, #059669)`,
              color: "white", fontWeight: 700, fontSize: 16,
              cursor: pinChangeLoading ? "not-allowed" : "pointer", letterSpacing: "-0.2px",
              fontFamily: font,
              boxShadow: pinChangeLoading ? "none" : "0 8px 24px rgba(16,185,129,0.3)",
              opacity: pinChangeLoading ? 0.6 : 1,
            }}
          >
            {pinChangeLoading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Loader2 size={18} />
                Updating...
              </div>
            ) : (
              "Update PIN"
            )}
          </button>
        </div>
      </Modal>

    </div>
  );
}




