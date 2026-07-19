"use client";

import { useEffect, useState } from "react";
import { Loader2, Terminal, ShieldCheck, ShieldAlert, Check, X, RefreshCw, Copy, ExternalLink, Receipt, Calendar, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Developer {
  id: string;
  apiKey: string;
  webhookUrl: string | null;
  whitelistIps: string[];
  status: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  user: {
    fullName: string;
    phone: string;
    email: string | null;
    balance: number;
    tier: string;
  };
}

export default function AdminDevelopersPage() {
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [credModal, setCredModal] = useState<{
    open: boolean;
    apiKey: string;
    clientSecret: string;
    devName: string;
  } | null>(null);

  const [txLogsModal, setTxLogsModal] = useState<{ open: boolean; devName: string; devId: string } | null>(null);
  const [txLogs, setTxLogs] = useState<any[]>([]);
  const [txLogsLoading, setTxLogsLoading] = useState(false);

  const loadDeveloperTransactions = async (devId: string, name: string) => {
    setTxLogsModal({ open: true, devName: name, devId });
    setTxLogsLoading(true);
    setTxLogs([]);
    try {
      const res = await fetch(`/api/admin/developers/${devId}/transactions`);
      const data = await res.json();
      if (data.success) {
        setTxLogs(data.transactions || []);
      } else {
        toast.error("Failed to load developer logs");
      }
    } catch {
      toast.error("Connection error loading API transaction logs");
    } finally {
      setTxLogsLoading(false);
    }
  };

  const fetchDevelopers = async () => {
    try {
      const res = await fetch("/api/admin/developers");
      const data = await res.json();
      if (data.success) {
        setDevelopers(data.developers);
      } else {
        toast.error("Failed to load developer applications");
      }
    } catch {
      toast.error("Network error loading developers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevelopers();
  }, []);

  const handleAction = async (id: string, name: string, status: "APPROVED" | "REJECTED") => {
    setSubmittingId(id);
    try {
      const res = await fetch(`/api/admin/developers/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`Application ${status.toLowerCase()} successfully`);
        fetchDevelopers();

        if (status === "APPROVED") {
          setCredModal({
            open: true,
            apiKey: data.profile.apiKey,
            clientSecret: "",
            devName: name,
          });
        }
      } else {
        toast.error(data.error || "Action failed");
      }
    } catch {
      toast.error("Network error submitting response");
    } finally {
      setSubmittingId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 min-h-[500px]">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center pb-6 border-b border-slate-100">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Terminal className="text-blue-600" />
            Developer Applications
          </h1>
          <p className="text-slate-500 mt-1">Approve developer access, view API usage, and manage keys.</p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            fetchDevelopers();
          }}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-slate-50 hover:bg-slate-100 text-slate-600 font-medium rounded-lg border border-slate-200 transition"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Developers List */}
      {developers.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <Terminal size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-800">No Applications</h3>
          <p className="text-slate-500 mt-1">There are no pending or registered developer requests yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {developers.map((dev) => (
            <div
              key={dev.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition duration-200 overflow-hidden"
            >
              {/* Top Banner Status */}
              <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
                    {dev.user.fullName.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">{dev.user.fullName}</h3>
                    <p className="text-xs text-slate-500">Joined: {new Date(dev.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {dev.status === "PENDING" && (
                    <span className="px-3 py-1 text-xs font-semibold bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                      Pending Review
                    </span>
                  )}
                  {dev.status === "APPROVED" && (
                    <span className="px-3 py-1 text-xs font-semibold bg-green-50 text-green-700 rounded-full border border-green-200 flex items-center gap-1">
                      <ShieldCheck size={12} /> Approved
                    </span>
                  )}
                  {dev.status === "REJECTED" && (
                    <span className="px-3 py-1 text-xs font-semibold bg-rose-50 text-rose-700 rounded-full border border-rose-200 flex items-center gap-1">
                      <ShieldAlert size={12} /> Rejected
                    </span>
                  )}

                  <span className="text-sm font-semibold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">
                    Wallet: ₦{(dev.user.balance / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Dev Profile Content */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contact Info</h4>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-slate-600 font-medium">{dev.user.phone}</p>
                    <p className="text-sm text-slate-500">{dev.user.email || "No email provided"}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Webhook Endpoint</h4>
                  <p className="text-sm mt-2 font-mono text-slate-600 break-all bg-slate-50 p-2 rounded-lg border border-slate-100">
                    {dev.webhookUrl || "No webhook URL configured"}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">IP Whitelist</h4>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {dev.whitelistIps.length === 0 ? (
                      <span className="text-sm text-slate-400 italic">No restrictions (open)</span>
                    ) : (
                      dev.whitelistIps.map((ip, i) => (
                        <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded font-mono border border-slate-200">
                          {ip}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons if Pending */}
              {dev.status === "PENDING" && (
                <div className="px-6 py-4 bg-slate-50/20 border-t border-slate-100 flex justify-end gap-3">
                  <button
                    disabled={submittingId !== null}
                    onClick={() => handleAction(dev.id, dev.user.fullName, "REJECTED")}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-slate-600 hover:text-rose-600 text-sm font-semibold rounded-xl transition disabled:opacity-50"
                  >
                    <X size={16} />
                    Reject Access
                  </button>
                  <button
                    disabled={submittingId !== null}
                    onClick={() => handleAction(dev.id, dev.user.fullName, "APPROVED")}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition disabled:opacity-50"
                  >
                    <Check size={16} />
                    Approve Application
                  </button>
                </div>
              )}

              {/* API Key Display if Approved */}
              {dev.status === "APPROVED" && (
                <div className="px-6 py-4 bg-slate-50/20 border-t border-slate-100 flex flex-wrap justify-between items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">API Key:</span>
                    <code className="text-sm font-mono text-slate-600 bg-slate-50 border border-slate-150 px-2 py-1 rounded">
                      {dev.apiKey}
                    </code>
                    <button
                      onClick={() => copyToClipboard(dev.apiKey)}
                      className="text-slate-400 hover:text-blue-500 transition p-1"
                      title="Copy Key"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                  
                  <button
                    onClick={() => loadDeveloperTransactions(dev.id, dev.user.fullName)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition"
                  >
                    <Receipt size={14} />
                    Audit API Logs
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Success Credentials Modal */}
      {credModal && credModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl p-8 border border-slate-100 relative animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="text-green-500" size={28} />
              Developer Access Approved
            </h2>
            <p className="text-slate-500 mt-2 text-sm">
              Developer access for <strong className="text-slate-800">{credModal.devName}</strong> is approved.
              Please copy the API key below and share it with the developer.
            </p>

            <div className="mt-6 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 relative">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">API Key</span>
                <code className="text-sm font-mono text-slate-800 break-all select-all block pr-8">
                  {credModal.apiKey}
                </code>
                <button
                  onClick={() => copyToClipboard(credModal.apiKey)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-blue-500"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setCredModal(null)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl shadow-sm transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {txLogsModal && txLogsModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl p-8 border border-slate-100 relative max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200 animate-duration-150">
            <button
              onClick={() => setTxLogsModal(null)}
              className="absolute right-6 top-6 text-slate-400 hover:text-slate-600 transition"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold text-slate-950 flex items-center gap-2 mb-2">
              <Receipt className="text-blue-600" />
              API Logs: {txLogsModal.devName}
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Reviewing direct server-to-server data bundle purchases processed under this developer account.
            </p>

            <div className="flex-1 overflow-y-auto min-h-[300px] border border-slate-100 rounded-2xl bg-slate-50/50 p-4">
              {txLogsLoading ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <Loader2 className="animate-spin text-blue-500 mb-2" size={32} />
                  <span className="text-xs text-slate-500 font-semibold">Loading API transaction logs...</span>
                </div>
              ) : txLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <AlertCircle className="text-slate-400 mb-2" size={32} />
                  <span className="text-xs text-slate-500 font-bold">No Transactions Found</span>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xs">This developer hasn't processed any API requests yet.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs text-slate-500">
                  <thead className="bg-slate-100/80 text-slate-700 font-semibold uppercase text-[10px] text-nowrap">
                    <tr>
                      <th className="px-3 py-2.5">Reference</th>
                      <th className="px-3 py-2.5">Date</th>
                      <th className="px-3 py-2.5">Amount</th>
                      <th className="px-3 py-2.5">Recipient</th>
                      <th className="px-3 py-2.5">Description</th>
                      <th className="px-3 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {txLogs.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-100/30">
                        <td className="px-3 py-2.5 font-mono text-slate-900 select-all">{tx.reference}</td>
                        <td className="px-3 py-2.5 text-nowrap">{new Date(tx.createdAt).toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-slate-900 font-bold">₦{tx.amount}</td>
                        <td className="px-3 py-2.5">{tx.phone}</td>
                        <td className="px-3 py-2.5 max-w-xs truncate">{tx.description}</td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${
                              tx.status === "SUCCESS"
                                ? "bg-green-50 text-green-700 border border-green-200"
                                : tx.status === "FAILED"
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setTxLogsModal(null)}
                className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
