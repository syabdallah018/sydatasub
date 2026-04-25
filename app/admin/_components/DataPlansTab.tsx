"use client";

import { useEffect, useState } from "react";

import { Loader2, Plus, Edit2, Trash2, X } from "lucide-react";
import { toast } from "sonner";

// Design tokens
const T = {
  bgCard:     "#0F1320",
  bgElevated: "#161B2E",
  blue:       "#3B82F6",
  violet:     "#8B5CF6",
  textPrimary:   "#F1F5FF",
  textSecondary: "#8B93B0",
  textMuted:     "#4B5370",
  border:     "rgba(255,255,255,0.07)",
  green:      "#10B981",
  red:        "#EF4444",
};

const font = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Helvetica, Arial, sans-serif';

interface DataPlan {
  id: string;
  name: string;
  networkId: string;
  networkName: string;
  sizeLabel: string;
  validity: string;
  price: number;
  userPrice: number;
  agentPrice: number;
  apiAId: string;
  apiBId: string;
  apiCId: string;
  activeApi: "A" | "B" | "C";
  isActive: boolean;
}

const NETWORKS = [
  { id: 1, name: "MTN" },
  { id: 2, name: "Glo" },
  { id: 4, name: "Airtel" },
  { id: 3, name: "9Mobile" },
];

const VALIDITY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const formatValidityLabel = (value: string) =>
  VALIDITY_OPTIONS.find((option) => option.value === value)?.label || value || "-";

// Modal wrapper
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

export default function DataPlansTab() {
  const [plans, setPlans] = useState<DataPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<DataPlan | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    networkId: "",
    sizeLabel: "",
    validity: "",
    price: "",
    userPrice: "",
    agentPrice: "",
    apiAId: "",
    apiBId: "",
    apiCId: "",
    activeApi: "A" as "A" | "B" | "C",
    isActive: true,
  });

  // Fetch plans
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch("/api/admin/plans", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch plans");
        const json = await res.json();
        // Ensure json is an array
        if (Array.isArray(json)) {
          setPlans(json);
        } else {
          throw new Error("Invalid plans data");
        }
      } catch (error) {
        toast.error("Failed to load plans");
        setPlans([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const filteredPlans = plans.filter((plan) => {
    const searchLower = formData.name?.toLowerCase() || "";
    return (
      (plan.name || "").toLowerCase().includes(searchLower) ||
      (plan.networkName || "").toLowerCase().includes(searchLower) ||
      (plan.sizeLabel || "").toLowerCase().includes(searchLower)
    );
  });

  const handleOpenCreate = () => {
    setFormData({
      name: "",
      networkId: "",
      sizeLabel: "",
      validity: "",
      price: "",
      userPrice: "",
      agentPrice: "",
      apiAId: "",
      apiBId: "",
      apiCId: "",
      activeApi: "A",
      isActive: true,
    });
    setShowCreateModal(true);
  };

  const handleOpenEdit = (plan: DataPlan) => {
    setFormData({
      name: plan.name,
      networkId: plan.networkId,
      sizeLabel: plan.sizeLabel,
      validity: plan.validity,
      price: plan.price.toString(),
      userPrice: plan.userPrice.toString(),
      agentPrice: plan.agentPrice.toString(),
      apiAId: plan.apiAId,
      apiBId: plan.apiBId,
      apiCId: plan.apiCId,
      activeApi: plan.activeApi,
      isActive: plan.isActive,
    });
    setEditingPlan(plan);
    setShowEditModal(true);
  };

  const handleSavePlan = async () => {
    if (!formData.name || !formData.networkId || !formData.sizeLabel || !formData.validity || !formData.price) {
      toast.error("Please fill all required fields");
      return;
    }

    if (formData.activeApi === "A" && !formData.apiAId) {
      toast.error("API A ID is required when API A is active");
      return;
    }

    if (formData.activeApi === "B" && !formData.apiBId) {
      toast.error("API B ID is required when API B is active");
      return;
    }

    if (formData.activeApi === "C" && !formData.apiCId) {
      toast.error("API C ID is required when API C is active");
      return;
    }

    setFormLoading(true);

    try {
      const payload = {
        name: formData.name,
        networkId: parseInt(String(formData.networkId)), // Convert to number
        networkName: NETWORKS.find((n) => n.id === parseInt(String(formData.networkId)))?.name || formData.networkId,
        sizeLabel: formData.sizeLabel,
        validity: formData.validity,
        price: parseFloat(formData.price),
        userPrice: formData.userPrice ? parseFloat(formData.userPrice) : undefined,
        agentPrice: formData.agentPrice ? parseFloat(formData.agentPrice) : undefined,
        apiAId: formData.apiAId || undefined,
        apiBId: formData.apiBId || undefined,
        apiCId: formData.apiCId || undefined,
        activeApi: formData.activeApi,
        isActive: formData.isActive,
      };

      if (editingPlan) {
        // Update
        const res = await fetch(`/api/admin/plans/${editingPlan.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to update plan");
        }
        const updated = await res.json();
        setPlans(plans.map((p) => (p.id === updated.id ? updated : p)));
        toast.success("Plan updated");
      } else {
        // Create
        const res = await fetch("/api/admin/plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to create plan");
        }
        const created = await res.json();
        setPlans([...plans, created]);
        toast.success("Plan created");
      }

      setShowCreateModal(false);
      setShowEditModal(false);
      setEditingPlan(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : (editingPlan ? "Failed to update plan" : "Failed to create plan");
      toast.error(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm("Are you sure you want to delete this plan?")) return;

    setDeleteLoading(id);

    try {
      const res = await fetch(`/api/admin/plans/${id}`, {
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

  const handleSetActiveApi = async (plan: DataPlan, newActiveApi: DataPlan["activeApi"]) => {
    try {
      const res = await fetch(`/api/admin/plans/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ activeApi: newActiveApi }),
      });
      if (!res.ok) throw new Error("Failed to update API");
      const updated = await res.json();
      setPlans(plans.map((p) => (p.id === updated.id ? updated : p)));
      toast.success(`Active API switched to ${newActiveApi}`);
    } catch (error) {
      toast.error("Failed to update API");
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
      {/* Create button */}
      <button
        onClick={handleOpenCreate}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 16px",
          marginBottom: 20,
          borderRadius: 8,
          background: T.blue,
          border: "none",
          color: "#fff",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: font,
        }}
      >
        <Plus size={18} />
        Create Plan
      </button>

      {/* Plans table */}
      <div style={{
        padding: 20,
        borderRadius: 12,
        background: T.bgCard,
        border: `1px solid ${T.border}`,
        overflowX: "auto",
      }}>
        <table style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 13,
          minWidth: "900px",
        }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}` }}>
              <th style={{ padding: "12px 8px", textAlign: "left", color: T.textMuted, fontWeight: 600 }}>Name</th>
              <th style={{ padding: "12px 8px", textAlign: "left", color: T.textMuted, fontWeight: 600 }}>Network</th>
              <th style={{ padding: "12px 8px", textAlign: "left", color: T.textMuted, fontWeight: 600 }}>Size</th>
              <th style={{ padding: "12px 8px", textAlign: "left", color: T.textMuted, fontWeight: 600 }}>Validity</th>
              <th style={{ padding: "12px 8px", textAlign: "right", color: T.textMuted, fontWeight: 600 }}>Price</th>
              <th style={{ padding: "12px 8px", textAlign: "left", color: T.textMuted, fontWeight: 600 }}>API A</th>
                <th style={{ padding: "12px 8px", textAlign: "left", color: T.textMuted, fontWeight: 600 }}>API B</th>
                <th style={{ padding: "12px 8px", textAlign: "left", color: T.textMuted, fontWeight: 600 }}>API C</th>
                <th style={{ padding: "12px 8px", textAlign: "center", color: T.textMuted, fontWeight: 600 }}>Active</th>
              <th style={{ padding: "12px 8px", textAlign: "center", color: T.textMuted, fontWeight: 600 }}>Status</th>
              <th style={{ padding: "12px 8px", textAlign: "center", color: T.textMuted, fontWeight: 600 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr key={plan.id || Math.random()} style={{ borderBottom: `1px solid ${T.border}` }}>
                <td style={{ padding: "12px 8px", color: T.textSecondary }}>{plan.name || "-"}</td>
                <td style={{ padding: "12px 8px", color: T.textSecondary }}>{plan.networkName || "-"}</td>
                <td style={{ padding: "12px 8px", color: T.textSecondary }}>{plan.sizeLabel || "-"}</td>
                <td style={{ padding: "12px 8px", color: T.textSecondary }}>{formatValidityLabel(plan.validity)}</td>
                <td style={{ padding: "12px 8px", textAlign: "right", color: T.textPrimary, fontWeight: 600 }}>
                  NGN {(plan.price || 0).toLocaleString()}
                </td>
                <td style={{ padding: "12px 8px", color: T.textSecondary, fontSize: 11, fontFamily: "monospace" }}>
                  {plan.apiAId && String(plan.apiAId).length > 0 ? String(plan.apiAId).slice(0, 8) + "..." : "-"}
                </td>
                <td style={{ padding: "12px 8px", color: T.textSecondary, fontSize: 11, fontFamily: "monospace" }}>
                  {plan.apiBId && String(plan.apiBId).length > 0 ? String(plan.apiBId).slice(0, 8) + "..." : "-"}
                </td>
                <td style={{ padding: "12px 8px", color: T.textSecondary, fontSize: 11, fontFamily: "monospace" }}>
                  {plan.apiCId && String(plan.apiCId).length > 0 ? String(plan.apiCId).slice(0, 8) + "..." : "-"}
                </td>
                <td style={{ padding: "12px 8px", textAlign: "center" }}>
                  <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                    {(["A", "B", "C"] as const).map((api) => (
                      <button
                        key={api}
                        onClick={() => handleSetActiveApi(plan, api)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 6,
                          background: plan.activeApi === api ? T.blue : T.bgElevated,
                          border: `1px solid ${plan.activeApi === api ? T.blue : T.border}`,
                          color: plan.activeApi === api ? "#fff" : T.textSecondary,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                          fontFamily: font,
                        }}
                      >
                        {api}
                      </button>
                    ))}
                  </div>
                </td>
                <td style={{ padding: "12px 8px", textAlign: "center" }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "4px 8px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      background: plan.isActive ? `${T.green}20` : `${T.red}20`,
                      color: plan.isActive ? T.green : T.red,
                    }}
                  >
                    {plan.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td style={{ padding: "12px 8px", textAlign: "center" }}>
                  <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                    <button
                      onClick={() => handleOpenEdit(plan)}
                      style={{
                        background: T.bgElevated,
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
                        background: T.bgElevated,
                        border: `1px solid ${T.border}`,
                        borderRadius: 6,
                        width: 32,
                        height: 32,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: deleteLoading === plan.id ? "not-allowed" : "pointer",
                        color: T.red,
                        opacity: deleteLoading === plan.id ? 0.5 : 1,
                      }}
                    >
                      {deleteLoading === plan.id ? <Loader2 size={14} /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {plans.length === 0 && (
          <div style={{ padding: "40px 20px", textAlign: "center", color: T.textSecondary }}>
            No plans yet. Create one to get started.
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        show={showCreateModal || showEditModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
          setEditingPlan(null);
        }}
        title={editingPlan ? "Edit Plan" : "Create Plan"}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Name */}
          <div>
            <label style={{ display: "block", fontSize: 12, color: T.textMuted, marginBottom: 4, fontWeight: 600 }}>
              Plan Name *
            </label>
            <input
              type="text"
              placeholder="e.g., 1GB"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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

          {/* Network */}
          <div>
            <label style={{ display: "block", fontSize: 12, color: T.textMuted, marginBottom: 4, fontWeight: 600 }}>
              Network *
            </label>
            <select
              value={formData.networkId}
              onChange={(e) => setFormData({ ...formData, networkId: e.target.value })}
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
              <option value="">Select Network</option>
              {NETWORKS.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
          </div>

          {/* Size */}
          <div>
            <label style={{ display: "block", fontSize: 12, color: T.textMuted, marginBottom: 4, fontWeight: 600 }}>
              Size Label *
            </label>
            <input
              type="text"
              placeholder="e.g., 500MB"
              value={formData.sizeLabel}
              onChange={(e) => setFormData({ ...formData, sizeLabel: e.target.value })}
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

          {/* Validity */}
          <div>
            <label style={{ display: "block", fontSize: 12, color: T.textMuted, marginBottom: 4, fontWeight: 600 }}>
              Validity *
            </label>
            <select
              value={formData.validity}
              onChange={(e) => setFormData({ ...formData, validity: e.target.value })}
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
              <option value="">Select Validity</option>
              {VALIDITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Price */}
          <div>
            <label style={{ display: "block", fontSize: 12, color: T.textMuted, marginBottom: 4, fontWeight: 600 }}>
              Price (NGN) *
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

          {/* User Price */}
          <div>
            <label style={{ display: "block", fontSize: 12, color: T.textMuted, marginBottom: 4, fontWeight: 600 }}>
              User Price (NGN)
            </label>
            <input
              type="number"
              placeholder="0"
              value={formData.userPrice}
              onChange={(e) => setFormData({ ...formData, userPrice: e.target.value })}
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

          {/* Agent Price */}
          <div>
            <label style={{ display: "block", fontSize: 12, color: T.textMuted, marginBottom: 4, fontWeight: 600 }}>
              Agent Price (NGN)
            </label>
            <input
              type="number"
              placeholder="0"
              value={formData.agentPrice}
              onChange={(e) => setFormData({ ...formData, agentPrice: e.target.value })}
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

          {/* API A ID */}
          <div>
            <label style={{ display: "block", fontSize: 12, color: T.textMuted, marginBottom: 4, fontWeight: 600 }}>
              API A ID
            </label>
            <input
              type="text"
              placeholder="Provider A plan ID"
              value={formData.apiAId}
              onChange={(e) => setFormData({ ...formData, apiAId: e.target.value })}
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

          {/* API B ID */}
          <div>
            <label style={{ display: "block", fontSize: 12, color: T.textMuted, marginBottom: 4, fontWeight: 600 }}>
              API B ID
            </label>
            <input
              type="text"
              placeholder="Provider B plan ID"
              value={formData.apiBId}
              onChange={(e) => setFormData({ ...formData, apiBId: e.target.value })}
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

          {/* API C ID */}
          <div>
            <label style={{ display: "block", fontSize: 12, color: T.textMuted, marginBottom: 4, fontWeight: 600 }}>
              API C ID
            </label>
            <input
              type="text"
              placeholder="Provider C plan ID"
              value={formData.apiCId}
              onChange={(e) => setFormData({ ...formData, apiCId: e.target.value })}
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

          {/* Active API */}
          <div>
            <label style={{ display: "block", fontSize: 12, color: T.textMuted, marginBottom: 8, fontWeight: 600 }}>
              Active API
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {(["A", "B", "C"] as const).map((api) => (
                <button
                  type="button"
                  key={api}
                  onClick={() => setFormData({ ...formData, activeApi: api })}
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: formData.activeApi === api ? T.blue : T.bgElevated,
                    border: `1px solid ${formData.activeApi === api ? T.blue : T.border}`,
                    color: formData.activeApi === api ? "#fff" : T.textSecondary,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: font,
                  }}
                >
                  API {api}
                </button>
              ))}
            </div>
          </div>

          {/* Is Active */}
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                style={{ width: 18, height: 18, borderRadius: 4 }}
              />
              <span style={{ fontSize: 14, color: T.textSecondary, fontWeight: 500 }}>Active</span>
            </label>
          </div>

          {/* Save button */}
          <button
            onClick={handleSavePlan}
            disabled={formLoading}
            style={{
              width: "100%",
              padding: 12,
              marginTop: 12,
              borderRadius: 8,
              background: T.blue,
              border: "none",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: formLoading ? "not-allowed" : "pointer",
              opacity: formLoading ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontFamily: font,
            }}
          >
            {formLoading ? (
              <>
                <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                Saving...
              </>
            ) : editingPlan ? (
              "Update Plan"
            ) : (
              "Create Plan"
            )}
          </button>
        </div>
      </Modal>
    </div>
  );
}

