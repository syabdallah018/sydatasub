"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Transaction } from "@/types";

interface TransactionsResponse {
  data: Transaction[];
  total: number;
}

export function useTransactions() {
  return useQuery<Transaction[]>({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data } = await axios.get("/api/transactions");
      return data;
    },
    staleTime: 1000 * 30, // 30 seconds
  });
}
