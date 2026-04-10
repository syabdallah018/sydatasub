"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { AppButton } from "@/components/app/AppButton";
import { PinInput } from "@/components/app/PinInput";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState as useReactState } from "react";

export interface DataPlan {
  id: string;
  name: string;
  price: number;
  dataSize: string;
  validity: string;
  networkId: string;
}

export interface Network {
  id: string;
  name: string;
  code: string;
  color: string;
  initial: string;
}

interface BuyDataSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchase: (plan: DataPlan, phone: string, pin: string) => Promise<void>;
  networks: Network[];
  plans: DataPlan[];
  isLoading?: boolean;
}

type Step = "network" | "plan" | "phone" | "pin";

export function BuyDataSheet({
  isOpen,
  onClose,
  onPurchase,
  networks,
  plans,
  isLoading = false,
}: BuyDataSheetProps) {
  const [currentStep, setCurrentStep] = useReactState<Step>("network");
  const [selectedNetwork, setSelectedNetwork] = useReactState<Network | null>(null);
  const [selectedPlan, setSelectedPlan] = useReactState<DataPlan | null>(null);
  const [phoneNumber, setPhoneNumber] = useReactState("");
  const [showPinModal, setShowPinModal] = useReactState(false);
  const [pinError, setPinError] = useReactState(false);
  const [isProcessing, setIsProcessing] = useReactState(false);

  const filteredPlans = selectedNetwork
    ? plans.filter((p) => p.networkId === selectedNetwork.id)
    : [];

  const handleNetworkSelect = (network: Network) => {
    setSelectedNetwork(network);
    setCurrentStep("plan");
  };

  const handlePlanSelect = (plan: DataPlan) => {
    setSelectedPlan(plan);
    setCurrentStep("phone");
  };

  const handlePhoneSubmit = () => {
    if (phoneNumber.length < 10) {
      return;
    }
    setCurrentStep("pin");
    setShowPinModal(true);
  };

  const handlePinComplete = async (pin: string) => {
    if (!selectedPlan || !selectedNetwork) return;

    setIsProcessing(true);
    setPinError(false);

    try {
      await onPurchase(selectedPlan, phoneNumber, pin);
      handleClose();
    } catch (error) {
      setPinError(true);
      // Reset after error shake animation
      setTimeout(() => {
        setPinError(false);
      }, 600);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setCurrentStep("network");
    setSelectedNetwork(null);
    setSelectedPlan(null);
    setPhoneNumber("");
    setShowPinModal(false);
    setPinError(false);
    onClose();
  };

  const handleBack = () => {
    if (currentStep === "plan") {
      setSelectedNetwork(null);
      setCurrentStep("network");
    } else if (currentStep === "phone") {
      setSelectedPlan(null);
      setCurrentStep("plan");
    }
  };

  return (
    <>
      <Sheet open={isOpen && !showPinModal} onOpenChange={(open) => !open && handleClose()}>
        <SheetContent side="bottom" className="bg-card-bg rounded-t-3xl border-0">
          <SheetHeader className="flex flex-row justify-between items-center mb-6">
            {currentStep !== "network" && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={handleBack}
                className="p-2 hover:bg-card-elevated rounded-lg transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </motion.button>
            )}
            <div className="flex-1 flex justify-center">
              <h2 className="text-xl font-heading font-bold text-text-primary">
                {currentStep === "network" && "Select Network"}
                {currentStep === "plan" && "Choose Plan"}
                {currentStep === "phone" && "Recipient"}
                {currentStep === "pin" && "Confirm PIN"}
              </h2>
            </div>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={handleClose}
              className="p-2 hover:bg-card-elevated rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </motion.button>
          </SheetHeader>

          <AnimatePresence mode="wait">
            {/* NETWORK SELECTION */}
            {currentStep === "network" && (
              <motion.div
                key="network"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-3 pb-8"
              >
                {networks.map((network, index) => (
                  <motion.button
                    key={network.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleNetworkSelect(network)}
                    className="w-full p-4 rounded-lg bg-card-elevated border border-border-primary hover:border-brand transition-all duration-200 text-left flex items-center gap-4"
                    whileTap={{ scale: 0.97 }}
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: network.color }}
                    >
                      {network.initial}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-text-primary">{network.name}</p>
                      <p className="text-xs text-text-tertiary">{network.code}</p>
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            )}

            {/* PLAN SELECTION */}
            {currentStep === "plan" && (
              <motion.div
                key="plan"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-2 pb-8"
              >
                {filteredPlans.map((plan, index) => (
                  <motion.button
                    key={plan.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handlePlanSelect(plan)}
                    className="w-full p-4 rounded-lg bg-card-elevated border border-border-primary hover:border-brand transition-all duration-200 flex items-center justify-between"
                    whileTap={{ scale: 0.97 }}
                  >
                    <div className="text-left flex-1">
                      <p className="font-semibold text-text-primary">{plan.dataSize}</p>
                      <p className="text-xs text-text-tertiary">{plan.validity}</p>
                    </div>
                    <p className="font-bold text-brand">₦{plan.price.toLocaleString()}</p>
                  </motion.button>
                ))}
              </motion.div>
            )}

            {/* PHONE INPUT */}
            {currentStep === "phone" && selectedPlan && (
              <motion.div
                key="phone"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6 pb-8"
              >
                {/* Summary Card */}
                <div className="bg-card-elevated rounded-lg p-4 border border-border-primary">
                  <p className="text-sm text-text-tertiary mb-1">Network</p>
                  <p className="font-semibold text-text-primary mb-4">{selectedNetwork?.name}</p>

                  <p className="text-sm text-text-tertiary mb-1">Plan</p>
                  <p className="font-semibold text-text-primary mb-4">{selectedPlan.dataSize}</p>

                  <p className="text-sm text-text-tertiary mb-1">Price</p>
                  <p className="font-heading font-bold text-brand text-lg">
                    ₦{selectedPlan.price.toLocaleString()}
                  </p>
                </div>

                {/* Phone Input */}
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-3">
                    Recipient Phone Number
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary font-semibold">
                      +234
                    </span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      placeholder="(70x) xxx-xxxx"
                      value={phoneNumber}
                      onChange={(e) =>
                        setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))
                      }
                      maxLength={10}
                      className="w-full pl-14 pr-4 py-3 bg-input-bg border border-border-primary rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>
                </div>

                <AppButton
                  onClick={handlePhoneSubmit}
                  disabled={phoneNumber.length < 10}
                  fullWidth
                  size="lg"
                >
                  Continue
                </AppButton>
              </motion.div>
            )}
          </AnimatePresence>
        </SheetContent>
      </Sheet>

      {/* PIN CONFIRMATION MODAL */}
      <Dialog open={showPinModal} onOpenChange={(open) => !open && setShowPinModal(false)}>
        <DialogContent className="bg-card-bg border-border-primary">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading font-bold text-text-primary">
              Confirm with PIN
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-6">
            <p className="text-center text-text-secondary">
              Enter your 6-digit PIN to complete this transaction
            </p>

            <PinInput
              onComplete={handlePinComplete}
              error={pinError}
              disabled={isProcessing}
              autoFocus={true}
            />

            {pinError && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center text-error text-sm font-semibold"
              >
                Invalid PIN. Please try again.
              </motion.p>
            )}

            <p className="text-xs text-text-tertiary text-center">
              Your PIN is never stored or shared. You can change it anytime in settings.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
