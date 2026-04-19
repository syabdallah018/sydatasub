"use client";

import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  network: string;
  sizeLabel: string;
  validity: string;
  price: number;
  user_price: number;
  agent_price: number;
  apiSource: string;
  externalPlanId: number;
  externalNetworkId: number;
  isActive: boolean;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    network: "MTN",
    sizeLabel: "",
    validity: "",
    user_price: 0,
    agent_price: 0,
    apiSource: "API_A",
    externalPlanId: 0,
    externalNetworkId: 0,
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch("/api/admin/plans");
      if (!response.ok) throw new Error("Failed to fetch plans");
      const data = await response.json();
      setPlans(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: "",
      network: "MTN",
      sizeLabel: "",
      validity: "",
      user_price: 0,
      agent_price: 0,
      apiSource: "API_A",
      externalPlanId: 0,
      externalNetworkId: 0,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (formData.agent_price > formData.user_price) {
        throw new Error("Agent price cannot exceed user price");
      }

      const method = editingId ? "PATCH" : "POST";
      const url = editingId ? `/api/admin/plans/${editingId}` : "/api/admin/plans";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Failed to save plan");
      }

      await fetchPlans();
      setOpenDialog(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleEdit = (plan: Plan) => {
    setFormData({
      name: plan.name,
      network: plan.network,
      sizeLabel: plan.sizeLabel,
      validity: plan.validity,
      user_price: plan.user_price,
      agent_price: plan.agent_price,
      apiSource: plan.apiSource,
      externalPlanId: plan.externalPlanId,
      externalNetworkId: plan.externalNetworkId,
    });
    setEditingId(plan.id);
    setOpenDialog(true);
  };

  const handleDelete = async (planId: string) => {
    if (!confirm("Are you sure you want to delete this plan?")) return;
    try {
      const response = await fetch(`/api/admin/plans/${planId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete plan");
      await fetchPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const handleToggleActive = async (plan: Plan) => {
    try {
      const response = await fetch(`/api/admin/plans/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !plan.isActive }),
      });
      if (!response.ok) throw new Error("Failed to toggle plan");
      await fetchPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading plans...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Data Plans</h1>
        <Dialog open={openDialog} onOpenChange={(open) => {
          setOpenDialog(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger>
            <Button onClick={() => setEditingId(null)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Plan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Plan" : "Add New Plan"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Network</Label>
                  <Select value={formData.network} onValueChange={(value) => setFormData({ ...formData, network: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MTN">MTN</SelectItem>
                      <SelectItem value="GLO">Glo</SelectItem>
                      <SelectItem value="AIRTEL">Airtel</SelectItem>
                      <SelectItem value="NINEMOBILE">9Mobile</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Size</Label>
                  <Input value={formData.sizeLabel} onChange={(e) => setFormData({ ...formData, sizeLabel: e.target.value })} placeholder="e.g., 1GB" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Validity</Label>
                  <Input value={formData.validity} onChange={(e) => setFormData({ ...formData, validity: e.target.value })} placeholder="e.g., Monthly" required />
                </div>
                <div>
                  <Label>User Price (N)</Label>
                  <Input type="number" value={formData.user_price} onChange={(e) => setFormData({ ...formData, user_price: parseFloat(e.target.value) || 0 })} required />
                </div>
              </div>
              <div>
                <Label>Agent Price (N)</Label>
                <Input type="number" value={formData.agent_price} onChange={(e) => setFormData({ ...formData, agent_price: parseFloat(e.target.value) || 0 })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>API Source</Label>
                  <Select value={formData.apiSource} onValueChange={(value) => setFormData({ ...formData, apiSource: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="API_A">SMEPlug</SelectItem>
                      <SelectItem value="API_B">Saiful</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>External Plan ID</Label>
                  <Input type="number" value={formData.externalPlanId} onChange={(e) => setFormData({ ...formData, externalPlanId: parseInt(e.target.value, 10) || 0 })} required />
                </div>
                <div>
                  <Label>External Network ID</Label>
                  <Input type="number" value={formData.externalNetworkId} onChange={(e) => setFormData({ ...formData, externalNetworkId: parseInt(e.target.value, 10) || 0 })} required />
                </div>
              </div>
              <Button type="submit" className="w-full">
                {editingId ? "Update" : "Create"} Plan
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Network</th>
                <th className="px-4 py-3 text-left font-semibold">Size</th>
                <th className="px-4 py-3 text-left font-semibold">Validity</th>
                <th className="px-4 py-3 text-left font-semibold">User Price</th>
                <th className="px-4 py-3 text-left font-semibold">Agent Price</th>
                <th className="px-4 py-3 text-left font-semibold">API</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{plan.name}</td>
                  <td className="px-4 py-3"><Badge variant="outline">{plan.network}</Badge></td>
                  <td className="px-4 py-3">{plan.sizeLabel}</td>
                  <td className="px-4 py-3">{plan.validity}</td>
                  <td className="px-4 py-3 font-semibold">N{plan.user_price}</td>
                  <td className="px-4 py-3 font-semibold">N{plan.agent_price}</td>
                  <td className="px-4 py-3"><Badge>{plan.apiSource}</Badge></td>
                  <td className="px-4 py-3">
                    <Badge className={plan.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                      {plan.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(plan)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleToggleActive(plan)}>
                      {plan.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(plan.id)}>
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
