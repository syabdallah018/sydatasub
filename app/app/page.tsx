"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"login" | "signup" | "guest">("login");

  const handlePinChange = (index: number, value: string) => {
    const digitOnly = value.replace(/[^0-9]/g, "");
    if (digitOnly.length > 1) return;

    const newPin = [...pin];
    newPin[index] = digitOnly;
    setPin(newPin);

    if (digitOnly && index < 5) {
      document.getElementById(`pin-${index + 1}`)?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      document.getElementById(`pin-${index - 1}`)?.focus();
    }
  };

  const handleLogin = async () => {
    if (!phone || pin.some((d) => !d)) {
      toast.error("Please fill all fields");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, pin: pin.join("") }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Login successful!");
        router.push("/app/dashboard");
      } else {
        toast.error(data.error || "Login failed");
      }
    } catch (error) {
      toast.error("Network error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #F5F7FF 100%)" }} className="min-h-screen flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <motion.div
          className="flex justify-center mb-6"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #1E3A8A, #2563EB)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 32px rgba(37,99,235,0.18)",
            }}
          >
            <img src="/logo.jpeg" alt="SY DATA" style={{ width: "40px", height: "40px", borderRadius: "50%" }} />
          </div>
        </motion.div>

        {/* Header */}
        <motion.div
          className="text-center mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#0F172A", marginBottom: "8px", fontFamily: "Inter" }}>
            SY DATA SUB
          </h1>
          <p style={{ fontSize: "14px", fontWeight: 500, color: "#64748B", fontFamily: "Inter" }}>
            Fast, reliable data in seconds
          </p>
        </motion.div>

        {/* Tab Picker */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "24px", background: "#F8FAFF", padding: "4px", borderRadius: "12px" }}>
          {(["login", "signup", "guest"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: "8px 12px",
                fontSize: "14px",
                fontWeight: activeTab === tab ? 600 : 500,
                color: activeTab === tab ? "#2563EB" : "#64748B",
                background: activeTab === tab ? "#FFFFFF" : "transparent",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                fontFamily: "Inter",
              }}
            >
              {tab === "login" ? "Login" : tab === "signup" ? "Sign Up" : "Guest"}
            </button>
          ))}
        </div>

        {/* Login Tab */}
        {activeTab === "login" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div>
              <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#0F172A", marginBottom: "8px", fontFamily: "Inter" }}>
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="08012345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: "16px",
                  fontWeight: 500,
                  color: "#0F172A",
                  border: "1px solid #E2E8F0",
                  borderRadius: "12px",
                  outline: "none",
                  transition: "all 0.2s ease",
                  boxSizing: "border-box",
                  fontFamily: "Inter",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#2563EB")}
                onBlur={(e) => (e.target.style.borderColor = "#E2E8F0")}
              />
            </div>

            {/* PIN Input - 6 circular dots */}
            <div>
              <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#0F172A", marginBottom: "12px", fontFamily: "Inter" }}>
                PIN
              </label>
              <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                {pin.map((digit, idx) => (
                  <motion.input
                    key={idx}
                    id={`pin-${idx}`}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(idx, e.target.value)}
                    onKeyDown={(e) => handlePinKeyDown(idx, e)}
                    whileTap={{ scale: 0.9 }}
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      fontSize: "20px",
                      fontWeight: 700,
                      color: digit ? "#2563EB" : "#E2E8F0",
                      background: digit ? "#F0F4FF" : "#F8FAFF",
                      border: "2px solid #E2E8F0",
                      textAlign: "center",
                      outline: "none",
                      transition: "all 0.2s ease",
                      cursor: "text",
                      fontFamily: "Inter",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "#2563EB";
                      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "#E2E8F0";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                ))}
              </div>
            </div>

            <motion.button
              onClick={handleLogin}
              disabled={isLoading}
              whileTap={{ scale: 0.98 }}
              whileHover={{ y: -2 }}
              style={{
                width: "100%",
                padding: "14px 16px",
                marginTop: "24px",
                fontSize: "14px",
                fontWeight: 600,
                color: "#FFFFFF",
                background: isLoading ? "#94A3B8" : "#2563EB",
                border: "none",
                borderRadius: "14px",
                cursor: isLoading ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                fontFamily: "Inter",
              }}
            >
              {isLoading ? "Logging in..." : "Login"}
            </motion.button>

            <p style={{ textAlign: "center", fontSize: "14px", color: "#64748B", fontFamily: "Inter" }}>
              Don't have an account?{" "}
              <button
                onClick={() => setActiveTab("signup")}
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#2563EB",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textDecoration: "underline",
                  fontFamily: "Inter",
                }}
              >
                Sign up
              </button>
            </p>
          </motion.div>
        )}

        {/* Signup Tab */}
        {activeTab === "signup" && <SignupTab onComplete={() => router.push("/app/dashboard")} />}

        {/* Guest Tab */}
        {activeTab === "guest" && <GuestTab />}
      </motion.div>
    </div>
  );
}

function SignupTab({ onComplete }: { onComplete: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [confirmPin, setConfirmPin] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async () => {
    if (!name || !phone || pin.some((d) => !d) || confirmPin.some((d) => !d)) {
      toast.error("Please fill all fields");
      return;
    }
    if (pin.join("") !== confirmPin.join("")) {
      toast.error("PINs don't match");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, pin: pin.join(""), confirmPin: confirmPin.join(""), acceptTerms: true }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Account created!");
        onComplete();
      } else {
        toast.error(data.error || "Signup failed");
      }
    } catch (error) {
      toast.error("Network error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 max-h-96 overflow-y-auto"
    >
      <input
        type="text"
        placeholder="Full Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{
          width: "100%",
          padding: "12px 16px",
          fontSize: "16px",
          fontWeight: 500,
          color: "#0F172A",
          border: "1px solid #E2E8F0",
          borderRadius: "12px",
          outline: "none",
          boxSizing: "border-box",
          fontFamily: "Inter",
        }}
      />
      <input
        type="tel"
        placeholder="08012345678"
        value={phone}
        onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
        style={{
          width: "100%",
          padding: "12px 16px",
          fontSize: "16px",
          fontWeight: 500,
          color: "#0F172A",
          border: "1px solid #E2E8F0",
          borderRadius: "12px",
          outline: "none",
          boxSizing: "border-box",
          fontFamily: "Inter",
        }}
      />
      <div>
        <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#0F172A", marginBottom: "8px", fontFamily: "Inter" }}>
          PIN
        </label>
        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
          {pin.map((digit, idx) => (
            <input
              key={idx}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => {
                const newPin = [...pin];
                newPin[idx] = e.target.value.slice(0, 1);
                setPin(newPin);
                if (e.target.value && idx < 5) {
                  document.getElementById(`signup-pin-${idx + 1}`)?.focus();
                }
              }}
              id={`signup-pin-${idx}`}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "8px",
                fontSize: "18px",
                fontWeight: 700,
                color: "#0F172A",
                background: "#F8FAFF",
                border: "1px solid #E2E8F0",
                textAlign: "center",
                outline: "none",
                boxSizing: "border-box",
                fontFamily: "Inter",
              }}
            />
          ))}
        </div>
      </div>
      <div>
        <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#0F172A", marginBottom: "8px", fontFamily: "Inter" }}>
          Confirm PIN
        </label>
        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
          {confirmPin.map((digit, idx) => (
            <input
              key={idx}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => {
                const newPin = [...confirmPin];
                newPin[idx] = e.target.value.slice(0, 1);
                setConfirmPin(newPin);
                if (e.target.value && idx < 5) {
                  document.getElementById(`confirm-pin-${idx + 1}`)?.focus();
                }
              }}
              id={`confirm-pin-${idx}`}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "8px",
                fontSize: "18px",
                fontWeight: 700,
                color: "#0F172A",
                background: "#F8FAFF",
                border: "1px solid #E2E8F0",
                textAlign: "center",
                outline: "none",
                boxSizing: "border-box",
                fontFamily: "Inter",
              }}
            />
          ))}
        </div>
      </div>
      <button
        onClick={handleSignup}
        disabled={isLoading}
        style={{
          width: "100%",
          padding: "14px 16px",
          marginTop: "24px",
          fontSize: "14px",
          fontWeight: 600,
          color: "#FFFFFF",
          background: isLoading ? "#94A3B8" : "#2563EB",
          border: "none",
          borderRadius: "14px",
          cursor: isLoading ? "not-allowed" : "pointer",
          fontFamily: "Inter",
        }}
      >
        {isLoading ? "Creating..." : "Create Account"}
      </button>
    </motion.div>
  );
}

function GuestTab() {
  const [phone, setPhone] = useState("");
  const router = useRouter();

  const handleGuestContinue = () => {
    if (!phone || !/^0[0-9]{10}$/.test(phone)) {
      toast.error("Enter valid 11-digit phone number");
      return;
    }
    localStorage.setItem("guestPhone", phone);
    router.push("/app/checkout?guest=true");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      <div style={{ background: "#F0F4FF", border: "1px solid #DBEAFE", borderRadius: "12px", padding: "12px 16px" }}>
        <p style={{ fontSize: "14px", fontWeight: 500, color: "#1E40AF", fontFamily: "Inter" }}>
          👤 No account needed — buy instantly
        </p>
      </div>
      <input
        type="tel"
        placeholder="08012345678"
        value={phone}
        onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
        style={{
          width: "100%",
          padding: "12px 16px",
          fontSize: "16px",
          fontWeight: 500,
          color: "#0F172A",
          border: "1px solid #E2E8F0",
          borderRadius: "12px",
          outline: "none",
          boxSizing: "border-box",
          fontFamily: "Inter",
        }}
      />
      <button
        onClick={handleGuestContinue}
        style={{
          width: "100%",
          padding: "14px 16px",
          marginTop: "24px",
          fontSize: "14px",
          fontWeight: 600,
          color: "#FFFFFF",
          background: "#2563EB",
          border: "none",
          borderRadius: "14px",
          cursor: "pointer",
          fontFamily: "Inter",
        }}
      >
        Continue as Guest
      </button>
    </motion.div>
  );
}
