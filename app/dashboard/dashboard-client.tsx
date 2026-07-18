"use client";

import { useEffect, useState } from "react";
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
  Search
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

type TabType = "overview" | "transactions" | "accounts" | "developer" | "settings";
type DocTopic = "intro" | "auth" | "plans" | "purchase" | "query" | "webhooks";

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

  // Documentation states
  const [docTopic, setDocTopic] = useState<DocTopic>("intro");
  const [docExpanded, setDocExpanded] = useState({
    gettingStarted: true,
    endpoints: true,
    webhooks: true,
  });

  // Purchase Sandbox states
  const [sandboxPhone, setSandboxPhone] = useState("");
  const [sandboxPlanId, setSandboxPlanId] = useState("");
  const [sandboxNetworkId, setSandboxNetworkId] = useState(1);
  const [sandboxRef, setSandboxRef] = useState(`ref-${Date.now()}`);
  const [sandboxLoading, setSandboxLoading] = useState(false);
  const [sandboxResponse, setSandboxResponse] = useState<any>(null);

  // Quick purchase states for standard portal
  const [quickPhone, setQuickPhone] = useState("");
  const [quickPlanId, setQuickPlanId] = useState("");
  const [quickLoading, setQuickLoading] = useState(false);

  // Transaction state
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [searchTx, setSearchTx] = useState("");

  // Virtual bank accounts
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [bankLoading, setBankLoading] = useState(false);

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
      router.push("/app/auth");
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
        toast.success("Developer application submitted for admin review!");
      } else {
        toast.error(data.error || "Application submission failed");
      }
    } catch {
      toast.error("Network error submitting request");
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
        toast.success("Developer settings updated successfully!");
      } else {
        toast.error(data.error || "Update failed");
      }
    } catch {
      toast.error("Network error updating developer configurations");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleRegenerateKeys = async () => {
    if (!confirm("Are you sure? This will instantly revoke your old API key and secret!")) return;
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
        toast.success("API credentials regenerated successfully!");
      } else {
        toast.error(data.error || "Regeneration failed");
      }
    } catch {
      toast.error("Network error regenerating credentials");
    } finally {
      setRegenerating(false);
    }
  };

  const executeSandboxPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!devProfile || devProfile.status !== "APPROVED") {
      toast.error("API is only active for approved developer accounts.");
      return;
    }
    setSandboxLoading(true);
    setSandboxResponse(null);

    const secretToken = generatedCreds?.clientSecret || "sys_your_secret_hash_here_from_keys";

    try {
      const res = await fetch("/api/data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": devProfile.apiKey,
          "X-API-Secret": secretToken,
        },
        body: JSON.stringify({
          phone: sandboxPhone,
          networkId: Number(sandboxNetworkId),
          planId: sandboxPlanId,
          reference: sandboxRef,
        }),
      });
      const data = await res.json();
      setSandboxResponse({
        status: res.status,
        body: data,
      });

      // Refresh balance and transactions if successful
      if (data.success) {
        toast.success("Sandbox API call completed successfully!");
        // Refresh balance
        fetch("/api/auth/me")
          .then((r) => r.json())
          .then((d) => {
            if (d.user) setUser((prev) => ({ ...prev, balance: d.user.balance }));
          });
      } else {
        toast.error(data.error || "Sandbox API call failed");
      }
    } catch (err: any) {
      setSandboxResponse({
        status: 500,
        body: { success: false, error: err.message },
      });
      toast.error("API sandbox connection error");
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
          pin: "000000", // placeholder pin or prompt user
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
        toast.error(data.error || "Data purchase failed");
      }
    } catch {
      toast.error("Network error making purchase");
    } finally {
      setQuickLoading(false);
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="flex min-h-screen bg-[#fbfbfd]">
      {/* Sidebar navigation */}
      <div className="w-72 bg-slate-900 text-white flex flex-col justify-between border-r border-slate-800 shrink-0">
        <div>
          {/* Logo */}
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
            <button
              onClick={() => setActiveTab("developer")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                activeTab === "developer" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Terminal size={18} />
              Developer API
            </button>
          </div>
        </div>

        {/* User profile section at the bottom */}
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

      {/* Main portal layout */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 shadow-sm select-none">
          <h2 className="text-xl font-bold text-slate-800 capitalize">{activeTab}</h2>
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

        {/* Dynamic portal content tabs */}
        <main className="p-8 flex-1">
          <AnimatePresence mode="wait">
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              >
                {/* Left Columns - Quick Operations */}
                <div className="lg:col-span-2 space-y-8">
                  {/* Quick buy portal widget */}
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

                {/* Right Column - User Stats & Wallet Details */}
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

                  {/* Dev access quick trigger */}
                  <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm text-center">
                    <Terminal size={32} className="mx-auto text-blue-600 mb-3" />
                    <h4 className="font-bold text-slate-800">Developer Integrations</h4>
                    <p className="text-xs text-slate-500 mt-1">Implement programmatic sales using our endpoints.</p>
                    <button
                      onClick={() => setActiveTab("developer")}
                      className="mt-4 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition inline-flex items-center gap-2"
                    >
                      Configure Keys <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Transactions Tab */}
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

            {/* Virtual Accounts Tab */}
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

            {/* Developer Tab */}
            {activeTab === "developer" && (
              <motion.div
                key="developer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="space-y-8"
              >
                {/* 1. If not registered developer profile */}
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

                {/* 2. If Developer access is pending */}
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

                {/* 3. If Developer access is rejected */}
                {devProfile && devProfile.status === "REJECTED" && (
                  <div className="bg-white rounded-3xl border border-rose-100 p-8 shadow-sm text-center max-w-2xl mx-auto">
                    <AlertTriangle size={48} className="mx-auto text-rose-500 mb-4" />
                    <h3 className="text-xl font-bold text-slate-800">Developer Access Rejected</h3>
                    <p className="text-slate-500 mt-2 text-sm max-w-lg mx-auto">
                      Unfortunately, your developer application was declined by the administrator. Please contact customer support for appeal parameters.
                    </p>
                  </div>
                )}

                {/* 4. If approved developer client */}
                {devProfile && devProfile.status === "APPROVED" && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: API Settings & Credentials */}
                    <div className="space-y-8 lg:col-span-1">
                      {/* API Keys Credentials panel */}
                      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-6">
                        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                          <Key className="text-blue-600" size={18} />
                          API Sandbox Access
                        </h3>

                        {/* API Key box */}
                        <div className="space-y-2">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">API Client Key</span>
                          <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-3 items-center justify-between font-mono text-xs">
                            <span className="truncate pr-2 text-slate-700">{devProfile.apiKey}</span>
                            <button onClick={() => copyText(devProfile.apiKey)} className="text-slate-400 hover:text-blue-500">
                              <Copy size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Regenerated Secret Box if any */}
                        {generatedCreds ? (
                          <div className="space-y-2 bg-red-50/50 border border-red-200 rounded-xl p-4">
                            <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider block">
                              Client Secret (Save Immediately!)
                            </span>
                            <div className="flex items-center justify-between font-mono text-xs bg-white border border-red-100 p-2.5 rounded-lg">
                              <span className="break-all text-slate-800 pr-2 select-all">{generatedCreds.clientSecret}</span>
                              <button onClick={() => copyText(generatedCreds.clientSecret)} className="text-slate-400 hover:text-red-500 shrink-0">
                                <Copy size={14} />
                              </button>
                            </div>
                            <p className="text-[10px] text-red-600">
                              This secret is stored hashed and will never be shown again! Copy it now.
                            </p>
                          </div>
                        ) : (
                          <div className="bg-slate-50 border border-slate-250 p-4 rounded-xl text-center">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Client Secret</span>
                            <span className="text-[11px] text-slate-400 block mt-2 italic">Hashed in database (hidden)</span>
                          </div>
                        )}

                        {/* Regenerate Action button */}
                        <button
                          onClick={handleRegenerateKeys}
                          disabled={regenerating}
                          className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition disabled:opacity-50"
                        >
                          <RefreshCw className={regenerating ? "animate-spin" : ""} size={14} />
                          Generate New API Credentials
                        </button>
                      </div>

                      {/* Developer Endpoints Configuration form */}
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
                            <span className="text-[9px] text-slate-400 mt-1 block">Leave empty to allow calls from any IP address.</span>
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

                    {/* Right Columns: API Docs & Interactive Sandbox */}
                    <div className="lg:col-span-2 space-y-8">
                      {/* API Documentation Tree and Guides */}
                      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 min-h-[500px]">
                        {/* Documentation Left Tree Navigation */}
                        <div className="border-r border-slate-100 pr-4 space-y-4 text-sm font-semibold select-none">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">API Documentation</h4>
                          
                          {/* Folder: Getting Started */}
                          <div className="space-y-1">
                            <button
                              onClick={() => setDocExpanded((prev) => ({ ...prev, gettingStarted: !prev.gettingStarted }))}
                              className="w-full flex items-center justify-between text-slate-700 hover:text-slate-900 py-1"
                            >
                              <span className="flex items-center gap-1.5"><BookOpen size={16} className="text-slate-400" /> Get Started</span>
                              {docExpanded.gettingStarted ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                            
                            {docExpanded.gettingStarted && (
                              <div className="pl-6 border-l border-slate-100 space-y-1 mt-1 text-xs">
                                <button
                                  onClick={() => setDocTopic("intro")}
                                  className={`w-full text-left py-1 block ${docTopic === "intro" ? "text-blue-600 font-bold" : "text-slate-500 hover:text-slate-800"}`}
                                >
                                  Introduction
                                </button>
                                <button
                                  onClick={() => setDocTopic("auth")}
                                  className={`w-full text-left py-1 block ${docTopic === "auth" ? "text-blue-600 font-bold" : "text-slate-500 hover:text-slate-800"}`}
                                >
                                  Authentication
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Folder: Endpoints */}
                          <div className="space-y-1">
                            <button
                              onClick={() => setDocExpanded((prev) => ({ ...prev, endpoints: !prev.endpoints }))}
                              className="w-full flex items-center justify-between text-slate-700 hover:text-slate-900 py-1"
                            >
                              <span className="flex items-center gap-1.5"><FileCode size={16} className="text-slate-400" /> Endpoints</span>
                              {docExpanded.endpoints ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                            
                            {docExpanded.endpoints && (
                              <div className="pl-6 border-l border-slate-100 space-y-1 mt-1 text-xs">
                                <button
                                  onClick={() => setDocTopic("plans")}
                                  className={`w-full text-left py-1 block ${docTopic === "plans" ? "text-blue-600 font-bold" : "text-slate-500 hover:text-slate-800"}`}
                                >
                                  GET /api/plans
                                </button>
                                <button
                                  onClick={() => setDocTopic("purchase")}
                                  className={`w-full text-left py-1 block ${docTopic === "purchase" ? "text-blue-600 font-bold" : "text-slate-500 hover:text-slate-800"}`}
                                >
                                  POST /api/data
                                </button>
                                <button
                                  onClick={() => setDocTopic("query")}
                                  className={`w-full text-left py-1 block ${docTopic === "query" ? "text-blue-600 font-bold" : "text-slate-500 hover:text-slate-800"}`}
                                >
                                  GET /api/data/[ref]
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Folder: Webhooks */}
                          <div className="space-y-1">
                            <button
                              onClick={() => setDocExpanded((prev) => ({ ...prev, webhooks: !prev.webhooks }))}
                              className="w-full flex items-center justify-between text-slate-700 hover:text-slate-900 py-1"
                            >
                              <span className="flex items-center gap-1.5"><Globe size={16} className="text-slate-400" /> Webhooks</span>
                              {docExpanded.webhooks ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                            
                            {docExpanded.webhooks && (
                              <div className="pl-6 border-l border-slate-100 space-y-1 mt-1 text-xs">
                                <button
                                  onClick={() => setDocTopic("webhooks")}
                                  className={`w-full text-left py-1 block ${docTopic === "webhooks" ? "text-blue-600 font-bold" : "text-slate-500 hover:text-slate-800"}`}
                                >
                                  Signature Verification
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Documentation Right Panel Description */}
                        <div className="md:col-span-2 space-y-4">
                          {docTopic === "intro" && (
                            <div className="space-y-3">
                              <h4 className="text-base font-bold text-slate-800">Introduction</h4>
                              <p className="text-xs leading-relaxed text-slate-600">
                                The SY DATA Developer API allows you to automate mobile data bundle distributions programmatically. You can trigger data gifts, check balances, and fetch plan prices dynamically.
                              </p>
                              <div className="bg-slate-900 text-slate-200 rounded-xl p-3 font-mono text-[10px] space-y-1">
                                <p className="text-slate-500">// API Base URL</p>
                                <p>https://sydatasub.com</p>
                              </div>
                              <h5 className="font-bold text-xs text-slate-700">Headers Required</h5>
                              <p className="text-xs text-slate-500">Every developer API request expects parameters encoded as JSON with appropriate Content-Type.</p>
                              <div className="bg-slate-550 border border-slate-200 rounded-xl p-3 font-mono text-[10px] space-y-1">
                                <p>Content-Type: application/json</p>
                              </div>
                            </div>
                          )}

                          {docTopic === "auth" && (
                            <div className="space-y-3">
                              <h4 className="text-base font-bold text-slate-800">API Authentication</h4>
                              <p className="text-xs leading-relaxed text-slate-600">
                                Connect to our system securely by passing your API Key and Secret in the HTTP request headers.
                              </p>
                              <div className="bg-slate-900 text-slate-200 rounded-xl p-4 font-mono text-[10px] space-y-2">
                                <p className="text-slate-500"># Pass these headers in every API call</p>
                                <p><span className="text-indigo-400">X-API-Key</span>: sy_live_xxxxxxxxxxxxxxxxxxxxxxxx</p>
                                <p><span className="text-indigo-400">X-API-Secret</span>: sys_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</p>
                              </div>
                            </div>
                          )}

                          {docTopic === "plans" && (
                            <div className="space-y-3">
                              <h4 className="text-base font-bold text-slate-800">1. Retrieve Active Plans</h4>
                              <p className="text-xs leading-relaxed text-slate-600">
                                Fetch a list of active plans from our database along with their unique identifiers and your custom pricing.
                              </p>
                              <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 font-bold rounded text-[10px]">GET /api/plans</span>
                              
                              <h5 className="font-bold text-xs text-slate-700 mt-4">Sample Response (200 OK)</h5>
                              <div className="bg-slate-900 text-slate-200 rounded-xl p-4 font-mono text-[10px] max-h-56 overflow-y-auto">
                                <pre>{JSON.stringify({
                                  success: true,
                                  plans: [
                                    {
                                      id: "cm1234567890",
                                      name: "MTN SME 1GB",
                                      network: "MTN",
                                      networkId: 1,
                                      size: "1GB",
                                      validity: "30 Days",
                                      price: 240
                                    }
                                  ]
                                }, null, 2)}</pre>
                              </div>
                            </div>
                          )}

                          {docTopic === "purchase" && (
                            <div className="space-y-3">
                              <h4 className="text-base font-bold text-slate-800">2. Purchase Data Subscription</h4>
                              <p className="text-xs leading-relaxed text-slate-600">
                                Debit your main balance and gift mobile data directly to any recipient phone.
                              </p>
                              <span className="inline-block px-2 py-0.5 bg-green-100 text-green-800 font-bold rounded text-[10px]">POST /api/data</span>
                              
                              <h5 className="font-bold text-xs text-slate-700 mt-2">Request Body Payload</h5>
                              <div className="bg-slate-900 text-slate-200 rounded-xl p-3 font-mono text-[10px]">
                                <pre>{JSON.stringify({
                                  phone: "08164135836",
                                  networkId: 1,
                                  planId: "cm1234567890",
                                  reference: "your-unique-ref-9892"
                                }, null, 2)}</pre>
                              </div>

                              <h5 className="font-bold text-xs text-slate-700 mt-2">Network ID Mapping:</h5>
                              <ul className="text-xs space-y-1 list-disc pl-4 text-slate-600 font-semibold">
                                <li>MTN: <code className="bg-slate-100 px-1 py-0.2 rounded text-slate-800">1</code></li>
                                <li>Glo: <code className="bg-slate-100 px-1 py-0.2 rounded text-slate-800">2</code></li>
                                <li>9mobile: <code className="bg-slate-100 px-1 py-0.2 rounded text-slate-800">3</code></li>
                                <li>Airtel: <code className="bg-slate-100 px-1 py-0.2 rounded text-slate-800">4</code></li>
                              </ul>

                              <h5 className="font-bold text-xs text-slate-700 mt-2">Sample Response (200 OK)</h5>
                              <div className="bg-slate-900 text-slate-200 rounded-xl p-3 font-mono text-[10px]">
                                <pre>{JSON.stringify({
                                  success: true,
                                  reference: "your-unique-ref-9892",
                                  externalReference: "FLW-128491823",
                                  status: "SUCCESS"
                                }, null, 2)}</pre>
                              </div>
                            </div>
                          )}

                          {docTopic === "query" && (
                            <div className="space-y-3">
                              <h4 className="text-base font-bold text-slate-800">3. Retrieve Transaction Details</h4>
                              <p className="text-xs leading-relaxed text-slate-600">
                                Verify the delivery state of a transaction by querying its unique developer reference.
                              </p>
                              <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 font-bold rounded text-[10px]">GET /api/data/{"{reference}"}</span>

                              <h5 className="font-bold text-xs text-slate-700 mt-4">Sample Response (200 OK)</h5>
                              <div className="bg-slate-900 text-slate-200 rounded-xl p-4 font-mono text-[10px]">
                                <pre>{JSON.stringify({
                                  success: true,
                                  transaction: {
                                    id: "tx_cuid_abc",
                                    reference: "your-unique-ref-9892",
                                    externalReference: "FLW-128491823",
                                    type: "DATA_PURCHASE",
                                    status: "SUCCESS",
                                    amount: 240,
                                    recipient: "08164135836",
                                    description: "MTN SME 1GB -> 08164135836",
                                    createdAt: "2026-07-19T00:00:00.000Z",
                                    updatedAt: "2026-07-19T00:00:02.000Z"
                                  }
                                }, null, 2)}</pre>
                              </div>
                            </div>
                          )}

                          {docTopic === "webhooks" && (
                            <div className="space-y-3">
                              <h4 className="text-base font-bold text-slate-800">Webhook Signature Verification</h4>
                              <p className="text-xs leading-relaxed text-slate-600">
                                When a transaction completes or fails, we fire a POST callback to your Webhook URL. We sign payloads using your Client Secret hash as the secret.
                              </p>
                              <p className="text-xs font-semibold text-slate-700">Headers sent:</p>
                              <div className="bg-slate-900 text-slate-200 rounded-xl p-3.5 font-mono text-[10px] space-y-1">
                                <p><span className="text-indigo-400">X-SYDATA-Event</span>: transaction.updated</p>
                                <p><span className="text-indigo-400">X-SYDATA-Signature</span>: hex_hmac_sha256_hash</p>
                              </div>
                              <p className="text-xs text-slate-600">
                                To verify signatures: Compute the SHA256 HMAC of the raw request body string using your Client Secret (Bcrypt Hash format stored in dashboard) as the secret key.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Interactive Sandbox purchase playground */}
                      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
                          <Settings className="text-blue-600" size={18} />
                          API Sandbox Playground
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {/* Sandbox Form */}
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

                          {/* Sandbox Console Output */}
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
                              <div className="flex-1 flex items-center justify-center text-slate-500 italic">
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
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
