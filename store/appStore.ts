"use client";

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { User, Transaction, Plan } from "@/types";

interface AppStore {
  // User state
  user: User | null;
  setUser: (user: User | null) => void;
  clearUser: () => void;
  
  // Loading state
  isLoading: boolean;
  setLoading: (v: boolean) => void;
  
  // Buy data flow state
  selectedNetwork: string | null;
  setSelectedNetwork: (n: string | null) => void;
  selectedPlan: Plan | null;
  setSelectedPlan: (p: Plan | null) => void;
  
  // Legacy fields for backward compatibility
  transactions: Transaction[];
  plans: Plan[];
  setTransactions: (transactions: Transaction[]) => void;
  setPlans: (plans: Plan[]) => void;
  logout: () => void;
}

export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (set) => ({
        // User state
        user: null,
        setUser: (user) => set({ user }),
        clearUser: () => set({ user: null }),
        
        // Loading state
        isLoading: true,
        setLoading: (v) => set({ isLoading: v }),
        
        // Buy data flow state
        selectedNetwork: null,
        setSelectedNetwork: (n) => set({ selectedNetwork: n }),
        selectedPlan: null,
        setSelectedPlan: (p) => set({ selectedPlan: p }),
        
        // Legacy fields
        transactions: [],
        plans: [],
        setTransactions: (transactions) => set({ transactions }),
        setPlans: (plans) => set({ plans }),
        logout: () =>
          set({
            user: null,
            transactions: [],
            isLoading: false,
            selectedNetwork: null,
            selectedPlan: null,
          }),
      }),
      {
        name: "sy-data-sub-store",
        partialize: (state) => ({ user: state.user }),
      }
    )
  )
);

