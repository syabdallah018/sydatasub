"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, SquarePen, Trash2 } from "lucide-react";
import { toast } from "sonner";

type RewardType = "SIGNUP_BONUS" | "FIRST_DEPOSIT_2K" | "DEPOSIT_10K_UPGRADE" | "SALES_50GB_WEEKLY" | "SALES_100GB_WEEKLY";

type RewardItem = {
  id: string;
  type: RewardType;
  title: string;
  description: string;
  amount: number;
  isActive: boolean;
};

const REWARD_OPTIONS: { value: RewardType; label: string; rule: string }[] = [
  { value: "SIGNUP_BONUS", label: "Signup reward N100", rule: "One-time account creation reward" },
  { value: "FIRST_DEPOSIT_2K", label: "First deposit N2,000-N9,999", rule: "One-time deposit reward" },
  { value: "DEPOSIT_10K_UPGRADE", label: "First deposit N10,000+", rule: "One-time premium deposit reward" },
  { value: "SALES_50GB_WEEKLY", label: "50GB sales in 7 days", rule: "One-time sales milestone reward" },
  { value: "SALES_100GB_WEEKLY", label: "100GB sales in 7 days", rule: "One-time sales milestone reward" },
];

const emptyForm = {
  type: "FIRST_DEPOSIT_2K" as RewardType,
  title: "",
  description: "",
  amount: 200,
  isActive: true,
};

export default function AdminRewardsPage() {
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [supportedTypes, setSupportedTypes] = useState<RewardType[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RewardItem | null>(null);
  const [form, setForm] = useState(emptyForm);

  const usedTypes = useMemo(() => new Set(rewards.map((reward) => reward.type)), [rewards]);
  const availableOptions = REWARD_OPTIONS.filter((option) => supportedTypes.length === 0 || supportedTypes.includes(option.value));

  const fetchRewards = async () => {
    const res = await fetch("/api/admin/rewards", { cache: "no-store" });
    const payload = await res.json();
    if (!res.ok || !payload.success) {
      toast.error(payload.error || "Ahh, sorry, rewards could not load right now.");
      return;
    }
    setSupportedTypes(Array.isArray(payload.supportedTypes) ? payload.supportedTypes : []);
    setRewards(payload.data || []);
  };

  useEffect(() => {
    fetchRewards();
  }, []);

  const openCreate = () => {
    const nextType = availableOptions.find((option) => !usedTypes.has(option.value))?.value || "FIRST_DEPOSIT_2K";
    setEditing(null);
    setForm({ ...emptyForm, type: nextType });
    setOpen(true);
  };

  const openEdit = (reward: RewardItem) => {
    setEditing(reward);
    setForm({
      type: reward.type,
      title: reward.title,
      description: reward.description,
      amount: reward.amount,
      isActive: reward.isActive,
    });
    setOpen(true);
  };

  const submit = async () => {
    const method = editing ? "PATCH" : "POST";
    const url = editing ? `/api/admin/rewards/${editing.id}` : "/api/admin/rewards";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = await res.json();

    if (!res.ok || !payload.success) {
      toast.error(payload.error || "Ahh, sorry, that reward could not be saved right now.");
      return;
    }

    toast.success(editing ? "Reward updated." : "Reward created.");
    setOpen(false);
    setEditing(null);
    setForm(emptyForm);
    fetchRewards();
  };

  const removeReward = async (reward: RewardItem) => {
    if (!confirm(`Delete ${reward.title}?`)) return;
    const res = await fetch(`/api/admin/rewards/${reward.id}`, { method: "DELETE" });
    const payload = await res.json();
    if (!res.ok || !payload.success) {
      toast.error(payload.error || "Ahh, sorry, that reward could not be removed right now.");
      return;
    }
    toast.success("Reward deleted.");
    fetchRewards();
  };

  const toggleReward = async (reward: RewardItem) => {
    const res = await fetch(`/api/admin/rewards/${reward.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !reward.isActive }),
    });
    const payload = await res.json();
    if (!res.ok || !payload.success) {
      toast.error(payload.error || "Ahh, sorry, that reward could not be updated right now.");
      return;
    }
    fetchRewards();
  };

  const createDisabled = !editing && availableOptions.every((option) => usedTypes.has(option.value));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Rewards</h1>
          <p className="text-sm text-slate-500">Manage one-time reward rules, messaging, and payout amounts.</p>
        </div>
        <Button onClick={openCreate} disabled={createDisabled}>
          <Plus className="mr-2 h-4 w-4" />
          New Reward
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit reward" : "Create reward"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {!editing ? (
                <div>
                  <Label>Reward Type</Label>
                  <select
                    value={form.type}
                    onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as RewardType }))}
                    className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    {availableOptions.filter((option) => !usedTypes.has(option.value) || option.value === form.type).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div>
                <Label>Title</Label>
                <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
              </div>
              <div>
                <Label>Description</Label>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  className="mt-2 min-h-28 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <Label>Amount (Naira)</Label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(event) => setForm((current) => ({ ...current, amount: Number(event.target.value || 0) }))}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
                />
                Active
              </label>
              <Button onClick={submit} className="w-full">
                {editing ? "Save changes" : "Create reward"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {rewards.map((reward) => {
          const rule = REWARD_OPTIONS.find((option) => option.value === reward.type)?.rule || reward.type;
          return (
            <Card key={reward.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-900">{reward.title}</h2>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${reward.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {reward.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{reward.description}</p>
                  <p className="text-xs uppercase tracking-wide text-slate-400">{rule}</p>
                  <p className="text-sm font-medium text-slate-900">Reward: N{reward.amount.toLocaleString()}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => toggleReward(reward)}>
                    {reward.isActive ? "Disable" : "Enable"}
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => openEdit(reward)}>
                    <SquarePen className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => removeReward(reward)}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
