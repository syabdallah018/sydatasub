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
  User,
  UserCheck,
  BellRing,
  TrendingUp,
  RefreshCw,
  Clock,
  Sparkles,
  Search,
  X,
  Radio,
  Check,
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

interface SearchedUser {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  hasDevice: boolean;
}

export default function AdminPushPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetMode, setTargetMode] = useState<"ALL" | "INDIVIDUAL" | "SELECTED">("ALL");

  // Individual targeting state
  const [individualUser, setIndividualUser] = useState<SearchedUser | null>(null);

  // Multi-select targeting state
  const [selectedUsers, setSelectedUsers] = useState<SearchedUser[]>([]);

  // User search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);

  // Broadcast execution & stats state
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [broadcasts, setBroadcasts] = useState<PushBroadcastItem[]>([]);
  const [stats, setStats] = useState<PushStats | null>(null);

  // Last sent result banner
  const [lastResult, setLastResult] = useState<{
    successCount: number;
    failureCount: number;
    totalDevices: number;
    target?: string;
  } | null>(null);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Fetch stats and broadcast history
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

  // Click outside listener for search dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSearchDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced user search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setSearchDropdownOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await fetch(`/api/admin/push?action=searchUsers&query=${encodeURIComponent(searchQuery.trim())}`);
        const data = await res.json();
        if (res.ok && data.success) {
          setSearchResults(data.users || []);
          setSearchDropdownOpen(true);
        }
      } catch (err) {
        console.error("Search user error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectUser = (user: SearchedUser) => {
    if (targetMode === "INDIVIDUAL") {
      setIndividualUser(user);
      setSearchQuery("");
      setSearchDropdownOpen(false);
    } else if (targetMode === "SELECTED") {
      if (!selectedUsers.some((u) => u.id === user.id)) {
        setSelectedUsers([...selectedUsers, user]);
      }
      setSearchQuery("");
      setSearchDropdownOpen(false);
    }
  };

  const handleRemoveSelectedUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter((u) => u.id !== userId));
  };

  const handleSendPush = async (e?: React.FormEvent, customTitle?: string, customBody?: string) => {
    if (e) e.preventDefault();

    const pushTitle = (customTitle ?? title).trim();
    const pushBody = (customBody ?? body).trim();

    if (!pushTitle || !pushBody) {
      toast.error("Please enter both a title and message body.");
      return;
    }

    if (targetMode === "INDIVIDUAL" && !individualUser) {
      toast.error("Please search and pick an individual recipient user.");
      return;
    }

    if (targetMode === "SELECTED" && selectedUsers.length === 0) {
      toast.error("Please select at least one recipient user.");
      return;
    }

    setSending(true);
    setLastResult(null);

    const payload: any = {
      title: pushTitle,
      body: pushBody,
      target: targetMode,
    };

    if (targetMode === "INDIVIDUAL" && individualUser) {
      payload.targetUserId = individualUser.id;
      payload.targetPhone = individualUser.phone;
    } else if (targetMode === "SELECTED") {
      payload.targetUserIds = selectedUsers.map((u) => u.id);
    }

    try {
      const res = await fetch("/api/admin/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(data.message || "Push notification dispatched successfully!");
        setLastResult({
          ...(data.stats || { successCount: 0, failureCount: 0, totalDevices: 0 }),
          target: data.broadcast?.target || targetMode,
        });

        // Instant optimistic update of broadcasts table
        if (data.broadcast) {
          setBroadcasts((prev) => [data.broadcast, ...prev.filter((b) => b.id !== data.broadcast.id)]);
        }

        if (!customTitle) {
          setTitle("");
          setBody("");
        }

        // Refresh stats in background
        fetchHistoryAndStats();
      } else {
        toast.error(data.error || "Failed to broadcast push notification.");
      }
    } catch (error) {
      console.error("[PUSH BROADCAST ERROR]", error);
      toast.error("An unexpected network error occurred while sending push notification.");
    } finally {
      setSending(false);
    }
  };

  const handleResend = (item: PushBroadcastItem) => {
    handleSendPush(undefined, item.title, item.body);
  };

  const handleEditAndResend = (item: PushBroadcastItem) => {
    setTitle(item.title);
    setBody(item.body);
    toast.info("Message copied to composer above. Make your edits and click send.");
    titleInputRef.current?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
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
            Send instant native push notifications to all users, specific individuals, or selected user groups with live delivery tracking.
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
          <div className="text-xs text-slate-500 mt-1">Eligible FCM tokens</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Broadcasts</span>
            <Send size={18} className="text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats?.totalBroadcasts ?? 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">Campaigns logged</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Delivered</span>
            <CheckCircle2 size={18} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats?.totalDelivered?.toLocaleString() ?? 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">Delivered notifications</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Success Rate</span>
            <TrendingUp size={18} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{successRate}%</div>
          <div className="text-xs text-slate-500 mt-1">Delivery reliability</div>
        </div>
      </div>

      {/* Last Result Alert Banner */}
      {lastResult && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-4 text-emerald-900 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
            <div className="text-sm font-medium">
              <span className="font-bold">Dispatch Status:</span> Successfully delivered to{" "}
              <span className="font-bold">{lastResult.successCount}</span> device(s)
              {lastResult.failureCount > 0 && (
                <>
                  , <span className="text-red-700 font-bold">{lastResult.failureCount} failed</span>
                </>
              )}
              . (Target: {lastResult.target || "Recipients"}).
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
              <h2 className="font-bold text-slate-900 text-sm">Compose Notification</h2>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
              FCM HTTP v1 Standard
            </span>
          </div>

          <form onSubmit={handleSendPush} className="p-6 space-y-5">
            {/* Target Mode Segmented Switcher */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Recipient Audience
              </label>
              <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setTargetMode("ALL")}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    targetMode === "ALL"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Users size={14} />
                  All Users
                </button>
                <button
                  type="button"
                  onClick={() => setTargetMode("INDIVIDUAL")}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    targetMode === "INDIVIDUAL"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <User size={14} />
                  Individual
                </button>
                <button
                  type="button"
                  onClick={() => setTargetMode("SELECTED")}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    targetMode === "SELECTED"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <UserCheck size={14} />
                  Select Users
                </button>
              </div>
            </div>

            {/* Individual User Picker */}
            {targetMode === "INDIVIDUAL" && (
              <div className="space-y-3 p-4 rounded-xl bg-blue-50/50 border border-blue-100 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                    Select Target Recipient
                  </span>
                  {individualUser && (
                    <button
                      type="button"
                      onClick={() => setIndividualUser(null)}
                      className="text-xs text-red-600 hover:text-red-700 font-medium"
                    >
                      Clear Recipient
                    </button>
                  )}
                </div>

                {individualUser ? (
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-blue-200 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                        {individualUser.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{individualUser.fullName}</div>
                        <div className="text-[11px] text-slate-500">{individualUser.phone}</div>
                      </div>
                    </div>
                    <div>
                      {individualUser.hasDevice ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                          <Check size={10} /> Active Device
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          No App Device
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div ref={searchContainerRef} className="relative">
                    <div className="relative">
                      <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search user by phone number or name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-blue-500 bg-white"
                      />
                      {isSearching && (
                        <Loader2 size={14} className="animate-spin absolute right-3 top-3.5 text-blue-500" />
                      )}
                    </div>

                    {searchDropdownOpen && searchResults.length > 0 && (
                      <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-lg max-h-56 overflow-y-auto divide-y divide-slate-100">
                        {searchResults.map((u) => (
                          <button
                            type="button"
                            key={u.id}
                            onClick={() => handleSelectUser(u)}
                            className="w-full text-left px-4 py-2.5 hover:bg-blue-50/50 flex items-center justify-between transition text-xs"
                          >
                            <div>
                              <div className="font-bold text-slate-900">{u.fullName}</div>
                              <div className="text-[11px] text-slate-500">{u.phone}</div>
                            </div>
                            <div>
                              {u.hasDevice ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                  App Device
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
                                  No FCM Token
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Select Users (Multi-select) Picker */}
            {targetMode === "SELECTED" && (
              <div className="space-y-3 p-4 rounded-xl bg-purple-50/50 border border-purple-100 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                    Select Target Users ({selectedUsers.length} chosen)
                  </span>
                  {selectedUsers.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedUsers([])}
                      className="text-xs text-red-600 hover:text-red-700 font-medium"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {/* Selected Users Chips */}
                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1">
                    {selectedUsers.map((u) => (
                      <span
                        key={u.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-purple-200 text-xs font-medium text-slate-800 shadow-2xs"
                      >
                        <span>{u.fullName.split(" ")[0]} ({u.phone.slice(-4)})</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSelectedUser(u.id)}
                          className="text-slate-400 hover:text-red-600"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* User Search Input */}
                <div ref={searchContainerRef} className="relative">
                  <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Type name or phone to add to list..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-purple-500 bg-white"
                    />
                    {isSearching && (
                      <Loader2 size={14} className="animate-spin absolute right-3 top-3.5 text-purple-500" />
                    )}
                  </div>

                  {searchDropdownOpen && searchResults.length > 0 && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-lg max-h-56 overflow-y-auto divide-y divide-slate-100">
                      {searchResults.map((u) => {
                        const isAlreadySelected = selectedUsers.some((sel) => sel.id === u.id);
                        return (
                          <button
                            type="button"
                            key={u.id}
                            onClick={() => handleSelectUser(u)}
                            className="w-full text-left px-4 py-2.5 hover:bg-purple-50/50 flex items-center justify-between transition text-xs"
                          >
                            <div>
                              <div className="font-bold text-slate-900">{u.fullName}</div>
                              <div className="text-[11px] text-slate-500">{u.phone}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              {u.hasDevice ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                  Device Ready
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
                                  No FCM Token
                                </span>
                              )}
                              {isAlreadySelected && (
                                <span className="text-purple-600 font-bold text-[11px]">Selected</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notification Title */}
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

            {/* Message Body */}
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!title.trim() || !body.trim() || sending}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold flex items-center justify-center gap-2 transition shadow-md hover:shadow-lg"
            >
              {sending ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Dispatching Push Notification...
                </>
              ) : (
                <>
                  <Send size={18} />
                  {targetMode === "ALL"
                    ? "Broadcast to All Devices"
                    : targetMode === "INDIVIDUAL"
                    ? `Send to ${individualUser ? individualUser.fullName : "User"}`
                    : `Send to ${selectedUsers.length} Selected User(s)`}
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

          {/* Target Audience Indicator Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium text-slate-600">
            <span className="font-bold text-slate-700">Recipient:</span>
            {targetMode === "ALL" ? (
              <span className="text-blue-600 font-bold">All Active Mobile Devices ({stats?.totalRegisteredDevices ?? 0})</span>
            ) : targetMode === "INDIVIDUAL" ? (
              <span className="text-indigo-600 font-bold">
                {individualUser ? `${individualUser.fullName} (${individualUser.phone})` : "Choose individual above"}
              </span>
            ) : (
              <span className="text-purple-600 font-bold">
                {selectedUsers.length > 0 ? `${selectedUsers.length} specific user(s)` : "Choose users above"}
              </span>
            )}
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
              Recipients who have installed and logged into the mobile app will receive this immediately on their device notification tray with sound and vibration.
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
                <th className="px-5 py-3.5">Target</th>
                <th className="px-5 py-3.5">Title</th>
                <th className="px-5 py-3.5">Message Body</th>
                <th className="px-5 py-3.5">Delivery Stats</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loadingHistory ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                    <Loader2 size={24} className="animate-spin mx-auto mb-2 text-blue-500" />
                    Loading broadcast history...
                  </td>
                </tr>
              ) : broadcasts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
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

                      <td className="px-5 py-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            item.target?.startsWith("Individual")
                              ? "bg-indigo-100 text-indigo-800"
                              : item.target?.startsWith("Selected")
                              ? "bg-purple-100 text-purple-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {item.target || "ALL"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900 text-xs line-clamp-1 max-w-[180px]">
                          {item.title}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="text-xs text-slate-600 line-clamp-2 max-w-[280px]" title={item.body}>
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
                            title="Resend this message"
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
