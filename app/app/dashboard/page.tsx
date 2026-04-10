"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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
  ArrowRight
} from "lucide-react"
import { toast } from "react-hot-toast"

interface User {
  id: string
  fullName: string
  phone: string
  balance: number
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
  sizeLabel: string
  validity: string
  network: string
}

const NETWORKS = [
  { id: "mtn", name: "MTN", color: "bg-yellow-100", textColor: "text-yellow-700" },
  { id: "airtel", name: "Airtel", color: "bg-red-100", textColor: "text-red-700" },
  { id: "glo", name: "Glo", color: "bg-green-100", textColor: "text-green-700" },
  { id: "9mobile", name: "9mobile", color: "bg-blue-100", textColor: "text-blue-700" },
]

const AIRTIME_AMOUNTS = [100, 200, 500, 1000, 2000, 5000]

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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center text-sm font-bold text-white">
              {user.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div>
              <p className="text-xs text-slate-500">Welcome back,</p>
              <p className="text-sm font-semibold text-slate-900">{user.fullName.split(" ")[0]}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-red-50 text-red-600 font-medium transition text-sm"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Wallet Card - Premium Fintech Style */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-600 to-green-600 rounded-3xl p-8 mb-6 text-white shadow-lg">
          <div className="flex justify-between items-start mb-8">
            <div>
              <p className="text-blue-100 text-sm mb-2">Available Balance</p>
              <div className="flex items-center gap-3">
                <h2 className="text-5xl font-bold">
                  {showBalance ? formatBalance(user.balance) : "••••••"}
                </h2>
                <button
                  onClick={() => setShowBalance(!showBalance)}
                  className="p-2 hover:bg-white/20 rounded-lg transition"
                >
                  {showBalance ? <Eye size={20} /> : <EyeOff size={20} />}
                </button>
              </div>
            </div>
          </div>

          {/* Account Details */}
          <div className="border-t border-white/20 pt-6">
            <p className="text-blue-100 text-xs mb-2">Virtual Account</p>
            <div className="flex items-center justify-between group cursor-pointer" onClick={handleCopy}>
              <div>
                <p className="font-mono text-lg font-semibold">{user.virtualAccount?.accountNumber ?? "—"}</p>
                <p className="text-blue-100 text-xs mt-1">{user.virtualAccount?.bankName || "Linked Account"}</p>
              </div>
              <button
                className="p-2 hover:bg-white/20 rounded-lg transition"
              >
                {copied ? <Check size={20} /> : <Copy size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions Grid - Fintech Style */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {/* Buy Data */}
          <button
            onClick={() => {
              setBuyDataOpen(true)
              setBuyDataStep(1)
            }}
            className="bg-white rounded-2xl p-6 border-2 border-slate-200 hover:border-blue-500 hover:shadow-lg transition active:scale-95"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Zap size={24} className="text-blue-600" />
              </div>
              <ChevronRight size={20} className="text-slate-400" />
            </div>
            <p className="text-left font-semibold text-slate-900">Buy Data</p>
            <p className="text-left text-sm text-slate-500 mt-1">All networks</p>
          </button>

          {/* Buy Airtime */}
          <button
            onClick={() => setAirtimeOpen(true)}
            className="bg-white rounded-2xl p-6 border-2 border-slate-200 hover:border-green-500 hover:shadow-lg transition active:scale-95"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <Phone size={24} className="text-green-600" />
              </div>
              <ChevronRight size={20} className="text-slate-400" />
            </div>
            <p className="text-left font-semibold text-slate-900">Buy Airtime</p>
            <p className="text-left text-sm text-slate-500 mt-1">All networks</p>
          </button>

          {/* Rewards - Coming Soon */}
          <button
            disabled
            className="bg-slate-100 rounded-2xl p-6 border-2 border-slate-200 opacity-50 cursor-not-allowed"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <Gift size={24} className="text-amber-600" />
              </div>
              <ChevronRight size={20} className="text-slate-400" />
            </div>
            <p className="text-left font-semibold text-slate-900">Rewards</p>
            <p className="text-left text-sm text-slate-500 mt-1">Coming soon</p>
          </button>

          {/* Settings */}
          <button
            disabled
            className="bg-slate-100 rounded-2xl p-6 border-2 border-slate-200 opacity-50 cursor-not-allowed"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-slate-300 flex items-center justify-center">
                <Settings size={24} className="text-slate-600" />
              </div>
              <ChevronRight size={20} className="text-slate-400" />
            </div>
            <p className="text-left font-semibold text-slate-900">Settings</p>
            <p className="text-left text-sm text-slate-500 mt-1">Coming soon</p>
          </button>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Transactions</h3>
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <ArrowRight className="text-slate-400" size={24} />
              </div>
              <p className="text-slate-600 font-medium">No transactions yet</p>
              <p className="text-slate-400 text-sm mt-1">Your activity will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-xl transition border border-slate-100">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-green-100 flex items-center justify-center flex-shrink-0">
                    <Zap size={20} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{tx.description}</p>
                    <p className="text-sm text-slate-500">{new Date(tx.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-slate-900">₦{(tx.amount / 100).toLocaleString()}</p>
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                      tx.status === "SUCCESS" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
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

      {/* BUY DATA MODAL */}
      {buyDataOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-green-600 text-white px-6 py-6 flex items-center justify-between">
              <h2 className="text-xl font-bold">Buy Data</h2>
              <button
                onClick={() => {
                  setBuyDataOpen(false)
                  setBuyDataStep(1)
                  setSelectedNetwork(null)
                  setSelectedPlan(null)
                }}
                className="p-1 hover:bg-white/20 rounded-lg transition"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              {/* Step 1: Select Network */}
              {buyDataStep === 1 && (
                <div className="space-y-4">
                  <p className="text-slate-600 font-medium">Select Network</p>
                  <div className="grid grid-cols-2 gap-3">
                    {NETWORKS.map((net) => (
                      <button
                        key={net.id}
                        onClick={() => handleNetworkSelect(net.id)}
                        className={`p-4 rounded-xl border-2 font-semibold transition ${
                          selectedNetwork === net.id
                            ? "border-blue-600 bg-blue-50 text-blue-700"
                            : "border-slate-200 bg-white text-slate-900 hover:border-slate-300"
                        }`}
                      >
                        {net.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Select Plan */}
              {buyDataStep === 2 && (
                <div className="space-y-4">
                  <button
                    onClick={() => setBuyDataStep(1)}
                    className="text-blue-600 text-sm font-medium mb-2"
                  >
                    ← Back
                  </button>
                  <p className="text-slate-600 font-medium">Select Data Plan</p>
                  {plansLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="animate-spin text-blue-600" size={24} />
                    </div>
                  ) : dataPlans.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">No plans available</p>
                  ) : (
                    <div className="space-y-2">
                      {dataPlans.map((plan) => (
                        <button
                          key={plan.id}
                          onClick={() => handlePlanSelect(plan)}
                          className="w-full p-4 rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-left transition"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-semibold text-slate-900">{plan.sizeLabel}</span>
                            <span className="text-blue-600 font-bold">₦{(plan.price / 100).toLocaleString()}</span>
                          </div>
                          <p className="text-sm text-slate-500">{plan.validity}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Enter Phone & PIN */}
              {buyDataStep === 3 && (
                <div className="space-y-5">
                  <button
                    onClick={() => setBuyDataStep(2)}
                    className="text-blue-600 text-sm font-medium mb-2"
                  >
                    ← Back
                  </button>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Selected Plan: {selectedPlan?.sizeLabel}
                    </label>
                    <p className="text-2xl font-bold text-slate-900">₦{(selectedPlan?.price || 0) / 100}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      maxLength={11}
                      placeholder="08012345678"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 11))}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">6-Digit PIN</label>
                    <div className="flex gap-2 justify-between">
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
                          className="w-full aspect-square border-2 border-slate-200 rounded-lg text-center text-2xl font-bold focus:border-blue-500 focus:outline-none"
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handlePurchaseData}
                    disabled={purchasingData || !phoneNumber || pin.some((p) => !p)}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-lg font-bold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
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
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BUY AIRTIME MODAL */}
      {airtimeOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white px-6 py-6 flex items-center justify-between rounded-t-3xl">
              <h2 className="text-xl font-bold">Buy Airtime</h2>
              <button
                onClick={() => {
                  setAirtimeOpen(false)
                  setAirtimeNetwork(null)
                  setAirtimeAmount(null)
                  setAirtimePhone("")
                }}
                className="p-1 hover:bg-white/20 rounded-lg transition"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Network Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Network</label>
                <div className="grid grid-cols-2 gap-2">
                  {NETWORKS.map((net) => (
                    <button
                      key={net.id}
                      onClick={() => setAirtimeNetwork(net.id)}
                      className={`p-3 rounded-lg border-2 font-semibold transition ${
                        airtimeNetwork === net.id
                          ? "border-green-600 bg-green-50 text-green-700"
                          : "border-slate-200 bg-white text-slate-900"
                      }`}
                    >
                      {net.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Amount</label>
                <div className="grid grid-cols-3 gap-2">
                  {AIRTIME_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setAirtimeAmount(amt)}
                      className={`p-3 rounded-lg border-2 font-semibold transition ${
                        airtimeAmount === amt
                          ? "border-green-600 bg-green-50 text-green-700"
                          : "border-slate-200 bg-white text-slate-900"
                      }`}
                    >
                      ₦{amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  maxLength={11}
                  placeholder="08012345678"
                  value={airtimePhone}
                  onChange={(e) => setAirtimePhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-green-500 focus:outline-none"
                />
              </div>

              {/* Purchase Button */}
              <button
                onClick={handlePurchaseAirtime}
                disabled={purchasingAirtime || !airtimeNetwork || !airtimeAmount || !airtimePhone}
                className="w-full py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg font-bold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {purchasingAirtime ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 size={20} className="animate-spin" />
                    Processing...
                  </div>
                ) : (
                  `Buy ₦${airtimeAmount || 0} Airtime`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}