"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, AlertCircle, Mail, RotateCw, Lock, KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function ChangePinPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Standard Change Flow
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  // Forgot / Reset Flow
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotStep, setForgotStep] = useState<"otp" | "reset">("otp");
  const [otpCode, setOtpCode] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [resetNewPin, setResetNewPin] = useState("");
  const [resetConfirmPin, setResetConfirmPin] = useState("");

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // ─── CHANGE PIN (with current PIN) ───
  const handleChangePin = async () => {
    if (currentPin.length !== 6) {
      setError("Current PIN must be 6 digits");
      return;
    }
    if (newPin.length !== 6) {
      setError("New PIN must be 6 digits");
      return;
    }
    if (newPin !== confirmPin) {
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
          currentPin,
          newPin,
          confirmPin,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("PIN changed successfully!");
        setTimeout(() => router.back(), 800);
      } else {
        setError(data.error || "Failed to change PIN");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ─── FORGOT PIN: Send OTP ───
  const handleSendResetCode = async (isResend = false) => {
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-pin/send", { method: "POST" });
      const data = await res.json();

      if (res.ok) {
        setMaskedEmail(data.email);
        setIsForgotMode(true);
        setForgotStep("otp");
        setResendTimer(60);
        toast.success(isResend ? "New code sent!" : "Verification code sent!");
      } else {
        setError(data.error || "Failed to send reset code");
      }
    } catch {
      setError("Network error");
    } finally {
      setIsLoading(false);
    }
  };

  // ─── FORGOT PIN: Verify OTP ───
  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      setError("Enter the 6-digit code");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-pin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otpCode }),
      });

      const data = await res.json();

      if (res.ok) {
        setForgotStep("reset");
        toast.success("Code verified!");
      } else {
        setError(data.error || "Invalid or expired code");
      }
    } catch {
      setError("Network error");
    } finally {
      setIsLoading(false);
    }
  };

  // ─── FORGOT PIN: Reset PIN ───
  const handleResetPin = async () => {
    if (resetNewPin.length !== 6) {
      setError("New PIN must be 6 digits");
      return;
    }
    if (resetNewPin !== resetConfirmPin) {
      setError("PINs do not match");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-pin/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          otpCode,
          newPin: resetNewPin,
          confirmPin: resetConfirmPin,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("PIN reset successfully!");
        setTimeout(() => router.back(), 800);
      } else {
        setError(data.error || "Failed to reset PIN");
      }
    } catch {
      setError("Network error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0A0F0E" }}>
      {/* ── Header ── */}
      <div
        className="sticky top-0 z-50 px-4 py-3.5 flex items-center gap-3 border-b"
        style={{ backgroundColor: "#0A0F0E", borderColor: "rgba(255,255,255,0.08)" }}
      >
        <button
          onClick={() => {
            if (isForgotMode && forgotStep === "reset") {
              setForgotStep("otp");
              setError("");
            } else if (isForgotMode) {
              setIsForgotMode(false);
              setError("");
            } else {
              router.back();
            }
          }}
          className="p-1.5 rounded-lg"
          style={{ color: "#94a3b8" }}
        >
          <ChevronLeft size={22} />
        </button>
        <h1 className="text-base font-bold" style={{ color: "#e2e8f0" }}>
          {isForgotMode ? "Reset PIN" : "Change PIN"}
        </h1>
      </div>

      {/* ── Content ── */}
      <div className="px-5 py-6 max-w-md mx-auto">
        {/* ═══════════════════════════════════════════ */}
        {/* STANDARD CHANGE PIN — Single Screen Flow   */}
        {/* ═══════════════════════════════════════════ */}
        {!isForgotMode && (
          <div>
            {/* Title */}
            <div className="text-center mb-8">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: "rgba(20,184,166,0.1)", border: "1px solid rgba(20,184,166,0.2)" }}
              >
                <KeyRound size={24} style={{ color: "#14b8a6" }} />
              </div>
              <h2 className="text-xl font-bold mb-1" style={{ color: "#f1f5f9" }}>
                Change Your PIN
              </h2>
              <p className="text-sm" style={{ color: "#64748b" }}>
                Enter your current PIN and choose a new one
              </p>
            </div>

            {/* Current PIN */}
            <div className="mb-5">
              <label className="flex items-center gap-2 text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: "#94a3b8" }}>
                <Lock size={13} style={{ color: "#14b8a6" }} />
                Current PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter your current 6-digit PIN"
                className="w-full px-4 py-3.5 rounded-xl text-sm font-mono tracking-[0.3em] text-center outline-none transition"
                style={{
                  backgroundColor: "rgba(30,41,59,0.5)",
                  border: "1px solid rgba(100,116,139,0.3)",
                  color: "#e2e8f0",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#14b8a6")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(100,116,139,0.3)")}
              />
            </div>

            {/* Connector line */}
            <div className="flex justify-center my-1">
              <div className="w-px h-5" style={{ backgroundColor: "rgba(100,116,139,0.3)" }} />
            </div>

            {/* New PIN */}
            <div className="mb-5">
              <label className="flex items-center gap-2 text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: "#94a3b8" }}>
                <ShieldCheck size={13} style={{ color: "#14b8a6" }} />
                New PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter your new 6-digit PIN"
                className="w-full px-4 py-3.5 rounded-xl text-sm font-mono tracking-[0.3em] text-center outline-none transition"
                style={{
                  backgroundColor: "rgba(30,41,59,0.5)",
                  border: "1px solid rgba(100,116,139,0.3)",
                  color: "#e2e8f0",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#14b8a6")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(100,116,139,0.3)")}
              />
            </div>

            {/* Connector line */}
            <div className="flex justify-center my-1">
              <div className="w-px h-5" style={{ backgroundColor: "rgba(100,116,139,0.3)" }} />
            </div>

            {/* Confirm PIN */}
            <div className="mb-6">
              <label className="flex items-center gap-2 text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: "#94a3b8" }}>
                <ShieldCheck size={13} style={{ color: "#14b8a6" }} />
                Confirm New PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Confirm your new 6-digit PIN"
                className="w-full px-4 py-3.5 rounded-xl text-sm font-mono tracking-[0.3em] text-center outline-none transition"
                style={{
                  backgroundColor: "rgba(30,41,59,0.5)",
                  border: "1px solid rgba(100,116,139,0.3)",
                  color: "#e2e8f0",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#14b8a6")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(100,116,139,0.3)")}
              />
            </div>

            {/* Error */}
            {error && (
              <div
                className="flex items-center gap-2.5 mb-5 p-3 rounded-xl text-left"
                style={{
                  backgroundColor: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.25)",
                }}
              >
                <AlertCircle size={16} style={{ color: "#f87171" }} className="shrink-0" />
                <p className="text-sm" style={{ color: "#fca5a5" }}>
                  {error}
                </p>
              </div>
            )}

            {/* Change PIN Button */}
            <button
              onClick={handleChangePin}
              disabled={isLoading || !currentPin || !newPin || !confirmPin}
              className="w-full py-3.5 rounded-xl text-sm font-bold transition disabled:opacity-40"
              style={{
                backgroundColor: "#14b8a6",
                color: "#fff",
              }}
            >
              {isLoading ? "Changing PIN..." : "Change PIN"}
            </button>

            {/* Forgot PIN underlined link */}
            <div className="text-center mt-5">
              <button
                onClick={() => handleSendResetCode(false)}
                disabled={isLoading}
                className="text-sm font-bold transition disabled:opacity-40"
                style={{
                  color: "#14b8a6",
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Forgot PIN?
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* FORGOT PIN — OTP Verification              */}
        {/* ═══════════════════════════════════════════ */}
        {isForgotMode && forgotStep === "otp" && (
          <div>
            <div className="text-center mb-8">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: "rgba(20,184,166,0.1)", border: "1px solid rgba(20,184,166,0.2)" }}
              >
                <Mail size={24} style={{ color: "#14b8a6" }} />
              </div>
              <h2 className="text-xl font-bold mb-1" style={{ color: "#f1f5f9" }}>
                Verification Code
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: "#64748b" }}>
                Enter the 6-digit code sent to{" "}
                <span className="font-semibold" style={{ color: "#14b8a6" }}>
                  {maskedEmail}
                </span>
              </p>
            </div>

            {/* OTP Input */}
            <div className="mb-5">
              <label className="flex items-center gap-2 text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: "#94a3b8" }}>
                Verification Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter 6-digit code"
                className="w-full px-4 py-3.5 rounded-xl text-sm font-mono tracking-[0.5em] text-center outline-none transition"
                style={{
                  backgroundColor: "rgba(30,41,59,0.5)",
                  border: "1px solid rgba(100,116,139,0.3)",
                  color: "#e2e8f0",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#14b8a6")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(100,116,139,0.3)")}
              />
            </div>

            {error && (
              <div
                className="flex items-center gap-2.5 mb-5 p-3 rounded-xl text-left"
                style={{
                  backgroundColor: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.25)",
                }}
              >
                <AlertCircle size={16} style={{ color: "#f87171" }} className="shrink-0" />
                <p className="text-sm" style={{ color: "#fca5a5" }}>
                  {error}
                </p>
              </div>
            )}

            <button
              onClick={handleVerifyOtp}
              disabled={isLoading || otpCode.length !== 6}
              className="w-full py-3.5 rounded-xl text-sm font-bold transition disabled:opacity-40"
              style={{ backgroundColor: "#14b8a6", color: "#fff" }}
            >
              {isLoading ? "Verifying..." : "Verify Code"}
            </button>

            <div className="text-center mt-5">
              {resendTimer > 0 ? (
                <p className="text-xs" style={{ color: "#64748b" }}>
                  Resend code in{" "}
                  <span className="font-semibold" style={{ color: "#14b8a6" }}>
                    {resendTimer}s
                  </span>
                </p>
              ) : (
                <button
                  onClick={() => handleSendResetCode(true)}
                  disabled={isLoading}
                  className="text-xs font-bold flex items-center gap-1.5 mx-auto transition disabled:opacity-40"
                  style={{
                    color: "#14b8a6",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <RotateCw size={12} /> Resend Code
                </button>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* FORGOT PIN — Set New PIN                    */}
        {/* ═══════════════════════════════════════════ */}
        {isForgotMode && forgotStep === "reset" && (
          <div>
            <div className="text-center mb-8">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: "rgba(20,184,166,0.1)", border: "1px solid rgba(20,184,166,0.2)" }}
              >
                <KeyRound size={24} style={{ color: "#14b8a6" }} />
              </div>
              <h2 className="text-xl font-bold mb-1" style={{ color: "#f1f5f9" }}>
                Set New PIN
              </h2>
              <p className="text-sm" style={{ color: "#64748b" }}>
                Choose a new 6-digit transaction PIN
              </p>
            </div>

            {/* New PIN */}
            <div className="mb-5">
              <label className="flex items-center gap-2 text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: "#94a3b8" }}>
                <ShieldCheck size={13} style={{ color: "#14b8a6" }} />
                New PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={resetNewPin}
                onChange={(e) => setResetNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter your new 6-digit PIN"
                className="w-full px-4 py-3.5 rounded-xl text-sm font-mono tracking-[0.3em] text-center outline-none transition"
                style={{
                  backgroundColor: "rgba(30,41,59,0.5)",
                  border: "1px solid rgba(100,116,139,0.3)",
                  color: "#e2e8f0",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#14b8a6")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(100,116,139,0.3)")}
              />
            </div>

            {/* Connector line */}
            <div className="flex justify-center my-1">
              <div className="w-px h-5" style={{ backgroundColor: "rgba(100,116,139,0.3)" }} />
            </div>

            {/* Confirm PIN */}
            <div className="mb-6">
              <label className="flex items-center gap-2 text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: "#94a3b8" }}>
                <ShieldCheck size={13} style={{ color: "#14b8a6" }} />
                Confirm New PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={resetConfirmPin}
                onChange={(e) => setResetConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Confirm your new 6-digit PIN"
                className="w-full px-4 py-3.5 rounded-xl text-sm font-mono tracking-[0.3em] text-center outline-none transition"
                style={{
                  backgroundColor: "rgba(30,41,59,0.5)",
                  border: "1px solid rgba(100,116,139,0.3)",
                  color: "#e2e8f0",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#14b8a6")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(100,116,139,0.3)")}
              />
            </div>

            {error && (
              <div
                className="flex items-center gap-2.5 mb-5 p-3 rounded-xl text-left"
                style={{
                  backgroundColor: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.25)",
                }}
              >
                <AlertCircle size={16} style={{ color: "#f87171" }} className="shrink-0" />
                <p className="text-sm" style={{ color: "#fca5a5" }}>
                  {error}
                </p>
              </div>
            )}

            <button
              onClick={handleResetPin}
              disabled={isLoading || !resetNewPin || !resetConfirmPin}
              className="w-full py-3.5 rounded-xl text-sm font-bold transition disabled:opacity-40"
              style={{ backgroundColor: "#14b8a6", color: "#fff" }}
            >
              {isLoading ? "Resetting..." : "Reset PIN"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
