"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { UserReward } from "@/types";

interface RewardsResponse {
  availableRewards: any[];
  userRewards: UserReward[];
}

export function useRewards() {
  return useQuery<RewardsResponse>({
    queryKey: ["rewards"],
    queryFn: async () => {
      const { data } = await axios.get("/api/rewards");
      return data;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}
