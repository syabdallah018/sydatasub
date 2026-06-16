"use client";

import { useState } from "react";
import { Send, Loader2, Info } from "lucide-react";
import { toast } from "sonner";

export default function AdminPushPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const handleSendPush = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !body.trim()) {
      toast.error("Please enter both a title and message body.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/admin/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, body }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(data.message || "Push notification broadcast dispatched successfully!");
        setTitle("");
        setBody("");
      } else {
        toast.error(data.error || "Failed to broadcast push notification.");
      }
    } catch (error) {
      console.error("[PUSH BROADCAST ERROR]", error);
      toast.error("An error occurred. Please check connection and try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Broadcast Push Notification</h1>
        <p className="text-slate-600">Send an instant push notification to all registered Android app users.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="bg-blue-50/50 p-4 border-b border-blue-100 flex items-start gap-3">
          <Info size={20} className="text-blue-600 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-800">
            <span className="font-semibold">Important Info:</span> This will send a native device push notification to all users who have logged in via the Android WebView app and generated an FCM token.
          </div>
        </div>

        <form onSubmit={handleSendPush} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Notification Title
            </label>
            <input
              type="text"
              placeholder="e.g. New Promo Active! 🚀"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={sending}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 transition"
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Notification Message (Body)
            </label>
            <textarea
              rows={4}
              placeholder="Enter the message you want users to see on their device screens..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={sending}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 transition"
              maxLength={500}
            />
          </div>

          <button
            type="submit"
            disabled={!title.trim() || !body.trim() || sending}
            className="w-full py-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold flex items-center justify-center gap-2 transition shadow-md hover:shadow-lg"
          >
            {sending ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Broadcasting Notification...
              </>
            ) : (
              <>
                <Send size={18} />
                Send Push Notification
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
