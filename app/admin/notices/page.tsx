"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";

interface Notice {
  id: string;
  title: string;
  message: string;
  severity: "INFO" | "WARNING" | "SUCCESS" | "ERROR" | "PROMO";
  audience: string;
  network: string | null;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
}

export default function AdminNoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    message: "",
    severity: "INFO",
    audience: "all",
    network: "",
    startsAt: "",
    endsAt: "",
    isActive: true,
  });

  const adminPassword = typeof window !== "undefined" ? sessionStorage.getItem("adminPassword") || "" : "";

  const fetchNotices = async () => {
    const res = await fetch("/api/admin/notices", {
      headers: { "X-Admin-Password": adminPassword },
    });
    const data = await res.json();
    setNotices(data.data || []);
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const createNotice = async () => {
    await fetch("/api/admin/notices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Password": adminPassword,
      },
      body: JSON.stringify({
        ...form,
        network: form.network || null,
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
      }),
    });
    setOpen(false);
    setForm({
      title: "",
      message: "",
      severity: "INFO",
      audience: "all",
      network: "",
      startsAt: "",
      endsAt: "",
      isActive: true,
    });
    fetchNotices();
  };

  const deleteNotice = async (id: string) => {
    await fetch(`/api/admin/notices/${id}`, {
      method: "DELETE",
      headers: { "X-Admin-Password": adminPassword },
    });
    fetchNotices();
  };

  const toggleNotice = async (notice: Notice) => {
    await fetch(`/api/admin/notices/${notice.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Password": adminPassword,
      },
      body: JSON.stringify({ isActive: !notice.isActive }),
    });
    fetchNotices();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Service Notices</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger>
            <Button><Plus className="w-4 h-4 mr-2" />New Notice</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Notice</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Message</Label><Input value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
              <div><Label>Severity</Label><Input value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value as any })} /></div>
              <div><Label>Audience</Label><Input value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} /></div>
              <div><Label>Network</Label><Input value={form.network} onChange={(e) => setForm({ ...form, network: e.target.value })} placeholder="Optional: MTN" /></div>
              <div><Label>Starts At</Label><Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></div>
              <div><Label>Ends At</Label><Input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} /></div>
              <Button onClick={createNotice} className="w-full">Create Notice</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {notices.map((notice) => (
          <Card key={notice.id} className="p-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold">{notice.title}</h3>
              <p className="text-sm text-slate-600">{notice.message}</p>
              <p className="text-xs text-slate-500 mt-2">{notice.severity} • {notice.audience}{notice.network ? ` • ${notice.network}` : ""}</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => toggleNotice(notice)} className={`px-3 py-1 rounded text-sm ${notice.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                {notice.isActive ? "Active" : "Inactive"}
              </button>
              <Button variant="ghost" size="sm" onClick={() => deleteNotice(notice.id)}>
                <Trash2 className="w-4 h-4 text-red-600" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
