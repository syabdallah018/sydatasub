'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import { ChevronLeft, AlertCircle, Zap, CreditCard, X } from 'lucide-react';
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
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, []);

  async function fetchTransactions() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/transactions');
      console.log('[TRANSACTIONS PAGE] Response status:', res.status);
      if (!res.ok) throw new Error(`Failed to fetch transactions: ${res.statusText}`);
      const data = await res.json();
      console.log('[TRANSACTIONS PAGE] Data:', data);
      if (data.success) {
        setTransactions(data.transactions || []);
      } else {
        throw new Error(data.error || 'Failed to load transactions');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load transactions';
      setError(message);
      console.error('[TRANSACTIONS PAGE] Error:', message);
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
                onClick={() => {
                  setSelectedTransaction(tx);
                  setReceiptModalOpen(true);
                }}
                className={`p-4 rounded-lg border border-gray-200 cursor-pointer transition-shadow hover:shadow-md ${getStatusBgColor(tx.status)}`}
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

      {/* Receipt Modal */}
      {receiptModalOpen && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
          <div className="w-full bg-white rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            {/* Close Button */}
            <button
              onClick={() => {
                setReceiptModalOpen(false);
                setSelectedTransaction(null);
              }}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={24} className="text-gray-600" />
            </button>

            {/* Header */}
            <div className="text-center mb-6 mt-2">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                selectedTransaction.status === 'SUCCESS'
                  ? 'bg-green-100'
                  : selectedTransaction.status === 'FAILED'
                  ? 'bg-red-100'
                  : 'bg-yellow-100'
              }`}>
                {selectedTransaction.status === 'SUCCESS' ? (
                  <Zap className="text-green-600" size={32} />
                ) : selectedTransaction.status === 'FAILED' ? (
                  <AlertCircle className="text-red-600" size={32} />
                ) : (
                  <CreditCard className="text-yellow-600" size={32} />
                )}
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedTransaction.status === 'SUCCESS'
                  ? 'Transaction Successful'
                  : selectedTransaction.status === 'FAILED'
                  ? 'Transaction Failed'
                  : 'Pending'}
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                ₦{selectedTransaction.amount.toLocaleString()}
              </p>
            </div>

            {/* Receipt Details Box */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 space-y-5 mb-6">
              {/* Transaction Type */}
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Transaction Type</p>
                  <p className="text-gray-900 font-semibold text-lg">
                    {selectedTransaction.type === 'DATA' ? 'Data Purchase' : 'Airtime Purchase'}
                  </p>
                </div>
              </div>

              {/* Phone Number */}
              <div className="border-t border-blue-200 pt-4 flex justify-between items-start">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Phone Number</p>
                  <p className="text-gray-900 font-semibold text-lg font-mono">
                    {selectedTransaction.phone}
                  </p>
                </div>
              </div>

              {/* Amount */}
              <div className="border-t border-blue-200 pt-4 flex justify-between items-start">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Amount</p>
                  <p className="text-gray-900 font-semibold text-lg">
                    ₦{selectedTransaction.amount.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Status */}
              <div className="border-t border-blue-200 pt-4 flex justify-between items-start">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Status</p>
                  <div className="mt-1">
                    <span
                      className={`text-xs font-bold px-3 py-1.5 rounded-full inline-block ${getStatusColor(
                        selectedTransaction.status
                      )}`}
                    >
                      {selectedTransaction.status === 'SUCCESS'
                        ? '✓ Successful'
                        : selectedTransaction.status === 'FAILED'
                        ? '✗ Failed'
                        : '⏱ Pending'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Date & Time */}
              <div className="border-t border-blue-200 pt-4 flex justify-between items-start">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Date & Time</p>
                  <p className="text-gray-900 font-semibold">
                    {format(new Date(selectedTransaction.createdAt), 'MMM d, yyyy')}
                  </p>
                  <p className="text-gray-600 text-sm">
                    {format(new Date(selectedTransaction.createdAt), 'h:mm a')}
                  </p>
                </div>
              </div>

              {/* Reference */}
              {selectedTransaction.reference && (
                <div className="border-t border-blue-200 pt-4 flex justify-between items-start">
                  <div className="w-full">
                    <p className="text-gray-600 text-sm font-medium">Reference</p>
                    <p className="text-gray-900 font-mono text-xs mt-2 break-all bg-white p-2 rounded border border-blue-100">
                      {selectedTransaction.reference}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Close Button */}
            <Button
              onClick={() => {
                setReceiptModalOpen(false);
                setSelectedTransaction(null);
              }}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 rounded-xl transition-all"
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
