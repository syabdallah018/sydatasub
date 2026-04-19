'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Loader2, Save } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  sizeLabel: string;
  network: string;
  validity: string;
  user_price: number;
  agent_price: number;
  margin: number;
}

interface EditedPrice {
  user_price: number;
  agent_price: number;
}

export default function PricingPage() {
  const [groupedPlans, setGroupedPlans] = useState<Record<string, Plan[]>>({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [editedPrices, setEditedPrices] = useState<Record<string, EditedPrice>>({});

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const adminPassword = sessionStorage.getItem('adminPassword');
      const res = await fetch('/api/admin/plans/list', {
        headers: {
          'X-Admin-Password': adminPassword || '',
        },
      });

      if (res.status === 403) {
        toast.error('Unauthorized');
        return;
      }

      const data = await res.json();
      if (data.data) {
        setGroupedPlans(data.data);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = (plan: Plan, field: keyof EditedPrice, value: number) => {
    setEditedPrices((prev) => {
      const next = {
        user_price: prev[plan.id]?.user_price ?? plan.user_price,
        agent_price: prev[plan.id]?.agent_price ?? plan.agent_price,
        [field]: value,
      };

      return {
        ...prev,
        [plan.id]: next,
      };
    });
  };

  const handleSave = async () => {
    try {
      setUpdating(true);
      const adminPassword = sessionStorage.getItem('adminPassword');
      const prices = Object.entries(editedPrices).map(([planId, price]) => ({
        planId,
        user_price: price.user_price,
        agent_price: price.agent_price,
      }));

      if (prices.length === 0) {
        toast.error('No prices to update');
        return;
      }

      const invalidPlan = prices.find((plan) => plan.agent_price > plan.user_price);
      if (invalidPlan) {
        toast.error('Agent price cannot exceed user price');
        return;
      }

      const res = await fetch('/api/admin/plans/update-agent-price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': adminPassword || '',
        },
        body: JSON.stringify({ prices }),
      });

      if (res.status === 403) {
        toast.error('Unauthorized');
        return;
      }

      const data = await res.json();
      if (data.message) {
        toast.success(data.message);
        setEditedPrices({});
        fetchPlans();
      } else {
        toast.error(data.error || 'Update failed');
      }
    } catch (error) {
      console.error('Error updating prices:', error);
      toast.error('Failed to update prices');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Tier Pricing Management</h2>
        <p className="text-slate-600">Manage both regular-user and agent prices, and the backend will charge exactly these values.</p>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedPlans).map(([network, plans]) => (
          <div key={network} className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
              <h3 className="text-lg font-bold text-white">{network}</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Plan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Validity</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">User Price</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">Agent Price</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">Edit User</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">Edit Agent</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {plans.map((plan) => {
                    const edited = editedPrices[plan.id];
                    const displayUserPrice = edited?.user_price ?? plan.user_price;
                    const displayAgentPrice = edited?.agent_price ?? plan.agent_price;
                    const currentMargin = displayUserPrice - displayAgentPrice;
                    const isEdited = Boolean(edited);

                    return (
                      <tr key={plan.id} className={isEdited ? 'bg-yellow-50' : 'hover:bg-slate-50'}>
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{plan.sizeLabel}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{plan.validity}</td>
                        <td className="px-6 py-4 text-sm text-right font-semibold text-slate-900">N{plan.user_price.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-right font-medium text-slate-700">N{plan.agent_price.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-right">
                          <input
                            type="number"
                            value={displayUserPrice || ''}
                            onChange={(e) => handlePriceChange(plan, 'user_price', parseInt(e.target.value, 10) || 0)}
                            className="w-24 px-3 py-2 rounded border border-slate-300 bg-white text-sm text-right font-medium text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-6 py-4 text-sm text-right">
                          <input
                            type="number"
                            value={displayAgentPrice || ''}
                            onChange={(e) => handlePriceChange(plan, 'agent_price', parseInt(e.target.value, 10) || 0)}
                            className="w-24 px-3 py-2 rounded border border-slate-300 bg-white text-sm text-right font-medium text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-6 py-4 text-sm text-right">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            currentMargin > 0
                              ? 'bg-green-100 text-green-800'
                              : currentMargin === 0
                              ? 'bg-slate-100 text-slate-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            N{currentMargin.toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {Object.keys(editedPrices).length > 0 && (
        <div className="fixed bottom-8 right-8">
          <button
            onClick={handleSave}
            disabled={updating}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold shadow-lg transition"
          >
            {updating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} />
                Save Changes
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
