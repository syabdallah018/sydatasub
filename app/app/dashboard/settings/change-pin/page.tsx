"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Check, AlertCircle, Mail, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ChangePinPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Standard Change Flow States
  const [currentPin, setCurrentPin] = useState(["", "", "", "", "", ""]);
  const [newPin, setNewPin] = useState(["", "", "", "", "", ""]);
  const [confirmPin, setConfirmPin] = useState(["", "", "", "", "", ""]);

  // Forgot / Reset Flow States
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1 = send code, 2 = verify code, 3 = input new PIN, 4 = confirm new PIN
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  // Resend OTP Countdown Timer Hook
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handlePinChange = (
    pinArray: string[],
    setPinArray: (arr: string[]) => void,
    index: number,
    value: string,
    prefixId: string
  ) => {
    if (value.length > 1) return;
    const newArray = [...pinArray];
    newArray[index] = value;
    setPinArray(newArray);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`${prefixId}-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handlePinKeyDown = (
    pinArray: string[],
    index: number,
    prefixId: string,
    e: React.KeyboardEvent
  ) => {
    if (e.key === "Backspace" && !pinArray[index] && index > 0) {
      const prevInput = document.getElementById(`${prefixId}-${index - 1}`);
      prevInput?.focus();
    }
  };

  // Flow 1: Verify Current PIN
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
        document.getElementById("pin-inputs-verify")?.classList.add("shake");
        setTimeout(() => {
          document.getElementById("pin-inputs-verify")?.classList.remove("shake");
        }, 500);
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setIsLoading(false);
    }
  };

  // Flow 1: Change PIN with Current PIN
  const handleChangePin = async () => {
    const newPinValue = newPin.join("");
    const confirmPinValue = confirmPin.join("");

    if (newPinValue.length !== 6 || confirmPinValue.length !== 6) {
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
        setTimeout(() => router.back(), 1000);
      } else {
        setError(data.error || "Failed to change PIN");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setIsLoading(false);
    }
  };

  // Flow 2: Trigger Resend Reset Code
  const handleSendResetCode = async (isResend = false) => {
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-pin/send", { method: "POST" });
      const data = await res.json();

      if (res.ok) {
        setMaskedEmail(data.email);
        setIsForgotMode(true);
        setForgotStep(2); // Go to verification code input screen
        setResendTimer(60); // Set resend cooldown to 60 seconds
        toast.success(isResend ? "New verification code sent!" : "Verification code sent!");
      } else {
        setError(data.error || "Failed to send reset code");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setIsLoading(false);
    }
  };

  // Flow 2: Verify Verification Code (OTP)
  const handleVerifyResetOtp = async () => {
    const otpValue = otpCode.join("");
    if (otpValue.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-pin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otpCode: otpValue }),
      });

      const data = await res.json();

      if (res.ok) {
        setForgotStep(3); // Go to input new PIN screen
        toast.success("Code verified successfully");
      } else {
        setError(data.error || "Invalid or expired verification code");
        document.getElementById("pin-inputs-otp")?.classList.add("shake");
        setTimeout(() => {
          document.getElementById("pin-inputs-otp")?.classList.remove("shake");
        }, 500);
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setIsLoading(false);
    }
  };

  // Flow 2: Reset PIN with OTP Code
  const handleResetPin = async () => {
    const newPinValue = newPin.join("");
    const confirmPinValue = confirmPin.join("");

    if (newPinValue.length !== 6 || confirmPinValue.length !== 6) {
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
      const res = await fetch("/api/auth/forgot-pin/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          otpCode: otpCode.join(""),
          newPin: newPinValue,
          confirmPin: confirmPinValue,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("PIN reset completed successfully!");
        setTimeout(() => router.back(), 1000);
      } else {
        setError(data.error || "Failed to reset PIN");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setIsLoading(false);
    }
  };

  // Back trigger handling both flows
  const handleBack = () => {
    if (isForgotMode) {
      if (forgotStep === 2) {
        setIsForgotMode(false);
        setForgotStep(1);
        setError("");
      } else if (forgotStep === 3) {
        setForgotStep(2);
        setError("");
      } else if (forgotStep === 4) {
        setForgotStep(3);
        setError("");
      }
    } else {
      if (step === 1) {
        router.back();
      } else {
        setStep(step - 1);
        setError("");
      }
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
            onClick={handleBack}
            className="text-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">{isForgotMode ? "Reset PIN" : "Change PIN"}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
        {/* Progress Indicator */}
        <div className="flex gap-2 mb-12">
          {isForgotMode ? (
            [2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-2 w-12 rounded-full transition-all ${
                  s <= forgotStep ? "bg-teal-500" : "bg-white/10"
                }`}
              />
            ))
          ) : (
            [1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 w-12 rounded-full transition-all ${
                  s <= step ? "bg-teal-500" : "bg-white/10"
                }`}
              />
            ))
          )}
        </div>

        <AnimatePresence mode="wait">
          {/* ================================================================= */}
          {/* FLOW 1: STANDARD CHANGE PIN FLOW                                 */}
          {/* ================================================================= */}
          {!isForgotMode && step === 1 && (
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

              <div id="pin-inputs-verify" className="flex gap-2 justify-center mb-8">
                {currentPin.map((digit, index) => (
                  <input
                    key={index}
                    id={`pin-current-${index}`}
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) =>
                      handlePinChange(currentPin, setCurrentPin, index, e.target.value, "pin-current")
                    }
                    onKeyDown={(e) => handlePinKeyDown(currentPin, index, "pin-current", e)}
                    className="w-12 h-12 md:w-14 md:h-14 text-center bg-slate-800/50 border border-slate-600 rounded-lg text-white text-2xl font-mono focus:border-teal-400 focus:outline-none transition"
                  />
                ))}
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 mb-6 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-left"
                >
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                  <p className="text-sm text-red-200">{error}</p>
                </motion.div>
              )}

              <Button
                onClick={handleVerifyCurrentPin}
                disabled={isLoading || currentPin.some((d) => !d)}
                className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold h-11"
              >
                {isLoading ? "Verifying..." : "Verify PIN"}
              </Button>

              <button
                onClick={() => handleSendResetCode(false)}
                disabled={isLoading}
                className="mt-6 text-sm text-teal-400 hover:text-teal-300 font-bold transition block mx-auto underline cursor-pointer disabled:opacity-50"
              >
                Forgot PIN?
              </button>
            </motion.div>
          )}

          {!isForgotMode && step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-sm text-center"
            >
              <h2 className="text-2xl font-bold mb-2">New PIN</h2>
              <p className="text-white/60 mb-8">Enter your new 6-digit PIN</p>

              <div className="flex gap-2 justify-center mb-8">
                {newPin.map((digit, index) => (
                  <input
                    key={index}
                    id={`pin-new-${index}`}
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) =>
                      handlePinChange(newPin, setNewPin, index, e.target.value, "pin-new")
                    }
                    onKeyDown={(e) => handlePinKeyDown(newPin, index, "pin-new", e)}
                    className="w-12 h-12 md:w-14 md:h-14 text-center bg-slate-800/50 border border-slate-600 rounded-lg text-white text-2xl font-mono focus:border-teal-400 focus:outline-none transition"
                  />
                ))}
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 mb-6 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-left"
                >
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                  <p className="text-sm text-red-200">{error}</p>
                </motion.div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="flex-1 border-white/20 text-white hover:bg-white/10 font-bold h-11"
                >
                  Back
                </Button>
                <Button
                  onClick={() => {
                    if (newPin.some((d) => !d)) {
                      setError("Please fill in the PIN fields");
                    } else {
                      setError("");
                      setStep(3);
                    }
                  }}
                  disabled={newPin.some((d) => !d)}
                  className="flex-1 bg-teal-500 hover:bg-teal-600 text-white font-bold h-11"
                >
                  Next
                </Button>
              </div>
            </motion.div>
          )}

          {!isForgotMode && step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-sm text-center"
            >
              <h2 className="text-2xl font-bold mb-2">Confirm PIN</h2>
              <p className="text-white/60 mb-8">Confirm your new 6-digit PIN</p>

              <div className="flex gap-2 justify-center mb-8">
                {confirmPin.map((digit, index) => (
                  <input
                    key={index}
                    id={`pin-confirm-${index}`}
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) =>
                      handlePinChange(confirmPin, setConfirmPin, index, e.target.value, "pin-confirm")
                    }
                    onKeyDown={(e) => handlePinKeyDown(confirmPin, index, "pin-confirm", e)}
                    className="w-12 h-12 md:w-14 md:h-14 text-center bg-slate-800/50 border border-slate-600 rounded-lg text-white text-2xl font-mono focus:border-teal-400 focus:outline-none transition"
                  />
                ))}
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 mb-6 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-left"
                >
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                  <p className="text-sm text-red-200">{error}</p>
                </motion.div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="flex-1 border-white/20 text-white hover:bg-white/10 font-bold h-11"
                >
                  Back
                </Button>
                <Button
                  onClick={handleChangePin}
                  disabled={isLoading || confirmPin.some((d) => !d)}
                  className="flex-1 bg-teal-500 hover:bg-teal-600 text-white font-bold h-11"
                >
                  {isLoading ? "Changing..." : "Change PIN"}
                </Button>
              </div>
            </motion.div>
          )}

          {/* ================================================================= */}
          {/* FLOW 2: FORGOT PIN RESET OTP FLOW                                */}
          {/* ================================================================= */}
          {isForgotMode && forgotStep === 2 && (
            <motion.div
              key="forgot2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-sm text-center"
            >
              <div className="flex justify-center mb-4">
                <div className="p-3.5 bg-teal-500/10 border border-teal-500/20 rounded-full text-teal-400">
                  <Mail className="h-6 w-6 animate-pulse" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2">Verification Code</h2>
              <p className="text-white/60 mb-8 text-sm leading-relaxed">
                Enter the 6-digit verification code dispatched to <span className="text-teal-400 font-semibold">{maskedEmail}</span>
              </p>

              <div id="pin-inputs-otp" className="flex gap-2 justify-center mb-8">
                {otpCode.map((digit, index) => (
                  <input
                    key={index}
                    id={`pin-otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) =>
                      handlePinChange(otpCode, setOtpCode, index, e.target.value, "pin-otp")
                    }
                    onKeyDown={(e) => handlePinKeyDown(otpCode, index, "pin-otp", e)}
                    className="w-12 h-12 md:w-14 md:h-14 text-center bg-slate-800/50 border border-slate-600 rounded-lg text-white text-2xl font-mono focus:border-teal-400 focus:outline-none transition font-bold"
                  />
                ))}
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 mb-6 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-left"
                >
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                  <p className="text-sm text-red-200">{error}</p>
                </motion.div>
              )}

              <Button
                onClick={handleVerifyResetOtp}
                disabled={isLoading || otpCode.some((d) => !d)}
                className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold h-11 mb-6"
              >
                {isLoading ? "Verifying Code..." : "Verify Code"}
              </Button>

              <div className="flex justify-center text-xs">
                {resendTimer > 0 ? (
                  <p className="text-white/40">
                    Resend code in <span className="text-teal-400 font-semibold">{resendTimer}s</span>
                  </p>
                ) : (
                  <button
                    onClick={() => handleSendResetCode(true)}
                    disabled={isLoading}
                    className="text-teal-400 hover:text-teal-300 font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RotateCw className="w-3 h-3" /> Resend Code
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {isForgotMode && forgotStep === 3 && (
            <motion.div
              key="forgot3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-sm text-center"
            >
              <h2 className="text-2xl font-bold mb-2">Choose New PIN</h2>
              <p className="text-white/60 mb-8">Enter your new 6-digit transaction PIN</p>

              <div className="flex gap-2 justify-center mb-8">
                {newPin.map((digit, index) => (
                  <input
                    key={index}
                    id={`pin-newforgot-${index}`}
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) =>
                      handlePinChange(newPin, setNewPin, index, e.target.value, "pin-newforgot")
                    }
                    onKeyDown={(e) => handlePinKeyDown(newPin, index, "pin-newforgot", e)}
                    className="w-12 h-12 md:w-14 md:h-14 text-center bg-slate-800/50 border border-slate-600 rounded-lg text-white text-2xl font-mono focus:border-teal-400 focus:outline-none transition"
                  />
                ))}
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 mb-6 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-left"
                >
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                  <p className="text-sm text-red-200">{error}</p>
                </motion.div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="flex-1 border-white/20 text-white hover:bg-white/10 font-bold h-11"
                >
                  Back
                </Button>
                <Button
                  onClick={() => {
                    if (newPin.some((d) => !d)) {
                      setError("Please fill in the PIN fields");
                    } else {
                      setError("");
                      setForgotStep(4);
                    }
                  }}
                  disabled={newPin.some((d) => !d)}
                  className="flex-1 bg-teal-500 hover:bg-teal-600 text-white font-bold h-11"
                >
                  Next
                </Button>
              </div>
            </motion.div>
          )}

          {isForgotMode && forgotStep === 4 && (
            <motion.div
              key="forgot4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-sm text-center"
            >
              <h2 className="text-2xl font-bold mb-2">Confirm New PIN</h2>
              <p className="text-white/60 mb-8">Verify the matching digits of your new PIN</p>

              <div className="flex gap-2 justify-center mb-8">
                {confirmPin.map((digit, index) => (
                  <input
                    key={index}
                    id={`pin-confirmforgot-${index}`}
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) =>
                      handlePinChange(confirmPin, setConfirmPin, index, e.target.value, "pin-confirmforgot")
                    }
                    onKeyDown={(e) => handlePinKeyDown(confirmPin, index, "pin-confirmforgot", e)}
                    className="w-12 h-12 md:w-14 md:h-14 text-center bg-slate-800/50 border border-slate-600 rounded-lg text-white text-2xl font-mono focus:border-teal-400 focus:outline-none transition"
                  />
                ))}
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 mb-6 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-left"
                >
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                  <p className="text-sm text-red-200">{error}</p>
                </motion.div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="flex-1 border-white/20 text-white hover:bg-white/10 font-bold h-11"
                >
                  Back
                </Button>
                <Button
                  onClick={handleForgotResetPin}
                  disabled={isLoading || confirmPin.some((d) => !d)}
                  className="flex-1 bg-teal-500 hover:bg-teal-600 text-white font-bold h-11"
                >
                  {isLoading ? "Resetting..." : "Reset PIN"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
