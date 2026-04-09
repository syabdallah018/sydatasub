"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast, Toaster } from "sonner";

interface Transaction {
  id: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  amount: number;
  phone: string;
  reference: string;
  description: string;
  createdAt: string;
}

export default function StatusContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reference = searchParams.get("reference");

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!reference) {
      router.push("/app");
      return;
    }

    const fetchTransaction = async () => {
      try {
        const res = await fetch(`/api/transactions/status?reference=${reference}`);
        if (res.ok) {
          const data = await res.json();
          setTransaction(data.transaction);
        } else {
          toast.error("Could not load transaction details");
        }
      } catch (error) {
        toast.error("Error loading transaction");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransaction();
    // Poll for status updates every 3 seconds
    const interval = setInterval(fetchTransaction, 3000);
    return () => clearInterval(interval);
  }, [reference, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500" />
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Transaction Not Found</h1>
          <p className="text-gray-600 mb-6">Unable to find your transaction details</p>
          <Button
            onClick={() => router.push("/app")}
            className="bg-teal-500 hover:bg-teal-600 text-white"
          >
            Go Back
          </Button>
        </motion.div>
      </div>
    );
  }

  const statusConfig = {
    SUCCESS: { icon: CheckCircle, color: "text-green-500", bg: "bg-green-50", title: "Purchase Successful! ✅" },
    PENDING: { icon: Clock, color: "text-amber-500", bg: "bg-amber-50", title: "Processing..." },
    FAILED: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-50", title: "Purchase Failed" },
  };

  const config = statusConfig[transaction.status];
  const Icon = config.icon;

  return (
    <div className={`min-h-screen ${config.bg} p-4`}>
      <div className="max-w-md mx-auto pt-12">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <Icon className={`w-16 h-16 ${config.color} mx-auto mb-4`} />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{config.title}</h1>

          <div className="bg-white rounded-xl p-6 mb-6 border border-gray-200">
            <div className="space-y-3 text-left">
              <div className="flex justify-between">
                <span className="text-gray-600">Phone:</span>
                <span className="font-semibold text-gray-900">{transaction.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-semibold text-gray-900">₦{transaction.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Reference:</span>
                <span className="text-sm font-mono text-gray-600">{transaction.reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    transaction.status === "SUCCESS"
                      ? "bg-green-100 text-green-700"
                      : transaction.status === "PENDING"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"
                  }`}
                >
                  {transaction.status}
                </span>
              </div>
              {transaction.description && (
                <div className="flex justify-between pt-3 border-t border-gray-200">
                  <span className="text-gray-600">Details:</span>
                  <span className="text-sm text-gray-600">{transaction.description}</span>
                </div>
              )}
            </div>
          </div>

          {transaction.status === "SUCCESS" && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-green-700 mb-6"
            >
              Your data has been credited to your phone line.
            </motion.p>
          )}

          {transaction.status === "PENDING" && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-amber-700 mb-6"
            >
              Please wait while we process your transaction...
            </motion.p>
          )}

          {transaction.status === "FAILED" && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-red-700 mb-6"
            >
              Your transaction could not be completed. Please try again.
            </motion.p>
          )}

          <div className="flex gap-3">
            <Button
              onClick={() => router.push("/app")}
              variant="outline"
              className="flex-1 border-gray-300"
            >
              Back to Login
            </Button>
            {transaction.status === "FAILED" && (
              <Button
                onClick={() => router.push("/app/checkout")}
                className="flex-1 bg-teal-500 hover:bg-teal-600 text-white"
              >
                Try Again
              </Button>
            )}
          </div>
        </motion.div>
      </div>
      <Toaster position="top-center" />
    </div>
  );
}
