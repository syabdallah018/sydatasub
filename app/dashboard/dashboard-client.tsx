"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal,
  Key,
  Database,
  BookOpen,
  FileCode,
  ShieldCheck,
  Globe,
  Settings,
  PlusCircle,
  Copy,
  Check,
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Wallet,
  Receipt,
  UserCheck,
  Send,
  Building,
  User,
  ArrowRight,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Search,
  BookMarked,
  Info,
  HelpCircle,
  Lock,
  Eye,
  EyeOff
} from "lucide-react";
import { toast } from "sonner";

interface UserData {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  balance: number;
  rewardBalance?: number;
  tier: "user" | "agent";
  joinedAt?: string;
}

interface DevProfile {
  id: string;
  apiKey: string;
  webhookUrl: string | null;
  whitelistIps: string[];
  status: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
}

interface DataPlan {
  id: string;
  name: string;
  network: string;
  size: string;
  validity: string;
  user_price: number;
  agent_price: number;
}

interface DashboardClientProps {
  initialUser: UserData;
  initialDevProfile: DevProfile | null;
  initialPlans: DataPlan[];
}

type TabType = "overview" | "transactions" | "accounts" | "developer" | "plans" | "docs" | "settings";

const NETWORK_CODES: Record<string, number> = {
  MTN: 1,
  GLO: 2,
  NINEMOBILE: 3,
  AIRTEL: 4,
};

export default function DashboardClient({
  initialUser,
  initialDevProfile,
  initialPlans,
}: DashboardClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [user, setUser] = useState<UserData>(initialUser);
  const [devProfile, setDevProfile] = useState<DevProfile | null>(initialDevProfile);
  const [plans] = useState<DataPlan[]>(initialPlans);
  
  // Developer states
  const [requestingAccess, setRequestingAccess] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState(devProfile?.webhookUrl || "");
  const [ipsInput, setIpsInput] = useState(devProfile?.whitelistIps?.join(", ") || "");
  const [generatedCreds, setGeneratedCreds] = useState<{ apiKey: string; clientSecret: string } | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  // Search filter states
  const [searchPlan, setSearchPlan] = useState("");
  const [filterNetwork, setFilterNetwork] = useState("");

  // Sandbox purchase playground states
  const [sandboxPhone, setSandboxPhone] = useState("");
  const [sandboxPlanId, setSandboxPlanId] = useState("");
  const [sandboxNetworkId, setSandboxNetworkId] = useState(1);
  const [sandboxRef, setSandboxRef] = useState(`ref-${Date.now()}`);
  const [sandboxLoading, setSandboxLoading] = useState(false);
  const [sandboxResponse, setSandboxResponse] = useState<any>(null);

  // Quick purchase states
  const [quickPhone, setQuickPhone] = useState("");
  const [quickPlanId, setQuickPlanId] = useState("");
  const [quickLoading, setQuickLoading] = useState(false);

  // Transactions state
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [searchTx, setSearchTx] = useState("");

  // Virtual bank accounts
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [bankLoading, setBankLoading] = useState(false);

  // Change PIN states
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] = useState("");
  const [showPinFields, setShowPinFields] = useState(false);
  const [pinChangeLoading, setPinChangeLoading] = useState(false);

  // Documentation scroll / topic highlights
  const docsContentRef = useRef<HTMLDivElement>(null);
  const [activeDocSection, setActiveDocSection] = useState("doc-intro");

  const fetchTransactions = async () => {
    setTxLoading(true);
    try {
      const res = await fetch("/api/transactions");
      const data = await res.json();
      if (data.success) {
        setTransactions(data.transactions || []);
      }
    } catch {
      toast.error("Failed to load transactions");
    } finally {
      setTxLoading(false);
    }
  };

  const fetchBankAccounts = async () => {
    setBankLoading(true);
    try {
      const res = await fetch("/api/payments/accounts");
      const data = await res.json();
      if (data.success) {
        setBankAccounts(data.accounts || []);
      }
    } catch {
      toast.error("Failed to load funding accounts");
    } finally {
      setBankLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "transactions") {
      fetchTransactions();
    } else if (activeTab === "accounts") {
      fetchBankAccounts();
    }
  }, [activeTab]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast.success("Logged out successfully");
      router.push("/dashboard/auth");
    } catch {
      toast.error("Logout failed");
    }
  };

  const handleRequestDeveloperAccess = async () => {
    setRequestingAccess(true);
    try {
      const res = await fetch("/api/developer/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.success) {
        setDevProfile(data.profile);
        toast.success("Developer access request submitted successfully.");
      } else {
        toast.error(data.error || "Submission failed.");
      }
    } catch {
      toast.error("Network error submitting request.");
    } finally {
      setRequestingAccess(false);
    }
  };

  const handleSaveDeveloperSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingProfile(true);
    const ipList = ipsInput
      .split(",")
      .map((ip) => ip.trim())
      .filter((ip) => ip.length > 0);

    try {
      const res = await fetch("/api/developer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl: webhookUrl || null,
          whitelistIps: ipList,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDevProfile(data.profile);
        toast.success("API settings saved successfully!");
      } else {
        toast.error(data.error || "Settings save failed.");
      }
    } catch {
      toast.error("Network error saving configurations.");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleRegenerateKeys = async () => {
    if (!confirm("Caution: This will immediately revoke your old developer API credentials! Proceed?")) return;
    setRegenerating(true);
    try {
      const res = await fetch("/api/developer/profile/regenerate", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedCreds({
          apiKey: data.apiKey,
          clientSecret: data.clientSecret,
        });
        setDevProfile((prev: any) => ({ ...prev, apiKey: data.apiKey }));
        toast.success("New API credentials generated!");
      } else {
        toast.error(data.error || "Regeneration failed.");
      }
    } catch {
      toast.error("Network error regenerating credentials.");
    } finally {
      setRegenerating(false);
    }
  };

  const executeSandboxPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!devProfile || devProfile.status !== "APPROVED") {
      toast.error("Sandbox API is only available for approved developers.");
      return;
    }
    setSandboxLoading(true);
    setSandboxResponse(null);

    try {
      const res = await fetch("/api/data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": devProfile.apiKey,
        },
        body: JSON.stringify({
          phone: sandboxPhone,
          networkId: Number(sandboxNetworkId),
          planId: Number(sandboxPlanId),
          reference: sandboxRef,
        }),
      });
      const data = await res.json();
      setSandboxResponse({
        status: res.status,
        body: data,
      });

      if (data.success) {
        toast.success("Sandbox request processed successfully!");
        fetch("/api/auth/me")
          .then((r) => r.json())
          .then((d) => {
            if (d.user) setUser((prev) => ({ ...prev, balance: d.user.balance }));
          });
      } else {
        toast.error(data.error || "Sandbox API purchase failed");
      }
    } catch (err: any) {
      setSandboxResponse({
        status: 500,
        body: { success: false, error: err.message },
      });
      toast.error("Connection error running Sandbox playground.");
    } finally {
      setSandboxLoading(false);
      setSandboxRef(`ref-${Date.now()}`);
    }
  };

  const executeQuickBuyData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPlanId || !quickPhone) return;
    setQuickLoading(true);
    try {
      const res = await fetch("/api/data/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: quickPlanId,
          buyerPhone: user.phone,
          recipientPhone: quickPhone,
          pin: "000000",
          confirmDuplicate: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Data purchase successful!");
        setQuickPhone("");
        // Reload user info
        const meRes = await fetch("/api/auth/me");
        const meData = await meRes.json();
        if (meData.user) {
          setUser(meData.user);
        }
      } else {
        toast.error(data.error || "Purchase failed");
      }
    } catch {
      toast.error("Network error making purchase");
    } finally {
      setQuickLoading(false);
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 6 || confirmNewPin.length !== 6) {
      toast.error("PIN must be exactly 6 digits.");
      return;
    }
    if (newPin !== confirmNewPin) {
      toast.error("New PIN entries do not match.");
      return;
    }

    setPinChangeLoading(true);
    try {
      const res = await fetch("/api/auth/change-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPin,
          newPin,
          confirmNewPin,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("PIN changed successfully!");
        setCurrentPin("");
        setNewPin("");
        setConfirmNewPin("");
      } else {
        toast.error(data.error || "Failed to update PIN");
      }
    } catch {
      toast.error("Connection issue changing transaction PIN.");
    } finally {
      setPinChangeLoading(false);
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const scrollToDocSection = (id: string) => {
    setActiveDocSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="flex min-h-screen bg-[#fbfbfd]">
      {/* Sidebar Navigation */}
      <div className="w-72 bg-slate-900 text-white flex flex-col justify-between border-r border-slate-800 shrink-0 h-screen sticky top-0">
        <div>
          {/* Brand Header */}
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
            <img src="/logo.jpeg" alt="SY DATA" className="h-10 w-10 rounded-xl object-cover" />
            <div>
              <span className="font-extrabold text-lg tracking-tight block">SY DATA SUB</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Desktop Portal</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="p-4 space-y-1">
            <button
              onClick={() => setActiveTab("overview")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                activeTab === "overview" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <LayoutDashboard size={18} />
              Overview
            </button>
            <button
              onClick={() => setActiveTab("transactions")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                activeTab === "transactions" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Receipt size={18} />
              Transactions
            </button>
            <button
              onClick={() => setActiveTab("accounts")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                activeTab === "accounts" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Building size={18} />
              Virtual Accounts
            </button>
            
            <div className="pt-4 pb-2 px-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Developer Center</span>
            </div>

            <button
              onClick={() => setActiveTab("developer")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                activeTab === "developer" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Terminal size={18} />
              Developer keys & settings
            </button>
            <button
              onClick={() => setActiveTab("plans")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                activeTab === "plans" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Database size={18} />
              Data Plans Catalog
            </button>
            <button
              onClick={() => setActiveTab("docs")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                activeTab === "docs" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <BookOpen size={18} />
              API Documentation
            </button>

            <div className="pt-4 pb-2 px-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Account Settings</span>
            </div>

            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                activeTab === "settings" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Settings size={18} />
              Profile & Security
            </button>
          </div>
        </div>

        {/* User Profile at the bottom */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="h-10 w-10 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center font-bold">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <span className="font-bold text-sm block truncate text-slate-100">{user.fullName}</span>
              <span className="text-xs text-slate-400 truncate block">{user.phone}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-bold transition"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 shadow-sm select-none">
          <h2 className="text-xl font-bold text-slate-800 capitalize">
            {activeTab === "developer" ? "Developer keys & settings" : activeTab}
          </h2>
          <div className="flex items-center gap-6">
            <div className="bg-blue-50/70 border border-blue-100 px-4 py-2 rounded-xl flex items-center gap-3">
              <Wallet className="text-blue-600" size={18} />
              <div>
                <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Main Wallet</span>
                <span className="font-extrabold text-slate-800 text-sm">
                  ₦{(user.balance / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            
            {user.rewardBalance !== undefined && user.rewardBalance > 0 && (
              <div className="bg-green-50/70 border border-green-100 px-4 py-2 rounded-xl flex items-center gap-3">
                <Check className="text-green-600" size={18} />
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Data Bonus</span>
                  <span className="font-extrabold text-slate-800 text-sm">
                    ₦{(user.rewardBalance / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Dynamic Tab Rendering */}
        <main className="p-8 flex-1">
          <AnimatePresence mode="wait">
            
            {/* 1. Overview Tab */}
            {activeTab === "overview" && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              >
                <div className="lg:col-span-2 space-y-8">
                  {/* Quick purchase card */}
                  <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <PlusCircle className="text-blue-600" size={20} />
                      Quick Data Purchase
                    </h3>
                    <form onSubmit={executeQuickBuyData} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-2 uppercase tracking-wide">Recipient Phone</label>
                        <input
                          type="tel"
                          required
                          value={quickPhone}
                          onChange={(e) => setQuickPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                          placeholder="08012345678"
                          className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-2 uppercase tracking-wide">Select Plan</label>
                        <select
                          required
                          value={quickPlanId}
                          onChange={(e) => setQuickPlanId(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition"
                        >
                          <option value="">-- Choose Plan --</option>
                          {plans.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.network} {p.name} ({p.size}) - ₦{p.user_price}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="submit"
                        disabled={quickLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                      >
                        {quickLoading ? <Loader2 className="animate-spin" size={18} /> : "Buy Subscription"}
                      </button>
                    </form>
                  </div>

                  {/* Pricing Overview grid */}
                  <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Available Data Plans Catalog</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-slate-500">
                        <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-xs">
                          <tr>
                            <th className="px-4 py-3">Plan Name</th>
                            <th className="px-4 py-3">Network</th>
                            <th className="px-4 py-3">Data Size</th>
                            <th className="px-4 py-3">Validity</th>
                            <th className="px-4 py-3">Retail Price</th>
                            <th className="px-4 py-3">Agent Price</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {plans.slice(0, 8).map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3 text-slate-900">{p.name}</td>
                              <td className="px-4 py-3">{p.network}</td>
                              <td className="px-4 py-3">{p.size}</td>
                              <td className="px-4 py-3">{p.validity}</td>
                              <td className="px-4 py-3 text-blue-600">₦{p.user_price}</td>
                              <td className="px-4 py-3 text-green-600">₦{p.agent_price}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Right Column details */}
                <div className="space-y-8">
                  <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 rounded-3xl p-6 text-white shadow-xl">
                    <h4 className="text-xs font-bold text-blue-100 uppercase tracking-widest">Fintech Wallet Card</h4>
                    <div className="mt-8">
                      <span className="text-[10px] text-blue-200 font-bold uppercase tracking-wider block">Total Balance</span>
                      <h3 className="text-3xl font-extrabold mt-1">
                        ₦{((user.balance + (user.rewardBalance || 0)) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </h3>
                    </div>
                    <div className="mt-8 flex justify-between border-t border-blue-500/30 pt-4 text-xs">
                      <div>
                        <span className="text-blue-200 block text-[10px]">Client Name</span>
                        <span className="font-bold">{user.fullName}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-blue-200 block text-[10px]">Account Tier</span>
                        <span className="font-bold uppercase tracking-wider bg-blue-500 px-2 py-0.5 rounded text-[10px]">
                          {user.tier}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dev settings portal widget */}
                  <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm text-center">
                    <Terminal size={32} className="mx-auto text-blue-600 mb-3" />
                    <h4 className="font-bold text-slate-800">Developer Integrations</h4>
                    <p className="text-xs text-slate-500 mt-1">Automate bundle distribution using API endpoints.</p>
                    <button
                      onClick={() => setActiveTab("developer")}
                      className="mt-4 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition inline-flex items-center gap-2"
                    >
                      Manage API Keys <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 2. Transactions Tab */}
            {activeTab === "transactions" && (
              <motion.div
                key="transactions"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-6"
              >
                <div className="flex flex-wrap justify-between items-center gap-4">
                  <h3 className="text-lg font-bold text-slate-800">Transaction History</h3>
                  <div className="relative w-80">
                    <input
                      type="text"
                      placeholder="Search phone or reference..."
                      value={searchTx}
                      onChange={(e) => setSearchTx(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                    />
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                  </div>
                </div>

                {txLoading ? (
                  <div className="text-center py-12">
                    <Loader2 className="animate-spin mx-auto text-blue-600" size={32} />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-500">
                      <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-xs">
                        <tr>
                          <th className="px-4 py-3">Reference</th>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3">Amount</th>
                          <th className="px-4 py-3">Recipient</th>
                          <th className="px-4 py-3">Description</th>
                          <th className="px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {transactions
                          .filter(
                            (t) =>
                              t.reference.toLowerCase().includes(searchTx.toLowerCase()) ||
                              (t.phone && t.phone.includes(searchTx))
                          )
                          .map((t) => (
                            <tr key={t.id} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3 font-mono text-xs text-slate-900 flex items-center gap-1">
                                {t.reference}
                                <button onClick={() => copyText(t.reference)} className="text-slate-400 hover:text-blue-500 p-0.5">
                                  <Copy size={10} />
                                </button>
                              </td>
                              <td className="px-4 py-3 text-xs">{new Date(t.createdAt).toLocaleString()}</td>
                              <td className="px-4 py-3 text-xs font-semibold">{t.type}</td>
                              <td className="px-4 py-3 text-slate-900 font-bold">₦{t.amount}</td>
                              <td className="px-4 py-3">{t.phone || "—"}</td>
                              <td className="px-4 py-3 text-xs max-w-xs truncate">{t.description}</td>
                              <td className="px-4 py-3">
                                <span
                                  className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                    t.status === "SUCCESS"
                                      ? "bg-green-50 text-green-700 border border-green-200"
                                      : t.status === "FAILED"
                                      ? "bg-red-50 text-red-700 border border-red-200"
                                      : "bg-amber-50 text-amber-700 border border-amber-200"
                                  }`}
                                >
                                  {t.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            )}

            {/* 3. Virtual Accounts Tab */}
            {activeTab === "accounts" && (
              <motion.div
                key="accounts"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-6"
              >
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Dynamic Bank Funding Accounts</h3>
                  <p className="text-slate-500 text-sm mt-1">Transfer money to any assigned account below to credit your main wallet balance instantly.</p>
                </div>

                {bankLoading ? (
                  <div className="text-center py-12">
                    <Loader2 className="animate-spin mx-auto text-blue-600" size={32} />
                  </div>
                ) : bankAccounts.length === 0 ? (
                  <div className="bg-slate-50 text-slate-500 rounded-2xl p-6 text-center text-sm border border-slate-100">
                    No virtual bank accounts assigned. Please fund via Flutterwave gateway.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {bankAccounts.map((acc) => (
                      <div key={acc.id} className="bg-slate-50 border border-slate-200/60 rounded-2xl p-6 relative overflow-hidden">
                        <div className="absolute right-4 top-4 opacity-5 text-slate-900">
                          <Building size={80} />
                        </div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{acc.bankName}</h4>
                        <div className="mt-4">
                          <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wide">Account Number</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-2xl font-mono font-extrabold text-slate-800">{acc.accountNumber}</span>
                            <button onClick={() => copyText(acc.accountNumber)} className="text-slate-400 hover:text-blue-600 transition p-1">
                              <Copy size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="mt-4">
                          <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wide">Account Name</span>
                          <span className="font-semibold text-slate-700 text-sm block mt-1">{acc.accountName || "SY DATA SUB Account"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* 4. Developer Keys & Settings Tab */}
            {activeTab === "developer" && (
              <motion.div
                key="developer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="space-y-8"
              >
                {!devProfile && (
                  <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm text-center max-w-2xl mx-auto">
                    <Terminal size={48} className="mx-auto text-blue-600 mb-4 animate-pulse" />
                    <h3 className="text-xl font-bold text-slate-800">Become a Partner Developer</h3>
                    <p className="text-slate-500 mt-2 text-sm max-w-lg mx-auto">
                      Access programmatic endpoints to integrate data sales. Query plans, submit sales directly from your server, and get automated webhook callbacks on resolution.
                    </p>
                    <button
                      onClick={handleRequestDeveloperAccess}
                      disabled={requestingAccess}
                      className="mt-6 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50"
                    >
                      {requestingAccess ? <Loader2 className="animate-spin" size={18} /> : "Request API Sandbox Access"}
                    </button>
                  </div>
                )}

                {devProfile && devProfile.status === "PENDING" && (
                  <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm text-center max-w-2xl mx-auto">
                    <Loader2 size={48} className="mx-auto text-amber-500 mb-4 animate-spin" />
                    <h3 className="text-xl font-bold text-slate-800">Developer Access Reviewing</h3>
                    <p className="text-slate-500 mt-2 text-sm max-w-lg mx-auto">
                      Your request to access Developer Credentials has been received and is undergoing validation by our admins. You will receive access credentials once approved.
                    </p>
                    <div className="mt-4 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 py-1.5 px-3 rounded-full inline-block">
                      Status: Pending Approval
                    </div>
                  </div>
                )}

                {devProfile && devProfile.status === "REJECTED" && (
                  <div className="bg-white rounded-3xl border border-rose-100 p-8 shadow-sm text-center max-w-2xl mx-auto">
                    <AlertTriangle size={48} className="mx-auto text-rose-500 mb-4" />
                    <h3 className="text-xl font-bold text-slate-800">Developer Access Rejected</h3>
                    <p className="text-slate-500 mt-2 text-sm max-w-lg mx-auto">
                      Unfortunately, your developer application was declined by the administrator. Please contact customer support for appeal parameters.
                    </p>
                  </div>
                )}

                {devProfile && devProfile.status === "APPROVED" && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Credentials & Webhook configs */}
                    <div className="lg:col-span-1 space-y-8">
                      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-6">
                        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                          <Key className="text-blue-600" size={18} />
                          API Sandbox Access
                        </h3>

                        <div className="space-y-2">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">API Client Key</span>
                          <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-3 items-center justify-between font-mono text-xs">
                            <span className="truncate pr-2 text-slate-700">{devProfile.apiKey}</span>
                            <button onClick={() => copyText(devProfile.apiKey)} className="text-slate-400 hover:text-blue-500">
                              <Copy size={14} />
                            </button>
                          </div>
                        </div>

                        <button
                          onClick={handleRegenerateKeys}
                          disabled={regenerating}
                          className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition disabled:opacity-50"
                        >
                          <RefreshCw className={regenerating ? "animate-spin" : ""} size={14} />
                          Generate New API Key
                        </button>
                      </div>

                      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
                          <Globe className="text-blue-600" size={18} />
                          API Whitelists & Webhooks
                        </h3>
                        <form onSubmit={handleSaveDeveloperSettings} className="space-y-4">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Webhook URL</label>
                            <input
                              type="url"
                              value={webhookUrl}
                              onChange={(e) => setWebhookUrl(e.target.value)}
                              placeholder="https://yourserver.com/api/data-webhook"
                              className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">IP Whitelist (comma separated)</label>
                            <input
                              type="text"
                              value={ipsInput}
                              onChange={(e) => setIpsInput(e.target.value)}
                              placeholder="127.0.0.1, 192.168.1.1"
                              className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 font-mono"
                            />
                            <span className="text-[9px] text-slate-400 mt-1 block font-semibold">Leave empty to allow calls from any IP address.</span>
                          </div>

                          <button
                            type="submit"
                            disabled={updatingProfile}
                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {updatingProfile ? <Loader2 className="animate-spin" size={14} /> : "Save Configuration"}
                          </button>
                        </form>
                      </div>
                    </div>

                    {/* Interactive Sandbox purchase playground */}
                    <div className="lg:col-span-2 space-y-8">
                      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
                          <Settings className="text-blue-600" size={18} />
                          API Sandbox Playground
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <form onSubmit={executeSandboxPurchase} className="space-y-4">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Recipient Number</label>
                              <input
                                type="tel"
                                required
                                value={sandboxPhone}
                                onChange={(e) => setSandboxPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                                placeholder="08164135836"
                                className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Network ID</label>
                                <select
                                  value={sandboxNetworkId}
                                  onChange={(e) => setSandboxNetworkId(Number(e.target.value))}
                                  className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500"
                                >
                                  <option value={1}>MTN (1)</option>
                                  <option value={2}>Glo (2)</option>
                                  <option value={3}>9mobile (3)</option>
                                  <option value={4}>Airtel (4)</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Data Plan</label>
                                <select
                                  required
                                  value={sandboxPlanId}
                                  onChange={(e) => setSandboxPlanId(e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500"
                                >
                                  <option value="">-- Select --</option>
                                  {plans
                                    .filter((p) => NETWORK_CODES[p.network] === sandboxNetworkId)
                                    .map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.name} ({p.size}) - ₦{p.user_price}
                                      </option>
                                    ))}
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">API reference</label>
                              <input
                                type="text"
                                required
                                value={sandboxRef}
                                onChange={(e) => setSandboxRef(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 font-mono"
                              />
                            </div>

                            <button
                              type="submit"
                              disabled={sandboxLoading || !sandboxPlanId || !sandboxPhone}
                              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              {sandboxLoading ? <Loader2 className="animate-spin" size={14} /> : "Execute Sandbox API Call"}
                            </button>
                          </form>

                          {/* Console output display */}
                          <div className="flex flex-col border border-slate-100 rounded-2xl overflow-hidden bg-slate-900 text-slate-200 p-4 font-mono text-[10px] min-h-[220px]">
                            <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider border-b border-slate-800 pb-2 mb-3">API Console Output</span>
                            {sandboxResponse ? (
                              <div className="flex-1 overflow-y-auto space-y-3">
                                <div>
                                  <span className="text-slate-500">Status Code:</span>
                                  <span className={`ml-2 font-bold ${sandboxResponse.status === 200 ? "text-green-400" : "text-red-400"}`}>
                                    {sandboxResponse.status}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-500">Response Payload:</span>
                                  <pre className="mt-2 text-slate-300 max-h-48 overflow-y-auto">
                                    {JSON.stringify(sandboxResponse.body, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            ) : (
                              <div className="flex-1 flex items-center justify-center text-slate-500 italic font-semibold">
                                Waiting to execute sandbox API call...
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* 5. Data Plans Catalog Tab */}
            {activeTab === "plans" && (
              <motion.div
                key="plans"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-6"
              >
                <div className="flex flex-wrap justify-between items-center gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">System Data Plans Catalog</h3>
                    <p className="text-slate-500 text-sm mt-1">Use these Plan IDs in your `/api/data` purchase requests.</p>
                  </div>

                  <div className="flex gap-3">
                    <select
                      value={filterNetwork}
                      onChange={(e) => setFilterNetwork(e.target.value)}
                      className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-500"
                    >
                      <option value="">All Networks</option>
                      <option value="MTN">MTN</option>
                      <option value="GLO">Glo</option>
                      <option value="AIRTEL">Airtel</option>
                      <option value="NINEMOBILE">9mobile</option>
                    </select>

                    <div className="relative w-64">
                      <input
                        type="text"
                        placeholder="Search plans name..."
                        value={searchPlan}
                        onChange={(e) => setSearchPlan(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                      />
                      <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-500">
                    <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-xs text-nowrap">
                      <tr>
                        <th className="px-4 py-3">Plan ID</th>
                        <th className="px-4 py-3">Plan Name</th>
                        <th className="px-4 py-3">Network</th>
                        <th className="px-4 py-3">Network ID</th>
                        <th className="px-4 py-3">Data Size</th>
                        <th className="px-4 py-3">Validity</th>
                        <th className="px-4 py-3">Retail Price</th>
                        <th className="px-4 py-3">Agent Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {plans
                        .filter(
                          (p) =>
                            p.name.toLowerCase().includes(searchPlan.toLowerCase()) &&
                            (filterNetwork === "" || p.network === filterNetwork)
                        )
                        .map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-mono text-xs text-slate-900 flex items-center gap-1.5">
                              {p.id}
                              <button onClick={() => copyText(String(p.id))} className="text-slate-400 hover:text-blue-500 p-0.5">
                                <Copy size={10} />
                              </button>
                            </td>
                            <td className="px-4 py-3 text-slate-900">{p.name}</td>
                            <td className="px-4 py-3">{p.network}</td>
                            <td className="px-4 py-3 font-mono text-xs">{NETWORK_CODES[p.network]}</td>
                            <td className="px-4 py-3">{p.size}</td>
                            <td className="px-4 py-3">{p.validity}</td>
                            <td className="px-4 py-3 text-blue-600 font-bold">₦{p.user_price}</td>
                            <td className="px-4 py-3 text-green-600 font-bold">₦{p.agent_price}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* 6. Fully Structured API Documentation Tab */}
            {activeTab === "docs" && (
              <motion.div
                key="docs"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col h-[calc(100vh-130px)] -mt-8 -mx-8 -mb-8 select-text bg-white overflow-hidden relative"
              >
                {/* Horizontal Sticky Top Nav Bar */}
                <div className="sticky top-0 bg-slate-50 border-b border-slate-200/80 px-8 py-3.5 flex gap-2 overflow-x-auto z-20 shrink-0 no-scrollbar select-none">
                  {[
                    { id: "doc-intro", label: "Introduction" },
                    { id: "doc-auth", label: "Authentication" },
                    { id: "doc-balance", label: "GET /api/balance" },
                    { id: "doc-plans", label: "GET /api/plans" },
                    { id: "doc-purchase", label: "POST /api/data" },
                    { id: "doc-query", label: "GET /api/data/[ref]" },
                    { id: "doc-webhooks", label: "Webhooks Setup" },
                    { id: "doc-errors", label: "Error Codes" }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => scrollToDocSection(item.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all text-nowrap whitespace-nowrap ${
                        activeDocSection === item.id 
                          ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" 
                          : "bg-white hover:bg-slate-100 text-slate-650 border border-slate-200/60"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* Scrolled Content Area */}
                <div 
                  ref={docsContentRef} 
                  className="flex-1 overflow-y-auto px-8 py-10 space-y-8 scroll-smooth"
                >
                  {/* Topic: Intro */}
                  <section id="doc-intro" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-7 space-y-4">
                      <h3 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-blue-600"></span>
                        Introduction
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        Welcome to the SY DATA SUB Developer API documentation! This guide details how to integrate mobile data bundle sales programmatically.
                      </p>
                      <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 flex gap-3 text-blue-800 text-xs font-semibold leading-relaxed">
                        <Info className="shrink-0 text-blue-600 mt-0.5" size={16} />
                        <div>
                          <span className="font-bold text-sm">Protocol Requirement</span>
                          <p className="mt-1">
                            All requests must be made over <span className="font-semibold text-blue-900">HTTPS</span>. Re-validate your balances before execution, as data orders automatically trigger wallet debits.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="lg:col-span-5 bg-slate-950 border border-slate-800 p-5 rounded-2xl font-mono text-xs text-slate-300 shadow-xl space-y-3">
                      <span className="text-slate-500 block border-b border-slate-800 pb-2 uppercase tracking-widest text-[10px] font-bold">API Base URL</span>
                      <div className="flex items-center justify-between text-sky-400 font-bold select-all bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                        <span>https://sydatasub.com</span>
                        <button onClick={() => copyText("https://sydatasub.com")} className="text-slate-400 hover:text-slate-200">
                          <Copy size={12} />
                        </button>
                      </div>
                    </div>
                  </section>

                  <hr className="border-slate-200/60" />

                  {/* Topic: Auth */}
                  <section id="doc-auth" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-7 space-y-4">
                      <h3 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-blue-600"></span>
                        Authentication
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        Access to our developer API endpoints is validated using custom HTTP header parameters. Authentication is simple: pass your raw API Key inside the <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-600 font-bold">X-API-Key</code> header of all requests.
                      </p>
                      <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-4 flex gap-3 text-amber-800 text-xs font-semibold leading-relaxed">
                        <AlertTriangle className="shrink-0 text-amber-600 mt-0.5" size={16} />
                        <div>
                          <span className="font-bold text-sm">Credential Confidentiality</span>
                          <p className="mt-1">
                            Your API Key acts as your credential to debit your account. Never commit it to version control systems or client-facing application code.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-5 bg-slate-955 text-slate-300 p-5 rounded-2xl border border-slate-800 font-mono text-xs shadow-xl space-y-3">
                      <span className="text-slate-500 block border-b border-slate-800 pb-2 uppercase tracking-widest text-[10px] font-bold">Required Headers</span>
                      <div className="space-y-1.5 p-3 bg-slate-900 rounded-lg border border-slate-800 text-slate-200">
                        <p><span className="text-slate-400">Content-Type:</span> <span className="text-emerald-450">"application/json"</span></p>
                        <p><span className="text-slate-400">X-API-Key:</span> <span className="text-sky-300">"sy_live_c8588b0e..."</span></p>
                      </div>
                    </div>
                  </section>

                  <hr className="border-slate-200/60" />

                  {/* Topic: GET Balance */}
                  <section id="doc-balance" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-7 space-y-4">
                      <h3 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-blue-600"></span>
                        Check Wallet Balance
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        Query your current wallet balance in both Naira and Kobo formats. Useful for pre-purchase balance assertions.
                      </p>
                      <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-150 max-w-xs">
                        <span className="px-2 py-0.5 bg-blue-600 text-white font-bold rounded text-[10px]">GET</span>
                        <code className="text-xs font-mono font-bold text-slate-850">/api/balance</code>
                      </div>
                    </div>

                    <div className="lg:col-span-5 bg-slate-950 text-slate-300 p-5 rounded-2xl border border-slate-800 font-mono text-xs shadow-xl space-y-3">
                      <span className="text-slate-500 block border-b border-slate-800 pb-2 uppercase tracking-widest text-[10px] font-bold">Sample Response (200 OK)</span>
                      <pre className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-sky-300 whitespace-pre-wrap select-all leading-relaxed">
{`{
  "success": true,
  "balance": 12540.50, // In Naira
  "balanceKobo": 1254050, // In Kobo
  "currency": "NGN"
}`}
                      </pre>
                    </div>
                  </section>

                  <hr className="border-slate-200/60" />

                  {/* Topic: GET Plans */}
                  <section id="doc-plans" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-7 space-y-6">
                      <div className="space-y-4">
                        <h3 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-blue-600"></span>
                          1. Retrieve Active Plans
                        </h3>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          Retrieve all active mobile data subscription plans, containing prices adjusted to your customer tier (Retail vs. Agent). Note that the returned plan ID is an **Integer** (not a long database string).
                        </p>
                        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-150 max-w-xs">
                          <span className="px-2 py-0.5 bg-blue-600 text-white font-bold rounded text-[10px]">GET</span>
                          <code className="text-xs font-mono font-bold text-slate-850">/api/plans</code>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-bold text-slate-850 text-xs uppercase tracking-wider">Plan Attributes</h4>
                        <div className="overflow-x-auto border border-slate-150 rounded-2xl">
                          <table className="w-full text-left text-sm text-slate-500">
                            <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-xs border-b border-slate-150">
                              <tr>
                                <th className="px-4 py-2.5">Field</th>
                                <th className="px-4 py-2.5">Type</th>
                                <th className="px-4 py-2.5">Description</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-semibold text-slate-655">
                              <tr>
                                <td className="px-4 py-3 font-mono text-blue-600 text-xs">id</td>
                                <td className="px-4 py-3 text-slate-405 text-xs">Integer</td>
                                <td className="px-4 py-3 text-xs">The unique Plan ID. Use this integer key in purchase requests.</td>
                              </tr>
                              <tr>
                                <td className="px-4 py-3 font-mono text-blue-600 text-xs">name</td>
                                <td className="px-4 py-3 text-slate-405 text-xs">String</td>
                                <td className="px-4 py-3 text-xs">Display name of the data plan.</td>
                              </tr>
                              <tr>
                                <td className="px-4 py-3 font-mono text-blue-600 text-xs">network</td>
                                <td className="px-4 py-3 text-slate-405 text-xs">String</td>
                                <td className="px-4 py-3 text-xs">MTN, GLO, AIRTEL, or 9MOBILE.</td>
                              </tr>
                              <tr>
                                <td className="px-4 py-3 font-mono text-blue-600 text-xs">price</td>
                                <td className="px-4 py-3 text-slate-405 text-xs">Integer</td>
                                <td className="px-4 py-3 text-xs">Cost of the plan in Naira.</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-5 bg-slate-950 text-slate-300 p-5 rounded-2xl border border-slate-800 font-mono text-xs shadow-xl space-y-3">
                      <span className="text-slate-500 block border-b border-slate-800 pb-2 uppercase tracking-widest text-[10px] font-bold">Sample Response (200 OK)</span>
                      <pre className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-sky-300 whitespace-pre-wrap select-all leading-relaxed">
{`{
  "success": true,
  "plans": [
    {
      "id": 125, // Integer ID
      "name": "MTN SME 1GB",
      "network": "MTN",
      "networkId": 1,
      "size": "1GB",
      "validity": "30 Days",
      "price": 240
    }
  ]
}`}
                      </pre>
                    </div>
                  </section>

                  <hr className="border-slate-200/60" />

                  {/* Topic: POST Purchase */}
                  <section id="doc-purchase" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-7 space-y-6">
                      <div className="space-y-4">
                        <h3 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-blue-600"></span>
                          2. Buy Data Subscription
                        </h3>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          Submit a data purchase transaction. The reference identifier must be unique globally across your transactions history logs. Pass the integer `planId` key retrieved from `/api/plans`.
                        </p>
                        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-150 max-w-xs">
                          <span className="px-2.5 py-0.5 bg-green-650 text-white font-bold rounded text-[10px]">POST</span>
                          <code className="text-xs font-mono font-bold text-slate-850">/api/data</code>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-bold text-slate-855 text-xs uppercase tracking-wider">Request Parameters (JSON)</h4>
                        <div className="overflow-x-auto border border-slate-150 rounded-2xl">
                          <table className="w-full text-left text-sm text-slate-500">
                            <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-xs border-b border-slate-150">
                              <tr>
                                <th className="px-4 py-2.5">Field</th>
                                <th className="px-4 py-2.5">Type</th>
                                <th className="px-4 py-2.5">Required</th>
                                <th className="px-4 py-2.5">Description</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-semibold text-slate-655">
                              <tr>
                                <td className="px-4 py-3 font-mono text-blue-600 text-xs">phone</td>
                                <td className="px-4 py-3 text-slate-405 text-xs">String</td>
                                <td className="px-4 py-3 text-red-500 font-bold text-xs">Yes</td>
                                <td className="px-4 py-3 text-xs">Recipient's 11-digit phone number (e.g. 08164135836)</td>
                              </tr>
                              <tr>
                                <td className="px-4 py-3 font-mono text-blue-600 text-xs">networkId</td>
                                <td className="px-4 py-3 text-slate-405 text-xs">Integer</td>
                                <td className="px-4 py-3 text-red-500 font-bold text-xs">Yes</td>
                                <td className="px-4 py-3 text-xs">Provider key: 1=MTN, 2=Glo, 3=9mobile, 4=Airtel</td>
                              </tr>
                              <tr>
                                <td className="px-4 py-3 font-mono text-blue-600 text-xs">planId</td>
                                <td className="px-4 py-3 text-slate-405 text-xs">Integer</td>
                                <td className="px-4 py-3 text-red-500 font-bold text-xs">Yes</td>
                                <td className="px-4 py-3 text-xs">The integer Plan ID retrieved from `/api/plans`</td>
                              </tr>
                              <tr>
                                <td className="px-4 py-3 font-mono text-blue-600 text-xs">reference</td>
                                <td className="px-4 py-3 text-slate-405 text-xs">String</td>
                                <td className="px-4 py-3 text-red-500 font-bold text-xs">Yes</td>
                                <td className="px-4 py-3 text-xs">A unique client-side transaction trace key (alphanumeric, no spaces)</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-5 space-y-4">
                      <div className="bg-slate-950 text-slate-300 p-5 rounded-2xl border border-slate-800 font-mono text-xs shadow-xl space-y-3">
                        <span className="text-slate-500 block border-b border-slate-800 pb-2 uppercase tracking-widest text-[10px] font-bold">Sample Request Payload</span>
                        <pre className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-sky-300 whitespace-pre-wrap select-all leading-relaxed">
{`{
  "phone": "08164135836",
  "networkId": 1,
  "planId": 125, // Integer ID
  "reference": "tx-unique-trace-983"
}`}
                        </pre>
                      </div>

                      <div className="bg-slate-955 text-slate-300 p-5 rounded-2xl border border-slate-800 font-mono text-xs shadow-xl space-y-3">
                        <span className="text-slate-550 block border-b border-slate-800 pb-2 uppercase tracking-widest text-[10px] font-bold">Sample Success Response (200 OK)</span>
                        <pre className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-sky-300 whitespace-pre-wrap select-all leading-relaxed">
{`{
  "success": true,
  "reference": "tx-unique-trace-983",
  "externalReference": "API-C-7289139",
  "status": "SUCCESS",
  "message": "You have successfully transferred MTN SME 1GB to 08164135836"
}`}
                        </pre>
                      </div>
                    </div>
                  </section>

                  <hr className="border-slate-200/60" />

                  {/* Topic: GET Single Ref */}
                  <section id="doc-query" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-7 space-y-4">
                      <h3 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-blue-600"></span>
                        3. Retrieve Transaction Details
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        Verify the resolution, delivery notes, and timestamp metadata of a previous transaction by querying its reference.
                      </p>
                      <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-150">
                        <span className="px-2 py-0.5 bg-blue-600 text-white font-bold rounded text-[10px]">GET</span>
                        <code className="text-xs font-mono font-bold text-slate-850">/api/data/[reference]</code>
                      </div>
                    </div>

                    <div className="lg:col-span-5 bg-slate-950 text-slate-300 p-5 rounded-2xl border border-slate-800 font-mono text-xs shadow-xl space-y-3">
                      <span className="text-slate-500 block border-b border-slate-800 pb-2 uppercase tracking-widest text-[10px] font-bold">Sample Response (200 OK)</span>
                      <pre className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-sky-300 whitespace-pre-wrap select-all leading-relaxed">
{`{
  "success": true,
  "transaction": {
    "id": "tx_cuid_key_abc",
    "reference": "tx-unique-trace-983",
    "externalReference": "API-C-7289139",
    "type": "DATA_PURCHASE",
    "status": "SUCCESS",
    "amount": 240,
    "recipient": "08164135836",
    "description": "Developer API: MTN SME 1GB -> 08164135836",
    "createdAt": "2026-07-19T00:00:00.000Z",
    "updatedAt": "2026-07-19T00:00:02.000Z"
  }
}`}
                      </pre>
                    </div>
                  </section>

                  <hr className="border-slate-200/60" />

                  {/* Topic: Webhooks */}
                  <section id="doc-webhooks" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-7 space-y-4">
                      <h3 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-blue-600"></span>
                        Webhooks Setup
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        Configure your webhook endpoint to receive asynchronous updates when transactions complete. We push payload events via POST and sign the payload.
                      </p>
                      <div className="space-y-1.5 p-3 bg-slate-50 border border-slate-150 rounded-xl font-semibold text-xs text-slate-705">
                        <p><span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold block">Webhook Event Headers</span></p>
                        <p><span className="text-slate-550">X-SYDATA-Event:</span> <span className="font-mono text-slate-900 font-bold">transaction.updated</span></p>
                        <p><span className="text-slate-550">X-SYDATA-Signature:</span> <span className="font-mono text-slate-900 font-bold text-blue-600">hex_hmac_sha256_hash</span></p>
                      </div>

                      <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 flex gap-3 text-blue-800 text-xs font-semibold leading-relaxed">
                        <Info className="shrink-0 text-blue-600 mt-0.5" size={16} />
                        <div>
                          <span className="font-bold text-sm">Signature Verification</span>
                          <p className="mt-1">
                            Compute a SHA256 HMAC of the raw request payload body. Use your raw developer **API Client Key** as the hashing key. Compare the computed signature hex against the value in the header key <code className="bg-blue-100 px-1 py-0.2 rounded font-mono font-bold text-blue-900">X-SYDATA-Signature</code>.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-5 bg-slate-955 text-slate-300 p-5 rounded-2xl border border-slate-800 font-mono text-xs shadow-xl space-y-4">
                      <span className="text-slate-550 block border-b border-slate-800 pb-2 uppercase tracking-widest text-[10px] font-bold">Node.js Verification Example</span>
                      <pre className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-sky-300 whitespace-pre overflow-x-auto leading-relaxed">
{`const crypto = require("crypto");

function verifyWebhook(reqBody, headerSignature, apiKey) {
  const hash = crypto
    .createHmac("sha256", apiKey)
    .update(JSON.stringify(reqBody))
    .digest("hex");
    
  return hash === headerSignature;
}`}
                      </pre>
                    </div>
                  </section>

                  <hr className="border-slate-200/60" />

                  {/* Topic: Errors */}
                  <section id="doc-errors" className="space-y-4 pb-16">
                    <h3 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-600"></span>
                      HTTP Error Codes
                    </h3>
                    <p className="text-sm text-slate-655 leading-relaxed">
                      Summary table of API response error codes and their context:
                    </p>
                    <div className="overflow-x-auto border border-slate-150 rounded-2xl">
                      <table className="w-full text-left text-sm text-slate-500">
                        <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-xs border-b border-slate-150">
                          <tr>
                            <th className="px-4 py-2.5">HTTP Code</th>
                            <th className="px-4 py-2.5">Error Message</th>
                            <th className="px-4 py-2.5">Cause / Resolution</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-655">
                          <tr>
                            <td className="px-4 py-3 text-slate-900 font-bold text-xs">400 Bad Request</td>
                            <td className="px-4 py-3 font-mono text-red-500 text-xs">Invalid phone number</td>
                            <td className="px-4 py-3 text-xs">Recipient's phone format is incorrect (must be 11 digits starting with 0).</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 text-slate-900 font-bold text-xs">400 Bad Request</td>
                            <td className="px-4 py-3 font-mono text-red-500 text-xs">Insufficient wallet balance</td>
                            <td className="px-4 py-3 text-xs">Your main wallet balance does not cover the price of the requested plan.</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 text-slate-900 font-bold text-xs">401 Unauthorized</td>
                            <td className="px-4 py-3 font-mono text-red-500 text-xs">Invalid API credentials</td>
                            <td className="px-4 py-3 text-xs">The provided `X-API-Key` header is incorrect or suspended.</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 text-slate-900 font-bold text-xs">403 Forbidden</td>
                            <td className="px-4 py-3 font-mono text-red-500 text-xs">IP address not whitelisted</td>
                            <td className="px-4 py-3 text-xs">Your request server IP does not match the configured whitelist array in settings.</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 text-slate-900 font-bold text-xs">409 Conflict</td>
                            <td className="px-4 py-3 font-mono text-red-500 text-xs">Duplicate reference detected</td>
                            <td className="px-4 py-3 text-xs">A transaction with that exact reference has already been executed. Use a new trace key.</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>
              </motion.div>
            )}

            {/* 7. Profile & Security Tab */}
            {activeTab === "settings" && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              >
                {/* Profile Information */}
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-6 lg:col-span-2">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <User className="text-blue-600" size={20} />
                    Profile Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Full Name</span>
                      <span className="text-sm font-semibold text-slate-800 block mt-1">{user.fullName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Phone Number</span>
                      <span className="text-sm font-semibold text-slate-800 block mt-1">{user.phone}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Email Address</span>
                      <span className="text-sm font-semibold text-slate-800 block mt-1">{user.email || "No email connected"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Joined Date</span>
                      <span className="text-sm font-semibold text-slate-800 block mt-1">
                        {user.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Change Transaction PIN Card */}
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-6 lg:col-span-1">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Lock className="text-blue-600" size={20} />
                    Transaction PIN Settings
                  </h3>
                  
                  {!showPinFields ? (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Update your 6-digit transaction PIN used to authenticate mobile app and API sandbox transactions.
                      </p>
                      <button
                        onClick={() => setShowPinFields(true)}
                        className="w-full py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition"
                      >
                        Change Transaction PIN
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleChangePin} className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Current PIN</label>
                        <input
                          type="password"
                          required
                          maxLength={6}
                          value={currentPin}
                          onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="••••••"
                          className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 font-mono tracking-[0.2em]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">New PIN</label>
                        <input
                          type="password"
                          required
                          maxLength={6}
                          value={newPin}
                          onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="••••••"
                          className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 font-mono tracking-[0.2em]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Confirm New PIN</label>
                        <input
                          type="password"
                          required
                          maxLength={6}
                          value={confirmNewPin}
                          onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="••••••"
                          className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 font-mono tracking-[0.2em]"
                        />
                      </div>

                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setShowPinFields(false);
                            setCurrentPin("");
                            setNewPin("");
                            setConfirmNewPin("");
                          }}
                          className="w-1/2 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 font-bold text-xs rounded-xl transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={pinChangeLoading}
                          className="w-1/2 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {pinChangeLoading ? <Loader2 className="animate-spin" size={14} /> : "Update PIN"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
