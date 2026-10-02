"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PartyPopper,
  Plus,
  SquarePen,
  Trash2,
  Sparkles,
  CheckCircle2,
  XCircle,
  Share2,
  Calendar,
  Wand2,
  Power,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

export interface Celebration {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  tag: string | null;
  icon: string;
  theme: "NIGERIA_GREEN" | "GOLD" | "BLUE" | "PURPLE" | "RED";
  accentColor: string | null;
  message: string;
  stat1Top: string | null;
  stat1Bottom: string | null;
  stat2Top: string | null;
  stat2Bottom: string | null;
  stat3Top: string | null;
  stat3Bottom: string | null;
  actionText: string | null;
  shareText: string | null;
  dismissText: string | null;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  priority: number;
  createdAt: string;
}

const TEMPLATES = [
  {
    name: "Nigeria 66th Independence",
    icon: "🇳🇬",
    theme: "NIGERIA_GREEN" as const,
    data: {
      title: "Happy 66th Independence Nigeria! 🇳🇬",
      subtitle: "Celebrating our Great Nation • Tap to celebrate",
      badge: "🇳🇬 66TH INDEPENDENCE ANNIVERSARY",
      tag: "OFFICIAL ANNIVERSARY",
      icon: "🇳🇬",
      theme: "NIGERIA_GREEN" as const,
      accentColor: "#10B981",
      message:
        "Happy 66th Independence Day, Nigeria! 🇳🇬 SY Data Sub proudly celebrates the resilience, unity, and greatness of our nation. Thank you for connecting with us as we empower digital lifestyles and businesses across Nigeria with fast, reliable, and affordable telecom services.",
      stat1Top: "🇳🇬 66 Years",
      stat1Bottom: "Resilient & Strong",
      stat2Top: "⚡ 99.9%",
      stat2Bottom: "Nationwide Uptime",
      stat3Top: "💎 Wholesale",
      stat3Bottom: "Cheapest Rates",
      actionText: "Share Independence Spirit 🇳🇬",
      shareText:
        "🎉 Celebrating Nigeria's 66th Independence Day! 🇳🇬\n\nEmpower your hustle with Nigeria's fastest & cheapest data bundles, airtime, and bill payments on SY Data Sub.\n\nDownload the app & celebrate with us: https://sydatasub.com",
      dismissText: "Keep Celebrating 🚀",
      isActive: true,
      priority: 100,
    },
  },
  {
    name: "Community Milestone (500 Members)",
    icon: "🏆",
    theme: "GOLD" as const,
    data: {
      title: "500+ Active Members Milestone! 🏆",
      subtitle: "Celebrating our community • Tap to celebrate",
      badge: "🎉 500 USERS MILESTONE",
      tag: "COMMUNITY MILESTONE",
      icon: "🏆",
      theme: "GOLD" as const,
      accentColor: "#F59E0B",
      message:
        "Thank you for being part of our journey! Together we have delivered thousands of instant data bundles and seamless recharges across Nigeria.",
      stat1Top: "⚡ Instant",
      stat1Bottom: "99.9% Uptime",
      stat2Top: "💎 Wholesale",
      stat2Bottom: "Best Rates",
      stat3Top: "🔒 Secured",
      stat3Bottom: "Bio-Protection",
      actionText: "Share with Friends & Community",
      shareText:
        "🎉 Celebrating 500+ Active Members on SY Data Sub! 🚀\n\nEnjoy instant wholesale data bundles, airtime, and automated bill payments at Nigeria's cheapest rates.\n\nDownload the app today: https://sydatasub.com",
      dismissText: "Keep Celebrating 🚀",
      isActive: true,
      priority: 50,
    },
  },
  {
    name: "Eid Mubarak Celebration",
    icon: "🌙",
    theme: "NIGERIA_GREEN" as const,
    data: {
      title: "Eid Mubarak to You & Family! 🌙",
      subtitle: "Wishing you peace, joy and prosperity • Tap to celebrate",
      badge: "✨ EID MUBARAK SPECIAL",
      tag: "FESTIVE CELEBRATION",
      icon: "🌙",
      theme: "NIGERIA_GREEN" as const,
      accentColor: "#10B981",
      message:
        "Warmest Eid greetings from all of us at SY Data Sub! May this blessed season bring endless peace, joy, good health, and success to you and your loved ones.",
      stat1Top: "🌙 Blessed",
      stat1Bottom: "Peace & Harmony",
      stat2Top: "⚡ 24/7",
      stat2Bottom: "Instant Topups",
      stat3Top: "🎁 Zero Delay",
      stat3Bottom: "Holiday Reliable",
      actionText: "Share Eid Greetings",
      shareText:
        "🌙 Eid Mubarak! Warm wishes of peace and prosperity from SY Data Sub. Stay seamlessly connected with affordable data & airtime: https://sydatasub.com",
      dismissText: "Eid Mubarak 🌟",
      isActive: true,
      priority: 80,
    },
  },
  {
    name: "Christmas & New Year",
    icon: "🎄",
    theme: "RED" as const,
    data: {
      title: "Merry Christmas & Happy New Year! 🎄",
      subtitle: "Season's greetings & thank you • Tap to celebrate",
      badge: "🎁 HOLIDAY CELEBRATION",
      tag: "SEASON OF GIVING",
      icon: "🎄",
      theme: "RED" as const,
      accentColor: "#EF4444",
      message:
        "Merry Christmas and a joyful Happy New Year from the entire SY Data Sub family! Thank you for trusting us with your data and bill payments throughout the year.",
      stat1Top: "🎄 Festive",
      stat1Bottom: "Holiday Cheer",
      stat2Top: "⚡ 100%",
      stat2Bottom: "Automated",
      stat3Top: "🎉 New Year",
      stat3Bottom: "Bigger Discounts",
      actionText: "Share Season's Greetings",
      shareText:
        "🎄 Merry Christmas and Happy New Year! 🎁 Recharge fast and stay connected with family on SY Data Sub: https://sydatasub.com",
      dismissText: "Season's Greetings 🚀",
      isActive: true,
      priority: 90,
    },
  },
];

const emptyForm = {
  title: "",
  subtitle: "",
  badge: "",
  tag: "OFFICIAL CELEBRATION",
  icon: "🇳🇬",
  theme: "NIGERIA_GREEN" as "NIGERIA_GREEN" | "GOLD" | "BLUE" | "PURPLE" | "RED",
  accentColor: "#10B981",
  message: "",
  stat1Top: "",
  stat1Bottom: "",
  stat2Top: "",
  stat2Bottom: "",
  stat3Top: "",
  stat3Bottom: "",
  actionText: "Share with Friends & Community",
  shareText: "",
  dismissText: "Keep Celebrating 🚀",
  isActive: true,
  startsAt: "",
  endsAt: "",
  priority: 0,
};

export default function AdminCelebrationsPage() {
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Celebration | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchCelebrations = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/celebrations", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || "Failed to load celebrations");
        return;
      }
      setCelebrations(data.data || []);
    } catch {
      toast.error("Network error while loading celebrations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCelebrations();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const applyTemplate = (templateData: Partial<typeof emptyForm>) => {
    setForm({
      ...emptyForm,
      ...templateData,
      startsAt: "",
      endsAt: "",
    });
    toast.success("Template preset applied!");
  };

  const openEdit = (item: Celebration) => {
    setEditing(item);
    setForm({
      title: item.title,
      subtitle: item.subtitle,
      badge: item.badge,
      tag: item.tag || "OFFICIAL CELEBRATION",
      icon: item.icon,
      theme: item.theme,
      accentColor: item.accentColor || "#10B981",
      message: item.message,
      stat1Top: item.stat1Top || "",
      stat1Bottom: item.stat1Bottom || "",
      stat2Top: item.stat2Top || "",
      stat2Bottom: item.stat2Bottom || "",
      stat3Top: item.stat3Top || "",
      stat3Bottom: item.stat3Bottom || "",
      actionText: item.actionText || "Share with Friends & Community",
      shareText: item.shareText || "",
      dismissText: item.dismissText || "Keep Celebrating 🚀",
      isActive: item.isActive,
      startsAt: item.startsAt ? item.startsAt.slice(0, 16) : "",
      endsAt: item.endsAt ? item.endsAt.slice(0, 16) : "",
      priority: item.priority || 0,
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!form.badge.trim()) {
      toast.error("Badge text is required");
      return;
    }
    if (!form.message.trim()) {
      toast.error("Message is required");
      return;
    }

    const method = editing ? "PATCH" : "POST";
    const url = editing ? `/api/admin/celebrations/${editing.id}` : "/api/admin/celebrations";

    const payload = {
      ...form,
      startsAt: form.startsAt || null,
      endsAt: form.endsAt || null,
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.error || "Failed to save celebration");
        return;
      }

      toast.success(editing ? "Celebration updated successfully!" : "Celebration created successfully!");
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      fetchCelebrations();
    } catch {
      toast.error("Failed to connect to server");
    }
  };

  const toggleCelebration = async (item: Celebration) => {
    const newStatus = !item.isActive;
    try {
      // Optimistic update
      setCelebrations((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, isActive: newStatus } : c))
      );

      const res = await fetch(`/api/admin/celebrations/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.error || "Failed to toggle celebration");
        fetchCelebrations();
        return;
      }

      toast.success(
        newStatus
          ? `"${item.title}" is now ACTIVE on mobile & web!`
          : `"${item.title}" is now DISABLED.`
      );
    } catch {
      toast.error("Network error toggling status");
      fetchCelebrations();
    }
  };

  const deleteCelebration = async (item: Celebration) => {
    if (!confirm(`Are you sure you want to delete "${item.title}"?`)) return;

    try {
      const res = await fetch(`/api/admin/celebrations/${item.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.error || "Failed to delete celebration");
        return;
      }

      toast.success("Celebration deleted.");
      fetchCelebrations();
    } catch {
      toast.error("Network error deleting celebration");
    }
  };

  const activeCelebration = celebrations.find((c) => c.isActive);

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <PartyPopper className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Celebrations & Milestones
              </h1>
              <p className="text-sm text-slate-500">
                Configure national holidays, milestone celebrations, and toggle them on/off in real-time.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={fetchCelebrations}
            variant="outline"
            className="border-slate-300 text-slate-700"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button
            onClick={openCreate}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Celebration
          </Button>
        </div>
      </div>

      {/* Metrics & Current Live Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="p-5 border-slate-200/80 bg-white shadow-sm flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${
              activeCelebration
                ? "bg-emerald-50 border border-emerald-200 text-emerald-600"
                : "bg-slate-100 text-slate-400"
            }`}
          >
            {activeCelebration?.icon || "🎉"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Live App Status
            </p>
            <p className="text-base font-extrabold text-slate-900 truncate">
              {activeCelebration ? activeCelebration.title : "No Celebration Active"}
            </p>
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full mt-1 ${
                activeCelebration
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {activeCelebration ? (
                <>
                  <CheckCircle2 size={12} /> Active on Mobile & Web
                </>
              ) : (
                <>
                  <XCircle size={12} /> Hidden from App
                </>
              )}
            </span>
          </div>
        </Card>

        <Card className="p-5 border-slate-200/80 bg-white shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Total In Catalog
          </p>
          <p className="text-2xl font-black text-slate-900 mt-1">{celebrations.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Configured celebrations ready to toggle
          </p>
        </Card>

        <Card className="p-5 border-slate-200/80 bg-white shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Quick Action
          </p>
          <p className="text-sm font-semibold text-slate-700 mt-1">
            Toggle off anytime to completely remove the card from users&apos; home screens.
          </p>
        </Card>
      </div>

      {/* Celebrations List */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          Celebrations Catalog ({celebrations.length})
        </h2>

        {loading ? (
          <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            Loading celebrations...
          </div>
        ) : celebrations.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
            <p className="text-base font-bold text-slate-700">No celebrations configured</p>
            <p className="text-xs text-slate-500">
              Click &quot;New Celebration&quot; to add Nigeria&apos;s 66th Independence Day or custom milestones.
            </p>
            <Button onClick={openCreate} className="bg-emerald-600 text-white font-bold">
              <Plus className="mr-2 h-4 w-4" /> Create First Celebration
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {celebrations.map((item) => {
              const isNigeria = item.theme === "NIGERIA_GREEN";
              const isGold = item.theme === "GOLD";
              const isRed = item.theme === "RED";

              const borderClass = item.isActive
                ? isNigeria
                  ? "border-emerald-500/60 ring-2 ring-emerald-500/10"
                  : isGold
                  ? "border-amber-500/60 ring-2 ring-amber-500/10"
                  : "border-blue-500/60 ring-2 ring-blue-500/10"
                : "border-slate-200 opacity-80";

              const badgeBg = isNigeria
                ? "bg-emerald-600 text-white"
                : isGold
                ? "bg-amber-500 text-slate-950 font-black"
                : isRed
                ? "bg-red-600 text-white"
                : "bg-blue-600 text-white";

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl border ${borderClass} p-5 shadow-sm transition-all hover:shadow-md relative overflow-hidden flex flex-col justify-between`}
                >
                  {/* Top Bar inside card */}
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm ${
                            isNigeria
                              ? "bg-gradient-to-br from-emerald-500 to-teal-800 text-white"
                              : isGold
                              ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white"
                              : "bg-gradient-to-br from-blue-500 to-indigo-700 text-white"
                          }`}
                        >
                          {item.icon}
                        </div>
                        <div>
                          <span
                            className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full inline-block ${badgeBg}`}
                          >
                            {item.badge}
                          </span>
                          <h3 className="text-base font-extrabold text-slate-900 mt-1">
                            {item.title}
                          </h3>
                        </div>
                      </div>

                      {/* Active Status Badge */}
                      <button
                        onClick={() => toggleCelebration(item)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition shadow-sm ${
                          item.isActive
                            ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                            : "bg-slate-200 hover:bg-slate-300 text-slate-600"
                        }`}
                        title="Click to toggle live visibility"
                      >
                        <Power size={13} />
                        {item.isActive ? "ACTIVE" : "INACTIVE"}
                      </button>
                    </div>

                    {/* Subtitle & Message Preview */}
                    <p className="text-xs font-medium text-slate-500 mt-2.5">
                      {item.subtitle}
                    </p>
                    <p className="text-xs text-slate-600 mt-2 line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                      &quot;{item.message}&quot;
                    </p>

                    {/* 3 Stats preview */}
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-center">
                      <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                        <p className="text-[11px] font-black text-slate-800 truncate">
                          {item.stat1Top || "Stat 1"}
                        </p>
                        <p className="text-[9px] text-slate-500 truncate">
                          {item.stat1Bottom || "Highlight"}
                        </p>
                      </div>
                      <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                        <p className="text-[11px] font-black text-slate-800 truncate">
                          {item.stat2Top || "Stat 2"}
                        </p>
                        <p className="text-[9px] text-slate-500 truncate">
                          {item.stat2Bottom || "Highlight"}
                        </p>
                      </div>
                      <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                        <p className="text-[11px] font-black text-slate-800 truncate">
                          {item.stat3Top || "Stat 3"}
                        </p>
                        <p className="text-[9px] text-slate-500 truncate">
                          {item.stat3Bottom || "Highlight"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Controls */}
                  <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100">
                    <span className="text-[11px] text-slate-400 font-medium">
                      Theme:{" "}
                      <span className="font-semibold text-slate-600">{item.theme}</span>
                    </span>

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => openEdit(item)}
                        variant="outline"
                        size="sm"
                        className="text-xs font-semibold border-slate-200"
                      >
                        <SquarePen className="mr-1.5 h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        onClick={() => deleteCelebration(item)}
                        variant="ghost"
                        size="sm"
                        className="text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Modal Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <PartyPopper className="h-5 w-5 text-emerald-600" />
              {editing ? "Edit Celebration" : "Create New Celebration"}
            </DialogTitle>
          </DialogHeader>

          {/* Quick Presets (Only in Create Mode) */}
          {!editing && (
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Wand2 size={13} className="text-indigo-600" />
                Quick 1-Click Templates:
              </p>
              <div className="flex flex-wrap gap-2">
                {TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.name}
                    type="button"
                    onClick={() => applyTemplate(tmpl.data)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 hover:border-emerald-500 hover:text-emerald-700 text-slate-700 transition shadow-xs"
                  >
                    <span>{tmpl.icon}</span>
                    <span>{tmpl.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4 pt-2">
            {/* Title & Subtitle */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700">Headline Title</Label>
                <Input
                  placeholder="e.g. Happy 66th Independence Nigeria! 🇳🇬"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-slate-700">Home Card Subtitle</Label>
                <Input
                  placeholder="e.g. Celebrating our Great Nation • Tap to celebrate"
                  value={form.subtitle}
                  onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Badge, Tag & Icon */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700">Badge Label</Label>
                <Input
                  placeholder="e.g. 🇳🇬 66TH INDEPENDENCE"
                  value={form.badge}
                  onChange={(e) => setForm({ ...form, badge: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-slate-700">Tag Label</Label>
                <Input
                  placeholder="e.g. OFFICIAL ANNIVERSARY"
                  value={form.tag}
                  onChange={(e) => setForm({ ...form, tag: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-slate-700">Hero Icon / Emoji</Label>
                <Input
                  placeholder="e.g. 🇳🇬 or 🏆"
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Theme & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700">Color Theme</Label>
                <select
                  value={form.theme}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      theme: e.target.value as typeof form.theme,
                    })
                  }
                  className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold mt-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="NIGERIA_GREEN">🇳🇬 Nigeria Green & White</option>
                  <option value="GOLD">🏆 Golden Milestone</option>
                  <option value="BLUE">⚡ Electric Blue</option>
                  <option value="PURPLE">👑 Royal Purple</option>
                  <option value="RED">🎁 Festive Holiday Red</option>
                </select>
              </div>
              <div>
                <Label className="text-xs font-bold text-slate-700">Active Status</Label>
                <div className="flex items-center gap-3 mt-1 h-9">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    />
                    Live & Active in App
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Appreciation Message */}
            <div>
              <Label className="text-xs font-bold text-slate-700">
                Modal Appreciation Message (Full Story)
              </Label>
              <textarea
                rows={3}
                placeholder="Full message displayed inside the popup celebration modal..."
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full rounded-md border border-slate-300 p-2.5 text-xs text-slate-800 mt-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Highlight Stat Pills */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">
                3 Highlight Stats (Pills in modal)
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Input
                    placeholder="Stat 1 Top"
                    value={form.stat1Top}
                    onChange={(e) => setForm({ ...form, stat1Top: e.target.value })}
                    className="text-xs"
                  />
                  <Input
                    placeholder="Stat 1 Bottom"
                    value={form.stat1Bottom}
                    onChange={(e) => setForm({ ...form, stat1Bottom: e.target.value })}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Input
                    placeholder="Stat 2 Top"
                    value={form.stat2Top}
                    onChange={(e) => setForm({ ...form, stat2Top: e.target.value })}
                    className="text-xs"
                  />
                  <Input
                    placeholder="Stat 2 Bottom"
                    value={form.stat2Bottom}
                    onChange={(e) => setForm({ ...form, stat2Bottom: e.target.value })}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Input
                    placeholder="Stat 3 Top"
                    value={form.stat3Top}
                    onChange={(e) => setForm({ ...form, stat3Top: e.target.value })}
                    className="text-xs"
                  />
                  <Input
                    placeholder="Stat 3 Bottom"
                    value={form.stat3Bottom}
                    onChange={(e) => setForm({ ...form, stat3Bottom: e.target.value })}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Share & CTA Text */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700">CTA Button Text</Label>
                <Input
                  placeholder="e.g. Share Independence Spirit 🇳🇬"
                  value={form.actionText}
                  onChange={(e) => setForm({ ...form, actionText: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-slate-700">Dismiss Button Text</Label>
                <Input
                  placeholder="e.g. Keep Celebrating 🚀"
                  value={form.dismissText}
                  onChange={(e) => setForm({ ...form, dismissText: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700">Social Share Copy</Label>
              <textarea
                rows={2}
                placeholder="Text copied or shared to social networks when users tap Share..."
                value={form.shareText}
                onChange={(e) => setForm({ ...form, shareText: e.target.value })}
                className="w-full rounded-md border border-slate-300 p-2 text-xs text-slate-800 mt-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              {editing ? "Save Changes" : "Create Celebration"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
