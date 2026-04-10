"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Zap, Phone, Gift, Settings2, Sun, Moon, Copy, Bell, Clock, CheckCircle, XCircle } from "lucide-react";
import { BuyDataSheet, DataPlan, Network } from "@/components/app/BuyDataSheet";
import { AppButton } from "@/components/app/AppButton";
import { getTxIcon, getTxLabel, formatRelativeDate } from "@/lib/txIcon";

interface User {
  id: string;
  name: string;
  phone: string;
  role: string;
  balance: number;
  virtualAccounts: Array<{ accountNumber: string; bankName: string }>;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  description: string;
  createdAt: string;
}

const NETWORKS: Network[] = [
  { id: "mtn", name: "MTN", code: "920", color: "#FFCC00", initial: "M" },
  { id: "airtel", name: "Airtel", code: "901", color: "#FF0000", initial: "A" },
  { id: "glo", name: "Glo", code: "902", color: "#00D084", initial: "G" },
  { id: "9mobile", name: "9mobile", code: "903", color: "#00A651", initial: "9" },
];

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showBuyDataSheet, setShowBuyDataSheet] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  // Fetch user data
  const { data: userData, isLoading: userLoading, isError: userError } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) return res.json();
      if (res.status === 401) throw new Error("Unauthorized");
      throw new Error("Failed");
    },
  });

  useEffect(() => {
    if (userError && !userLoading) router.push("/app");
  }, [userError, userLoading, router]);

  useEffect(() => {
    if (userData) {
      setUser({
        id: userData.id,
        name: userData.fullName || userData.name || "User",
        phone: userData.phone,
        role: userData.role,
        balance: userData.balance || 0,
        virtualAccounts: userData.virtualAccount ? [userData.virtualAccount] : [],
      });
      setIsLoading(false);
    }
  }, [userData]);

  const { data: transactionsData, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading: transactionsLoading } = useInfiniteQuery({
    queryKey: ["transactions"],
    initialPageParam: null,
    queryFn: async ({ pageParam = null }) => {
      const params = new URLSearchParams();
      if (pageParam) params.set("cursor", pageParam);
      params.set("limit", "10");
      const res = await fetch(`/api/transactions?${params}`, { credentials: "include" });
      if (res.ok) return res.json();
      throw new Error("Failed");
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const transactions = transactionsData?.pages.flatMap((page) => page.transactions) || [];

  const formatBalance = (balance: number) => {
    const naira = Math.floor(balance / 100);
    const kobo = balance % 100;
    return `₦${naira.toLocaleString()}.${kobo.toString().padStart(2, "0")}`;
  };

  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const handleDataPurchase = async (plan: DataPlan, phone: string, pin: string) => {
    setIsPurchasing(true);
    try {
      const res = await fetch("/api/data/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ planId: plan.id, phone, pin }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("✨ Data purchased successfully!");
        return;
      }
      throw new Error(data.error || "Failed");
    } catch (error) {
      throw error;
    } finally {
      setIsPurchasing(false);
    }
  };

  const { data: plansData } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const res = await fetch("/api/data/plans");
      if (res.ok) return res.json();
      throw new Error("Failed");
    },
    enabled: showBuyDataSheet,
  });

  const plans: DataPlan[] = (plansData?.plans || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    dataSize: p.dataSize,
    validity: p.validity,
    networkId: p.networkId || NETWORKS.find((n) => n.name.toLowerCase() === p.network?.toLowerCase())?.id || "",
  }));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-app-bg pt-safe pb-safe px-5">
        <div className="space-y-6">
          <Skeleton className="h-12 w-32 rounded-lg" />
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-bg pt-safe pb-safe px-5">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="space-y-6">
        {/* TOP BAR */}
        <motion.div className="flex items-center justify-between" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12 bg-gradient-brand">
              <AvatarFallback className="bg-gradient-brand text-white font-bold">{getInitials(user?.name || "User")}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm text-text-tertiary">Welcome</p>
              <h2 className="text-lg font-heading font-bold text-text-primary">{user?.name?.split(" ")[0]}</h2>
            </div>
          </div>

          <div className="flex gap-2">
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="p-2.5 rounded-lg bg-card-elevated border border-border-primary hover:border-brand transition-colors">
              {theme === "dark" ? <Sun className="w-5 h-5 text-text-secondary" /> : <Moon className="w-5 h-5 text-text-secondary" />}
            </motion.button>
            <motion.button whileTap={{ scale: 0.95 }} className="p-2.5 rounded-lg bg-card-elevated border border-border-primary hover:border-brand transition-colors relative">
              <Bell className="w-5 h-5 text-text-secondary" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-brand rounded-full" />
            </motion.button>
          </div>
        </motion.div>

        {/* WALLET CARD */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{delay: 0.2 }} className="relative overflow-hidden rounded-3xl p-6 bg-gradient-brand text-white shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
          <div className="relative z-10 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-semibold opacity-90 mb-1">Available Balance</p>
                <h3 className="text-4xl font-heading font-bold">{formatBalance(user?.balance || 0)}</h3>
              </div>
              <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 3, repeat: Infinity }} className="text-3xl">💳</motion.div>
            </div>

            {user?.virtualAccounts && user.virtualAccounts.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="pt-4 border-t border-white/20">
                <div className="flex justify-between items-center">
                  <div className="text-sm">
                    <p className="opacity-75 text-xs mb-1">Account Number</p>
                    <p className="font-mono font-semibold">{user.virtualAccounts[0].accountNumber}</p>
                  </div>
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => { navigator.clipboard.writeText(user.virtualAccounts[0].accountNumber); toast.success("Copied!"); }} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    <Copy className="w-4 h-4" />
                  </motion.button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* QUICK ACTIONS */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="grid grid-cols-4 gap-3">
          {[
            { icon: Zap, label: "Buy Data", color: "bg-blue-500/10 text-blue-500", onClick: () => setShowBuyDataSheet(true) },
            { icon: Phone, label: "Airtime", color: "bg-green-500/10 text-green-500", onClick: () => toast.info("Coming soon") },
            { icon: Gift, label: "Rewards", color: "bg-amber-500/10 text-amber-500", onClick: () => router.push("/app/dashboard/rewards") },
            { icon: Settings2, label: "Settings", color: "bg-purple-500/10 text-purple-500", onClick: () => router.push("/app/dashboard/settings") },
          ].map((action, idx) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + idx * 0.05 }}
                whileTap={{ scale: 0.92 }}
                onClick={action.onClick}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-card-elevated border border-border-primary hover:border-brand transition-colors ${action.color}`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs font-semibold text-center">{action.label}</span>
              </motion.button>
            );
          })}
        </motion.div>

        {/* TRANSACTIONS */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-heading font-bold text-text-primary">Transactions</h3>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => router.push("/app/dashboard?tab=transactions")} className="text-sm text-brand hover:text-brand-light transition-colors">
              View all →
            </motion.button>
          </div>

          <AnimatePresence>
            {transactionsLoading && !transactions.length ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
            ) : transactions.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8">
                <p className="text-text-tertiary">No transactions yet</p>
              </motion.div>
            ) : (
              <motion.div className="space-y-2">
                {transactions.slice(0, 5).map((tx: Transaction, idx) => {
                  const isCredit = (tx.type || "").includes("CREDIT") || tx.type === "REWARD_CREDIT";
                  const StatusIcon = tx.status === "SUCCESS" ? CheckCircle : tx.status === "FAILED" ? XCircle : Clock;
                  const Icon = getTxIcon(tx.type as any);

                  return (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + idx * 0.05 }}
                      className="p-4 rounded-xl bg-card-elevated border border-border-primary hover:border-brand transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-full ${isCredit ? "bg-success/10 text-success" : "bg-info/10 text-info"}`}>
                          {Icon}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-text-primary text-sm">{getTxLabel(tx.type as any)}</p>
                          <p className="text-xs text-text-tertiary">{formatRelativeDate(tx.createdAt)}</p>
                        </div>

                        <div className="text-right flex items-center gap-2">
                          <span className={`font-heading font-bold text-sm ${isCredit ? "text-success" : "text-text-primary"}`}>
                            {isCredit ? "+" : "-"}₦{(tx.amount / 100).toFixed(2)}
                          </span>
                          <StatusIcon
                            className={`w-4 h-4 ${
                              tx.status === "SUCCESS" ? "text-success" : tx.status === "FAILED" ? "text-error" : "text-warning"
                            }`}
                          />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {hasNextPage && !isFetchingNextPage && (
            <AppButton onClick={() => fetchNextPage()} variant="secondary" fullWidth size="md">
              Load more
            </AppButton>
          )}
        </motion.div>
      </motion.div>

      <BuyDataSheet isOpen={showBuyDataSheet} onClose={() => setShowBuyDataSheet(false)} onPurchase={handleDataPurchase} networks={NETWORKS} plans={plans} isLoading={isPurchasing} />
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Zap,
  Phone,
  Gift,
  Settings2,
  Sun,
  Moon,
  Copy,
  Bell,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { BuyDataSheet, DataPlan, Network } from "@/components/app/BuyDataSheet";
import { AppButton } from "@/components/app/AppButton";
import { getTxIcon, getTxLabel, formatRelativeDate } from "@/lib/txIcon";

interface User {
  id: string;
  name: string;
  phone: string;
  role: string;
  balance: number;
  virtualAccounts: Array<{
    accountNumber: string;
    bankName: string;
  }>;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  description: string;
  createdAt: string;
}

const NETWORKS: Network[] = [
  { id: "mtn", name: "MTN", code: "920", color: "#FFCC00", initial: "M" },
  { id: "airtel", name: "Airtel", code: "901", color: "#FF0000", initial: "A" },
  { id: "glo", name: "Glo", code: "902", color: "#00D084", initial: "G" },
  { id: "9mobile", name: "9mobile", code: "903", color: "#00A651", initial: "9" },
];

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showBuyDataSheet, setShowBuyDataSheet] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const { data: userData, isLoading: userLoading, isError: userError } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) return res.json();
      if (res.status === 401) throw new Error("Unauthorized");
      throw new Error("Failed to fetch user");
    },
  });

  useEffect(() => {
    if (userError && !userLoading) router.push("/app");
  }, [userError, userLoading, router]);

  useEffect(() => {
    if (userData) {
      setUser({
        id: userData.id,
        name: userData.fullName || userData.name || "User",
        phone: userData.phone,
        role: userData.role,
        balance: userData.balance || 0,
        virtualAccounts: userData.virtualAccount ? [userData.virtualAccount] : [],
      });
      setIsLoading(false);
    }
  }, [userData]);

  const {
    data: transactionsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: transactionsLoading,
  } = useInfiniteQuery({
    queryKey: ["transactions"],
    initialPageParam: null,
    queryFn: async ({ pageParam = null }) => {
      const params = new URLSearchParams();
      if (pageParam) params.set("cursor", pageParam);
      params.set("limit", "10");
      const res = await fetch(`/api/transactions?${params}`, { credentials: "include" });
      if (res.ok) return res.json();
      throw new Error("Failed to fetch transactions");
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const transactions = transactionsData?.pages.flatMap((page) => page.transactions) || [];

  const formatBalance = (balance: number) => {
    const naira = Math.floor(balance / 100);
    const kobo = balance % 100;
    return `₦${naira.toLocaleString()}.${kobo.toString().padStart(2, "0")}`;
  };

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const handleDataPurchase = async (plan: DataPlan, phone: string, pin: string) => {
    setIsPurchasing(true);
    try {
      const res = await fetch("/api/data/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ planId: plan.id, phone, pin }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("✨ Data purchased successfully!");
        return;
      }
      throw new Error(data.error || "Purchase failed");
    } catch (error) {
      throw error;
    } finally {
      setIsPurchasing(false);
    }
  };

  const { data: plansData } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const res = await fetch("/api/data/plans");
      if (res.ok) return res.json();
      throw new Error("Failed to fetch plans");
    },
    enabled: showBuyDataSheet,
  });

  const plans: DataPlan[] = (plansData?.plans || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    dataSize: p.dataSize,
    validity: p.validity,
    networkId: p.networkId || NETWORKS.find((n) => n.name.toLowerCase() === p.network?.toLowerCase())?.id || "",
  }));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-app-bg pt-safe pb-safe px-5">
        <div className="space-y-6">
          <Skeleton className="h-12 w-32 rounded-lg" />
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-bg pt-safe pb-safe px-5">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="space-y-6">
        {/* TOP BAR */}
        <motion.div
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12 bg-gradient-brand">
              <AvatarFallback className="bg-gradient-brand text-white font-bold">
                {getInitials(user?.name || "User")}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm text-text-tertiary">Welcome back</p>
              <h2 className="text-lg font-heading font-bold text-text-primary">
                {user?.name?.split(" ")[0]}
              </h2>
            </div>
          </div>

          <div className="flex gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2.5 rounded-lg bg-card-elevated border border-border-primary hover:border-brand transition-colors"
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5 text-text-secondary" />
              ) : (
                <Moon className="w-5 h-5 text-text-secondary" />
              )}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="p-2.5 rounded-lg bg-card-elevated border border-border-primary hover:border-brand transition-colors relative"
            >
              <Bell className="w-5 h-5 text-text-secondary" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-brand rounded-full" />
            </motion.button>
          </div>
        </motion.div>

        {/* WALLET CARD */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative overflow-hidden rounded-3xl p-6 bg-gradient-brand text-white shadow-lg"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-semibold opacity-90 mb-1">Available Balance</p>
                <h3 className="text-4xl font-heading font-bold">
                  {formatBalance(user?.balance || 0)}
                </h3>
              </div>
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="text-3xl"
              >
                💳
              </motion.div>
            </div>

            {user?.virtualAccounts && user.virtualAccounts.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="pt-4 border-t border-white/20"
              >
                <div className="flex justify-between items-center">
                  <div className="text-sm">
                    <p className="opacity-75 text-xs mb-1">Account Number</p>
                    <p className="font-mono font-semibold">
                      {user.virtualAccounts[0].accountNumber}
                    </p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      navigator.clipboard.writeText(user.virtualAccounts[0].accountNumber);
                      toast.success("Account number copied!");
                    }}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </motion.button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* QUICK ACTIONS */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-4 gap-3"
        >
          {[
            {
              icon: Zap,
              label: "Buy Data",
              color: "bg-blue-500/10 text-blue-500",
              onClick: () => setShowBuyDataSheet(true),
            },
            {
              icon: Phone,
              label: "Airtime",
              color: "bg-green-500/10 text-green-500",
              onClick: () => toast.info("Airtime coming soon"),
            },
            {
              icon: Gift,
              label: "Rewards",
              color: "bg-amber-500/10 text-amber-500",
              onClick: () => router.push("/app/dashboard/rewards"),
            },
            {
              icon: Settings2,
              label: "Settings",
              color: "bg-purple-500/10 text-purple-500",
              onClick: () => router.push("/app/dashboard/settings"),
            },
          ].map((action, idx) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + idx * 0.05 }}
                whileTap={{ scale: 0.92 }}
                onClick={action.onClick}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-card-elevated border border-border-primary hover:border-brand transition-colors ${action.color}`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs font-semibold text-center">{action.label}</span>
              </motion.button>
            );
          })}
        </motion.div>

        {/* TRANSACTIONS */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-3"
        >
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-heading font-bold text-text-primary">Transactions</h3>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push("/app/dashboard?tab=transactions")}
              className="text-sm text-brand hover:text-brand-light transition-colors"
            >
              View all →
            </motion.button>
          </div>

          <AnimatePresence>
            {transactionsLoading && !transactions.length ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <p className="text-text-tertiary">No transactions yet</p>
                <p className="text-xs text-text-disabled mt-1">
                  Your transactions will appear here
                </p>
              </motion.div>
            ) : (
              <motion.div className="space-y-2">
                {transactions.slice(0, 5).map((tx: Transaction, idx) => {
                  const isCredit = (tx.type || "").includes("CREDIT") || tx.type === "REWARD_CREDIT";
                  const statusIcon =
                    tx.status === "SUCCESS"
                      ? CheckCircle
                      : tx.status === "FAILED"
                        ? XCircle
                        : Clock;
                  const StatusIcon = statusIcon;
                  const Icon = getTxIcon(tx.type as any) as any;

                  return (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + idx * 0.05 }}
                      whileTap={{ scale: 0.98 }}
                      className="p-4 rounded-xl bg-card-elevated border border-border-primary hover:border-brand transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2.5 rounded-full ${
                            isCredit ? "bg-success/10 text-success" : "bg-info/10 text-info"
                          }`}
                        >
                          {Icon}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-text-primary text-sm">
                            {getTxLabel(tx.type as any)}
                          </p>
                          <p className="text-xs text-text-tertiary">
                            {formatRelativeDate(tx.createdAt)}
                          </p>
                        </div>

                        <div className="text-right flex items-center gap-2">
                          <span
                            className={`font-heading font-bold text-sm ${
                              isCredit ? "text-success" : "text-text-primary"
                            }`}
                          >
                            {isCredit ? "+" : "-"}₦{(tx.amount / 100).toFixed(2)}
                          </span>
                          <StatusIcon
                            className={`w-4 h-4 ${
                              tx.status === "SUCCESS"
                                ? "text-success"
                                : tx.status === "FAILED"
                                  ? "text-error"
                                  : "text-warning"
                            }`}
                          />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {hasNextPage && !isFetchingNextPage && (
            <AppButton
              onClick={() => fetchNextPage()}
              variant="secondary"
              fullWidth
              size="md"
            >
              Load more
            </AppButton>
          )}
        </motion.div>
      </motion.div>

      <BuyDataSheet
        isOpen={showBuyDataSheet}
        onClose={() => setShowBuyDataSheet(false)}
        onPurchase={handleDataPurchase}
        networks={NETWORKS}
        plans={plans}
        isLoading={isPurchasing}
      />
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  DatabaseZap,
  Phone,
  Gift,
  Settings2,
  Sun,
  Moon,
  Copy,
  ChevronLeft,
  CheckCircle,
  XCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";

interface User {
  id: string;
  name: string;
  phone: string;
  role: string;
  balance: number;
  virtualAccounts: Array<{
    accountNumber: string;
    bankName: string;
  }>;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  description: string;
  createdAt: string;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  dataSize: string;
  validity: number;
  network: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showBuyDataSheet, setShowBuyDataSheet] = useState(false);
  const [buyDataStep, setBuyDataStep] = useState(1);
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [showPinModal, setShowPinModal] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  
  // Airtime state
  const [showAirtimeSheet, setShowAirtimeSheet] = useState(false);
  const [selectedAirtimeNetwork, setSelectedAirtimeNetwork] = useState<string | null>(null);
  const [airtimePhone, setAirtimePhone] = useState("");
  const [airtimeAmount, setAirtimeAmount] = useState("");
  const [airtimePin, setAirtimePin] = useState(["", "", "", "", "", ""]);
  const [showAirtimePinModal, setShowAirtimePinModal] = useState(false);
  const [isAirtimePurchasing, setIsAirtimePurchasing] = useState(false);
  
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  // Fetch user data
  const { data: userData, isLoading: userLoading, isError: userError } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
      });
      if (res.ok) {
        return res.json();
      }
      if (res.status === 401) {
        throw new Error("Unauthorized");
      }
      throw new Error("Failed to fetch user");
    },
  });

  // Handle auth errors - redirect to login if unauthorized
  useEffect(() => {
    if (userError && userLoading === false) {
      router.push("/app");
    }
  }, [userError, userLoading, router]);

  // Update local user state when userData changes
  useEffect(() => {
    if (userData) {
      // Map API response to component state (handle API naming differences)
      setUser({
        id: userData.id,
        name: userData.fullName || userData.name || "User",
        phone: userData.phone,
        role: userData.role,
        balance: userData.balance || 0,
        virtualAccounts: userData.virtualAccount 
          ? [userData.virtualAccount]  // Convert single virtualAccount to array
          : [],
      });
    }
  }, [userData, setUser]);

  // Redirect to login if user fetch fails or is unauthorized
  useEffect(() => {
    if (userLoading === false && (!userData || userError)) {
      router.push("/app");
    }
  }, [userLoading, userData, userError, router]);

  // Fetch transactions with infinite scroll
  const {
    data: transactionsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: transactionsLoading,
  } = useInfiniteQuery({
    queryKey: ["transactions"],
    initialPageParam: null,
    queryFn: async ({ pageParam = null }) => {
      const params = new URLSearchParams();
      if (pageParam) params.set("cursor", pageParam);
      params.set("limit", "10");

      const res = await fetch(`/api/transactions?${params}`, {
        credentials: "include",
      });
      if (res.ok) {
        return res.json();
      }
      throw new Error("Failed to fetch transactions");
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  // Format balance (kobo to naira)
  const formatBalance = (balance: number) => {
    const naira = Math.floor(balance / 100);
    const kobo = balance % 100;
    return `₦${naira.toLocaleString()}.${kobo.toString().padStart(2, "0")}`;
  };

  // Format transaction date
  const formatTransactionDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return `Today, ${format(date, "h:mm a")}`;
    } else if (isYesterday(date)) {
      return `Yesterday, ${format(date, "h:mm a")}`;
    } else {
      return format(date, "MMM d, h:mm a");
    }
  };

  // Get transaction icon and color
  const getTransactionIcon = (type: string, status: string) => {
    if (status === "FAILED") return { icon: XCircle, color: "text-red-500" };
    if (status === "PENDING") return { icon: Clock, color: "text-amber-500" };
    if (type.includes("CREDIT") || type === "FUND_WALLET") return { icon: ArrowDownLeft, color: "text-green-500" };
    return { icon: ArrowUpRight, color: "text-red-500" };
  };

  // Handle PIN input
  const handlePinChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    if (value && index < 5) {
      const nextInput = document.getElementById(`pin-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      const prevInput = document.getElementById(`pin-${index - 1}`);
      prevInput?.focus();
    }
  };

  // Handle purchase
  const handlePurchase = async () => {
    if (!selectedPlan || !phoneNumber) return;

    const pinValue = pin.join("");
    if (pinValue.length !== 6) {
      toast.error("Please enter your 6-digit PIN");
      return;
    }

    setIsPurchasing(true);
    try {
      const res = await fetch("/api/data/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan.id,
          phone: phoneNumber,
          pin: pinValue,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Data purchased successfully!");
        setShowPinModal(false);
        setShowBuyDataSheet(false);
        // Reset form
        setBuyDataStep(1);
        setSelectedNetwork(null);
        setSelectedPlan(null);
        setPhoneNumber("");
        setPin(["", "", "", "", "", ""]);
      } else {
        toast.error(data.error || "Purchase failed");
      }
    } catch (error) {
      toast.error("Network error");
    } finally {
      setIsPurchasing(false);
    }
  };

  // Handle airtime purchase
  const handleAirtimePurchase = async () => {
    if (!selectedAirtimeNetwork || !airtimePhone || !airtimeAmount) return;

    const pinValue = airtimePin.join("");
    if (pinValue.length !== 6) {
      toast.error("Please enter your 6-digit PIN");
      return;
    }

    setIsAirtimePurchasing(true);
    try {
      const res = await fetch("/api/airtime/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: airtimePhone,
          amount: parseInt(airtimeAmount),
          network: selectedAirtimeNetwork,
          pin: pinValue,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Airtime purchased successfully!");
        setShowAirtimePinModal(false);
        setShowAirtimeSheet(false);
        // Reset form
        setSelectedAirtimeNetwork(null);
        setAirtimePhone("");
        setAirtimeAmount("");
        setAirtimePin(["", "", "", "", "", ""]);
      } else {
        toast.error(data.error || "Purchase failed");
      }
    } catch (error) {
      toast.error("Network error");
    } finally {
      setIsAirtimePurchasing(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  // Get user initials
  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-[var(--app-bg,#0A0F0E)] p-4">
        <div className="space-y-6">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user && userLoading) {
    return (
      <div className="min-h-screen bg-[var(--app-bg,#0A0F0E)] text-white p-4">
        <div className="space-y-6">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <div className="grid grid-cols-4 gap-4">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const networks = [
    { id: "MTN", name: "MTN", color: "#FFCC00", bgColor: "bg-yellow-500" },
    { id: "GLO", name: "Glo", color: "#008751", bgColor: "bg-green-500" },
    { id: "AIRTEL", name: "Airtel", color: "#E40000", bgColor: "bg-red-500" },
    { id: "9MOBILE", name: "9Mobile", color: "#007A4D", bgColor: "bg-teal-600" },
  ];

  return (
    <div className="min-h-screen bg-[var(--app-bg,#0A0F0E)] text-white">
      {/* Top Bar */}
      <div className="sticky top-0 z-50 backdrop-blur-sm bg-[var(--app-bg,#0A0F0E)]/80 border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <Avatar className="h-10 w-10">
            <AvatarFallback className={user.role === "AGENT" ? "bg-yellow-500" : "bg-green-500"}>
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-col items-center">
            <span className="font-semibold">{user.name.split(" ")[0]}</span>
            <Badge variant="secondary" className="text-xs">
              {user.role}
            </Badge>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="text-white"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Wallet Card */}
        <motion.div
          layoutId="wallet-card"
          className="bg-gradient-to-r from-teal-600 to-emerald-600 rounded-2xl p-6 text-white"
        >
          <div className="flex justify-between items-start mb-4">
            <span className="text-sm opacity-90">Wallet Balance</span>
          </div>

          <div className="text-3xl font-bold mb-6">
            {formatBalance(user.balance)}
          </div>

          {user.virtualAccounts && user.virtualAccounts[0] && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm opacity-90">Account Number</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(user.virtualAccounts[0].accountNumber)}
                  className="h-6 w-6 p-0 text-white/70 hover:text-white"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              <div className="font-mono text-lg">
                {user.virtualAccounts[0].accountNumber}
              </div>
              <div className="text-sm opacity-75">
                {user.virtualAccounts[0].bankName}
              </div>
            </div>
          )}
        </motion.div>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-4">
          <Sheet open={showBuyDataSheet} onOpenChange={setShowBuyDataSheet}>
            <SheetTrigger>
              <button className="flex flex-col items-center space-y-2 p-4 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 transition">
                <DatabaseZap className="h-6 w-6 text-teal-400" />
                <span className="text-xs text-center">Buy Data</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="bg-[var(--app-bg,#0A0F0E)] border-white/10 text-white">
              <BuyDataSheet
                step={buyDataStep}
                setStep={setBuyDataStep}
                selectedNetwork={selectedNetwork}
                setSelectedNetwork={setSelectedNetwork}
                selectedPlan={selectedPlan}
                setSelectedPlan={setSelectedPlan}
                phoneNumber={phoneNumber}
                setPhoneNumber={setPhoneNumber}
                networks={networks}
                onProceedToPin={() => setShowPinModal(true)}
              />
            </SheetContent>
          </Sheet>

          <Sheet open={showAirtimeSheet} onOpenChange={setShowAirtimeSheet}>
            <SheetTrigger>
              <button className="flex flex-col items-center space-y-2 p-4 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 transition">
                <Phone className="h-6 w-6 text-teal-400" />
                <span className="text-xs text-center">Airtime</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="bg-[var(--app-bg,#0A0F0E)] border-white/10 text-white">
              <AirtimeSheet
                selectedNetwork={selectedAirtimeNetwork}
                setSelectedNetwork={setSelectedAirtimeNetwork}
                phone={airtimePhone}
                setPhone={setAirtimePhone}
                amount={airtimeAmount}
                setAmount={setAirtimeAmount}
                networks={networks}
                onProceedToPin={() => setShowAirtimePinModal(true)}
              />
            </SheetContent>
          </Sheet>

          <button
            onClick={() => router.push("/app/dashboard/rewards")}
            className="flex flex-col items-center space-y-2 p-4 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 transition"
          >
            <Gift className="h-6 w-6 text-teal-400" />
            <span className="text-xs text-center">Rewards</span>
          </button>

          <button
            onClick={() => router.push("/app/dashboard/settings")}
            className="flex flex-col items-center space-y-2 p-4 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 transition"
          >
            <Settings2 className="h-6 w-6 text-teal-400" />
            <span className="text-xs text-center">Settings</span>
          </button>
        </div>

        {/* Transaction History */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Recent Transactions</h2>
            <button
              onClick={() => router.push("/app/dashboard/transactions")}
              className="text-teal-400 text-sm hover:text-teal-300"
            >
              See All
            </button>
          </div>

          <div className="space-y-3">
            {transactionsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full bg-white/10" />
              ))
            ) : transactionsData?.pages.flatMap(page => page.transactions).length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-white/70">No transactions yet</p>
              </div>
            ) : (
              transactionsData?.pages.flatMap(page =>
                page.transactions.map((transaction: Transaction) => {
                  const { icon: Icon, color } = getTransactionIcon(transaction.type, transaction.status);
                  const isCredit = transaction.type.includes("CREDIT") || transaction.type === "FUND_WALLET";

                  return (
                    <div key={transaction.id} className="flex items-center space-x-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${color.replace("text-", "bg-")}/20`}>
                        <Icon className={`w-5 h-5 ${color}`} />
                      </div>

                      <div className="flex-1">
                        <p className="text-sm font-medium">{transaction.description}</p>
                        <p className="text-xs text-white/60">{formatTransactionDate(transaction.createdAt)}</p>
                      </div>

                      <div className="text-right">
                        <p className={`text-sm font-semibold ${isCredit ? "text-green-400" : "text-red-400"}`}>
                          {isCredit ? "+" : "-"}{formatBalance(Math.abs(transaction.amount))}
                        </p>
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>
        </div>
      </div>

      {/* PIN Modal */}
      <Dialog open={showPinModal} onOpenChange={setShowPinModal}>
        <DialogContent className="bg-[var(--app-bg,#0A0F0E)] border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle>Enter your 6-digit PIN</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="flex gap-2 justify-center">
              {pin.map((digit, index) => (
                <input
                  key={index}
                  id={`pin-${index}`}
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinChange(index, e.target.value)}
                  onKeyDown={(e) => handlePinKeyDown(index, e)}
                  className="w-10 h-10 text-center bg-slate-800/50 border border-slate-600 rounded-lg text-white text-lg font-mono focus:border-teal-400 focus:outline-none"
                />
              ))}
            </div>

            <div className="text-center text-sm text-white/60">
              Current balance: {formatBalance(user.balance)}
            </div>

            <Button
              onClick={handlePurchase}
              disabled={isPurchasing || pin.some(d => !d)}
              className="w-full bg-teal-500 hover:bg-teal-600 text-white"
            >
              {isPurchasing ? "Processing..." : "Confirm Purchase"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Airtime PIN Modal */}
      <Dialog open={showAirtimePinModal} onOpenChange={setShowAirtimePinModal}>
        <DialogContent className="bg-[var(--app-bg,#0A0F0E)] border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle>Enter your 6-digit PIN</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="flex gap-2 justify-center">
              {airtimePin.map((digit, index) => (
                <input
                  key={index}
                  id={`airtime-pin-${index}`}
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => {
                    const newPin = [...airtimePin];
                    newPin[index] = e.target.value;
                    setAirtimePin(newPin);
                    if (e.target.value && index < 5) {
                      const nextInput = document.getElementById(`airtime-pin-${index + 1}`);
                      nextInput?.focus();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !airtimePin[index] && index > 0) {
                      const prevInput = document.getElementById(`airtime-pin-${index - 1}`);
                      prevInput?.focus();
                    }
                  }}
                  className="w-10 h-10 text-center bg-slate-800/50 border border-slate-600 rounded-lg text-white text-lg font-mono focus:border-teal-400 focus:outline-none"
                />
              ))}
            </div>

            <div className="text-center text-sm text-white/60">
              Current balance: {formatBalance(user.balance)}
            </div>

            <Button
              onClick={handleAirtimePurchase}
              disabled={isAirtimePurchasing || airtimePin.some(d => !d)}
              className="w-full bg-teal-500 hover:bg-teal-600 text-white"
            >
              {isAirtimePurchasing ? "Processing..." : "Confirm Purchase"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Buy Data Sheet Component
function BuyDataSheet({
  step,
  setStep,
  selectedNetwork,
  setSelectedNetwork,
  selectedPlan,
  setSelectedPlan,
  phoneNumber,
  setPhoneNumber,
  networks,
  onProceedToPin,
}: {
  step: number;
  setStep: (step: number) => void;
  selectedNetwork: string | null;
  setSelectedNetwork: (network: string | null) => void;
  selectedPlan: any;
  setSelectedPlan: (plan: any) => void;
  phoneNumber: string;
  setPhoneNumber: (phone: string) => void;
  networks: any[];
  onProceedToPin: () => void;
}) {
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPlans = async (network: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/data/plans?network=${network}`);
      const data = await res.json();
      setPlans(data);
    } catch (error) {
      console.error("Failed to fetch plans");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNetworkSelect = (networkId: string) => {
    setSelectedNetwork(networkId);
    fetchPlans(networkId);
    setStep(2);
  };

  const handlePlanSelect = (plan: any) => {
    setSelectedPlan(plan);
    setStep(3);
  };

  const handleProceed = () => {
    if (!phoneNumber || phoneNumber.length !== 11 || !phoneNumber.startsWith("0")) {
      toast.error("Please enter a valid phone number");
      return;
    }
    onProceedToPin();
  };

  return (
    <div className="space-y-6">
      {step === 1 && (
        <>
          <SheetHeader>
            <SheetTitle>Select Network</SheetTitle>
          </SheetHeader>

          <div className="grid grid-cols-2 gap-4">
            {networks.map((network) => (
              <button
                key={network.id}
                onClick={() => handleNetworkSelect(network.id)}
                className={`relative p-6 rounded-xl text-white font-semibold overflow-hidden ${network.bgColor} hover:opacity-90 transition`}
              >
                <div className="absolute inset-0 flex items-center justify-center opacity-10">
                  <span className="text-6xl font-bold">{network.name[0]}</span>
                </div>
                <span className="relative z-10">{network.name}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <SheetHeader>
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(1)}
                className="text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <SheetTitle>{selectedNetwork} Data Plans</SheetTitle>
            </div>
          </SheetHeader>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full bg-white/10" />
              ))}
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => handlePlanSelect(plan)}
                  className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-lg text-left transition"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-white font-semibold">{plan.name}</p>
                      <p className="text-white/60 text-sm">{plan.validity} days</p>
                    </div>
                    <p className="text-teal-400 font-bold">₦{plan.price.toLocaleString()}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {step === 3 && selectedPlan && (
        <>
          <SheetHeader>
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(2)}
                className="text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <SheetTitle>Phone Number</SheetTitle>
            </div>
          </SheetHeader>

          <div className="bg-white/5 rounded-lg p-4 mb-4">
            <p className="text-white/60 text-sm mb-2">Selected Plan</p>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-white font-semibold">{selectedPlan.name}</p>
                <p className="text-white/60 text-sm">{selectedNetwork} • {selectedPlan.validity} days</p>
              </div>
              <p className="text-teal-400 font-bold">₦{selectedPlan.price.toLocaleString()}</p>
            </div>
          </div>

          <div>
            <Label htmlFor="phone" className="text-white text-sm">
              Phone Number
            </Label>
            <Input
              id="phone"
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="08XXXXXXXXX"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="mt-2 bg-white/10 border-white/20 text-white placeholder:text-white/50"
            />
          </div>

          <Button
            onClick={handleProceed}
            className="w-full bg-teal-500 hover:bg-teal-600 text-white"
          >
            Continue
          </Button>
        </>
      )}
    </div>
  );
}

// Airtime Sheet Component
function AirtimeSheet({
  selectedNetwork,
  setSelectedNetwork,
  phone,
  setPhone,
  amount,
  setAmount,
  networks,
  onProceedToPin,
}: {
  selectedNetwork: string | null;
  setSelectedNetwork: (network: string | null) => void;
  phone: string;
  setPhone: (phone: string) => void;
  amount: string;
  setAmount: (amount: string) => void;
  networks: any[];
  onProceedToPin: () => void;
}) {
  const handleProceed = () => {
    if (!selectedNetwork) {
      toast.error("Please select a network");
      return;
    }
    if (!phone || phone.length !== 11 || !phone.startsWith("0")) {
      toast.error("Please enter a valid phone number (11 digits starting with 0)");
      return;
    }
    if (!amount || parseInt(amount) < 50 || parseInt(amount) > 50000) {
      toast.error("Amount must be between ₦50 and ₦50,000");
      return;
    }
    onProceedToPin();
  };

  return (
    <div className="space-y-6">
      <SheetHeader>
        <SheetTitle>Buy Airtime</SheetTitle>
      </SheetHeader>

      {/* Network Selector */}
      <div>
        <p className="text-white/70 text-sm mb-3">Select Network</p>
        <div className="flex gap-2">
          {networks.map((network) => (
            <button
              key={network.id}
              onClick={() => setSelectedNetwork(network.id)}
              className={`flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition ${
                selectedNetwork === network.id
                  ? "bg-teal-500 text-white"
                  : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
            >
              {network.name}
            </button>
          ))}
        </div>
      </div>

      {/* Phone Number Input */}
      <div>
        <Label htmlFor="airtime-phone" className="text-white text-sm">
          Mobile Number
        </Label>
        <Input
          id="airtime-phone"
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="08XXXXXXXXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value.slice(0, 11))}
          className="mt-2 bg-white/10 border-white/20 text-white placeholder:text-white/50"
        />
      </div>

      {/* Amount Input */}
      <div>
        <Label htmlFor="airtime-amount" className="text-white text-sm">
          Amount
        </Label>
        <Input
          id="airtime-amount"
          type="number"
          inputMode="numeric"
          placeholder="Enter amount (₦)"
          min="50"
          max="50000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mt-2 bg-white/10 border-white/20 text-white placeholder:text-white/50"
        />
        <p className="text-xs text-white/50 mt-1">Min: ₦50 | Max: ₦50,000</p>
      </div>

      {/* Summary */}
      {amount && (
        <div className="bg-white/5 rounded-lg p-4">
          <p className="text-white/60 text-sm">
            You'll be charged <span className="font-bold text-white">₦{parseInt(amount).toLocaleString()}</span> from your wallet
          </p>
        </div>
      )}

      {/* Buy Button */}
      <Button
        onClick={handleProceed}
        disabled={!selectedNetwork || !phone || !amount}
        className="w-full bg-teal-500 hover:bg-teal-600 text-white disabled:opacity-50"
      >
        Buy Airtime
      </Button>
    </div>
  );
}