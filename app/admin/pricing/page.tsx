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

export default function PricingPage() {
  const [groupedPlans, setGroupedPlans] = useState<Record<string, Plan[]>>({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [editedPrices, setEditedPrices] = useState<Record<string, number>>({});

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

  const handlePriceChange = (planId: string, newPrice: number) => {
    setEditedPrices(prev => ({
      ...prev,
      [planId]: newPrice
    }));
  };

  const handleSave = async () => {
    try {
      setUpdating(true);
      const adminPassword = sessionStorage.getItem('adminPassword');
      const prices = Object.entries(editedPrices)
        .filter(([_, price]) => price > 0)
        .map(([planId, price]) => ({ planId, agent_price: price }));

      if (prices.length === 0) {
        toast.error('No prices to update');
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
        <p className="text-slate-600">Manage agent (reseller) pricing for all data plans</p>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedPlans).map(([network, plans]) => (
          <div key={network} className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
            {/* Network Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
              <h3 className="text-lg font-bold text-white">{network}</h3>
            </div>

            {/* Plans Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Plan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Validity</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">User Price</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">Agent Price</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">Edit Agent Price</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {plans.map(plan => {
                    const displayPrice = editedPrices[plan.id] ?? plan.agent_price;
                    const currentMargin = plan.user_price - displayPrice;
                    const isEdited = plan.id in editedPrices;

                    return (
                      <tr key={plan.id} className={isEdited ? 'bg-yellow-50' : 'hover:bg-slate-50'}>
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{plan.sizeLabel}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{plan.validity}</td>
                        <td className="px-6 py-4 text-sm text-right font-semibold text-slate-900">₦{plan.user_price.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-right font-medium text-slate-700">₦{plan.agent_price.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-right">
                          <input
                            type="number"
                            value={displayPrice || ''}
                            onChange={e => handlePriceChange(plan.id, parseInt(e.target.value) || 0)}
                            className={`w-24 px-3 py-2 rounded border text-sm text-right font-medium transition-colors ${
                              isEdited
                                ? 'border-yellow-500 bg-yellow-100 text-slate-900'
                                : 'border-slate-300 bg-white text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                            }`}
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
                            ₦{currentMargin.toLocaleString()}
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

      {/* Save Button */}
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
