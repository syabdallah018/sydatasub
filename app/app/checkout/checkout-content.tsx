"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast, Toaster } from "sonner";

interface DataPlan {
  id: string;
  name: string;
  network: string;
  sizeLabel: string;
  validity: string;
  price: number;
}

export default function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const phone = searchParams.get("phone");
  const isGuest = searchParams.get("guest") === "true";

  const [plans, setPlans] = useState<DataPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Fetch available data plans
    const fetchPlans = async () => {
      try {
        const res = await fetch("/api/data/plans", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setPlans(data.plans || []);
        } else {
          toast.error("Failed to load data plans");
        }
      } catch (error) {
        toast.error("Error loading plans");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const handlePurchase = async () => {
    if (!selectedPlan || !phone) {
      toast.error("Please select a plan");
      return;
    }

    setIsProcessing(true);
    try {
      // Create a guest transaction/payment
      const res = await fetch("/api/data/guest-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan,
          phone: phone,
          isGuest: true,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Purchase initiated! Checking your data now...");
        // Redirect to transaction status or success page
        setTimeout(() => {
          router.push(`/transaction-status?reference=${data.reference}`);
        }, 1000);
      } else {
        toast.error(data.error || "Purchase failed");
      }
    } catch (error) {
      toast.error("Network error during purchase");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
          >
            <ArrowLeft size={20} />
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Select Data Plan</h1>
          <div className="w-20" /> {/* Spacer for alignment */}
        </div>

        {/* Phone Display */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-4 bg-white rounded-xl border border-gray-200"
        >
          <p className="text-gray-600">
            <span className="font-semibold">Phone:</span> {phone}
            {isGuest && <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">Guest</span>}
          </p>
        </motion.div>

        {/* Plans Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500" />
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">No data plans available at the moment</p>
            <Button onClick={() => router.back()} className="bg-teal-500 hover:bg-teal-600 text-white">
              Go Back
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {plans.map((plan) => (
              <motion.div
                key={plan.id}
                whileHover={{ scale: 1.02 }}
                onClick={() => setSelectedPlan(plan.id)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition ${
                  selectedPlan === plan.id
                    ? "border-teal-500 bg-teal-50"
                    : "border-gray-200 bg-white hover:border-teal-300"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{plan.sizeLabel}</h3>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{plan.network}</span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{plan.name}</p>
                <div className="flex items-end justify-between">
                  <span className="text-xs text-gray-500">{plan.validity}</span>
                  <p className="text-xl font-bold text-teal-600">₦{plan.price.toLocaleString()}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Purchase Button */}
        {plans.length > 0 && (
          <div className="flex gap-4 sticky bottom-4">
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="flex-1 border-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePurchase}
              disabled={!selectedPlan || isProcessing}
              className="flex-1 bg-teal-500 hover:bg-teal-600 text-white"
            >
              {isProcessing ? "Processing..." : `Buy Now - ₦${plans.find((p) => p.id === selectedPlan)?.price.toLocaleString() || 0}`}
            </Button>
          </div>
        )}
      </div>
      <Toaster position="top-center" />
    </div>
  );
}