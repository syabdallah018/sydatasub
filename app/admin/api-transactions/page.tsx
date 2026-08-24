"use client";

import { useEffect, useState } from "react";
import {
  Terminal,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  Send,
  Download,
  PlusCircle,
  Copy,
  Check,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ExternalLink,
  Loader2,
  ArrowUpDown,
  Smartphone,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface ApiTransaction {
  id: string;
  reference: string;
  externalReference?: string | null;
  type: string;
  status: "SUCCESS" | "PENDING" | "FAILED" | "REVERSED";
  amount: number;
  phone: string;
  description?: string | null;
  apiUsed?: string | null;
  balanceBefore?: number | null;
  balanceAfter?: number | null;
  createdAt: string;
  updatedAt: string;
  userName: string;
  userPhone: string;
  userEmail: string;
  devApiKey?: string | null;
  devWebhookUrl?: string | null;
  planName: string;
  planSize: string;
  network: string;
  user?: {
    id: string;
    fullName: string;
    phone: string;
    email?: string | null;
    balance: number;
    developerProfile?: {
      id: string;
      apiKey: string;
      webhookUrl?: string | null;
      status: string;
    } | null;
  };
  plan?: {
    id: string;
    name: string;
    sizeLabel: string;
    network: string;
    price: number;
    apiSource: string;
  } | null;
}

interface DeveloperItem {
  userId: string;
  fullName: string;
  phone: string;
  email: string | null;
  status: string;
  webhookUrl: string | null;
}

interface Metrics {
  totalCount: number;
  successCount: number;
  failedCount: number;
  pendingCount: number;
  totalVolume: number;
}

export default function AdminApiTransactionsPage() {
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [developers, setDevelopers] = useState<DeveloperItem[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    totalCount: 0,
    successCount: 0,
    failedCount: 0,
    pendingCount: 0,
    totalVolume: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [network, setNetwork] = useState("ALL");
  const [developerId, setDeveloperId] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Modals
  const [selectedTx, setSelectedTx] = useState<ApiTransaction | null>(null);
  const [editingTx, setEditingTx] = useState<ApiTransaction | null>(null);
  const [editStatus, setEditStatus] = useState<string>("SUCCESS");
  const [editDescription, setEditDescription] = useState("");
  const [editExternalRef, setEditExternalRef] = useState("");
  const [editRefundToWallet, setEditRefundToWallet] = useState(false);
  const [editDispatchWebhook, setEditDispatchWebhook] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);

  // Webhook Retry state
  const [retryingWebhookId, setRetryingWebhookId] = useState<string | null>(null);
  const [webhookResultModal, setWebhookResultModal] = useState<{
    open: boolean;
    success: boolean;
    statusCode?: number;
    latencyMs?: number;
    responseBody?: string;
    webhookUrl?: string;
    error?: string;
  } | null>(null);

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createUserId, setCreateUserId] = useState("");
  const [createPlanId, setCreatePlanId] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createReference, setCreateReference] = useState("");
  const [createStatus, setCreateStatus] = useState<"SUCCESS" | "PENDING" | "FAILED">("SUCCESS");
  const [createExternalRef, setCreateExternalRef] = useState("");
  const [createDispatchWebhook, setCreateDispatchWebhook] = useState(true);
  const [creatingTx, setCreatingTx] = useState(false);

  // Delete Modal
  const [deletingTx, setDeletingTx] = useState<ApiTransaction | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Copied indicator
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const fetchTransactions = async (page = 1, isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(status !== "ALL" && { status }),
        ...(network !== "ALL" && { network }),
        ...(developerId !== "ALL" && { developerId }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        ...(search && { search }),
      });

      const res = await fetch(`/api/admin/api-transactions?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setTransactions(data.transactions);
        setDevelopers(data.developers || []);
        setMetrics(data.metrics);
        setPagination(data.pagination);
      } else {
        toast.error(data.error || "Failed to load API transactions");
      }
    } catch {
      toast.error("Network error while loading API transactions");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await fetch("/api/admin/plans");
      if (res.ok) {
        const data = await res.json();
        setPlans(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchTransactions(1);
    fetchPlans();
  }, [status, network, developerId, startDate, endDate, search]);

  const handleEditOpen = (tx: ApiTransaction) => {
    setEditingTx(tx);
    setEditStatus(tx.status);
    setEditDescription(tx.description || "");
    setEditExternalRef(tx.externalReference || "");
    setEditRefundToWallet(false);
    setEditDispatchWebhook(true);
  };

  const handleSaveEdit = async () => {
    if (!editingTx) return;
    setSavingEdit(true);

    try {
      const res = await fetch(`/api/admin/api-transactions/${editingTx.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: editStatus,
          description: editDescription,
          externalReference: editExternalRef || null,
          refundToWallet: editRefundToWallet,
          dispatchWebhook: editDispatchWebhook,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("API Transaction updated successfully");
        setEditingTx(null);
        fetchTransactions(pagination.page);
      } else {
        toast.error(data.error || "Failed to update transaction");
      }
    } catch {
      toast.error("Network error while updating transaction");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleRetryWebhook = async (txId: string) => {
    setRetryingWebhookId(txId);
    try {
      const res = await fetch(`/api/admin/api-transactions/${txId}/retry-webhook`, {
        method: "POST",
      });
      const data = await res.json();

      setWebhookResultModal({
        open: true,
        success: data.success,
        statusCode: data.statusCode,
        latencyMs: data.latencyMs,
        responseBody: data.responseBody,
        webhookUrl: data.webhookUrl,
        error: data.error,
      });

      if (data.success) {
        toast.success(`Webhook delivered! HTTP ${data.statusCode} (${data.latencyMs}ms)`);
      } else {
        toast.error(data.error || "Webhook dispatch failed");
      }
    } catch {
      toast.error("Connection error while retrying webhook");
    } finally {
      setRetryingWebhookId(null);
    }
  };

  const handleDeleteTransaction = async () => {
    if (!deletingTx) return;
    setConfirmDelete(true);

    try {
      const res = await fetch(`/api/admin/api-transactions/${deletingTx.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        toast.success(data.message || "Transaction deleted successfully");
        setDeletingTx(null);
        fetchTransactions(pagination.page);
      } else {
        toast.error(data.error || "Failed to delete transaction");
      }
    } catch {
      toast.error("Error deleting transaction");
    } finally {
      setConfirmDelete(false);
    }
  };

  const handleCreateTransaction = async () => {
    if (!createUserId || !createPlanId || !createPhone || !createReference) {
      toast.error("Please fill in all required fields");
      return;
    }

    setCreatingTx(true);
    try {
      const res = await fetch("/api/admin/api-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: createUserId,
          planId: createPlanId,
          phone: createPhone,
          reference: createReference,
          status: createStatus,
          externalReference: createExternalRef || undefined,
          dispatchWebhook: createDispatchWebhook,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("API Transaction created successfully");
        setCreateModalOpen(false);
        setCreateUserId("");
        setCreatePlanId("");
        setCreatePhone("");
        setCreateReference("");
        setCreateExternalRef("");
        fetchTransactions(1);
      } else {
        toast.error(data.error || "Failed to create transaction");
      }
    } catch {
      toast.error("Network error while creating transaction");
    } finally {
      setCreatingTx(false);
    }
  };

  const generateReference = () => {
    const random = "API-" + Math.random().toString(36).substring(2, 10).toUpperCase();
    setCreateReference(random);
  };

  const exportToCsv = () => {
    if (transactions.length === 0) {
      toast.error("No transactions to export");
      return;
    }

    const headers = [
      "ID",
      "Reference",
      "External Ref",
      "Developer Name",
      "Developer Phone",
      "Recipient Phone",
      "Network",
      "Plan",
      "Amount (NGN)",
      "Status",
      "Created At",
    ];

    const rows = transactions.map((t) => [
      t.id,
      t.reference,
      t.externalReference || "",
      `"${t.userName}"`,
      t.userPhone,
      t.phone,
      t.network,
      `"${t.planName}"`,
      t.amount,
      t.status,
      new Date(t.createdAt).toLocaleString(),
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `api-transactions-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV export downloaded successfully");
  };

  const getStatusBadge = (txStatus: string) => {
    switch (txStatus) {
      case "SUCCESS":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 size={12} className="text-emerald-600" /> SUCCESS
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock size={12} className="text-amber-600" /> PENDING
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle size={12} className="text-rose-600" /> FAILED
          </span>
        );
      case "REVERSED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <RotateCcw size={12} className="text-purple-600" /> REVERSED
          </span>
        );
      default:
        return <Badge variant="secondary">{txStatus}</Badge>;
    }
  };

  const getNetworkBadge = (net: string) => {
    const netUpper = (net || "").toUpperCase();
    if (netUpper.includes("MTN")) return "bg-yellow-100 text-yellow-900 border-yellow-300";
    if (netUpper.includes("GLO")) return "bg-green-100 text-green-900 border-green-300";
    if (netUpper.includes("AIRTEL")) return "bg-red-100 text-red-900 border-red-300";
    if (netUpper.includes("9MOBILE") || netUpper.includes("NINEMOBILE")) return "bg-emerald-100 text-emerald-900 border-emerald-300";
    return "bg-slate-100 text-slate-800 border-slate-200";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-md shadow-blue-500/20">
              <Terminal size={24} />
            </div>
            API Transactions Ledger
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Complete real-time monitoring, webhook audits, and full CRUD control over developer API transactions
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            onClick={exportToCsv}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 border-slate-200 hover:bg-slate-50"
          >
            <Download size={14} /> Export CSV
          </Button>

          <Button
            onClick={() => {
              generateReference();
              setCreateModalOpen(true);
            }}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 shadow-sm"
          >
            <PlusCircle size={14} /> Simulate / Create TX
          </Button>

          <Button
            onClick={() => fetchTransactions(pagination.page, true)}
            variant="outline"
            size="sm"
            disabled={refreshing}
            className="flex items-center gap-2 border-slate-200 hover:bg-slate-50"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4 bg-white border border-slate-200 shadow-sm rounded-xl space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Total API Calls</span>
            <Terminal size={16} className="text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{metrics.totalCount.toLocaleString()}</div>
          <p className="text-[11px] text-slate-400 font-medium">All logged API data requests</p>
        </Card>

        <Card className="p-4 bg-white border border-slate-200 shadow-sm rounded-xl space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Total API Volume</span>
            <span className="text-xs font-bold text-slate-400">NGN</span>
          </div>
          <div className="text-2xl font-black text-slate-900">₦{metrics.totalVolume.toLocaleString()}</div>
          <p className="text-[11px] text-slate-400 font-medium">Cumulative transaction turnover</p>
        </Card>

        <Card className="p-4 bg-white border border-slate-200 shadow-sm rounded-xl space-y-1">
          <div className="flex items-center justify-between text-emerald-600 text-xs font-bold uppercase tracking-wider">
            <span>Successful</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{metrics.successCount.toLocaleString()}</div>
          <p className="text-[11px] text-emerald-700/70 font-medium">
            {metrics.totalCount > 0 ? `${((metrics.successCount / metrics.totalCount) * 100).toFixed(1)}% fulfillment rate` : "0% fulfillment"}
          </p>
        </Card>

        <Card className="p-4 bg-white border border-slate-200 shadow-sm rounded-xl space-y-1">
          <div className="flex items-center justify-between text-rose-600 text-xs font-bold uppercase tracking-wider">
            <span>Failed / Refunds</span>
            <XCircle size={16} className="text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600">{metrics.failedCount.toLocaleString()}</div>
          <p className="text-[11px] text-rose-700/70 font-medium">Auto-refunded to wallets</p>
        </Card>

        <Card className="p-4 bg-white border border-slate-200 shadow-sm rounded-xl space-y-1">
          <div className="flex items-center justify-between text-amber-600 text-xs font-bold uppercase tracking-wider">
            <span>Pending</span>
            <Clock size={16} className="text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600">{metrics.pendingCount.toLocaleString()}</div>
          <p className="text-[11px] text-amber-700/70 font-medium">In processing queue</p>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-4 bg-white border border-slate-200 shadow-sm rounded-xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Search */}
          <div className="lg:col-span-2">
            <Label className="text-xs text-slate-500 font-semibold mb-1 block">Search Query</Label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <Input
                placeholder="Search reference, recipient, name, dev email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <Label className="text-xs text-slate-500 font-semibold mb-1 block">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="SUCCESS">SUCCESS</SelectItem>
                <SelectItem value="PENDING">PENDING</SelectItem>
                <SelectItem value="FAILED">FAILED</SelectItem>
                <SelectItem value="REVERSED">REVERSED</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Network */}
          <div>
            <Label className="text-xs text-slate-500 font-semibold mb-1 block">Network</Label>
            <Select value={network} onValueChange={setNetwork}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="All Networks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Networks</SelectItem>
                <SelectItem value="MTN">MTN</SelectItem>
                <SelectItem value="GLO">GLO</SelectItem>
                <SelectItem value="AIRTEL">AIRTEL</SelectItem>
                <SelectItem value="NINEMOBILE">9MOBILE</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Developer */}
          <div>
            <Label className="text-xs text-slate-500 font-semibold mb-1 block">Developer</Label>
            <Select value={developerId} onValueChange={setDeveloperId}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="All Developers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Developers</SelectItem>
                {developers.map((d) => (
                  <SelectItem key={d.userId} value={d.userId}>
                    {d.fullName} ({d.phone})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Start & End */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-slate-500 font-semibold mb-1 block">From</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs h-9 px-2"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-500 font-semibold mb-1 block">To</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs h-9 px-2"
              />
            </div>
          </div>
        </div>

        {(search || status !== "ALL" || network !== "ALL" || developerId !== "ALL" || startDate || endDate) && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500">Active filters applied</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setStatus("ALL");
                setNetwork("ALL");
                setDeveloperId("ALL");
                setStartDate("");
                setEndDate("");
              }}
              className="text-blue-600 hover:text-blue-800 text-xs h-7 px-2"
            >
              Clear All Filters
            </Button>
          </div>
        )}
      </Card>

      {/* Transactions Table */}
      <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Reference & Time</th>
                <th className="px-4 py-3.5">Developer</th>
                <th className="px-4 py-3.5">Recipient & Network</th>
                <th className="px-4 py-3.5">Plan Details</th>
                <th className="px-4 py-3.5">Amount</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <Loader2 className="animate-spin text-blue-600 mx-auto" size={28} />
                    <p className="text-xs text-slate-500 mt-2 font-semibold">Loading API transactions...</p>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <Terminal size={32} className="text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">No API Transactions Found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Try resetting your filters or simulate an API transaction above
                    </p>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Reference & Time */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900">
                        <span>{tx.reference}</span>
                        <button
                          onClick={() => copyToClipboard(tx.reference, tx.reference)}
                          className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
                          title="Copy Reference"
                        >
                          {copiedKey === tx.reference ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        </button>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(tx.createdAt).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      {tx.externalReference && (
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5 truncate max-w-[150px]">
                          Ext: {tx.externalReference}
                        </div>
                      )}
                    </td>

                    {/* Developer */}
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{tx.userName}</span>
                        <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 text-[10px] font-mono rounded border border-blue-200">
                          DEV
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">{tx.userPhone}</div>
                      {tx.devApiKey && (
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                          {tx.devApiKey.substring(0, 14)}...
                        </div>
                      )}
                    </td>

                    {/* Recipient & Network */}
                    <td className="px-4 py-3.5">
                      <div className="font-mono font-bold text-slate-900 flex items-center gap-1">
                        <Smartphone size={12} className="text-slate-400" />
                        {tx.phone}
                      </div>
                      <div className="mt-1">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${getNetworkBadge(tx.network)}`}>
                          {tx.network || "UNKNOWN"}
                        </span>
                      </div>
                    </td>

                    {/* Plan Details */}
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900">{tx.planName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {tx.planSize} • {tx.apiUsed || "Standard"}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-3.5">
                      <div className="font-mono font-bold text-slate-900 text-sm">₦{tx.amount.toLocaleString()}</div>
                      {tx.balanceBefore !== null && tx.balanceBefore !== undefined && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          Bal: ₦{(tx.balanceBefore / 100).toFixed(0)}
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      {getStatusBadge(tx.status)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Details */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedTx(tx)}
                          className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                          title="View Full Details"
                        >
                          <Eye size={15} />
                        </Button>

                        {/* Edit / Status / Refund */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditOpen(tx)}
                          className="h-8 w-8 text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                          title="Update Status / Refund"
                        >
                          <Edit size={15} />
                        </Button>

                        {/* Retry Webhook */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRetryWebhook(tx.id)}
                          disabled={retryingWebhookId === tx.id}
                          className="h-8 w-8 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
                          title="Dispatch Webhook to Developer"
                        >
                          {retryingWebhookId === tx.id ? (
                            <Loader2 size={15} className="animate-spin text-emerald-600" />
                          ) : (
                            <Send size={15} />
                          )}
                        </Button>

                        {/* Delete */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingTx(tx)}
                          className="h-8 w-8 text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                          title="Delete Record"
                        >
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Showing{" "}
            <span className="font-bold text-slate-900">
              {transactions.length === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1}
            </span>{" "}
            to{" "}
            <span className="font-bold text-slate-900">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{" "}
            of <span className="font-bold text-slate-900">{pagination.total}</span> transactions
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1 || loading}
              onClick={() => fetchTransactions(pagination.page - 1)}
              className="h-8 text-xs flex items-center gap-1"
            >
              <ChevronLeft size={14} /> Previous
            </Button>
            <span className="px-2 font-semibold">
              Page {pagination.page} of {pagination.pages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.pages || loading}
              onClick={() => fetchTransactions(pagination.page + 1)}
              className="h-8 text-xs flex items-center gap-1"
            >
              Next <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      </Card>

      {/* MODAL 1: VIEW FULL DETAILS */}
      <Dialog open={!!selectedTx} onOpenChange={(open) => !open && setSelectedTx(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedTx && (
            <div className="space-y-6">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Terminal size={20} className="text-blue-600" /> API Transaction Details
                  </DialogTitle>
                  <div>{getStatusBadge(selectedTx.status)}</div>
                </div>
              </DialogHeader>

              {/* Top Reference Bar */}
              <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Transaction Reference:</span>
                  <div className="flex items-center gap-2 font-bold text-sky-400">
                    <span>{selectedTx.reference}</span>
                    <button
                      onClick={() => copyToClipboard(selectedTx.reference, "modal_ref")}
                      className="text-slate-400 hover:text-white"
                    >
                      {copiedKey === "modal_ref" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
                {selectedTx.externalReference && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">External Provider Reference:</span>
                    <span className="text-emerald-400">{selectedTx.externalReference}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800 pt-2">
                  <span>Database ID: {selectedTx.id}</span>
                  <span>Created: {new Date(selectedTx.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Breakdown Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Developer Box */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Developer Profile
                  </span>
                  <div className="space-y-1">
                    <p><span className="text-slate-500 font-semibold">Name:</span> <span className="font-bold text-slate-900">{selectedTx.userName}</span></p>
                    <p><span className="text-slate-500 font-semibold">Phone:</span> <span className="font-mono text-slate-800">{selectedTx.userPhone}</span></p>
                    <p><span className="text-slate-500 font-semibold">Email:</span> <span className="text-slate-800">{selectedTx.userEmail || "N/A"}</span></p>
                    {selectedTx.devWebhookUrl && (
                      <p className="truncate">
                        <span className="text-slate-500 font-semibold">Webhook:</span>{" "}
                        <span className="font-mono text-blue-600">{selectedTx.devWebhookUrl}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Plan Box */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Data Plan & Fulfillment
                  </span>
                  <div className="space-y-1">
                    <p><span className="text-slate-500 font-semibold">Recipient:</span> <span className="font-mono font-bold text-slate-900">{selectedTx.phone}</span></p>
                    <p><span className="text-slate-500 font-semibold">Network:</span> <span className="font-bold text-slate-800">{selectedTx.network}</span></p>
                    <p><span className="text-slate-500 font-semibold">Plan Name:</span> <span className="text-slate-800">{selectedTx.planName} ({selectedTx.planSize})</span></p>
                    <p><span className="text-slate-500 font-semibold">Provider Route:</span> <span className="font-mono text-slate-800">{selectedTx.apiUsed || "Standard"}</span></p>
                  </div>
                </div>
              </div>

              {/* Financial Box */}
              <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl text-xs space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">
                  Financial Ledger
                </span>
                <div className="grid grid-cols-3 gap-2 font-mono">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Charge Amount</span>
                    <span className="font-bold text-base text-slate-900">₦{selectedTx.amount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Balance Before</span>
                    <span className="font-bold text-slate-700">
                      {selectedTx.balanceBefore !== null && selectedTx.balanceBefore !== undefined
                        ? `₦${(selectedTx.balanceBefore / 100).toFixed(2)}`
                        : "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Balance After</span>
                    <span className="font-bold text-slate-700">
                      {selectedTx.balanceAfter !== null && selectedTx.balanceAfter !== undefined
                        ? `₦${(selectedTx.balanceAfter / 100).toFixed(2)}`
                        : "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedTx.description && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Notes & Provider Log</span>
                  <p className="font-mono text-slate-700">{selectedTx.description}</p>
                </div>
              )}

              {/* Webhook Payload Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Simulated Webhook Payload Body</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRetryWebhook(selectedTx.id)}
                    disabled={retryingWebhookId === selectedTx.id}
                    className="h-7 text-xs flex items-center gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    {retryingWebhookId === selectedTx.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Send size={12} />
                    )}
                    Send Webhook to Developer
                  </Button>
                </div>
                <pre className="bg-slate-950 text-sky-300 p-3 rounded-xl font-mono text-[11px] overflow-x-auto select-all">
{JSON.stringify(
  {
    event: selectedTx.status === "SUCCESS" ? "transaction.success" : selectedTx.status === "FAILED" ? "transaction.failed" : "transaction.pending",
    timestamp: new Date().toISOString(),
    data: {
      id: selectedTx.id,
      reference: selectedTx.reference,
      externalReference: selectedTx.externalReference || null,
      type: selectedTx.type,
      status: selectedTx.status,
      amount: selectedTx.amount,
      recipient: selectedTx.phone,
      description: selectedTx.description || null,
    },
  },
  null,
  2
)}
                </pre>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedTx(null)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 2: EDIT / UPDATE STATUS / REFUND */}
      <Dialog open={!!editingTx} onOpenChange={(open) => !open && setEditingTx(null)}>
        <DialogContent className="max-w-lg">
          {editingTx && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Edit size={18} className="text-amber-600" /> Manage API Transaction #{editingTx.reference}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3 text-xs">
                <div>
                  <Label className="text-xs text-slate-600 font-semibold mb-1 block">Transaction Status</Label>
                  <Select
                    value={editStatus}
                    onValueChange={(val) => {
                      setEditStatus(val);
                      if (val === "FAILED" || val === "REVERSED") {
                        setEditRefundToWallet(true);
                      }
                    }}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SUCCESS">SUCCESS</SelectItem>
                      <SelectItem value="PENDING">PENDING</SelectItem>
                      <SelectItem value="FAILED">FAILED</SelectItem>
                      <SelectItem value="REVERSED">REVERSED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-slate-600 font-semibold mb-1 block">External Provider Reference</Label>
                  <Input
                    value={editExternalRef}
                    onChange={(e) => setEditExternalRef(e.target.value)}
                    placeholder="e.g. API-C-1982348"
                    className="text-xs font-mono"
                  />
                </div>

                <div>
                  <Label className="text-xs text-slate-600 font-semibold mb-1 block">Transaction Description / Notes</Label>
                  <Input
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Internal or provider note..."
                    className="text-xs"
                  />
                </div>

                {/* Refund Toggle */}
                {(editStatus === "FAILED" || editStatus === "REVERSED") && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                    <label className="flex items-center gap-2 cursor-pointer text-amber-900 font-bold">
                      <input
                        type="checkbox"
                        checked={editRefundToWallet}
                        onChange={(e) => setEditRefundToWallet(e.target.checked)}
                        className="rounded text-amber-600 focus:ring-amber-500"
                      />
                      <span>Refund ₦{editingTx.amount.toLocaleString()} to Developer's Main Wallet</span>
                    </label>
                    <p className="text-[11px] text-amber-700 pl-5">
                      Automatically credits {editingTx.userName}'s wallet balance with ₦{editingTx.amount.toLocaleString()} upon saving.
                    </p>
                  </div>
                )}

                {/* Dispatch Webhook Toggle */}
                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-semibold">
                    <input
                      type="checkbox"
                      checked={editDispatchWebhook}
                      onChange={(e) => setEditDispatchWebhook(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Dispatch webhook event to developer's registered endpoint</span>
                  </label>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setEditingTx(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {savingEdit ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
                  Save Changes
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 3: CREATE / SIMULATE API TX */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-lg">
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <PlusCircle size={18} className="text-blue-600" /> Simulate Developer API Transaction
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div>
                <Label className="text-xs text-slate-600 font-semibold mb-1 block">Developer Account *</Label>
                <Select value={createUserId} onValueChange={setCreateUserId}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select developer user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {developers.map((d) => (
                      <SelectItem key={d.userId} value={d.userId}>
                        {d.fullName} ({d.phone})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-slate-600 font-semibold mb-1 block">Data Plan *</Label>
                <Select value={createPlanId} onValueChange={setCreatePlanId}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select data plan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.network} - {p.name} ({p.sizeLabel}) • ₦{p.user_price || p.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-slate-600 font-semibold mb-1 block">Recipient Phone Number (11 digits) *</Label>
                <Input
                  value={createPhone}
                  onChange={(e) => setCreatePhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                  placeholder="08164135836"
                  maxLength={11}
                  className="text-xs font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs text-slate-600 font-semibold">Client Reference *</Label>
                  <button
                    type="button"
                    onClick={generateReference}
                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Sparkles size={11} /> Generate
                  </button>
                </div>
                <Input
                  value={createReference}
                  onChange={(e) => setCreateReference(e.target.value)}
                  placeholder="API-C-7289139"
                  className="text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-600 font-semibold mb-1 block">Status</Label>
                  <Select
                    value={createStatus}
                    onValueChange={(val: any) => setCreateStatus(val)}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SUCCESS">SUCCESS</SelectItem>
                      <SelectItem value="PENDING">PENDING</SelectItem>
                      <SelectItem value="FAILED">FAILED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-slate-600 font-semibold mb-1 block">External Reference</Label>
                  <Input
                    value={createExternalRef}
                    onChange={(e) => setCreateExternalRef(e.target.value)}
                    placeholder="Optional provider ref"
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-semibold">
                  <input
                    type="checkbox"
                    checked={createDispatchWebhook}
                    onChange={(e) => setCreateDispatchWebhook(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Dispatch webhook to developer's registered URL</span>
                </label>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateTransaction}
                disabled={creatingTx}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {creatingTx ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
                Create Transaction
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: DELETE CONFIRMATION */}
      <Dialog open={!!deletingTx} onOpenChange={(open) => !open && setDeletingTx(null)}>
        <DialogContent className="max-w-md">
          {deletingTx && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-rose-600 flex items-center gap-2">
                  <Trash2 size={18} /> Confirm Transaction Deletion
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-2 text-xs text-slate-600">
                <p>
                  Are you sure you want to delete API transaction{" "}
                  <span className="font-mono font-bold text-slate-900">{deletingTx.reference}</span>?
                </p>
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 space-y-1">
                  <p className="font-bold">Warning:</p>
                  <p>This action is irreversible and removes the ledger entry from the database.</p>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setDeletingTx(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteTransaction}
                  disabled={confirmDelete}
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                >
                  {confirmDelete ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
                  Delete Permanently
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 5: WEBHOOK DELIVERY REPORT */}
      <Dialog open={!!webhookResultModal} onOpenChange={(open) => !open && setWebhookResultModal(null)}>
        <DialogContent className="max-w-lg">
          {webhookResultModal && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Send size={18} className="text-blue-600" /> Webhook Delivery Report
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3 text-xs">
                <div className={`p-3 rounded-xl border flex items-center justify-between ${
                  webhookResultModal.success
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-rose-50 border-rose-200 text-rose-900"
                }`}>
                  <div className="flex items-center gap-2 font-bold">
                    {webhookResultModal.success ? (
                      <CheckCircle2 size={18} className="text-emerald-600" />
                    ) : (
                      <XCircle size={18} className="text-rose-600" />
                    )}
                    <span>{webhookResultModal.success ? "Delivered Successfully" : "Delivery Failed"}</span>
                  </div>
                  {webhookResultModal.statusCode && (
                    <span className="font-mono font-bold px-2 py-0.5 rounded bg-white/80 border text-xs">
                      HTTP {webhookResultModal.statusCode}
                    </span>
                  )}
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Destination:</span>
                    <span className="text-blue-600 font-bold truncate max-w-[280px]">
                      {webhookResultModal.webhookUrl || "N/A"}
                    </span>
                  </div>
                  {webhookResultModal.latencyMs !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Latency:</span>
                      <span className="text-slate-800 font-bold">{webhookResultModal.latencyMs}ms</span>
                    </div>
                  )}
                </div>

                {webhookResultModal.responseBody && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Target Server Response Body
                    </span>
                    <pre className="bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-[11px] overflow-x-auto select-all max-h-40">
                      {webhookResultModal.responseBody}
                    </pre>
                  </div>
                )}

                {webhookResultModal.error && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
                    <span className="font-bold block mb-0.5">Error Details:</span>
                    <p className="font-mono text-[11px]">{webhookResultModal.error}</p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button onClick={() => setWebhookResultModal(null)}>Close</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
