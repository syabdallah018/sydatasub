"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Send,
  Loader2,
  Info,
  Smartphone,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Edit3,
  Users,
  BellRing,
  TrendingUp,
  RefreshCw,
  Clock,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface PushBroadcastItem {
  id: string;
  title: string;
  body: string;
  target: string;
  successCount: number;
  failureCount: number;
  totalDevices: number;
  createdAt: string;
}

interface PushStats {
  totalBroadcasts: number;
  totalDelivered: number;
  totalFailed: number;
  totalRegisteredDevices: number;
}

export default function AdminPushPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [broadcasts, setBroadcasts] = useState<PushBroadcastItem[]>([]);
  const [stats, setStats] = useState<PushStats | null>(null);

  // Last sent result banner
  const [lastResult, setLastResult] = useState<{
    successCount: number;
    failureCount: number;
    totalDevices: number;
  } | null>(null);

  const titleInputRef = useRef<HTMLInputElement>(null);

  const fetchHistoryAndStats = useCallback(async (showToast = false) => {
    try {
      setLoadingHistory(true);
      const res = await fetch("/api/admin/push");
      const data = await res.json();

      if (res.ok && data.success) {
        setBroadcasts(data.broadcasts || []);
        setStats(data.stats || null);
        if (showToast) {
          toast.success("Push broadcast history updated");
        }
      } else {
        toast.error(data.error || "Failed to load push stats");
      }
    } catch (err) {
      console.error("[FETCH PUSH STATS ERROR]", err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchHistoryAndStats();
  }, [fetchHistoryAndStats]);

  const handleSendPush = async (e?: React.FormEvent, customTitle?: string, customBody?: string) => {
    if (e) e.preventDefault();

    const pushTitle = (customTitle ?? title).trim();
    const pushBody = (customBody ?? body).trim();

    if (!pushTitle || !pushBody) {
      toast.error("Please enter both a title and message body.");
      return;
    }

    setSending(true);
    setLastResult(null);

    try {
      const res = await fetch("/api/admin/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: pushTitle, body: pushBody }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(data.message || "Push notification broadcast dispatched successfully!");
        setLastResult(data.stats || null);
        if (!customTitle) {
          setTitle("");
          setBody("");
        }
        fetchHistoryAndStats();
      } else {
        toast.error(data.error || "Failed to broadcast push notification.");
      }
    } catch (error) {
      console.error("[PUSH BROADCAST ERROR]", error);
      toast.error("An error occurred. Please check your connection and try again.");
    } finally {
      setSending(false);
    }
  };

  const handleResend = async (item: PushBroadcastItem) => {
    const confirm = window.confirm(
      `Are you sure you want to resend this exact notification to all active devices?\n\nTitle: "${item.title}"\nMessage: "${item.body}"`
    );
    if (!confirm) return;

    await handleSendPush(undefined, item.title, item.body);
  };

  const handleEditAndResend = (item: PushBroadcastItem) => {
    setTitle(item.title);
    setBody(item.body);
    toast.info("Loaded notification into composer for editing.");
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => {
      titleInputRef.current?.focus();
    }, 400);
  };

  const successRate =
    stats && stats.totalDelivered + stats.totalFailed > 0
      ? ((stats.totalDelivered / (stats.totalDelivered + stats.totalFailed)) * 100).toFixed(1)
      : "100";

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20">
              <BellRing size={24} />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Push Notifications Hub</h1>
          </div>
          <p className="text-slate-600 mt-1 text-sm">
            Broadcast instant native push notifications to all registered mobile app users with live delivery tracking.
          </p>
        </div>

        <button
          onClick={() => fetchHistoryAndStats(true)}
          disabled={loadingHistory}
          className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-sm flex items-center gap-2 transition self-start md:self-auto disabled:opacity-50"
        >
          <RefreshCw size={16} className={loadingHistory ? "animate-spin" : ""} />
          Refresh Stats
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active App Devices</span>
            <Smartphone size={18} className="text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats?.totalRegisteredDevices ?? 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">FCM tokens registered</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Broadcasts</span>
            <Send size={18} className="text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats?.totalBroadcasts ?? 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">Campaigns sent</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Delivered</span>
            <CheckCircle2 size={18} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats?.totalDelivered?.toLocaleString() ?? 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">Device notifications received</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Success Rate</span>
            <TrendingUp size={18} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{successRate}%</div>
          <div className="text-xs text-slate-500 mt-1">Deliverability ratio</div>
        </div>
      </div>

      {/* Last Result Alert Banner */}
      {lastResult && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-4 text-emerald-900 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
            <div className="text-sm font-medium">
              <span className="font-bold">Broadcast Result:</span> Successfully delivered to{" "}
              <span className="font-bold">{lastResult.successCount}</span> device(s)
              {lastResult.failureCount > 0 && (
                <>
                  , <span className="text-red-700 font-bold">{lastResult.failureCount} failed</span>
                </>
              )}
              . (Target: {lastResult.totalDevices} registered devices).
            </div>
          </div>
          <button
            onClick={() => setLastResult(null)}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold px-2 py-1 rounded"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Composer & Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Composer Form */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-blue-600" />
              <h2 className="font-bold text-slate-900 text-sm">Compose New Push Notification</h2>
            </div>
            <div className="text-xs text-slate-500">
              Target: <span className="font-bold text-blue-600">All Active Devices</span>
            </div>
          </div>

          <form onSubmit={handleSendPush} className="p-6 space-y-5">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Notification Title
                </label>
                <span className={`text-[11px] ${title.length > 90 ? "text-red-500" : "text-slate-400"}`}>
                  {title.length}/100
                </span>
              </div>
              <input
                ref={titleInputRef}
                type="text"
                placeholder="e.g. Promo Active! Cheap Data Bundles Available 🚀"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={sending}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 transition"
                maxLength={100}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Message Body
                </label>
                <span className={`text-[11px] ${body.length > 450 ? "text-red-500" : "text-slate-400"}`}>
                  {body.length}/500
                </span>
              </div>
              <textarea
                rows={4}
                placeholder="Enter the push message text users will see on their device lock screens..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                disabled={sending}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 transition resize-none"
                maxLength={500}
              />
            </div>

            <button
              type="submit"
              disabled={!title.trim() || !body.trim() || sending}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold flex items-center justify-center gap-2 transition shadow-md hover:shadow-lg"
            >
              {sending ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Broadcasting Notification...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Send Push Broadcast
                </>
              )}
            </button>
          </form>
        </div>

        {/* Live Device Preview Mockup */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone size={18} className="text-slate-500" />
              <h3 className="font-bold text-slate-900 text-sm">Lock Screen Preview</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Android System Preview</span>
          </div>

          {/* Android Device Notification Card */}
          <div className="bg-slate-900 p-5 rounded-2xl shadow-xl text-white">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center font-bold text-[10px] text-white">
                  SY
                </div>
                <span className="font-bold text-slate-200 tracking-wide">SY DATA</span>
                <span>•</span>
                <span>Just now</span>
              </div>
              <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">app</span>
            </div>

            <div className="space-y-1 pl-7 border-l border-blue-500/40">
              <div className="font-bold text-sm text-slate-100 line-clamp-1">
                {title.trim() || "Notification Title Appears Here"}
              </div>
              <div className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                {body.trim() || "The body text of your push notification will appear here exactly as formatted..."}
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-start gap-2">
            <Info size={15} className="text-blue-500 shrink-0 mt-0.5" />
            <span>
              Users who have logged into the mobile app will receive this immediately on their device status bar and notification tray.
            </span>
          </div>
        </div>
      </div>

      {/* Broadcast History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-slate-900 text-base">Recent Push Broadcasts</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Historical record of sent notifications. You can easily resend or edit and broadcast again.
            </p>
          </div>

          <div className="text-xs text-slate-500">
            Total Logged: <span className="font-bold text-slate-800">{broadcasts.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3.5">Date & Time</th>
                <th className="px-5 py-3.5">Title</th>
                <th className="px-5 py-3.5">Message Body</th>
                <th className="px-5 py-3.5">Delivery Stats</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loadingHistory ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-500">
                    <Loader2 size={24} className="animate-spin mx-auto mb-2 text-blue-500" />
                    Loading broadcast history...
                  </td>
                </tr>
              ) : broadcasts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                      <Clock size={20} />
                    </div>
                    <div className="font-bold text-slate-800 text-sm">No Broadcasts Recorded Yet</div>
                    <div className="text-slate-500 text-xs mt-1">
                      Compose your first notification above to begin broadcasting to active devices.
                    </div>
                  </td>
                </tr>
              ) : (
                broadcasts.map((item) => {
                  const rate =
                    item.successCount + item.failureCount > 0
                      ? ((item.successCount / (item.successCount + item.failureCount)) * 100).toFixed(0)
                      : "100";

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 text-xs">
                          {new Date(item.createdAt).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {new Date(item.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900 text-xs line-clamp-1 max-w-[200px]">
                          {item.title}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="text-xs text-slate-600 line-clamp-2 max-w-[320px]" title={item.body}>
                          {item.body}
                        </div>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            {item.successCount} sent
                          </span>
                          {item.failureCount > 0 && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-800">
                              {item.failureCount} failed
                            </span>
                          )}
                          <span className="text-[11px] font-semibold text-slate-500">
                            ({rate}%)
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleResend(item)}
                            disabled={sending}
                            className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
                            title="Resend this exact message to all devices"
                          >
                            <RotateCcw size={13} />
                            Resend
                          </button>

                          <button
                            onClick={() => handleEditAndResend(item)}
                            disabled={sending}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                            title="Load into composer to edit before resending"
                          >
                            <Edit3 size={13} />
                            Edit & Resend
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
    </div>
  );
}
