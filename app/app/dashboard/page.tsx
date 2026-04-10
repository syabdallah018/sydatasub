"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Copy, Check, Eye, EyeOff, Loader2, LogOut, Zap, Phone, Gift, CreditCard, X } from "lucide-react";
import { toast } from "sonner";

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
  { id: "mtn", name: "MTN" },
  { id: "airtel", name: "Airtel" },
  { id: "glo", name: "Glo" },
  { id: "9mobile", name: "9mobile" },
];

const AIRTIME_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

const getPriceForTier = (plan: DataPlan, tier: string = "user"): number => {
  if (tier === "agent" && plan.agent_price > 0) return plan.agent_price;
  return plan.user_price > 0 ? plan.user_price : plan.price;
};

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
        if (data?.success && data?.data) {
          setUser(data.data);
        } else {
          router.replace("/app");
        }
      })
      .catch(() => router.replace("/app"))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/transactions?limit=10")
      .then((r) => r.json())
      .then((data) => {
        if (data?.success) setTransactions(data.data.transactions || []);
      });
  }, [user]);

  const formatBalance = (kobo: number) => {
    const naira = kobo / 100;
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(naira);
  };

  const handleCopy = () => {
    const acc = user?.virtualAccount?.accountNumber;
    if (!acc) return;
    navigator.clipboard.writeText(acc);
    setCopied(true);
    toast.success("Copied!");
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
      if (data.success) {
        setDataPlans(data.data || []);
        setBuyDataStep(2);
      }
    } catch {
      toast.error("Error loading plans");
    } finally {
      setPlansLoading(false);
    }
  };

  const handlePlanSelect = (plan: DataPlan) => {
    setSelectedPlan(plan);
    setPhoneNumber("");
    setPin(["", "", "", "", "", ""]);
    setBuyDataStep(3);
  };

  const handlePurchaseData = async () => {
    if (!phoneNumber || phoneNumber.length !== 11) {
      toast.error("Enter valid 11-digit phone number");
      return;
    }
    if (pin.some((p) => !p)) {
      toast.error("Enter complete PIN");
      return;
    }
    if (!selectedPlan) {
      toast.error("No plan selected");
      return;
    }

    setPurchasingData(true);
    try {
      const res = await fetch("/api/data/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan.id,
          phone: phoneNumber,
          pin: pin.join(""),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Data purchased!");
        setBuyDataOpen(false);
        setBuyDataStep(1);
        setSelectedNetwork(null);
        setSelectedPlan(null);
        fetch("/api/auth/me")
          .then((r) => r.json())
          .then((d) => d.success && setUser(d.data));
      } else {
        toast.error(data.error || "Failed");
      }
    } finally {
      setPurchasingData(false);
    }
  };

  const handlePurchaseAirtime = async () => {
    if (!airtimeNetwork || !airtimeAmount || !airtimePhone) {
      toast.error("Complete all fields");
      return;
    }
    if (airtimePhone.length !== 11) {
      toast.error("Enter valid 11-digit phone");
      return;
    }

    setPurchasingAirtime(true);
    try {
      const res = await fetch("/api/airtime/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          network: airtimeNetwork,
          amount: airtimeAmount,
          phone: airtimePhone,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Airtime purchased!");
        setAirtimeOpen(false);
        fetch("/api/auth/me")
          .then((r) => r.json())
          .then((d) => d.success && setUser(d.data));
      } else {
        toast.error(data.error || "Failed");
      }
    } finally {
      setPurchasingAirtime(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "Inter" }}>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold text-white">
              {user.fullName.charAt(0)}
            </div>
            <div>
              <p className="text-xs text-gray-500">Welcome back</p>
              <p className="text-sm font-bold text-gray-900">{user.fullName}</p>
            </div>
          </div>
          <motion.button onClick={handleLogout} className="text-gray-700 font-medium">
            Logout
          </motion.button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Wallet Card */}
        <motion.div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl p-8 mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-sm text-gray-500 font-medium mb-2">Balance</p>
              <h2 className="text-4xl font-black text-gray-900">
                {showBalance ? formatBalance(user.balance) : "â€¢â€¢â€¢â€¢â€¢"}
              </h2>
            </div>
            <motion.button onClick={() => setShowBalance(!showBalance)} className="p-2">
              {showBalance ? <Eye size={20} /> : <EyeOff size={20} />}
            </motion.button>
          </div>
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer" onClick={handleCopy}>
              <div>
                <p className="text-xs text-gray-500">Account</p>
                <p className="font-mono text-lg font-bold">{user.virtualAccount?.accountNumber || "â€”"}</p>
              </div>
              <motion.button>{copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}</motion.button>
            </div>
          </div>
        </motion.div>

        {/* 2x2 Actions */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <motion.button
            onClick={() => setBuyDataOpen(true)}
            className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
              <Zap size={20} className="text-blue-600" />
            </div>
            <p className="font-semibold text-gray-900 text-sm">Buy Data</p>
          </motion.button>

          <motion.button
            onClick={() => setAirtimeOpen(true)}
            className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md"
          >
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
              <Phone size={20} className="text-green-600" />
            </div>
            <p className="font-semibold text-gray-900 text-sm">Buy Airtime</p>
          </motion.button>

          <motion.button
            onClick={() => router.push("/app/dashboard/rewards")}
            className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md"
          >
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mb-3">
              <Gift size={20} className="text-amber-600" />
            </div>
            <p className="font-semibold text-gray-900 text-sm">Rewards</p>
          </motion.button>

          <motion.button
            onClick={() => router.push("/app/dashboard/transactions")}
            className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md"
          >
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
              <CreditCard size={20} className="text-purple-600" />
            </div>
            <p className="font-semibold text-gray-900 text-sm">History</p>
          </motion.button>
        </div>

        {/* Transactions */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-bold text-gray-900 mb-4">Recent</h3>
          {transactions.length === 0 ? (
            <p className="text-gray-500 text-sm">No transactions</p>
          ) : (
            <div className="space-y-2">
              {transactions.slice(0, 5).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{tx.description}</p>
                    <p className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleDateString()}</p>
                  </div>
                  <p className="font-bold text-gray-900">-â‚¦{tx.amount.toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* DATA MODAL */}
      {buyDataOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setBuyDataOpen(false)}>
          <motion.div className="bg-white rounded-2xl w-full max-w-sm max-h-96 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
              <h2 className="font-bold">Buy Data</h2>
              <button onClick={() => setBuyDataOpen(false)}><X size={20} /></button>
            </div>

            <div className="p-4">
              {buyDataStep === 1 && (
                <div className="grid grid-cols-2 gap-2">
                  {NETWORKS.map((net) => (
                    <button
                      key={net.id}
                      onClick={() => handleNetworkSelect(net.id)}
                      className={`p-3 rounded-lg border-2 text-sm font-semibold ${
                        selectedNetwork === net.id ? "border-blue-600 bg-blue-50" : "border-gray-200"
                      }`}
                    >
                      {net.name}
                    </button>
                  ))}
                </div>
              )}

              {buyDataStep === 2 && (
                <div className="space-y-2">
                  <button onClick={() => setBuyDataStep(1)} className="text-blue-600 text-sm font-semibold">â† Back</button>
                  {plansLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="animate-spin" size={24} />
                    </div>
                  ) : (
                    dataPlans.map((plan) => (
                      <button
                        key={plan.id}
                        onClick={() => handlePlanSelect(plan)}
                        className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-blue-500 text-sm"
                      >
                        <div className="flex justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">{plan.sizeLabel}</p>
                            <p className="text-xs text-gray-500">{plan.validity}</p>
                          </div>
                          <p className="text-blue-600 font-bold">â‚¦{getPriceForTier(plan, user.tier)}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

              {buyDataStep === 3 && (
                <div className="space-y-3">
                  <button onClick={() => setBuyDataStep(2)} className="text-blue-600 text-sm font-semibold">â† Back</button>
                  <input
                    type="tel"
                    maxLength={11}
                    placeholder="08012345678"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                    className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                  />
                  <div className="flex gap-1">
                    {pin.map((d, i) => (
                      <input
                        key={i}
                        type="password"
                        maxLength={1}
                        value={d}
                        onChange={(e) => {
                          const np = [...pin];
                          np[i] = e.target.value;
                          setPin(np);
                          if (e.target.value && i < 5) document.getElementById(`p${i + 1}`)?.focus();
                        }}
                        id={`p${i}`}
                        className="flex-1 p-2 border border-gray-200 rounded text-center font-bold"
                      />
                    ))}
                  </div>
                  <button
                    onClick={handlePurchaseData}
                    disabled={purchasingData}
                    className="w-full p-3 bg-blue-600 text-white rounded-lg font-semibold text-sm disabled:opacity-50"
                  >
                    {purchasingData ? "..." : "Confirm"}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* AIRTIME MODAL */}
      {airtimeOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setAirtimeOpen(false)}>
          <motion.div className="bg-white rounded-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="bg-green-600 text-white p-4 flex justify-between items-center">
              <h2 className="font-bold">Buy Airtime</h2>
              <button onClick={() => setAirtimeOpen(false)}><X size={20} /></button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <p className="text-sm font-semibold mb-2">Network</p>
                <div className="grid grid-cols-2 gap-2">
                  {NETWORKS.map((net) => (
                    <button
                      key={net.id}
                      onClick={() => setAirtimeNetwork(net.id)}
                      className={`p-2 rounded-lg border text-sm font-semibold ${
                        airtimeNetwork === net.id ? "border-green-600 bg-green-50" : "border-gray-200"
                      }`}
                    >
                      {net.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold mb-2">Amount</p>
                <div className="grid grid-cols-3 gap-2">
                  {AIRTIME_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setAirtimeAmount(amt)}
                      className={`p-2 rounded-lg border text-xs font-semibold ${
                        airtimeAmount === amt ? "border-green-600 bg-green-50" : "border-gray-200"
                      }`}
                    >
                      â‚¦{amt}
                    </button>
                  ))}
                </div>
              </div>

              <input
                type="tel"
                maxLength={11}
                placeholder="08012345678"
                value={airtimePhone}
                onChange={(e) => setAirtimePhone(e.target.value.replace(/\D/g, ""))}
                className="w-full p-2 border border-gray-200 rounded-lg text-sm"
              />

              <button
                onClick={handlePurchaseAirtime}
                disabled={purchasingAirtime}
                className="w-full p-3 bg-green-600 text-white rounded-lg font-semibold text-sm disabled:opacity-50"
              >
                {purchasingAirtime ? "..." : "Buy"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
