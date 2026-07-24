"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ChevronLeft, ChevronRight, Eye } from "lucide-react";

interface Transaction {
  id: string;
  reference: string;
  externalReference?: string;
  userName: string;
  userPhone?: string;
  userEmail?: string;
  phone: string;
  type: string;
  description?: string;
  amount: number;
  balanceBefore?: number;
  balanceAfter?: number;
  status: string;
  apiUsed?: string;
  planName?: string;
  planSize?: string;
  network?: string;
  createdAt: string;
  updatedAt?: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State for Full Transaction Details
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Filters
  const [status, setStatus] = useState("ALL");
  const [type, setType] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");

  const fetchTransactions = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status,
        type,
        page: page.toString(),
        limit: "20",
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        ...(search && { search }),
      });

      const response = await fetch(`/api/admin/transactions?${params}`);
      if (!response.ok) throw new Error("Failed to fetch transactions");

      const data = await response.json();
      setTransactions(data.transactions);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions(1);
  }, [status, type, startDate, endDate, search]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return "bg-green-100 text-green-800";
      case "FAILED":
        return "bg-red-100 text-red-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "REVERSED":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Transactions Ledger</h1>
          <p className="text-slate-500 text-sm mt-1">Audit and view complete real-time transaction details</p>
        </div>
      </div>

      {/* Filters Card */}
      <Card className="p-4 bg-white shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <Label className="text-xs text-slate-500">Search</Label>
            <Input
              placeholder="Phone, ref, name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mt-1 text-xs"
            />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="SUCCESS">SUCCESS</SelectItem>
                <SelectItem value="PENDING">PENDING</SelectItem>
                <SelectItem value="FAILED">FAILED</SelectItem>
                <SelectItem value="REVERSED">REVERSED</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-slate-500">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="DATA_PURCHASE">DATA_PURCHASE</SelectItem>
                <SelectItem value="AIRTIME_PURCHASE">AIRTIME_PURCHASE</SelectItem>
                <SelectItem value="WALLET_FUNDING">WALLET_FUNDING</SelectItem>
                <SelectItem value="REWARD_CREDIT">REWARD_CREDIT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-slate-500">Start Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 text-xs"
            />
          </div>
          <div>
            <Label className="text-xs text-slate-500">End Date</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 text-xs"
            />
          </div>
        </div>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Transactions Table */}
      <Card className="overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Date & Time</th>
                <th className="px-4 py-3 text-left">Reference</th>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Recipient Phone</th>
                <th className="px-4 py-3 text-left">Type / Details</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">API Used</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-500">
                    Loading transactions...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-500">
                    No transactions found
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedTx(tx)}
                  >
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {new Date(tx.createdAt).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-900">{tx.reference}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{tx.userName}</td>
                    <td className="px-4 py-3 font-mono font-bold text-blue-600">{tx.phone || "N/A"}</td>
                    <td className="px-4 py-3 text-slate-700">
                      <span className="font-semibold block">{tx.type.replace(/_/g, " ")}</span>
                      <span className="text-[11px] text-slate-500 block truncate max-w-[200px]">{tx.description}</span>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">₦{tx.amount.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {tx.apiUsed || "N/A"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`${getStatusColor(tx.status)} border-none text-[10px]`}>
                        {tx.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedTx(tx); }}>
                        <Eye className="w-4 h-4 text-blue-600" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
          <div className="text-xs text-slate-500">
            Showing Page <span className="font-semibold">{pagination.page}</span> of{" "}
            <span className="font-semibold">{pagination.pages || 1}</span> ({pagination.total} total)
          </div>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              disabled={pagination.page <= 1 || loading}
              onClick={() => fetchTransactions(pagination.page - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pagination.page >= pagination.pages || loading}
              onClick={() => fetchTransactions(pagination.page + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Full Transaction Data Modal */}
      <Dialog open={Boolean(selectedTx)} onOpenChange={(open) => { if (!open) setSelectedTx(null); }}>
        <DialogContent className="sm:max-w-xl bg-white border border-slate-300 shadow-2xl p-6 rounded-xl">
          <DialogHeader className="border-b border-slate-200 pb-4 mb-2">
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center justify-between pr-6">
              <span>Transaction Audit Details</span>
              {selectedTx && (
                <Badge className={`${getStatusColor(selectedTx.status)} border-none text-xs px-3 py-1`}>
                  {selectedTx.status}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedTx && (
            <div className="space-y-4 text-xs text-slate-800">
              {/* Reference & Identifiers */}
              <div className="space-y-2 pb-3 border-b border-slate-200">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Transaction Reference:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm select-all">{selectedTx.reference}</span>
                </div>
                {selectedTx.externalReference && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">External Provider Reference:</span>
                    <span className="font-mono font-bold text-blue-600 select-all">{selectedTx.externalReference}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Transaction Type:</span>
                  <span className="font-bold text-slate-900">{selectedTx.type}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">API Provider Used:</span>
                  <span className="font-semibold text-blue-700">{selectedTx.apiUsed || "N/A"}</span>
                </div>
              </div>

              {/* Customer & Target Information */}
              <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-200">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Customer Details</span>
                  <p className="font-bold text-slate-900 text-sm">{selectedTx.userName}</p>
                  <p className="text-slate-600 font-mono">Phone: {selectedTx.userPhone}</p>
                  <p className="text-slate-600 truncate">Email: {selectedTx.userEmail}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Recipient & Plan</span>
                  <p className="font-bold text-blue-600 font-mono text-sm">Target: {selectedTx.phone}</p>
                  <p className="text-slate-700 font-medium">Plan: {selectedTx.planName} {selectedTx.planSize ? `(${selectedTx.planSize})` : ""}</p>
                  <p className="text-slate-600">Network: {selectedTx.network || "N/A"}</p>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="space-y-2 pb-3 border-b border-slate-200">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Financial Summary</span>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Amount Charged:</span>
                  <span className="font-bold text-slate-900 text-base">₦{selectedTx.amount.toLocaleString()}</span>
                </div>
                {typeof selectedTx.balanceBefore === "number" && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">User Balance Before:</span>
                    <span className="font-mono text-slate-700 font-medium">₦{(selectedTx.balanceBefore / 100).toLocaleString()}</span>
                  </div>
                )}
                {typeof selectedTx.balanceAfter === "number" && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">User Balance After:</span>
                    <span className="font-mono text-slate-700 font-medium">₦{(selectedTx.balanceAfter / 100).toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Provider Response Description */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Provider Response Log</span>
                <div className="font-mono text-xs text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-200 whitespace-pre-wrap break-all">
                  {selectedTx.description || "No description provided"}
                </div>
              </div>

              <div className="flex justify-between text-[11px] text-slate-400 pt-2">
                <span>Created: {new Date(selectedTx.createdAt).toLocaleString()}</span>
                {selectedTx.updatedAt && (
                  <span>Updated: {new Date(selectedTx.updatedAt).toLocaleString()}</span>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
