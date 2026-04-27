"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, SquarePen, Trash2 } from "lucide-react";
import { toast } from "sonner";

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

const emptyForm = {
  title: "",
  message: "",
  severity: "INFO",
  audience: "all",
  network: "",
  startsAt: "",
  endsAt: "",
  isActive: true,
};

export default function AdminNoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [featureUnavailable, setFeatureUnavailable] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Notice | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchNotices = async () => {
    const res = await fetch("/api/admin/notices", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok || !data.success) {
      toast.error(data.error || "Ahh, sorry, broadcasts could not load right now.");
      return;
    }
    setFeatureUnavailable(Boolean(data.featureUnavailable));
    setNotices(data.data || []);
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (notice: Notice) => {
    setEditing(notice);
    setForm({
      title: notice.title,
      message: notice.message,
      severity: notice.severity,
      audience: notice.audience,
      network: notice.network || "",
      startsAt: notice.startsAt ? notice.startsAt.slice(0, 16) : "",
      endsAt: notice.endsAt ? notice.endsAt.slice(0, 16) : "",
      isActive: notice.isActive,
    });
    setOpen(true);
  };

  const submit = async () => {
    const method = editing ? "PATCH" : "POST";
    const url = editing ? `/api/admin/notices/${editing.id}` : "/api/admin/notices";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        network: form.network || null,
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
      }),
    });
    const payload = await res.json();

    if (!res.ok || !payload.success) {
      toast.error(payload.error || "Ahh, sorry, that broadcast could not be saved right now.");
      return;
    }

    toast.success(editing ? "Broadcast updated." : "Broadcast created.");
    setOpen(false);
    setEditing(null);
    setForm(emptyForm);
    fetchNotices();
  };

  const deleteNotice = async (notice: Notice) => {
    if (!confirm(`Delete ${notice.title || "this broadcast"}?`)) return;
    const res = await fetch(`/api/admin/notices/${notice.id}`, { method: "DELETE" });
    const payload = await res.json();
    if (!res.ok || !payload.success) {
      toast.error(payload.error || "Ahh, sorry, that broadcast could not be removed right now.");
      return;
    }
    toast.success("Broadcast deleted.");
    fetchNotices();
  };

  const toggleNotice = async (notice: Notice) => {
    const res = await fetch(`/api/admin/notices/${notice.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !notice.isActive }),
    });
    const payload = await res.json();
    if (!res.ok || !payload.success) {
      toast.error(payload.error || "Ahh, sorry, that broadcast could not be updated right now.");
      return;
    }
    fetchNotices();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Broadcasts</h1>
          <p className="text-sm text-slate-500">Create smart banners that users can see and dismiss inside the app.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Broadcast
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit broadcast" : "Create broadcast"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div>
                <Label>Message</Label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="mt-2 min-h-28 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <Label>Severity</Label>
                <select
                  value={form.severity}
                  onChange={(e) => setForm({ ...form, severity: e.target.value as Notice["severity"] })}
                  className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  {["INFO", "WARNING", "SUCCESS", "ERROR", "PROMO"].map((severity) => (
                    <option key={severity} value={severity}>{severity}</option>
                  ))}
                </select>
              </div>
              <div><Label>Audience</Label><Input value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} /></div>
              <div><Label>Network</Label><Input value={form.network} onChange={(e) => setForm({ ...form, network: e.target.value })} placeholder="Optional: MTN" /></div>
              <div><Label>Starts At</Label><Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></div>
              <div><Label>Ends At</Label><Input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} /></div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                Active
              </label>
              <Button onClick={submit} className="w-full">{editing ? "Save changes" : "Create broadcast"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {featureUnavailable ? (
          <Card className="p-5">
            <p className="text-sm text-slate-600">
              Broadcast storage is not available in this database yet. Apply the service notice migration, then this tab will become fully active.
            </p>
          </Card>
        ) : null}
        {notices.map((notice) => (
          <Card key={notice.id} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900">{notice.title}</h3>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${notice.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {notice.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-sm text-slate-600">{notice.message}</p>
                <p className="text-xs text-slate-500">
                  {notice.severity} • {notice.audience}{notice.network ? ` • ${notice.network}` : ""}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => toggleNotice(notice)}>
                  {notice.isActive ? "Disable" : "Enable"}
                </Button>
                <Button variant="outline" size="icon" onClick={() => openEdit(notice)}>
                  <SquarePen className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => deleteNotice(notice)}>
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
