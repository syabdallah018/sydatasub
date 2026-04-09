"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { User } from "@/types";

export function useUser() {
  return useQuery<User>({
    queryKey: ["user"],
    queryFn: async () => {
      const { data } = await axios.get("/api/auth/me");
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
