"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Cpu,
  RefreshCw,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Loader2,
  Search,
  Filter,
  DollarSign,
  Radio,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface QueuedTransaction {
  id: string;
  reference: string;
  phone: string;
  amount: number;
  status: string;
  description: string;
  apiUsed?: string;
  createdAt: string;
  plan?: {
    id: string;
    name: string;
    network: string;
    category: string;
    sizeLabel: string;
    user_price: number;
    apiSource: string;
  };
  user?: {
    id: string;
    fullName: string;
    phone: string;
    email?: string;
  };
}

interface SummaryStats {
  totalQueuedCount: number;
  totalQueuedAmount: number;
  networkBreakdown: Record<string, number>;
  providerBreakdown: Record<string, number>;
}

export default function AdminSimConfigPage() {
  const [queued, setQueued] = useState<QueuedTransaction[]>([]);
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState<string>("ALL");

  // Single item action states
  const [processingRef, setProcessingRef] = useState<string | null>(null);

  // Batch retry state
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [batchLogs, setBatchLogs] = useState<Array<{ ref: string; phone: string; status: "success" | "pending" | "error"; message: string }>>([]);
  const [showBatchModal, setShowBatchModal] = useState(false);

  const fetchQueued = useCallback(async (showToast = false) => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/sim-config");
      const data = await res.json();

      if (res.ok && data.success) {
        setQueued(data.data.queuedTransactions || []);
        setSummary(data.data.summary || null);
        if (showToast) {
          toast.success("Queued SIM orders refreshed");
        }
      } else {
        toast.error(data.error || "Failed to load queued SIM orders");
      }
    } catch (err) {
      console.error("[FETCH QUEUED ERROR]", err);
      toast.error("Network error while loading queued SIM orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueued();
  }, [fetchQueued]);

  // Single Retry
  const handleSingleRetry = async (reference: string) => {
    setProcessingRef(reference);
    try {
      const res = await fetch("/api/admin/sim-config/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, action: "retry" }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(`Ref ${reference}: ${data.message || "Delivered successfully!"}`);
        fetchQueued();
      } else {
        toast.warning(`Ref ${reference}: ${data.message || "Still waiting for SIM config"}`);
        fetchQueued();
      }
    } catch (err) {
      console.error("[SINGLE RETRY ERROR]", err);
      toast.error(`Error retrying transaction ${reference}`);
    } finally {
      setProcessingRef(null);
    }
  };

  // Single Refund
  const handleSingleRefund = async (reference: string, amount: number) => {
    const confirm = window.confirm(
      `Are you sure you want to CANCEL and REFUND ₦${amount} for reference ${reference}? This will immediately credit the customer wallet and cancel the order.`
    );
    if (!confirm) return;

    setProcessingRef(reference);
    try {
      const res = await fetch("/api/admin/sim-config/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, action: "refund" }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(`Ref ${reference} cancelled and refunded successfully.`);
        fetchQueued();
      } else {
        toast.error(data.error || data.message || "Failed to refund transaction");
      }
    } catch (err) {
      console.error("[REFUND ERROR]", err);
      toast.error("Error processing refund");
    } finally {
      setProcessingRef(null);
    }
  };

  // Batch Retry All
  const handleRetryAll = async () => {
    if (queued.length === 0) {
      toast.info("No queued transactions to retry.");
      return;
    }

    const confirm = window.confirm(
      `Start sequential retry for ${queued.length} queued data purchase(s)? The system will process each order one after another with automatic throttling.`
    );
    if (!confirm) return;

    setBatchRunning(true);
    setShowBatchModal(true);
    setBatchLogs([]);
    setBatchProgress({ current: 0, total: queued.length });

    for (let i = 0; i < queued.length; i++) {
      const tx = queued[i];
      setBatchProgress({ current: i + 1, total: queued.length });

      try {
        const res = await fetch("/api/admin/sim-config/retry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference: tx.reference, action: "retry" }),
        });
        const data = await res.json();

        if (res.ok && data.success) {
          setBatchLogs((prev) => [
            {
              ref: tx.reference,
              phone: tx.phone,
              status: "success",
              message: data.message || "Delivered successfully",
            },
            ...prev,
          ]);
        } else {
          setBatchLogs((prev) => [
            {
              ref: tx.reference,
              phone: tx.phone,
              status: data.status === "PENDING" ? "pending" : "error",
              message: data.message || data.error || "Provider did not dispense",
            },
            ...prev,
          ]);
        }
      } catch (err: any) {
        setBatchLogs((prev) => [
          {
            ref: tx.reference,
            phone: tx.phone,
            status: "error",
            message: err.message || "Network error",
          },
          ...prev,
        ]);
      }

      // Small throttle delay between provider calls (1.5s) to avoid vendor rate-limiting
      if (i < queued.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    setBatchRunning(false);
    toast.success("Sequential retry cycle completed.");
    fetchQueued();
  };

  // Filter queued list
  const filteredList = queued.filter((tx) => {
    const matchesSearch =
      tx.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.phone.includes(searchQuery) ||
      (tx.user?.fullName && tx.user.fullName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tx.plan?.name && tx.plan.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesNetwork = selectedNetwork === "ALL" || tx.plan?.network === selectedNetwork;

    return matchesSearch && matchesNetwork;
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <Cpu size={24} />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">SIM Config & Queued Orders</h1>
          </div>
          <p className="text-slate-600 mt-1 text-sm">
            Manage data purchases queued when provider SIM servers (SMEPlug / AmySub) are offline or need configuration.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchQueued(true)}
            disabled={loading || batchRunning}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-sm flex items-center gap-2 transition disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            onClick={handleRetryAll}
            disabled={batchRunning || queued.length === 0}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm flex items-center gap-2 shadow-md hover:shadow-lg transition disabled:opacity-50"
          >
            {batchRunning ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Retrying ({batchProgress.current}/{batchProgress.total})...
              </>
            ) : (
              <>
                <Play size={16} />
                Retry All Queued ({queued.length})
              </>
            )}
          </button>
        </div>
      </div>

      {/* Admin Action Notice Banner */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-amber-900">
        <div className="flex items-start gap-3">
          <AlertTriangle size={22} className="text-amber-600 mt-0.5 shrink-0" />
          <div className="text-sm">
            <span className="font-bold">Admin Workflow:</span> Whenever you receive a queued order alert on{" "}
            <span className="font-mono bg-amber-100 px-1.5 py-0.5 rounded font-semibold text-amber-800">07068614426</span>,
            log in to your <span className="font-semibold">SMEPlug</span> or <span className="font-semibold">AmySub</span>{" "}
            SIM server to configure or fund the dispensing SIMs. Once configured, click{" "}
            <span className="font-bold">Retry All</span> below to deliver all waiting orders sequentially.
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Queued Purchases</span>
            <Clock size={18} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{summary?.totalQueuedCount ?? 0}</div>
          <div className="text-xs text-slate-500 mt-1">Awaiting active SIM delivery</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Queued Value</span>
            <DollarSign size={18} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            ₦{summary?.totalQueuedAmount?.toLocaleString() ?? 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">Paid by customers</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">MTN Orders</span>
            <Radio size={18} className="text-yellow-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {summary?.networkBreakdown?.MTN ?? 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">MTN SME & Gifting</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Other Networks</span>
            <Radio size={18} className="text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {(summary?.totalQueuedCount ?? 0) - (summary?.networkBreakdown?.MTN ?? 0)}
          </div>
          <div className="text-xs text-slate-500 mt-1">Airtel, Glo, 9mobile</div>
        </div>
      </div>

      {/* Search & Network Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by recipient phone, reference, or customer name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter size={16} className="text-slate-400 shrink-0" />
          <select
            value={selectedNetwork}
            onChange={(e) => setSelectedNetwork(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white text-slate-700 font-medium focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Networks</option>
            <option value="MTN">MTN</option>
            <option value="AIRTEL">AIRTEL</option>
            <option value="GLO">GLO</option>
            <option value="NINEMOBILE">9MOBILE</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3.5">Time / Ref</th>
                <th className="px-5 py-3.5">Customer / Recipient</th>
                <th className="px-5 py-3.5">Plan & Network</th>
                <th className="px-5 py-3.5">Amount</th>
                <th className="px-5 py-3.5">Provider</th>
                <th className="px-5 py-3.5">Error Message</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    <Loader2 size={24} className="animate-spin mx-auto mb-2 text-amber-500" />
                    Loading queued SIM orders...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 size={24} />
                    </div>
                    <div className="font-bold text-slate-900 text-base">No Queued Purchases</div>
                    <div className="text-slate-500 text-xs mt-1">
                      All provider dispensing SIMs are active and data orders are running normally.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredList.map((tx) => {
                  const isProcessing = processingRef === tx.reference;
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-4">
                        <div className="font-mono text-xs font-semibold text-slate-800">
                          {tx.reference.slice(-12)}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {new Date(tx.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} •{" "}
                          {new Date(tx.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900">{tx.phone}</div>
                        <div className="text-xs text-slate-500 truncate max-w-[150px]">
                          {tx.user?.fullName || "Guest User"}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              tx.plan?.network === "MTN"
                                ? "bg-yellow-100 text-yellow-800"
                                : tx.plan?.network === "AIRTEL"
                                ? "bg-red-100 text-red-800"
                                : tx.plan?.network === "GLO"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-800"
                            }`}
                          >
                            {tx.plan?.network || "DATA"}
                          </span>
                          <span className="font-semibold text-slate-800 text-xs">
                            {tx.plan?.sizeLabel || tx.plan?.name || "Data Bundle"}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {tx.plan?.category || "Standard"}
                        </div>
                      </td>

                      <td className="px-5 py-4 font-bold text-slate-900">
                        ₦{tx.amount.toLocaleString()}
                      </td>

                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {tx.apiUsed || tx.plan?.apiSource || "SMEPlug"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="text-xs text-amber-700 max-w-[220px] font-medium truncate" title={tx.description}>
                          {tx.description.replace(/^SIM_CONFIG_QUEUED:\s*/, "")}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleSingleRetry(tx.reference)}
                            disabled={isProcessing || batchRunning}
                            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
                            title="Retry purchase with provider"
                          >
                            {isProcessing ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <RotateCcw size={13} />
                            )}
                            Retry
                          </button>

                          <button
                            onClick={() => handleSingleRefund(tx.reference, tx.amount)}
                            disabled={isProcessing || batchRunning}
                            className="px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 text-xs font-semibold flex items-center gap-1 transition disabled:opacity-50"
                            title="Cancel order and refund to customer wallet"
                          >
                            <XCircle size={13} />
                            Refund
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Batch Retry Live Progress Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {batchRunning ? (
                  <Loader2 size={20} className="animate-spin text-amber-500" />
                ) : (
                  <CheckCircle2 size={20} className="text-emerald-500" />
                )}
                <div>
                  <h3 className="font-bold text-slate-900">
                    {batchRunning ? "Processing Queued Orders..." : "Batch Retry Complete"}
                  </h3>
                  <div className="text-xs text-slate-500">
                    {batchProgress.current} of {batchProgress.total} orders processed
                  </div>
                </div>
              </div>

              {!batchRunning && (
                <button
                  onClick={() => setShowBatchModal(false)}
                  className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
                >
                  Close
                </button>
              )}
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 h-2">
              <div
                className="bg-amber-500 h-2 transition-all duration-300"
                style={{
                  width: `${batchProgress.total > 0 ? (batchProgress.current / batchProgress.total) * 100 : 0}%`,
                }}
              />
            </div>

            {/* Live Logs */}
            <div className="p-4 flex-1 overflow-y-auto space-y-2 font-mono text-xs max-h-[350px] bg-slate-900 text-slate-100">
              {batchLogs.length === 0 ? (
                <div className="text-slate-400 py-6 text-center">Starting sequential retry...</div>
              ) : (
                batchLogs.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-2 py-1 border-b border-slate-800">
                    {log.status === "success" ? (
                      <span className="text-emerald-400 font-bold">[SUCCESS]</span>
                    ) : log.status === "pending" ? (
                      <span className="text-amber-400 font-bold">[QUEUED]</span>
                    ) : (
                      <span className="text-red-400 font-bold">[FAILED]</span>
                    )}
                    <span className="text-slate-300 truncate">{log.phone}:</span>
                    <span className="text-slate-400 truncate flex-1">{log.message}</span>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <span>Throttling: 1.5s delay between provider API requests.</span>
              {!batchRunning && (
                <button
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
