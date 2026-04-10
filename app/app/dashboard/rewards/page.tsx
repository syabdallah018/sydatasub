"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Reward {
  id: string;
  type: string;
  title: string;
  description: string;
  amount: number;
  status: "IN_PROGRESS" | "EARNED" | "CLAIMED";
  claimedAt?: string;
}

export default function RewardsPage() {
  const router = useRouter();

  const { data: rewards, isLoading, error } = useQuery({
    queryKey: ["rewards"],
    queryFn: async () => {
      const res = await fetch("/api/rewards");
      if (!res.ok) throw new Error(`Failed to fetch rewards: ${res.statusText}`);
      const data = await res.json();
      console.log("[REWARDS] Fetched:", data);
      return Array.isArray(data) ? data : data.rewards || [];
    },
    retry: 2,
  });

  const getRewardIcon = (type: string) => {
    switch (type) {
      case "SIGNUP_BONUS":
        return "🎉";
      case "FIRST_DEPOSIT_2K":
        return "💰";
      case "DEPOSIT_10K_UPGRADE":
        return "👑";
      default:
        return "🎁";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "EARNED":
        return "bg-green-500/20 border-green-500/50";
      case "CLAIMED":
        return "bg-teal-500/20 border-teal-500/50";
      default:
        return "bg-white/5 border-white/10";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "EARNED":
        return (
          <Badge className="bg-green-500/30 text-green-200 border border-green-500/50">
            Earned ✓
          </Badge>
        );
      case "CLAIMED":
        return (
          <Badge className="bg-teal-500/30 text-teal-200 border border-teal-500/50">
            Claimed 🎁
          </Badge>
        );
      default:
        return (
          <Badge className="bg-amber-500/30 text-amber-200 border border-amber-500/50">
            In Progress
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--app-bg,#0A0F0E)] text-white p-4">
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="text-white mb-4"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">My Rewards</h1>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full bg-white/10" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--app-bg,#0A0F0E)] text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 backdrop-blur-sm bg-[var(--app-bg,#0A0F0E)]/80 border-b border-white/10 p-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="text-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">My Rewards</h1>
        </div>
      </div>

      {/* Rewards Grid */}
      <div className="p-4 space-y-4 pb-8">
        {rewards && rewards.length > 0 ? (
          rewards.map((reward: Reward, index: number) => (
            <motion.div
              key={reward.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative rounded-xl p-6 border transition-all ${getStatusColor(
                reward.status
              )} ${
                reward.status === "EARNED"
                  ? "bg-gradient-to-r from-green-500/20 to-emerald-500/20 animate-shimmer"
                  : ""
              }`}
            >
              {/* Card Content */}
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="text-5xl">{getRewardIcon(reward.type)}</div>

                {/* Middle Content */}
                <div className="flex-1">
                  <h3 className="text-lg font-bold">{reward.title}</h3>
                  <p className="text-sm text-white/70 mt-1">{reward.description}</p>

                  {/* Amount Badge */}
                  <div className="mt-3">
                    <Badge className="bg-green-500/30 text-green-200 border border-green-500/50">
                      ₦{reward.amount.toLocaleString()}
                    </Badge>
                  </div>
                </div>

                {/* Status Badge - Bottom Right */}
                <div className="flex flex-col items-end">
                  {getStatusBadge(reward.status)}

                  {/* Progress indicator for IN_PROGRESS */}
                  {reward.status === "IN_PROGRESS" && (
                    <div className="mt-2 text-xs text-amber-200">
                      <div className="w-16 h-1 bg-amber-500/30 rounded-full mt-1"></div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-white/70">No rewards yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
