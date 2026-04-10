'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import { ChevronLeft, AlertCircle, Zap, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Transaction {
  id: string;
  type: string;
  status: string;
  amount: number;
  phone: string;
  description: string;
  createdAt: string;
  reference: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, []);

  async function fetchTransactions() {
    try {
      setLoading(true);
      const res = await fetch('/api/transactions');
      if (!res.ok) throw new Error('Failed to fetch transactions');
      const data = await res.json();
      setTransactions(data.transactions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return 'text-green-600';
      case 'FAILED':
        return 'text-red-600';
      case 'PENDING':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return 'bg-green-50';
      case 'FAILED':
        return 'bg-red-50';
      case 'PENDING':
        return 'bg-yellow-50';
      default:
        return 'bg-gray-50';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'DATA_PURCHASE':
        return <Zap className="w-5 h-5" />;
      case 'AIRTIME_PURCHASE':
        return <CreditCard className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'DATA_PURCHASE':
        return 'Data Purchase';
      case 'AIRTIME_PURCHASE':
        return 'Airtime Purchase';
      case 'WALLET_FUNDING':
        return 'Wallet Top-up';
      default:
        return type.replace(/_/g, ' ');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 z-10">
        <div className="flex items-center gap-4">
          <Link href="/app">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ChevronLeft className="w-6 h-6" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Transaction History</h1>
            <p className="text-sm text-gray-600">View all your transactions</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6">
        {loading && (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && transactions.length === 0 && (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">📊</div>
            <h3 className="font-semibold text-gray-900 mb-2">No transactions yet</h3>
            <p className="text-gray-600 text-sm max-w-sm mx-auto">
              Start by purchasing data or airtime to see your transactions here
            </p>
          </div>
        )}

        {!loading && !error && transactions.length > 0 && (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className={`p-4 rounded-lg border border-gray-200 ${getStatusBgColor(tx.status)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`mt-1 ${getStatusColor(tx.status)}`}>
                      {getTypeIcon(tx.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {getTypeLabel(tx.type)}
                      </h3>
                      <p className="text-sm text-gray-600 truncate">
                        {tx.phone || tx.description || 'Transaction'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {format(new Date(tx.createdAt), 'MMM d, yyyy · h:mm a')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      ₦{tx.amount.toLocaleString()}
                    </p>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full inline-block mt-1 ${getStatusColor(
                        tx.status
                      )}`}
                    >
                      {tx.status === 'SUCCESS'
                        ? 'Successful'
                        : tx.status === 'FAILED'
                          ? 'Failed'
                          : 'Pending'}
                    </span>
                  </div>
                </div>
                {tx.reference && (
                  <p className="text-xs text-gray-500 mt-3 font-mono">Ref: {tx.reference.slice(0, 16)}...</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
