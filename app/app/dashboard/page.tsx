"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DatabaseZap, Phone, Gift, Settings2, Copy, Check, Loader2, LogOut, Sun, Moon } from "lucide-react"
import { useTheme } from "next-themes"
import { toast } from "react-hot-toast"

interface User {
  id: string
  fullName: string
  phone: string
  role: string
  balance: number
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

export default function DashboardPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [copied, setCopied] = useState(false)

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
    toast.success("Copied!")
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.replace("/app")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <Loader2 size={28} className="animate-spin text-green-500" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center justify-between px-5 h-16 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-sm font-bold">
            {user.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div>
            <p className="text-xs text-white/60">Welcome back,</p>
            <p className="text-sm font-semibold">{user.fullName.split(" ")[0]}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="p-2 hover:bg-white/10 rounded-lg">
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-lg">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <div className="px-5 py-6 max-w-2xl mx-auto">
        {/* Wallet Card */}
        <div className="bg-gradient-to-br from-green-600 to-emerald-600 rounded-3xl p-6 mb-6 text-white">
          <p className="text-xs text-white/70 mb-4">Wallet Balance</p>
          <h2 className="text-4xl font-bold mb-6">{formatBalance(user.balance)}</h2>
          <div className="pt-4 border-t border-white/20">
            <p className="text-xs text-white/70 mb-2">Account Number</p>
            <div className="flex items-center justify-between">
              <p className="font-mono font-semibold">{user.virtualAccount?.accountNumber ?? "—"}</p>
              <button
                onClick={handleCopy}
                className="p-2 hover:bg-white/10 rounded-lg transition"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
            {user.virtualAccount?.bankName && (
              <p className="text-xs text-white/60 mt-1">{user.virtualAccount.bankName}</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { icon: DatabaseZap, label: "Data", color: "text-blue-400" },
            { icon: Phone, label: "Airtime", color: "text-green-400" },
            { icon: Gift, label: "Rewards", color: "text-yellow-400" },
            { icon: Settings2, label: "Settings", color: "text-purple-400" },
          ].map((action, i) => {
            const Icon = action.icon
            return (
              <button
                key={i}
                onClick={() => {
                  if (action.label === "Rewards") router.push("/app/dashboard/rewards")
                  else if (action.label === "Settings") router.push("/app/dashboard/settings")
                }}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition"
              >
                <Icon size={20} className={action.color} />
                <span className="text-xs font-medium">{action.label}</span>
              </button>
            )
          })}
        </div>

        {/* Recent Transactions */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Recent Activity</h3>
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            {transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <p className="text-white/60 text-sm">No transactions yet</p>
                <p className="text-white/40 text-xs mt-1">Your activity will show here</p>
              </div>
            ) : (
              <div>
                {transactions.map((tx, idx) => (
                  <div
                    key={tx.id}
                    className={`flex items-center gap-3 px-4 py-3 ${idx > 0 ? "border-t border-white/10" : ""}`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-green-400">✓</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{tx.description}</p>
                      <p className="text-xs text-white/40">{new Date(tx.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold">₦{tx.amount.toLocaleString()}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70">{tx.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}