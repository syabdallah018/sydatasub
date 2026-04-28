"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

export default function AdminAirtimeCashPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feePercent, setFeePercent] = useState(10);

  const payoutPercent = 100 - feePercent;

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/settings/airtime-cash", { cache: "no-store" });
      const payload = await res.json();
      if (!res.ok || !payload?.success) {
        toast.error(payload?.error || "Could not load airtime-cash settings.");
        return;
      }
      const fee = Number(payload?.data?.feePercent);
      if (Number.isFinite(fee)) {
        setFeePercent(Math.max(0, Math.min(100, Math.round(fee))));
      }
    } catch {
      toast.error("Could not load airtime-cash settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/admin/settings/airtime-cash", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feePercent }),
      });
      const payload = await res.json();
      if (!res.ok || !payload?.success) {
        toast.error(payload?.error || "Could not update airtime-cash settings.");
        return;
      }
      toast.success(payload?.message || "Airtime-cash fee updated.");
      const nextFee = Number(payload?.data?.feePercent);
      if (Number.isFinite(nextFee)) {
        setFeePercent(Math.max(0, Math.min(100, Math.round(nextFee))));
      }
    } catch {
      toast.error("Could not update airtime-cash settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Airtime to Cash</h1>
        <p className="mt-1 text-sm text-slate-600">
          Configure the conversion fee. Users receive the remainder as payout.
        </p>
      </div>

      <div className="max-w-xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600">
          Fee Percentage
        </label>
        <input
          type="number"
          min={0}
          max={100}
          value={feePercent}
          onChange={(e) => setFeePercent(Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)))}
          className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-base font-semibold text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />

        <p className="mt-3 text-sm text-slate-700">
          Current payout to user: <span className="font-bold text-emerald-700">{payoutPercent}%</span>
        </p>

        <button
          onClick={save}
          disabled={saving}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
