"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ reset }: DashboardErrorProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-4 max-w-md">
        <div className="flex justify-center">
          <AlertTriangle className="h-12 w-12 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-white">Something went wrong!</h2>
        <p className="text-gray-400">
          We encountered an error while loading your dashboard. Please try again.
        </p>
        <Button onClick={reset} className="mt-6" size="lg">
          Try Again
        </Button>
      </div>
    </div>
  );
}
