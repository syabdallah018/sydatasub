"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Edit2, Trash2, X } from "lucide-react";
import { toast } from "sonner";

const T = {
  bgCard: "#0F1320",
  bgElevated: "#161B2E",
  blue: "#3B82F6",
  violet: "#8B5CF6",
  textPrimary: "#F1F5FF",
  textSecondary: "#8B93B0",
  textMuted: "#4B5370",
  border: "rgba(255,255,255,0.07)",
  green: "#10B981",
  red: "#EF4444",
};

const font = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Helvetica, Arial, sans-serif';

interface PowerPlan {
  id: string;
  provider: string;
  planName: string;
  meterType: string;
  price: number;
  isActive: boolean;
  createdAt: string;
}

const POWER_PROVIDERS = [
  "EKEDC",
  "IBADANELECTRICITY",
  "ABUJA",
  "ENUGU",
  "KANO",
  "IJEBU",
  "KEDCO",
  "PHED",
  "AEDC",
];

const METER_TYPES = ["PREPAID", "POSTPAID"];

const Modal = ({
  show,
  onClose,
  children,
  title,
}: {
  show: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}) => (
  <>
    {show && (
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "flex-end",
          fontFamily: font,
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: T.bgCard,
            border: `1px solid ${T.border}`,
            borderRadius: "28px 28px 0 0",
            padding: "32px 20px calc(env(safe-area-inset-bottom, 16px) + 24px)",
            width: "100%",
            maxHeight: "88vh",
            overflowY: "auto",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: T.textPrimary }}>
              {title}
            </h2>
            <button
              onClick={onClose}
              style={{
                background: T.bgElevated,
                border: `1px solid ${T.border}`,
                borderRadius: 12,
                width: 38,
                height: 38,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: T.textSecondary,
              }}
            >
              <X size={18} />
            </button>
          </div>
          {children}
        </div>
      </div>
    )}
  </>
);

export default function PowerTab() {
  const [plans, setPlans] = useState<PowerPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PowerPlan | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");

  const [formData, setFormData] = useState({
    provider: "",
    planName: "",
    meterType: "",
    price: "",
    isActive: true,
  });

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch("/api/admin/power/plans", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch plans");
        const json = await res.json();
        if (Array.isArray(json)) {
          setPlans(json);
        } else {
          throw new Error("Invalid plans data");
        }
      } catch (error) {
        toast.error("Failed to load power plans");
        setPlans([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const filteredPlans = plans.filter((plan) => {
    const searchLower = searchInput.toLowerCase();
    return (
      plan.planName.toLowerCase().includes(searchLower) ||
      plan.provider.toLowerCase().includes(searchLower) ||
      plan.meterType.toLowerCase().includes(searchLower)
    );
  });

  const handleOpenCreate = () => {
    setFormData({
      provider: "",
      planName: "",
      meterType: "",
      price: "",
      isActive: true,
    });
    setShowCreateModal(true);
  };

  const handleOpenEdit = (plan: PowerPlan) => {
    setFormData({
      provider: plan.provider,
      planName: plan.planName,
      meterType: plan.meterType,
      price: plan.price.toString(),
      isActive: plan.isActive,
    });
    setEditingPlan(plan);
    setShowEditModal(true);
  };

  const handleSavePlan = async () => {
    if (!formData.provider || !formData.planName || !formData.meterType || !formData.price) {
      toast.error("Please fill all required fields");
      return;
    }

    setFormLoading(true);

    try {
      const payload = {
        provider: formData.provider,
        planName: formData.planName,
        meterType: formData.meterType,
        price: parseFloat(formData.price),
        isActive: formData.isActive,
      };

      if (editingPlan) {
        const res = await fetch(`/api/admin/power/plans/${editingPlan.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to update plan");
        setPlans(plans.map((p) => (p.id === editingPlan.id ? { ...p, ...payload } : p)));
        toast.success("Plan updated");
      } else {
        const res = await fetch("/api/admin/power/plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to create plan");
        const created = await res.json();
        setPlans([...plans, created]);
        toast.success("Plan created");
      }

      setShowCreateModal(false);
      setShowEditModal(false);
      setEditingPlan(null);
    } catch (error) {
      toast.error(editingPlan ? "Failed to update plan" : "Failed to create plan");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm("Are you sure you want to delete this plan?")) return;

    setDeleteLoading(id);

    try {
      const res = await fetch(`/api/admin/power/plans/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete plan");
      setPlans(plans.filter((p) => p.id !== id));
      toast.success("Plan deleted");
    } catch (error) {
      toast.error("Failed to delete plan");
    } finally {
      setDeleteLoading(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "40px 20px", fontFamily: font }}>
        <Loader2 size={32} style={{ color: T.blue, animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: font }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.textPrimary }}>
          Power Plans ({plans.length})
        </h3>
        <button
          onClick={handleOpenCreate}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: T.blue,
            border: "none",
            borderRadius: 12,
            padding: "10px 16px",
            color: "white",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: 14,
            fontFamily: font,
          }}
        >
          <Plus size={18} />
          New Plan
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search plans..."
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 12px",
          marginBottom: 20,
          borderRadius: 8,
          background: T.bgElevated,
          border: `1px solid ${T.border}`,
          color: T.textPrimary,
          fontSize: 14,
          fontFamily: font,
        }}
      />

      {/* Plans Table */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 14,
            color: T.textPrimary,
          }}
        >
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}` }}>
              <th style={{ textAlign: "left", padding: "12px", fontWeight: 600, color: T.textMuted }}>Provider</th>
              <th style={{ textAlign: "left", padding: "12px", fontWeight: 600, color: T.textMuted }}>Plan Name</th>
              <th style={{ textAlign: "left", padding: "12px", fontWeight: 600, color: T.textMuted }}>Meter Type</th>
              <th style={{ textAlign: "left", padding: "12px", fontWeight: 600, color: T.textMuted }}>Price (₦)</th>
              <th style={{ textAlign: "left", padding: "12px", fontWeight: 600, color: T.textMuted }}>Status</th>
              <th style={{ textAlign: "right", padding: "12px", fontWeight: 600, color: T.textMuted }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlans.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "20px", textAlign: "center", color: T.textMuted }}>
                  No plans found
                </td>
              </tr>
            ) : (
              filteredPlans.map((plan) => (
                <tr key={plan.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                  <td style={{ padding: "12px" }}>{plan.provider}</td>
                  <td style={{ padding: "12px" }}>{plan.planName}</td>
                  <td style={{ padding: "12px" }}>
                    <span
                      style={{
                        background: `${T.blue}20`,
                        color: T.blue,
                        padding: "4px 8px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {plan.meterType}
                    </span>
                  </td>
                  <td style={{ padding: "12px" }}>₦{plan.price.toLocaleString()}</td>
                  <td style={{ padding: "12px" }}>
                    <span
                      style={{
                        color: plan.isActive ? T.green : T.red,
                        fontWeight: 600,
                        fontSize: 12,
                      }}
                    >
                      {plan.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "12px",
                      textAlign: "right",
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 8,
                    }}
                  >
                    <button
                      onClick={() => handleOpenEdit(plan)}
                      style={{
                        background: "transparent",
                        border: `1px solid ${T.border}`,
                        borderRadius: 6,
                        width: 32,
                        height: 32,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: T.textSecondary,
                      }}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeletePlan(plan.id)}
                      disabled={deleteLoading === plan.id}
                      style={{
                        background: "transparent",
                        border: `1px solid ${T.border}`,
                        borderRadius: 6,
                        width: 32,
                        height: 32,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: deleteLoading === plan.id ? T.textMuted : T.red,
                      }}
                    >
                      {deleteLoading === plan.id ? <Loader2 size={14} /> : <Trash2 size={14} />}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      <Modal show={showCreateModal || showEditModal} onClose={() => {
        setShowCreateModal(false);
        setShowEditModal(false);
        setEditingPlan(null);
      }} title={editingPlan ? "Edit Power Plan" : "Create Power Plan"}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Provider */}
          <div>
            <label style={{ display: "block", fontSize: 12, color: T.textMuted, marginBottom: 4, fontWeight: 600 }}>
              Provider *
            </label>
            <select
              value={formData.provider}
              onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                background: T.bgElevated,
                border: `1px solid ${T.border}`,
                color: T.textPrimary,
                fontSize: 14,
                fontFamily: font,
              }}
            >
              <option value="">Select Provider</option>
              {POWER_PROVIDERS.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
          </div>

          {/* Plan Name */}
          <div>
            <label style={{ display: "block", fontSize: 12, color: T.textMuted, marginBottom: 4, fontWeight: 600 }}>
              Plan Name *
            </label>
            <input
              type="text"
              placeholder="e.g., 5000 Units"
              value={formData.planName}
              onChange={(e) => setFormData({ ...formData, planName: e.target.value })}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                background: T.bgElevated,
                border: `1px solid ${T.border}`,
                color: T.textPrimary,
                fontSize: 14,
                fontFamily: font,
              }}
            />
          </div>

          {/* Meter Type */}
          <div>
            <label style={{ display: "block", fontSize: 12, color: T.textMuted, marginBottom: 4, fontWeight: 600 }}>
              Meter Type *
            </label>
            <select
              value={formData.meterType}
              onChange={(e) => setFormData({ ...formData, meterType: e.target.value })}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                background: T.bgElevated,
                border: `1px solid ${T.border}`,
                color: T.textPrimary,
                fontSize: 14,
                fontFamily: font,
              }}
            >
              <option value="">Select Meter Type</option>
              {METER_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Price */}
          <div>
            <label style={{ display: "block", fontSize: 12, color: T.textMuted, marginBottom: 4, fontWeight: 600 }}>
              Price (₦) *
            </label>
            <input
              type="number"
              placeholder="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                background: T.bgElevated,
                border: `1px solid ${T.border}`,
                color: T.textPrimary,
                fontSize: 14,
                fontFamily: font,
              }}
            />
          </div>

          {/* Active Status */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              style={{ width: 18, height: 18 }}
            />
            <label style={{ fontSize: 14, color: T.textPrimary, fontWeight: 600 }}>
              Active
            </label>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSavePlan}
            disabled={formLoading}
            style={{
              width: "100%",
              padding: 14,
              borderRadius: 12,
              background: T.blue,
              border: "none",
              color: "white",
              fontWeight: 600,
              cursor: formLoading ? "not-allowed" : "pointer",
              opacity: formLoading ? 0.6 : 1,
              fontSize: 14,
              fontFamily: font,
            }}
          >
            {formLoading ? "Saving..." : editingPlan ? "Update Plan" : "Create Plan"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
