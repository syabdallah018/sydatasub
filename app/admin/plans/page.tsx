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
  category: string;
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
    category: "SME",
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
      category: "SME",
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

      const url = editingId ? `/api/admin/plans/${editingId}` : "/api/admin/plans";
      const method = editingId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save plan");
      }

      fetchPlans();
      setOpenDialog(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleEdit = (plan: Plan) => {
    setEditingId(plan.id);
    setFormData({
      name: plan.name,
      network: plan.network,
      sizeLabel: plan.sizeLabel,
      validity: plan.validity,
      user_price: plan.user_price || plan.price,
      agent_price: plan.agent_price || plan.price,
      apiSource: plan.apiSource,
      category: plan.category || "SME",
      externalPlanId: plan.externalPlanId,
      externalNetworkId: plan.externalNetworkId,
    });
    setOpenDialog(true);
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/plans/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      });

      if (!response.ok) throw new Error("Failed to update plan");
      fetchPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this plan?")) return;

    try {
      const response = await fetch(`/api/admin/plans/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete plan");
      fetchPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Data Plans Management</h1>
        <Dialog open={openDialog} onOpenChange={(open) => { setOpenDialog(open); if (!open) resetForm(); }}>
          <DialogTrigger onClick={() => setOpenDialog(true)}>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Plan" : "Create New Plan"}</DialogTitle>
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
                      <SelectItem value="NINEMOBILE">9mobile</SelectItem>
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
                  <Label>Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SME">SME</SelectItem>
                      <SelectItem value="CG">CG</SelectItem>
                      <SelectItem value="GIFTING">Gifting</SelectItem>
                      <SelectItem value="PROMO">Promo</SelectItem>
                      <SelectItem value="AWOOF">Awoof</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>User Price (₦)</Label>
                  <Input type="number" value={formData.user_price} onChange={(e) => setFormData({ ...formData, user_price: parseFloat(e.target.value) || 0 })} required />
                </div>
                <div>
                  <Label>Agent Price (₦)</Label>
                  <Input type="number" value={formData.agent_price} onChange={(e) => setFormData({ ...formData, agent_price: parseFloat(e.target.value) || 0 })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>API Source</Label>
                  <Select value={formData.apiSource} onValueChange={(value) => setFormData({ ...formData, apiSource: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="API_A">SMEPlug</SelectItem>
                      <SelectItem value="API_B">Saiful</SelectItem>
                      <SelectItem value="API_C">Alrahuz</SelectItem>
                      <SelectItem value="API_D">Amysub</SelectItem>
                      <SelectItem value="API_E">DataBills</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>External Plan ID</Label>
                  <Input type="number" value={formData.externalPlanId} onChange={(e) => setFormData({ ...formData, externalPlanId: parseInt(e.target.value, 10) || 0 })} required />
                </div>
              </div>
              <div>
                <Label>External Network ID</Label>
                <Input type="number" value={formData.externalNetworkId} onChange={(e) => setFormData({ ...formData, externalNetworkId: parseInt(e.target.value, 10) || 0 })} required />
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
                <th className="px-4 py-3 text-left font-semibold">Category</th>
                <th className="px-4 py-3 text-left font-semibold">Size / Validity</th>
                <th className="px-4 py-3 text-left font-semibold">User Price</th>
                <th className="px-4 py-3 text-left font-semibold">Agent Price</th>
                <th className="px-4 py-3 text-left font-semibold">API Source</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-6 text-slate-500">Loading plans...</td>
                </tr>
              ) : plans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-6 text-slate-500">No plans found</td>
                </tr>
              ) : (
                plans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{plan.name}</td>
                    <td className="px-4 py-3"><Badge variant="outline">{plan.network}</Badge></td>
                    <td className="px-4 py-3"><Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none">{plan.category || "SME"}</Badge></td>
                    <td className="px-4 py-3">{plan.sizeLabel} ({plan.validity})</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">₦{(plan.user_price || plan.price).toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">₦{(plan.agent_price || plan.price).toLocaleString()}</td>
                    <td className="px-4 py-3"><Badge variant="secondary">{plan.apiSource}</Badge></td>
                    <td className="px-4 py-3">
                      <Badge variant={plan.isActive ? "default" : "destructive"}>
                        {plan.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <Button size="sm" variant="ghost" onClick={() => handleToggleActive(plan.id, plan.isActive)}>
                        {plan.isActive ? <EyeOff className="w-4 h-4 text-slate-500" /> : <Eye className="w-4 h-4 text-slate-500" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(plan)}>
                        <Edit2 className="w-4 h-4 text-slate-500" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(plan.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
