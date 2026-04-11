"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "next-themes";
import { ReactNode, useState, useEffect } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  // Register Service Worker for cache bypass (WebView compatibility)
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[APP] Service Worker registered:", reg.scope);
          // Force update check immediately
          reg.update();
          // Check for updates every 30 seconds
          setInterval(() => {
            console.log("[APP] Checking for Service Worker updates...");
            reg.update();
          }, 30000);
        })
        .catch((err) => {
          console.error("[APP] Service Worker registration failed:", err);
        });
    }
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster position="top-right" />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
