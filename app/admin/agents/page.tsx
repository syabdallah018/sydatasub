"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

type AgentItem = {
  id: string;
  fullName: string;
  phone: string;
  tier: "user" | "agent";
  role: "USER" | "AGENT" | "ADMIN";
  agentRequestStatus: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
  weeklySalesGb: number;
  thresholdGb: number;
  isAtRisk: boolean;
};

export default function AdminAgentsPage() {
  const [items, setItems] = useState<AgentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [featureUnavailable, setFeatureUnavailable] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/agents", { cache: "no-store" });
    const payload = await res.json();
    if (!res.ok || !payload.success) {
      toast.error(payload.error || "Ahh, sorry, agent applications could not load right now.");
      setLoading(false);
      return;
    }
    setFeatureUnavailable(Boolean(payload.featureUnavailable));
    setItems(payload.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const updateStatus = async (
    userId: string,
    action: "APPROVE" | "REJECT" | "REVOKE" | "PENDING"
  ) => {
    const res = await fetch(`/api/admin/agents/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const payload = await res.json();
    if (!res.ok || !payload.success) {
      toast.error(payload.error || "Ahh, sorry, this update could not be completed.");
      return;
    }
    toast.success("Agent application updated.");
    fetchItems();
  };

  if (loading) {
    return <div className="py-10 text-sm text-slate-500">Loading agent applications...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Agent Applications</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review applications, approve agents, and monitor weekly 50GB sales compliance.
        </p>
      </div>

      {featureUnavailable ? (
        <Card className="p-5 text-sm text-slate-600">
          Agent applications are unavailable until the database migration is complete.
        </Card>
      ) : null}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Phone</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Tier</th>
                <th className="px-4 py-3 text-left font-semibold">Weekly Sales</th>
                <th className="px-4 py-3 text-left font-semibold">Risk</th>
                <th className="px-4 py-3 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium">{item.fullName}</td>
                  <td className="px-4 py-3">{item.phone}</td>
                  <td className="px-4 py-3">{item.agentRequestStatus}</td>
                  <td className="px-4 py-3">{item.tier}</td>
                  <td className="px-4 py-3">
                    {item.weeklySalesGb.toLocaleString()}GB / {item.thresholdGb}GB
                  </td>
                  <td className="px-4 py-3">
                    {item.isAtRisk ? (
                      <span className="text-rose-600 font-medium">At risk</span>
                    ) : (
                      <span className="text-emerald-600 font-medium">Healthy</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => updateStatus(item.id, "APPROVE")}>
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => updateStatus(item.id, "REJECT")}>
                        Reject
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => updateStatus(item.id, "REVOKE")}>
                        Revoke
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={7}>
                    No agent applications yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
