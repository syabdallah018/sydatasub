"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DollarSign,
  Search,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Loader2,
  User as UserIcon,
  Smartphone,
  AlertCircle,
  Tag,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface CustomPriceItem {
  id: string;
  userId: string;
  planId: string;
  price: number;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    fullName: string;
    phone: string;
    email?: string;
    tier: string;
    balance?: number;
  };
  plan: {
    id: string;
    name: string;
    network: string;
    sizeLabel: string;
    validity: string;
    user_price: number;
    agent_price: number;
    category?: string;
    developerPlanId?: number;
    planCode?: string;
    isActive: boolean;
  };
}

interface PlanOption {
  id: string;
  name: string;
  network: string;
  sizeLabel: string;
  user_price: number;
  agent_price: number;
  category?: string;
  developerPlanId?: number;
  planCode?: string;
}

interface UserOption {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  tier: string;
  balance?: number;
}

export default function IndividualPricingManager() {
  const [customPrices, setCustomPrices] = useState<CustomPriceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableSearch, setTableSearch] = useState("");

  // Plans catalog
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  // New assignment form state
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<UserOption[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);

  const [selectedPlanNetwork, setSelectedPlanNetwork] = useState<string>("ALL");
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [customPriceInput, setCustomPriceInput] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Edit modal state
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    item: CustomPriceItem | null;
    newPrice: string;
    saving: boolean;
  }>({
    isOpen: false,
    item: null,
    newPrice: "",
    saving: false,
  });

  // Fetch all custom prices
  const fetchCustomPrices = useCallback(async (showToast = false) => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/custom-pricing");
      const data = await res.json();
      if (res.ok && data.success) {
        setCustomPrices(data.data || []);
        if (showToast) {
          toast.success("Individual custom prices reloaded");
        }
      } else {
        toast.error(data.error || "Failed to load individual custom prices");
      }
    } catch (err) {
      console.error("[FETCH CUSTOM PRICING ERROR]", err);
      toast.error("Network error loading custom pricing");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch plans
  const fetchPlans = useCallback(async () => {
    try {
      setLoadingPlans(true);
      const res = await fetch("/api/data/plans");
      const data = await res.json();
      if (res.ok && data.plans) {
        setPlans(data.plans || []);
      }
    } catch (err) {
      console.error("[FETCH PLANS ERROR]", err);
    } finally {
      setLoadingPlans(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomPrices();
    fetchPlans();
  }, [fetchCustomPrices, fetchPlans]);

  // Debounced search for users
  useEffect(() => {
    if (!userQuery.trim() || selectedUser) {
      setUserResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearchingUsers(true);
        const res = await fetch(`/api/admin/custom-pricing/users?q=${encodeURIComponent(userQuery.trim())}`);
        const data = await res.json();
        if (res.ok && data.data) {
          setUserResults(data.data || []);
        }
      } catch (err) {
        console.error("[SEARCH USERS ERROR]", err);
      } finally {
        setSearchingUsers(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [userQuery, selectedUser]);

  // Selected plan detail
  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  // Handle Create / Upsert
  const handleCreateCustomPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      toast.error("Please search and select a user first");
      return;
    }
    if (!selectedPlanId) {
      toast.error("Please select a data plan");
      return;
    }
    const priceNum = parseInt(customPriceInput, 10);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error("Please enter a valid price in Naira");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/admin/custom-pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          planId: selectedPlanId,
          price: priceNum,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(data.message || "Custom price set successfully!");
        setCustomPriceInput("");
        setSelectedPlanId("");
        fetchCustomPrices();
      } else {
        toast.error(data.error || "Failed to set custom price");
      }
    } catch (err) {
      console.error("[SAVE CUSTOM PRICE ERROR]", err);
      toast.error("Network error while setting custom price");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit Submit
  const handleSaveEdit = async () => {
    if (!editModal.item) return;
    const priceNum = parseInt(editModal.newPrice, 10);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error("Please enter a valid price in Naira");
      return;
    }

    try {
      setEditModal((prev) => ({ ...prev, saving: true }));
      const res = await fetch(`/api/admin/custom-pricing/${editModal.item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: priceNum }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(data.message || "Custom price updated!");
        setEditModal({ isOpen: false, item: null, newPrice: "", saving: false });
        fetchCustomPrices();
      } else {
        toast.error(data.error || "Failed to update custom price");
      }
    } catch (err) {
      console.error("[UPDATE CUSTOM PRICE ERROR]", err);
      toast.error("Network error updating custom price");
    } finally {
      setEditModal((prev) => ({ ...prev, saving: false }));
    }
  };

  // Handle Delete
  const handleDeleteCustomPrice = async (item: CustomPriceItem) => {
    const confirm = window.confirm(
      `Remove custom price (₦${item.price.toLocaleString()}) for ${item.user.fullName} on ${item.plan.name}? The user will revert to default tier pricing.`
    );
    if (!confirm) return;

    try {
      const res = await fetch(`/api/admin/custom-pricing/${item.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(data.message || "Custom price removed successfully");
        fetchCustomPrices();
      } else {
        toast.error(data.error || "Failed to remove custom price");
      }
    } catch (err) {
      console.error("[DELETE CUSTOM PRICE ERROR]", err);
      toast.error("Network error while removing custom price");
    }
  };

  // Filtered plans for dropdown
  const filteredPlanOptions = plans.filter((p) => {
    if (selectedPlanNetwork === "ALL") return true;
    return p.network?.toUpperCase() === selectedPlanNetwork.toUpperCase();
  });

  // Filtered table list
  const filteredCustomPrices = customPrices.filter((cp) => {
    if (!tableSearch.trim()) return true;
    const q = tableSearch.toLowerCase();
    return (
      cp.user?.fullName?.toLowerCase().includes(q) ||
      cp.user?.phone?.includes(q) ||
      cp.user?.email?.toLowerCase().includes(q) ||
      cp.plan?.name?.toLowerCase().includes(q) ||
      cp.plan?.network?.toLowerCase().includes(q) ||
      cp.plan?.sizeLabel?.toLowerCase().includes(q) ||
      cp.plan?.planCode?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Intro Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500 text-white shadow-sm mt-0.5">
            <DollarSign size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Individual User Custom Pricing System
            </h2>
            <p className="text-sm text-slate-600 mt-0.5 leading-relaxed">
              Give any user or developer customized rates for specific plans. Custom prices take absolute precedence over standard user and agent tier pricing.
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchCustomPrices(true)}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5 shrink-0 shadow-sm transition disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Reload Prices
        </button>
      </div>

      {/* Form: Assign Custom Price */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Plus size={18} className="text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Assign / Update Custom Price for a User
          </h3>
        </div>

        <form onSubmit={handleCreateCustomPrice} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Step 1: User Search & Selection */}
            <div className="space-y-1.5 relative">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <UserIcon size={14} className="text-slate-500" />
                1. Select User
              </label>

              {selectedUser ? (
                <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50/50 text-sm">
                  <div className="truncate">
                    <span className="font-bold text-slate-900">{selectedUser.fullName}</span>{" "}
                    <span className="text-slate-500 text-xs font-mono">({selectedUser.phone})</span>
                    <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold rounded uppercase bg-emerald-200 text-emerald-800">
                      {selectedUser.tier}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUser(null);
                      setUserQuery("");
                    }}
                    className="p-1 hover:bg-emerald-200/60 rounded-lg text-emerald-800 transition"
                    title="Change user"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    placeholder="Search phone or name..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <Search size={15} className="absolute left-3 top-3 text-slate-400" />
                  {searchingUsers && (
                    <Loader2 size={15} className="absolute right-3 top-3 text-slate-400 animate-spin" />
                  )}

                  {/* Dropdown search results */}
                  {userResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100">
                      {userResults.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setSelectedUser(u);
                            setUserResults([]);
                          }}
                          className="w-full text-left px-3.5 py-2.5 hover:bg-emerald-50/70 transition flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-slate-900">{u.fullName}</div>
                            <div className="text-slate-500 font-mono text-[11px]">{u.phone}</div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                            {u.tier}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step 2: Plan Selection */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Smartphone size={14} className="text-slate-500" />
                  2. Select Data Plan
                </label>
                <div className="flex items-center gap-1">
                  {["ALL", "MTN", "GLO", "AIRTEL"].map((net) => (
                    <button
                      key={net}
                      type="button"
                      onClick={() => setSelectedPlanNetwork(net)}
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold transition ${
                        selectedPlanNetwork === net
                          ? "bg-slate-900 text-white"
                          : "text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      {net}
                    </button>
                  ))}
                </div>
              </div>

              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                disabled={loadingPlans}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-white"
              >
                <option value="">-- Choose Plan --</option>
                {filteredPlanOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.network}] {p.name} ({p.sizeLabel}) — Retail: ₦{p.user_price} | Agent: ₦{p.agent_price}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 3: Custom Price in Naira */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Tag size={14} className="text-slate-500" />
                3. Individual Price (₦ Naira)
              </label>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">₦</span>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 215"
                    value={customPriceInput}
                    onChange={(e) => setCustomPriceInput(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || !selectedUser || !selectedPlanId || !customPriceInput}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center gap-1.5 shadow-md transition disabled:opacity-50 shrink-0"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      Set Price
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Price Preview helper */}
          {selectedPlan && customPriceInput && !isNaN(Number(customPriceInput)) && (
            <div className="text-xs bg-slate-50 border border-slate-200/80 p-3 rounded-xl flex flex-wrap items-center gap-4 text-slate-600">
              <span>
                Standard User Price: <strong className="text-slate-900">₦{selectedPlan.user_price}</strong>
              </span>
              <span>
                Agent Price: <strong className="text-slate-900">₦{selectedPlan.agent_price}</strong>
              </span>
              <span>
                Custom Price: <strong className="text-emerald-700">₦{Number(customPriceInput).toLocaleString()}</strong>
              </span>
              <span className="ml-auto font-bold text-emerald-600">
                {selectedPlan.user_price - Number(customPriceInput) >= 0
                  ? `₦${selectedPlan.user_price - Number(customPriceInput)} below retail price`
                  : `₦${Number(customPriceInput) - selectedPlan.user_price} above retail price`}
              </span>
            </div>
          )}
        </form>
      </div>

      {/* Active Custom Prices Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Table Header & Search */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">
              Active Individual Custom Prices ({filteredCustomPrices.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              All active user price overrides currently enforced by the checkout and API purchase endpoints.
            </p>
          </div>

          <div className="relative w-full md:w-72">
            <input
              type="text"
              placeholder="Search user, phone, plan..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          </div>
        </div>

        {/* Table body */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
              <Loader2 size={24} className="animate-spin text-emerald-600" />
              <span className="text-sm font-semibold">Loading custom prices...</span>
            </div>
          ) : filteredCustomPrices.length === 0 ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
              <AlertCircle size={28} className="text-slate-300" />
              <span className="text-sm font-semibold text-slate-700">No individual prices assigned</span>
              <p className="text-xs text-slate-400 max-w-sm">
                {tableSearch
                  ? "No custom price records matched your search query."
                  : "Use the form above to give any user or API developer their own custom price for any data bundle."}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">Customer / User</th>
                  <th className="px-4 py-3">Network & Plan</th>
                  <th className="px-4 py-3">Standard Retail</th>
                  <th className="px-4 py-3">Agent Price</th>
                  <th className="px-4 py-3">Custom Rate</th>
                  <th className="px-4 py-3">Difference</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                {filteredCustomPrices.map((item) => {
                  const retailDiff = item.plan.user_price - item.price;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">{item.user.fullName}</div>
                        <div className="font-mono text-slate-500 text-[11px]">{item.user.phone}</div>
                        <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-slate-100 text-slate-700">
                          {item.user.tier}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                              item.plan.network === "MTN"
                                ? "bg-amber-100 text-amber-800"
                                : item.plan.network === "AIRTEL"
                                ? "bg-red-100 text-red-800"
                                : item.plan.network === "GLO"
                                ? "bg-green-100 text-green-800"
                                : "bg-purple-100 text-purple-800"
                            }`}
                          >
                            {item.plan.network}
                          </span>
                          <span>{item.plan.name}</span>
                        </div>
                        <div className="text-slate-400 text-[11px] mt-0.5">
                          {item.plan.sizeLabel} • {item.plan.validity}
                          {item.plan.planCode && (
                            <span className="ml-1.5 font-mono text-[10px] text-slate-500">
                              ({item.plan.planCode})
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-slate-600 font-semibold">
                        ₦{item.plan.user_price.toLocaleString()}
                      </td>

                      <td className="px-4 py-3.5 text-slate-600 font-semibold">
                        ₦{item.plan.agent_price.toLocaleString()}
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          ₦{item.price.toLocaleString()}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        {retailDiff > 0 ? (
                          <span className="font-bold text-emerald-600 text-xs">
                            -₦{retailDiff.toLocaleString()} off
                          </span>
                        ) : retailDiff < 0 ? (
                          <span className="font-bold text-rose-600 text-xs">
                            +₦{Math.abs(retailDiff).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">Equal to retail</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() =>
                              setEditModal({
                                isOpen: true,
                                item,
                                newPrice: String(item.price),
                                saving: false,
                              })
                            }
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition"
                            title="Edit Custom Price"
                          >
                            <Edit2 size={13} />
                          </button>

                          <button
                            onClick={() => handleDeleteCustomPrice(item)}
                            className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 transition"
                            title="Delete Custom Price"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editModal.isOpen && editModal.item && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Edit Custom Price</h3>
              <button
                onClick={() => setEditModal({ isOpen: false, item: null, newPrice: "", saving: false })}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <div>
                <span className="text-slate-400">Customer:</span>{" "}
                <strong className="text-slate-900">{editModal.item.user.fullName}</strong> (
                {editModal.item.user.phone})
              </div>
              <div>
                <span className="text-slate-400">Plan:</span>{" "}
                <strong className="text-slate-900">
                  [{editModal.item.plan.network}] {editModal.item.plan.name}
                </strong>
              </div>
              <div>
                <span className="text-slate-400">Default Retail / Agent:</span> ₦
                {editModal.item.plan.user_price} / ₦{editModal.item.plan.agent_price}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                New Price (₦ Naira)
              </label>
              <input
                type="number"
                min="1"
                value={editModal.newPrice}
                onChange={(e) => setEditModal((prev) => ({ ...prev, newPrice: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEditModal({ isOpen: false, item: null, newPrice: "", saving: false })}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                onClick={handleSaveEdit}
                disabled={editModal.saving || !editModal.newPrice}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition disabled:opacity-50"
              >
                {editModal.saving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    Save Price
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
