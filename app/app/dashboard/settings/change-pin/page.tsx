"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ChangePinPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [currentPin, setCurrentPin] = useState(["", "", "", "", "", ""]);
  const [newPin, setNewPin] = useState(["", "", "", "", "", ""]);
  const [confirmPin, setConfirmPin] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePinChange = (
    pinArray: string[],
    setPinArray: (arr: string[]) => void,
    index: number,
    value: string
  ) => {
    if (value.length > 1) return;
    const newArray = [...pinArray];
    newArray[index] = value;
    setPinArray(newArray);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`pin-${step}-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handlePinKeyDown = (
    pinArray: string[],
    setPinArray: (arr: string[]) => void,
    index: number,
    e: React.KeyboardEvent
  ) => {
    if (e.key === "Backspace" && !pinArray[index] && index > 0) {
      const prevInput = document.getElementById(`pin-${step}-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerifyCurrentPin = async () => {
    const pinValue = currentPin.join("");
    if (pinValue.length !== 6) {
      setError("Please enter a 6-digit PIN");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinValue }),
      });

      const data = await res.json();

      if (res.ok && data.valid) {
        setStep(2);
        toast.success("PIN verified");
      } else {
        setError("Current PIN is incorrect");
        // Shake animation
        document.getElementById("pin-inputs")?.classList.add("shake");
        setTimeout(() => {
          document.getElementById("pin-inputs")?.classList.remove("shake");
        }, 500);
      }
    } catch (error) {
      setError("Network error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePin = async () => {
    const newPinValue = newPin.join("");
    const confirmPinValue = confirmPin.join("");

    if (newPinValue.length !== 6) {
      setError("Please enter a 6-digit new PIN");
      return;
    }

    if (confirmPinValue.length !== 6) {
      setError("Please confirm your new PIN");
      return;
    }

    if (newPinValue !== confirmPinValue) {
      setError("New PIN and confirmation do not match");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/change-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPin: currentPin.join(""),
          newPin: newPinValue,
          confirmPin: confirmPinValue,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("PIN changed successfully!");
        setTimeout(() => {
          router.back();
        }, 1000);
      } else {
        setError(data.error || "Failed to change PIN");
      }
    } catch (error) {
      setError("Network error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--app-bg,#0A0F0E)] text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 backdrop-blur-sm bg-[var(--app-bg,#0A0F0E)]/80 border-b border-white/10 p-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="text-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">Change PIN</h1>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
        {/* Progress Indicator */}
        <div className="flex gap-2 mb-12">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 w-12 rounded-full transition-all ${
                s <= step
                  ? "bg-teal-500"
                  : "bg-white/10"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-sm text-center"
            >
              <h2 className="text-2xl font-bold mb-2">Verify Your PIN</h2>
              <p className="text-white/60 mb-8">
                Enter your current 6-digit PIN to proceed
              </p>

              {/* PIN Input */}
              <div
                id="pin-inputs"
                className="flex gap-2 justify-center mb-8"
              >
                {currentPin.map((digit, index) => (
                  <input
                    key={index}
                    id={`pin-${step}-${index}`}
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) =>
                      handlePinChange(
                        currentPin,
                        setCurrentPin,
                        index,
                        e.target.value
                      )
                    }
                    onKeyDown={(e) =>
                      handlePinKeyDown(currentPin, setCurrentPin, index, e)
                    }
                    className="w-14 h-14 text-center bg-slate-800/50 border border-slate-600 rounded-lg text-white text-2xl font-mono focus:border-teal-400 focus:outline-none transition"
                  />
                ))}
              </div>

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 mb-6 p-3 rounded-lg bg-red-500/20 border border-red-500/50"
                >
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <p className="text-sm text-red-200">{error}</p>
                </motion.div>
              )}

              <Button
                onClick={handleVerifyCurrentPin}
                disabled={isLoading || currentPin.some((d) => !d)}
                className="w-full bg-teal-500 hover:bg-teal-600 text-white"
              >
                {isLoading ? "Verifying..." : "Verify PIN"}
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-sm text-center"
            >
              <h2 className="text-2xl font-bold mb-2">New PIN</h2>
              <p className="text-white/60 mb-8">
                Enter your new 6-digit PIN
              </p>

              {/* PIN Input */}
              <div className="flex gap-2 justify-center mb-8">
                {newPin.map((digit, index) => (
                  <input
                    key={index}
                    id={`pin-${step}-${index}`}
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) =>
                      handlePinChange(newPin, setNewPin, index, e.target.value)
                    }
                    onKeyDown={(e) =>
                      handlePinKeyDown(newPin, setNewPin, index, e)
                    }
                    className="w-14 h-14 text-center bg-slate-800/50 border border-slate-600 rounded-lg text-white text-2xl font-mono focus:border-teal-400 focus:outline-none transition"
                  />
                ))}
              </div>

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 mb-6 p-3 rounded-lg bg-red-500/20 border border-red-500/50"
                >
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <p className="text-sm text-red-200">{error}</p>
                </motion.div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setStep(1);
                    setError("");
                  }}
                  variant="outline"
                  className="flex-1 border-white/20 text-white hover:bg-white/10"
                >
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={newPin.some((d) => !d)}
                  className="flex-1 bg-teal-500 hover:bg-teal-600 text-white"
                >
                  Next
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-sm text-center"
            >
              <h2 className="text-2xl font-bold mb-2">Confirm PIN</h2>
              <p className="text-white/60 mb-8">
                Confirm your new 6-digit PIN
              </p>

              {/* PIN Input */}
              <div className="flex gap-2 justify-center mb-8">
                {confirmPin.map((digit, index) => (
                  <input
                    key={index}
                    id={`pin-${step}-${index}`}
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) =>
                      handlePinChange(
                        confirmPin,
                        setConfirmPin,
                        index,
                        e.target.value
                      )
                    }
                    onKeyDown={(e) =>
                      handlePinKeyDown(confirmPin, setConfirmPin, index, e)
                    }
                    className="w-14 h-14 text-center bg-slate-800/50 border border-slate-600 rounded-lg text-white text-2xl font-mono focus:border-teal-400 focus:outline-none transition"
                  />
                ))}
              </div>

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 mb-6 p-3 rounded-lg bg-red-500/20 border border-red-500/50"
                >
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <p className="text-sm text-red-200">{error}</p>
                </motion.div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setStep(2);
                    setError("");
                  }}
                  variant="outline"
                  className="flex-1 border-white/20 text-white hover:bg-white/10"
                >
                  Back
                </Button>
                <Button
                  onClick={handleChangePin}
                  disabled={isLoading || confirmPin.some((d) => !d)}
                  className="flex-1 bg-teal-500 hover:bg-teal-600 text-white"
                >
                  {isLoading ? "Changing..." : "Change PIN"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* CSS for shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}
