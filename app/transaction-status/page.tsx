"use client";

import { Suspense } from "react";
import StatusContent from "./status-content";

export const dynamic = "force-dynamic";

export default function TransactionStatusPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500" /></div>}>
      <StatusContent />
    </Suspense>
  );
}
