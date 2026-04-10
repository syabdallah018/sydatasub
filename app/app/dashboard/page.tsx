"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { 
  Zap, 
  Phone, 
  Gift, 
  Settings, 
  Copy, 
  Check, 
  Loader2, 
  LogOut, 
  X,
  ChevronRight,
  Eye,
  EyeOff,
  ArrowRight,
  CreditCard
} from "lucide-react"
import { toast } from "react-hot-toast"

interface User {
  id: string
  fullName: string
  phone: string
  balance: number
  tier: 'user' | 'agent'
  pinHash?: string
  virtualAccount?: { accountNumber: string; bankName: string } | null
}

interface Transaction {
  id: string
  type: string
  status: string
  amount: number
  description: string
  createdAt: string
}

interface DataPlan {
  id: string
  name: string
  price: number
  user_price: number
  agent_price: number
  sizeLabel: string
  validity: string
  network: string
}

const NETWORKS = [
  { id: "mtn", name: "MTN", color: "bg-gray-100", textColor: "text-black", borderColor: "border-gray-300" },
  { id: "airtel", name: "Airtel", color: "bg-gray-100", textColor: "text-black", borderColor: "border-gray-300" },
  { id: "glo", name: "Glo", color: "bg-gray-100", textColor: "text-black", borderColor: "border-gray-300" },
  { id: "9mobile", name: "9mobile", color: "bg-gray-100", textColor: "text-black", borderColor: "border-gray-300" },
]

const AIRTIME_AMOUNTS = [100, 200, 500, 1000, 2000, 5000]

// Helper to get correct price based on user tier
const getPriceForTier = (plan: DataPlan, tier: string = 'user'): number => {
  if (tier === 'agent' && plan.agent_price > 0) {
    return plan.agent_price
  }
  if (plan.user_price > 0) {
    return plan.user_price
  }
  // Fallback to old price column for backward compatibility
  return plan.price
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [copied, setCopied] = useState(false)
  const [showBalance, setShowBalance] = useState(true)
  
  // Buy Data Modal State
  const [buyDataOpen, setBuyDataOpen] = useState(false)
  const [buyDataStep, setBuyDataStep] = useState(1)
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null)
  const [dataPlans, setDataPlans] = useState<DataPlan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<DataPlan | null>(null)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [pin, setPin] = useState(["", "", "", "", "", ""])
  const [purchasingData, setPurchasingData] = useState(false)
  const [plansLoading, setPlansLoading] = useState(false)
  
  // Airtime Modal State
  const [airtimeOpen, setAirtimeOpen] = useState(false)
  const [airtimeNetwork, setAirtimeNetwork] = useState<string | null>(null)
  const [airtimeAmount, setAirtimeAmount] = useState<number | null>(null)
  const [airtimePhone, setAirtimePhone] = useState("")
  const [purchasingAirtime, setPurchasingAirtime] = useState(false)

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data?.success && data?.data) {
          setUser(data.data)
        } else {
          router.replace("/app")
        }
      })
      .catch(() => router.replace("/app"))
      .finally(() => setLoading(false))
  }, [router])

  useEffect(() => {
    if (!user) return
    fetch("/api/transactions?limit=10")
      .then((r) => r.json())
      .then((data) => {
        if (data?.success) setTransactions(data.data.transactions || [])
      })
      .catch(() => setTransactions([]))
  }, [user])

  const formatBalance = (kobo: number) => {
    const naira = kobo / 100
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(naira)
  }

  const handleCopy = () => {
    const acc = user?.virtualAccount?.accountNumber
    if (!acc) return
    navigator.clipboard.writeText(acc)
    setCopied(true)
    toast.success("Account number copied!")
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.replace("/app")
  }

  // Buy Data Handlers
  const handleNetworkSelect = async (networkId: string) => {
    setSelectedNetwork(networkId)
    setPlansLoading(true)
    try {
      const res = await fetch(`/api/data/plans?network=${networkId}`)
      const data = await res.json()
      if (data.success) {
        setDataPlans(data.data || [])
        setBuyDataStep(2)
      } else {
        toast.error("Failed to load plans")
      }
    } catch {
      toast.error("Error loading plans")
    } finally {
      setPlansLoading(false)
    }
  }

  const handlePlanSelect = (plan: DataPlan) => {
    setSelectedPlan(plan)
    setPhoneNumber("")
    setPin(["", "", "", "", "", ""])
    setBuyDataStep(3)
  }

  const handlePurchaseData = async () => {
    if (!phoneNumber || phoneNumber.length !== 11) {
      toast.error("Enter valid 11-digit phone number")
      return
    }
    if (pin.some((p) => !p)) {
      toast.error("Enter complete PIN")
      return
    }
    if (!selectedPlan) {
      toast.error("No plan selected")
      return
    }

    setPurchasingData(true)
    try {
      const res = await fetch("/api/data/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan.id,
          phone: phoneNumber,
          pin: pin.join(""),
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Data purchased successfully!")
        setBuyDataOpen(false)
        setBuyDataStep(1)
        setSelectedNetwork(null)
        setSelectedPlan(null)
        setPhoneNumber("")
        setPin(["", "", "", "", "", ""])
        // Refresh user and transactions
        fetch("/api/auth/me")
          .then((r) => r.json())
          .then((d) => d.success && setUser(d.data))
        fetch("/api/transactions?limit=10")
          .then((r) => r.json())
          .then((d) => d.success && setTransactions(d.data.transactions || []))
      } else {
        toast.error(data.error || "Purchase failed")
      }
    } catch {
      toast.error("Purchase failed")
    } finally {
      setPurchasingData(false)
    }
  }

  const handlePurchaseAirtime = async () => {
    if (!airtimeNetwork || !airtimeAmount || !airtimePhone) {
      toast.error("Please complete all fields")
      return
    }
    if (airtimePhone.length !== 11) {
      toast.error("Enter valid 11-digit phone number")
      return
    }

    setPurchasingAirtime(true)
    try {
      const res = await fetch("/api/airtime/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          network: airtimeNetwork,
          amount: airtimeAmount,
          phone: airtimePhone,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Airtime purchased successfully!")
        setAirtimeOpen(false)
        setAirtimeNetwork(null)
        setAirtimeAmount(null)
        setAirtimePhone("")
        // Refresh
        fetch("/api/auth/me")
          .then((r) => r.json())
          .then((d) => d.success && setUser(d.data))
        fetch("/api/transactions?limit=10")
          .then((r) => r.json())
          .then((d) => d.success && setTransactions(d.data.transactions || []))
      } else {
        toast.error(data.error || "Purchase failed")
      }
    } catch {
      toast.error("Purchase failed")
    } finally {
      setPurchasingAirtime(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <Loader2 size={32} className="animate-spin text-black" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-white to-gray-50/50">
      {/* Premium Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-200/50">
        <div className="max-w-4xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-sm font-bold text-white shadow-md">
              {user.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Welcome back,</p>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-900">{user.fullName.split(" ")[0]}</p>
                {user.tier === "agent" && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 border border-amber-200">Pro</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg hover:bg-gray-50 text-gray-700 font-medium transition text-sm border border-gray-200 hover:border-gray-300"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Premium Wallet Card */}
        <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200/80 rounded-2xl p-8 mb-8 shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="flex justify-between items-start mb-8">
            <div className="flex-1">
              <p className="text-gray-500 text-sm font-medium mb-3">Available Balance</p>
              <div className="flex items-center gap-4">
                <h2 className="text-5xl font-black text-gray-900 tracking-tight">
                  {showBalance ? formatBalance(user.balance) : "••••••••"}
                </h2>
                <button
                  onClick={() => setShowBalance(!showBalance)}
                  className="p-3 hover:bg-gray-100 rounded-full transition-colors duration-200"
                >
                  {showBalance ? <Eye size={20} className="text-gray-600" /> : <EyeOff size={20} className="text-gray-600" />}
                </button>
              </div>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100/80 rounded-full border border-green-200">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <span className="text-xs font-semibold text-green-700">Active</span>
              </div>
            </div>
          </div>

          {/* Premium Account Details */}
          <div className="border-t border-gray-100 pt-8">
            <p className="text-gray-500 text-xs font-semibold tracking-wider uppercase mb-3">Virtual Account</p>
            <div 
              className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition-all duration-200 cursor-pointer group"
              onClick={handleCopy}
            >
              <div>
                <p className="font-mono text-xl font-bold text-gray-900 tracking-wide">{user.virtualAccount?.accountNumber ?? "—"}</p>
                <p className="text-gray-500 text-xs mt-2">{user.virtualAccount?.bankName || "Linked Account"}</p>
              </div>
              <button
                className="p-2.5 group-hover:bg-gray-200/50 rounded-full transition-colors duration-200"
              >
                {copied ? (
                  <Check size={20} className="text-green-600" />
                ) : (
                  <Copy size={20} className="text-gray-500 group-hover:text-gray-700" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Premium Quick Actions Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5 mb-10">
          {/* Buy Data */}
          <button
            onClick={() => {
              setBuyDataOpen(true)
              setBuyDataStep(1)
            }}
            className="group relative bg-white border border-gray-200 rounded-2xl p-5 hover:border-gray-300 hover:shadow-lg transition-all duration-300 active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            <div className="relative flex flex-col items-start justify-between h-full">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center group-hover:shadow-md transition-all duration-300">
                <Zap size={24} className="text-blue-600" />
              </div>
              <div className="text-left mt-auto">
                <p className="font-semibold text-gray-900 text-sm">Buy Data</p>
                <p className="text-xs text-gray-500 mt-1">All networks</p>
              </div>
            </div>
          </button>

          {/* Buy Airtime */}
          <button
            onClick={() => setAirtimeOpen(true)}
            className="group relative bg-white border border-gray-200 rounded-2xl p-5 hover:border-gray-300 hover:shadow-lg transition-all duration-300 active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            <div className="relative flex flex-col items-start justify-between h-full">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-100 to-green-50 flex items-center justify-center group-hover:shadow-md transition-all duration-300">
                <Phone size={24} className="text-green-600" />
              </div>
              <div className="text-left mt-auto">
                <p className="font-semibold text-gray-900 text-sm">Buy Airtime</p>
                <p className="text-xs text-gray-500 mt-1">All networks</p>
              </div>
            </div>
          </button>

          {/* Rewards */}
          <button
            onClick={() => router.push("/app/dashboard/rewards")}
            className="group relative bg-white border border-gray-200 rounded-2xl p-5 hover:border-gray-300 hover:shadow-lg transition-all duration-300 active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            <div className="relative flex flex-col items-start justify-between h-full">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center group-hover:shadow-md transition-all duration-300">
                <Gift size={24} className="text-amber-600" />
              </div>
              <div className="text-left mt-auto">
                <p className="font-semibold text-gray-900 text-sm">Rewards</p>
                <p className="text-xs text-gray-500 mt-1">Earn points</p>
              </div>
            </div>
          </button>

          {/* Transactions */}
          <button
            onClick={() => router.push("/app/dashboard/transactions")}
            className="group relative bg-white border border-gray-200 rounded-2xl p-5 hover:border-gray-300 hover:shadow-lg transition-all duration-300 active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            <div className="relative flex flex-col items-start justify-between h-full">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center group-hover:shadow-md transition-all duration-300">
                <CreditCard size={24} className="text-purple-600" />
              </div>
              <div className="text-left mt-auto">
                <p className="font-semibold text-gray-900 text-sm">Transactions</p>
                <p className="text-xs text-gray-500 mt-1">View history</p>
              </div>
            </div>
          </button>

          {/* Settings */}
          <button
            onClick={() => router.push("/app/dashboard/settings")}
            className="group relative bg-white border border-gray-200 rounded-2xl p-5 hover:border-gray-300 hover:shadow-lg transition-all duration-300 active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            <div className="relative flex flex-col items-start justify-between h-full">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center group-hover:shadow-md transition-all duration-300">
                <Settings size={24} className="text-gray-600" />
              </div>
              <div className="text-left mt-auto">
                <p className="font-semibold text-gray-900 text-sm">Settings</p>
                <p className="text-xs text-gray-500 mt-1">Account settings</p>
              </div>
            </div>
          </button>
        </div>

        {/* Premium Recent Transactions */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Recent Activity</h3>
            <button
              onClick={() => router.push("/app/dashboard/transactions")}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition"
            >
              View All →
            </button>
          </div>
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mb-4">
                <ArrowRight className="text-gray-400" size={24} />
              </div>
              <p className="text-gray-600 font-semibold">No transactions yet</p>
              <p className="text-gray-400 text-sm mt-2">Your activity will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.slice(0, 5).map((tx) => (
                <div key={tx.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-xl transition-colors duration-200 border border-transparent hover:border-gray-200">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    tx.type === "data" ? "bg-gradient-to-br from-blue-100 to-blue-50" : "bg-gradient-to-br from-green-100 to-green-50"
                  }`}>
                    {tx.type === "data" ? (
                      <Zap size={20} className="text-blue-600" />
                    ) : (
                      <Phone size={20} className="text-green-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{tx.description}</p>
                    <p className="text-sm text-gray-500 mt-1">{new Date(tx.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-gray-900">-₦{tx.amount.toLocaleString()}</p>
                    <span className={`text-xs font-semibold px-3 py-1.5 rounded-full inline-block mt-1 ${
                      tx.status === "SUCCESS"
                        ? "bg-green-100 text-green-700 border border-green-200"
                        : "bg-amber-100 text-amber-700 border border-amber-200"
                    }`}>
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* BUY DATA MODAL - Premium Apple Style */}
      {buyDataOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
          >
            {/* Premium Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-6 flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight">Purchase Data</h2>
              <button
                onClick={() => {
                  setBuyDataOpen(false)
                  setBuyDataStep(1)
                  setSelectedNetwork(null)
                  setSelectedPlan(null)
                }}
                className="p-2 hover:bg-white/20 rounded-full transition"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              {/* Step 1: Select Network */}
              {buyDataStep === 1 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-4">Select Network</p>
                    <div className="grid grid-cols-2 gap-3">
                      {NETWORKS.map((net) => (
                        <button
                          key={net.id}
                          onClick={() => handleNetworkSelect(net.id)}
                          className={`p-4 rounded-xl border-2 font-semibold transition duration-200 ${
                            selectedNetwork === net.id
                              ? "border-blue-600 bg-blue-50 text-blue-700 shadow-md"
                              : "border-gray-200 bg-white text-gray-900 hover:border-gray-300 active:scale-95"
                          }`}
                        >
                          {net.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Select Plan */}
              {buyDataStep === 2 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                  <button
                    onClick={() => setBuyDataStep(1)}
                    className="text-blue-600 text-sm font-semibold mb-3 flex items-center gap-1 hover:text-blue-700"
                  >
                    ← Back
                  </button>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-4">Select Plan</p>
                    {plansLoading ? (
                      <div className="flex justify-center py-12">
                        <Loader2 className="animate-spin text-blue-600" size={32} />
                      </div>
                    ) : dataPlans.length === 0 ? (
                      <p className="text-gray-500 text-center py-12 font-medium">No plans available</p>
                    ) : (
                      <div className="space-y-3">
                        {dataPlans.map((plan) => (
                          <button
                            key={plan.id}
                            onClick={() => handlePlanSelect(plan)}
                            className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 text-left transition duration-200 active:scale-95"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="font-semibold text-gray-900">{plan.sizeLabel}</span>
                                <p className="text-xs text-gray-500 mt-1">{plan.validity}</p>
                              </div>
                              <span className="text-blue-600 font-bold text-lg">₦{getPriceForTier(plan, user.tier).toLocaleString()}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Step 3: Enter Phone & PIN */}
              {buyDataStep === 3 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <button
                    onClick={() => setBuyDataStep(2)}
                    className="text-blue-600 text-sm font-semibold mb-3 flex items-center gap-1 hover:text-blue-700"
                  >
                    ← Back
                  </button>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-xs text-gray-600 mb-1 font-medium">Selected Plan</p>
                    <div className="flex justify-between items-baseline">
                      <span className="font-semibold text-gray-900">{selectedPlan?.sizeLabel}</span>
                      <span className="text-2xl font-bold text-blue-600">₦{getPriceForTier(selectedPlan!, user.tier).toLocaleString()}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">Phone Number</label>
                    <input
                      type="tel"
                      maxLength={11}
                      placeholder="08012345678"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 11))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition font-semibold text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">6-Digit PIN</label>
                    <div className="flex gap-2">
                      {pin.map((digit, idx) => (
                        <input
                          key={idx}
                          type="password"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => {
                            const newPin = [...pin]
                            newPin[idx] = e.target.value.slice(0, 1)
                            setPin(newPin)
                            if (e.target.value && idx < 5) {
                              document.getElementById(`pin-${idx + 1}`)?.focus()
                            }
                          }}
                          id={`pin-${idx}`}
                          className="flex-1 aspect-square border-2 border-gray-200 rounded-xl text-center text-2xl font-bold focus:border-blue-500 focus:outline-none transition"
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handlePurchaseData}
                    disabled={purchasingData || !phoneNumber || pin.some((p) => !p)}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                  >
                    {purchasingData ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 size={20} className="animate-spin" />
                        Processing...
                      </div>
                    ) : (
                      "Confirm Purchase"
                    )}
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* BUY AIRTIME MODAL - Premium Apple Style */}
      {airtimeOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md"
          >
            {/* Premium Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-6 flex items-center justify-between rounded-t-3xl">
              <h2 className="text-xl font-bold tracking-tight">Purchase Airtime</h2>
              <button
                onClick={() => {
                  setAirtimeOpen(false)
                  setAirtimeNetwork(null)
                  setAirtimeAmount(null)
                  setAirtimePhone("")
                }}
                className="p-2 hover:bg-white/20 rounded-full transition"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Network Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-4">Select Network</label>
                <div className="grid grid-cols-2 gap-3">
                  {NETWORKS.map((net) => (
                    <button
                      key={net.id}
                      onClick={() => setAirtimeNetwork(net.id)}
                      className={`p-4 rounded-xl border-2 font-semibold transition duration-200 ${
                        airtimeNetwork === net.id
                          ? "border-green-600 bg-green-50 text-green-700 shadow-md"
                          : "border-gray-200 bg-white text-gray-900 hover:border-gray-300 active:scale-95"
                      }`}
                    >
                      {net.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-4">Amount</label>
                <div className="grid grid-cols-3 gap-3">
                  {AIRTIME_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setAirtimeAmount(amt)}
                      className={`p-3 rounded-xl border-2 font-semibold transition duration-200 text-sm ${
                        airtimeAmount === amt
                          ? "border-green-600 bg-green-50 text-green-700 shadow-md"
                          : "border-gray-200 bg-white text-gray-900 hover:border-gray-300 active:scale-95"
                      }`}
                    >
                      ₦{amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">Phone Number</label>
                <input
                  type="tel"
                  maxLength={11}
                  placeholder="08012345678"
                  value={airtimePhone}
                  onChange={(e) => setAirtimePhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition font-semibold text-gray-900"
                />
              </div>

              {/* Purchase Button */}
              <button
                onClick={handlePurchaseAirtime}
                disabled={purchasingAirtime || !airtimeNetwork || !airtimeAmount || !airtimePhone}
                className="w-full py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-bold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                {purchasingAirtime ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 size={20} className="animate-spin" />
                    Processing...
                  </div>
                ) : (
                  `Buy ₦${airtimeAmount?.toLocaleString() || "0"} Airtime`
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}