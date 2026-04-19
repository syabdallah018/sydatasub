"use client";

import Link from "next/link";

export default function RewardsPage() {
  return (
    <div className="min-h-screen bg-white px-6 py-12 text-slate-900">
      <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          Notice
        </p>
        <h1 className="mt-4 text-2xl font-bold">Rewards have been removed</h1>
        <p className="mt-3 text-sm text-slate-600">
          Wallet funding and purchases now work without any reward credits or reward history.
        </p>
        <Link
          href="/app"
          className="mt-6 inline-flex rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
