"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, RefreshCw, Search, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type WebhookStatus = "ALL" | "RECEIVED" | "PROCESSED" | "FAILED";

interface LinkedTransaction {
  id: string;
  reference: string;
  phone: string;
  amount: number;
  status: string;
  createdAt: string;
  userId: string | null;
  userName: string | null;
  userPhone: string | null;
}

interface WebhookRow {
  id: string;
  provider: string;
  eventType: string;
  status: string;
  transactionReference: string | null;
  interbankReference: string | null;
  merchantReference: string | null;
  amount: number | null;
  createdAt: string;
  processedAt: string | null;
  signatureAccepted: boolean;
  credited: boolean;
  payload?: unknown;
  linkedTransaction: LinkedTransaction | null;
}

interface WebhookResponse {
  success: boolean;
  data: WebhookRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  summary: {
    total: number;
    credited: number;
    processed: number;
    received: number;
    failed: number;
  };
}

function formatNaira(naira: number | null) {
  if (naira == null) return "—";
  return `₦${naira.toLocaleString()}`;
}

export default function AdminWebhooksPage() {
  const [rows, setRows] = useState<WebhookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<WebhookStatus>("ALL");
  const [search, setSearch] = useState("");
  const [summary, setSummary] = useState<WebhookResponse["summary"]>({
    total: 0,
    credited: 0,
    processed: 0,
    received: 0,
    failed: 0,
  });

  const fetchWebhooks = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    try {
      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      setError(null);

      const params = new URLSearchParams({
        limit: "100",
        status,
      });
      const response = await fetch(`/api/admin/webhooks?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch webhook events");
      const data: WebhookResponse = await response.json();
      setRows(data.data || []);
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load webhooks");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [status]);

  useEffect(() => {
    void fetchWebhooks("initial");
  }, [fetchWebhooks]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((item) => {
      const fields = [
        item.transactionReference,
        item.interbankReference,
        item.merchantReference,
        item.linkedTransaction?.reference,
        item.linkedTransaction?.userName,
        item.linkedTransaction?.userPhone,
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());
      return fields.some((field) => field.includes(query));
    });
  }, [rows, search]);

  return (
    <div className="space-y-6 rounded-2xl border border-slate-800 bg-black p-5">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Webhook Monitor</h1>
        <Button
          className="bg-blue-700 hover:bg-blue-600"
          onClick={() => void fetchWebhooks("refresh")}
          disabled={refreshing}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert className="border-rose-500/50 bg-rose-900/20 text-rose-100">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Metric label="Total Events" value={summary.total} />
        <Metric label="Credited" value={summary.credited} />
        <Metric label="Processed" value={summary.processed} />
        <Metric label="Received" value={summary.received} />
        <Metric label="Failed" value={summary.failed} />
      </div>

      <Card className="border-slate-800 bg-slate-950 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <Input
              className="border-slate-700 bg-black pl-10 text-slate-100"
              placeholder="Search refs, user name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={status} onValueChange={(value) => setStatus(value as WebhookStatus)}>
            <SelectTrigger className="border-slate-700 bg-black text-slate-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-slate-700 bg-black text-slate-100">
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="RECEIVED">Received</SelectItem>
              <SelectItem value="PROCESSED">Processed</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden border-slate-800 bg-slate-950">
        {loading ? (
          <div className="p-10 text-center text-slate-300">Loading webhook events...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-400">No webhook events found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1280px] text-sm text-slate-200">
              <thead className="border-b border-slate-800 bg-black">
                <tr>
                  <th className="px-4 py-3 text-left">Time</th>
                  <th className="px-4 py-3 text-left">Provider/Event</th>
                  <th className="px-4 py-3 text-left">References</th>
                  <th className="px-4 py-3 text-left">Amount</th>
                  <th className="px-4 py-3 text-left">Signature</th>
                  <th className="px-4 py-3 text-left">Credit Outcome</th>
                  <th className="px-4 py-3 text-left">Linked Transaction</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-b border-slate-900 hover:bg-slate-900/70">
                    <td className="px-4 py-3 align-top text-xs">
                      <div>{new Date(item.createdAt).toLocaleString()}</div>
                      <div className="text-slate-500">
                        {item.processedAt ? `Processed: ${new Date(item.processedAt).toLocaleString()}` : "Not processed yet"}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium">{item.provider}</div>
                      <div className="text-xs text-slate-400">{item.eventType}</div>
                      <Badge className={item.status === "PROCESSED" ? "mt-2 bg-emerald-700 text-emerald-100" : "mt-2 bg-amber-700 text-amber-100"}>
                        {item.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 align-top text-xs">
                      <div><span className="text-slate-400">txn:</span> {item.transactionReference || "—"}</div>
                      <div><span className="text-slate-400">wiaxy:</span> {item.interbankReference || "—"}</div>
                      <div><span className="text-slate-400">merchant:</span> {item.merchantReference || "—"}</div>
                    </td>
                    <td className="px-4 py-3 align-top font-semibold">{formatNaira(item.amount)}</td>
                    <td className="px-4 py-3 align-top">
                      <Badge className="bg-emerald-700 text-emerald-100">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Valid
                      </Badge>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {item.credited ? (
                        <Badge className="bg-emerald-700 text-emerald-100">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Wallet Credited
                        </Badge>
                      ) : (
                        <Badge className="bg-rose-700 text-rose-100">
                          <XCircle className="mr-1 h-3 w-3" />
                          Not Credited
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-xs">
                      {item.linkedTransaction ? (
                        <div className="space-y-1">
                          <div className="font-medium">{item.linkedTransaction.reference}</div>
                          <div className="text-slate-400">
                            {item.linkedTransaction.userName || "Unknown user"} ({item.linkedTransaction.userPhone || item.linkedTransaction.phone})
                          </div>
                          <div className="text-slate-400">
                            {item.linkedTransaction.status} • ₦{item.linkedTransaction.amount.toLocaleString()}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500">No linked transaction</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="border-slate-800 bg-slate-950 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-xl font-semibold text-slate-100">{value.toLocaleString()}</p>
    </Card>
  );
}
