"use client";

import { useEffect, useState } from "react";
import { Loader2, Megaphone, PauseCircle, PlayCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

const T = {
  bgCard: "#0F1320",
  bgElevated: "#161B2E",
  blue: "#3B82F6",
  textPrimary: "#F1F5FF",
  textSecondary: "#8B93B0",
  textMuted: "#4B5370",
  border: "rgba(255,255,255,0.07)",
  green: "#10B981",
  red: "#EF4444",
  amber: "#F59E0B",
};

const font =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Helvetica, Arial, sans-serif';

interface BroadcastItem {
  id: string;
  message: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  stoppedAt: string | null;
  dismissCount: number;
}

export default function BroadcastsTab() {
  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchBroadcasts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/broadcasts", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch broadcasts");
      const json = await res.json();
      setBroadcasts(Array.isArray(json.broadcasts) ? json.broadcasts : []);
    } catch {
      toast.error("Failed to load broadcasts");
      setBroadcasts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBroadcasts();
  }, []);

  const createBroadcast = async () => {
    const trimmed = message.trim();
    if (trimmed.length < 3) {
      toast.error("Message must be at least 3 characters");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/admin/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: trimmed }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create broadcast");
      setMessage("");
      toast.success("Broadcast created");
      await fetchBroadcasts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create broadcast");
    } finally {
      setSubmitting(false);
    }
  };

  const updateBroadcast = async (id: string, action: "start" | "stop") => {
    try {
      setBusyId(id);
      const res = await fetch(`/api/admin/broadcasts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update broadcast");
      toast.success(action === "stop" ? "Broadcast stopped" : "Broadcast resumed");
      await fetchBroadcasts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update broadcast");
    } finally {
      setBusyId(null);
    }
  };

  const deleteBroadcast = async (id: string) => {
    try {
      setBusyId(id);
      const res = await fetch(`/api/admin/broadcasts/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete broadcast");
      toast.success("Broadcast deleted");
      await fetchBroadcasts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete broadcast");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={{ fontFamily: font }}>
      <div
        style={{
          background: T.bgCard,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <Megaphone size={18} color={T.blue} />
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.textPrimary }}>
            New Broadcast
          </h3>
        </div>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: T.textSecondary, lineHeight: 1.6 }}>
          Send a dismissible banner to all users. Stopped messages stay in history and can be resumed or deleted.
        </p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type the announcement users should see..."
          rows={4}
          style={{
            width: "100%",
            padding: 14,
            borderRadius: 12,
            background: T.bgElevated,
            border: `1px solid ${T.border}`,
            color: T.textPrimary,
            fontSize: 14,
            resize: "vertical",
            boxSizing: "border-box",
            fontFamily: font,
            marginBottom: 12,
          }}
        />
        <button
          onClick={createBroadcast}
          disabled={submitting}
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            background: T.blue,
            border: "none",
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            cursor: submitting ? "not-allowed" : "pointer",
            opacity: submitting ? 0.7 : 1,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontFamily: font,
          }}
        >
          {submitting && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
          {submitting ? "Sending..." : "Send Broadcast"}
        </button>
      </div>

      <div
        style={{
          background: T.bgCard,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          padding: 20,
        }}
      >
        <h3 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700, color: T.textPrimary }}>
          Current and Past Messages
        </h3>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "30px 0" }}>
            <Loader2 size={28} style={{ color: T.blue, animation: "spin 1s linear infinite" }} />
          </div>
        ) : broadcasts.length === 0 ? (
          <div style={{ color: T.textSecondary, textAlign: "center", padding: "24px 0" }}>
            No broadcasts yet
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {broadcasts.map((broadcast) => {
              const isBusy = busyId === broadcast.id;
              return (
                <div
                  key={broadcast.id}
                  style={{
                    background: T.bgElevated,
                    border: `1px solid ${T.border}`,
                    borderRadius: 14,
                    padding: 16,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: 999,
                            background: broadcast.isActive ? `${T.green}20` : `${T.amber}20`,
                            color: broadcast.isActive ? T.green : T.amber,
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {broadcast.isActive ? "Active" : "Stopped"}
                        </span>
                        <span style={{ color: T.textMuted, fontSize: 12 }}>
                          Created {new Date(broadcast.createdAt).toLocaleString()}
                        </span>
                        <span style={{ color: T.textMuted, fontSize: 12 }}>
                          Dismissed {broadcast.dismissCount} times
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: 14, color: T.textPrimary, lineHeight: 1.7 }}>
                        {broadcast.message}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <button
                        onClick={() =>
                          updateBroadcast(broadcast.id, broadcast.isActive ? "stop" : "start")
                        }
                        disabled={isBusy}
                        style={{
                          padding: "10px 12px",
                          borderRadius: 10,
                          background: broadcast.isActive ? `${T.amber}20` : `${T.green}20`,
                          border: `1px solid ${broadcast.isActive ? T.amber : T.green}`,
                          color: broadcast.isActive ? T.amber : T.green,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: isBusy ? "not-allowed" : "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontFamily: font,
                        }}
                      >
                        {broadcast.isActive ? <PauseCircle size={14} /> : <PlayCircle size={14} />}
                        {broadcast.isActive ? "Stop" : "Start"}
                      </button>
                      <button
                        onClick={() => deleteBroadcast(broadcast.id)}
                        disabled={isBusy}
                        style={{
                          padding: "10px 12px",
                          borderRadius: 10,
                          background: `${T.red}20`,
                          border: `1px solid ${T.red}`,
                          color: T.red,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: isBusy ? "not-allowed" : "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontFamily: font,
                        }}
                      >
                        {isBusy ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={14} />}
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
