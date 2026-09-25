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
  Timer,
  Smartphone,
  Check,
  X,
  MessageSquare,
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
  type?: string;
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
  simCount: number;
  simAmount: number;
  timeoutCount: number;
  timeoutAmount: number;
  airtimeCount: number;
  airtimeAmount: number;
  totalQueuedCount: number;
  totalQueuedAmount: number;
  networkBreakdown: Record<string, number>;
  providerBreakdown: Record<string, number>;
}

export default function AdminSimConfigPage() {
  const [activeTab, setActiveTab] = useState<"sim" | "timeout" | "airtime">("sim");

  // Queues
  const [simList, setSimList] = useState<QueuedTransaction[]>([]);
  const [timeoutList, setTimeoutList] = useState<QueuedTransaction[]>([]);
  const [airtimeList, setAirtimeList] = useState<QueuedTransaction[]>([]);
  const [summary, setSummary] = useState<SummaryStats | null>(null);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState<string>("ALL");

  // Action processing state
  const [processingRef, setProcessingRef] = useState<string | null>(null);

  // Manual Confirmation Modal state (for Mark Success or Mark Failed)
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    tx: QueuedTransaction | null;
    actionType: "mark_success" | "mark_failed";
    note: string;
  }>({
    isOpen: false,
    tx: null,
    actionType: "mark_success",
    note: "",
  });

  // Batch retry state
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [batchLogs, setBatchLogs] = useState<
    Array<{ ref: string; phone: string; status: "success" | "pending" | "error"; message: string }>
  >([]);
  const [showBatchModal, setShowBatchModal] = useState(false);

  const fetchQueues = useCallback(async (showToast = false) => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/sim-config");
      const data = await res.json();

      if (res.ok && data.success) {
        setSimList(data.data.simConfigTransactions || data.data.queuedTransactions || []);
        setTimeoutList(data.data.timeoutTransactions || []);
        setAirtimeList(data.data.airtimeTransactions || []);
        setSummary(data.data.summary || null);
        if (showToast) {
          toast.success("Queues refreshed successfully");
        }
      } else {
        toast.error(data.error || "Failed to load queued orders");
      }
    } catch (err) {
      console.error("[FETCH QUEUED ERROR]", err);
      toast.error("Network error while loading queued orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueues();
  }, [fetchQueues]);

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
        fetchQueues();
      } else {
        toast.warning(`Ref ${reference}: ${data.message || "Provider still processing"}`);
        fetchQueues();
      }
    } catch (err) {
      console.error("[SINGLE RETRY ERROR]", err);
      toast.error(`Error retrying transaction ${reference}`);
    } finally {
      setProcessingRef(null);
    }
  };

  // Open confirmation modal for Mark Success or Mark Failed
  const openActionModal = (tx: QueuedTransaction, actionType: "mark_success" | "mark_failed") => {
    setActionModal({
      isOpen: true,
      tx,
      actionType,
      note: "",
    });
  };

  // Execute Mark Success / Mark Failed with optional admin note
  const handleExecuteModalAction = async () => {
    if (!actionModal.tx) return;
    const { reference, amount } = actionModal.tx;
    const action = actionModal.actionType;
    const adminNote = actionModal.note;

    setProcessingRef(reference);
    setActionModal((prev) => ({ ...prev, isOpen: false }));

    try {
      const res = await fetch("/api/admin/sim-config/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, action, adminNote }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        if (action === "mark_success") {
          toast.success(`Ref ${reference}: Marked as SUCCESS! Buyer notified via push.`);
        } else {
          toast.success(`Ref ${reference}: Marked as FAILED. ₦${amount} refunded to wallet.`);
        }
        fetchQueues();
      } else {
        toast.error(data.error || data.message || "Action failed to execute");
      }
    } catch (err) {
      console.error("[ACTION ERROR]", err);
      toast.error("Error executing admin action");
    } finally {
      setProcessingRef(null);
    }
  };

  // Current active list
  const currentList =
    activeTab === "sim" ? simList : activeTab === "timeout" ? timeoutList : airtimeList;

  // Filter current active list
  const filteredList = currentList.filter((tx) => {
    const matchesSearch =
      tx.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.phone.includes(searchQuery) ||
      (tx.user?.fullName && tx.user.fullName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tx.plan?.name && tx.plan.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tx.description && tx.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const txNetwork = tx.plan?.network || (tx.description?.toUpperCase().includes("MTN") ? "MTN" : tx.description?.toUpperCase().includes("AIRTEL") ? "AIRTEL" : tx.description?.toUpperCase().includes("GLO") ? "GLO" : tx.description?.toUpperCase().includes("9MOBILE") ? "NINEMOBILE" : "OTHER");
    const matchesNetwork = selectedNetwork === "ALL" || txNetwork === selectedNetwork;

    return matchesSearch && matchesNetwork;
  });

  // Batch Retry for current active queue
  const handleRetryAllCurrent = async () => {
    if (filteredList.length === 0) {
      toast.info("No queued transactions to retry in this tab.");
      return;
    }

    const confirm = window.confirm(
      `Start sequential retry for ${filteredList.length} order(s) in the "${activeTab.toUpperCase()}" queue? Throttled automatically with 1.5s delay.`
    );
    if (!confirm) return;

    setBatchRunning(true);
    setShowBatchModal(true);
    setBatchLogs([]);
    setBatchProgress({ current: 0, total: filteredList.length });

    for (let i = 0; i < filteredList.length; i++) {
      const tx = filteredList[i];
      setBatchProgress({ current: i + 1, total: filteredList.length });

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

      if (i < filteredList.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    setBatchRunning(false);
    toast.success("Sequential retry cycle completed.");
    fetchQueues();
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <Cpu size={26} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                SIM Config & Queued Orders
              </h1>
              <p className="text-slate-500 text-sm mt-0.5">
                Manage dispensing SIM queues, SMEPlug timeouts, and airtime orders with instant admin prerogatives.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchQueues(true)}
            disabled={loading || batchRunning}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm flex items-center gap-2 shadow-sm transition disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            onClick={handleRetryAllCurrent}
            disabled={batchRunning || filteredList.length === 0}
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
                Retry Current Tab ({filteredList.length})
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modern Tab Selector */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/80 w-fit">
        <button
          onClick={() => setActiveTab("sim")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === "sim"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <Cpu size={16} className={activeTab === "sim" ? "text-amber-500" : "text-slate-400"} />
          SIM Config Queue
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === "sim"
                ? "bg-amber-100 text-amber-800"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            {summary?.simCount ?? simList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("timeout")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === "timeout"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <Timer size={16} className={activeTab === "timeout" ? "text-rose-500" : "text-slate-400"} />
          Timeout Queue
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              (summary?.timeoutCount ?? timeoutList.length) > 0
                ? "bg-rose-100 text-rose-700 animate-pulse"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            {summary?.timeoutCount ?? timeoutList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("airtime")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === "airtime"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <Smartphone size={16} className={activeTab === "airtime" ? "text-blue-500" : "text-slate-400"} />
          Airtime Queue
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === "airtime"
                ? "bg-blue-100 text-blue-800"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            {summary?.airtimeCount ?? airtimeList.length}
          </span>
        </button>
      </div>

      {/* Contextual Notice Banner depending on Active Tab */}
      {activeTab === "timeout" ? (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-rose-950">
          <div className="flex items-start gap-3">
            <Timer size={22} className="text-rose-600 mt-0.5 shrink-0" />
            <div className="text-sm">
              <span className="font-extrabold text-rose-900">SMEPlug Timeout Protection:</span>{" "}
              These transactions experienced provider timeouts. The customer{"'"}s wallet is{" "}
              <span className="font-bold underline text-rose-900">DEBITED</span> so the platform is safe. Check your{" "}
              <span className="font-semibold">SMEPlug portal</span>: if the data/airtime was delivered, click{" "}
              <span className="font-bold text-emerald-700">Mark Success</span> to send a push to the buyer. If not delivered,
              click <span className="font-bold text-amber-700">Retry</span> or{" "}
              <span className="font-bold text-rose-700">Mark Failed</span> (which will refund the customer).
            </div>
          </div>
        </div>
      ) : activeTab === "sim" ? (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-amber-900">
          <div className="flex items-start gap-3">
            <AlertTriangle size={22} className="text-amber-600 mt-0.5 shrink-0" />
            <div className="text-sm">
              <span className="font-bold">SIM Config Workflow:</span> When an alert is received on{" "}
              <span className="font-mono bg-amber-100 px-1.5 py-0.5 rounded font-semibold text-amber-800">
                07068614426
              </span>
              , log in to your <span className="font-semibold">SMEPlug</span> or <span className="font-semibold">AmySub</span>{" "}
              dashboard to configure the dispensing SIMs. Once set up, click <span className="font-bold">Retry All</span> to deliver
              all waiting orders sequentially.
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-blue-900">
          <div className="flex items-start gap-3">
            <Smartphone size={22} className="text-blue-600 mt-0.5 shrink-0" />
            <div className="text-sm">
              <span className="font-bold">Airtime Queue:</span> Manage pending airtime top-ups. You can retry delivery through the provider,
              mark as delivered manually if dispatched externally, or cancel and refund to the user{"'"}s wallet.
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveTab("sim")}
          className={`p-5 rounded-2xl bg-white border cursor-pointer transition shadow-sm hover:shadow ${
            activeTab === "sim" ? "border-amber-400 ring-2 ring-amber-400/20" : "border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">SIM Queued</span>
            <Clock size={18} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{summary?.simCount ?? simList.length}</div>
          <div className="text-xs text-slate-500 mt-1">
            ₦{(summary?.simAmount ?? 0).toLocaleString()} • Awaiting SIM config
          </div>
        </div>

        <div
          onClick={() => setActiveTab("timeout")}
          className={`p-5 rounded-2xl bg-white border cursor-pointer transition shadow-sm hover:shadow ${
            activeTab === "timeout" ? "border-rose-400 ring-2 ring-rose-400/20" : "border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Timeout Queue</span>
            <Timer size={18} className="text-rose-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{summary?.timeoutCount ?? timeoutList.length}</div>
          <div className="text-xs text-rose-600 font-medium mt-1">
            ₦{(summary?.timeoutAmount ?? 0).toLocaleString()} • Needs manual check
          </div>
        </div>

        <div
          onClick={() => setActiveTab("airtime")}
          className={`p-5 rounded-2xl bg-white border cursor-pointer transition shadow-sm hover:shadow ${
            activeTab === "airtime" ? "border-blue-400 ring-2 ring-blue-400/20" : "border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Airtime Queued</span>
            <Smartphone size={18} className="text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{summary?.airtimeCount ?? airtimeList.length}</div>
          <div className="text-xs text-slate-500 mt-1">
            ₦{(summary?.airtimeAmount ?? 0).toLocaleString()} • Pending top-ups
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Value Held</span>
            <DollarSign size={18} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            ₦{(summary?.totalQueuedAmount ?? 0).toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {summary?.totalQueuedCount ?? 0} total transactions held
          </div>
        </div>
      </div>

      {/* Search & Network Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by phone, reference, or customer name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter size={16} className="text-slate-400 shrink-0" />
          <select
            value={selectedNetwork}
            onChange={(e) => setSelectedNetwork(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white text-slate-700 font-medium focus:outline-none focus:border-amber-500"
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
                <th className="px-5 py-3.5">Service / Plan</th>
                <th className="px-5 py-3.5">Amount</th>
                <th className="px-5 py-3.5">Provider</th>
                <th className="px-5 py-3.5">Queue Status / Note</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    <Loader2 size={24} className="animate-spin mx-auto mb-2 text-amber-500" />
                    Loading orders...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 size={24} />
                    </div>
                    <div className="font-bold text-slate-900 text-base">No Orders in this Queue</div>
                    <div className="text-slate-500 text-xs mt-1">
                      {activeTab === "timeout"
                        ? "Great! No timeout orders waiting for manual review."
                        : activeTab === "sim"
                        ? "All SIM servers are active and dispensing normally."
                        : "No pending airtime orders in queue."}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredList.map((tx) => {
                  const isProcessing = processingRef === tx.reference;
                  const isTimeoutItem =
                    tx.description?.startsWith("TIMEOUT_QUEUED:") ||
                    tx.description?.toLowerCase().includes("timeout");
                  const network =
                    tx.plan?.network ||
                    (tx.description?.toUpperCase().includes("MTN")
                      ? "MTN"
                      : tx.description?.toUpperCase().includes("AIRTEL")
                      ? "AIRTEL"
                      : tx.description?.toUpperCase().includes("GLO")
                      ? "GLO"
                      : "DATA");

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
                              network === "MTN"
                                ? "bg-yellow-100 text-yellow-800"
                                : network === "AIRTEL"
                                ? "bg-red-100 text-red-800"
                                : network === "GLO"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-800"
                            }`}
                          >
                            {network}
                          </span>
                          <span className="font-semibold text-slate-800 text-xs">
                            {tx.plan?.sizeLabel || (tx.type === "AIRTIME_PURCHASE" ? "Airtime Top-up" : tx.plan?.name || "Data")}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {tx.type === "AIRTIME_PURCHASE" ? "Airtime Recharge" : tx.plan?.category || "Standard"}
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
                        <div
                          className={`text-xs font-medium max-w-[240px] truncate ${
                            isTimeoutItem ? "text-rose-700" : "text-amber-700"
                          }`}
                          title={tx.description}
                        >
                          {tx.description
                            ?.replace(/^TIMEOUT_QUEUED:\s*/, "[TIMEOUT] ")
                            ?.replace(/^SIM_CONFIG_QUEUED:\s*/, "[SIM QUEUE] ")}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Retry Button */}
                          <button
                            onClick={() => handleSingleRetry(tx.reference)}
                            disabled={isProcessing || batchRunning}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition disabled:opacity-50"
                            title="Retry purchase with provider"
                          >
                            {isProcessing ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <RotateCcw size={13} />
                            )}
                            Retry
                          </button>

                          {/* Mark Success Button */}
                          <button
                            onClick={() => openActionModal(tx, "mark_success")}
                            disabled={isProcessing || batchRunning}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition disabled:opacity-50"
                            title="Mark as Delivered manually (Sends push to buyer)"
                          >
                            <Check size={13} />
                            Success
                          </button>

                          {/* Mark Failed Button */}
                          <button
                            onClick={() => openActionModal(tx, "mark_failed")}
                            disabled={isProcessing || batchRunning}
                            className="px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold flex items-center gap-1 transition disabled:opacity-50"
                            title="Cancel order & refund user wallet"
                          >
                            <X size={13} />
                            Fail/Refund
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

      {/* Confirmation & Note Modal */}
      {actionModal.isOpen && actionModal.tx && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`p-3 rounded-xl ${
                  actionModal.actionType === "mark_success"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {actionModal.actionType === "mark_success" ? (
                  <CheckCircle2 size={24} />
                ) : (
                  <XCircle size={24} />
                )}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg">
                  {actionModal.actionType === "mark_success"
                    ? "Confirm Manual Delivery"
                    : "Cancel & Refund Order"}
                </h3>
                <p className="text-xs text-slate-500">
                  Ref: <span className="font-mono font-semibold">{actionModal.tx.reference}</span>
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Recipient Phone:</span>
                <span className="font-bold text-slate-900">{actionModal.tx.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount:</span>
                <span className="font-bold text-slate-900">₦{actionModal.tx.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Action Impact:</span>
                <span className="font-semibold text-slate-900">
                  {actionModal.actionType === "mark_success"
                    ? "Order set to SUCCESS • Buyer sent delivered push"
                    : "Order set to FAILED • ₦" + actionModal.tx.amount + " refunded to wallet"}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Admin Note / External Portal Reference (Optional)
              </label>
              <input
                type="text"
                placeholder={
                  actionModal.actionType === "mark_success"
                    ? "e.g. Verified on SMEPlug order #83921"
                    : "e.g. Cancelled: SMEPlug unable to process"
                }
                value={actionModal.note}
                onChange={(e) => setActionModal((prev) => ({ ...prev, note: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setActionModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>

              <button
                onClick={handleExecuteModalAction}
                className={`px-5 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 shadow-md ${
                  actionModal.actionType === "mark_success"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {actionModal.actionType === "mark_success" ? (
                  <>
                    <Check size={14} />
                    Confirm Success
                  </>
                ) : (
                  <>
                    <X size={14} />
                    Confirm Fail & Refund
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
