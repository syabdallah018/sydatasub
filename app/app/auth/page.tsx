"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Loader2, Lock, User, LogIn } from "lucide-react";
import { toast } from "sonner";

const fontStyle = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&family=DM+Mono:wght@400;500&display=swap');
`;

const T = {
  bg: "#0A0D14",
  surface: "#111520",
  card: "#141927",
  border: "#1E2535",
  gold: "#D4A843",
  goldLight: "#F2C96E",
  blue: "#3B6FFF",
  blueLight: "#5B8AFF",
  blueDim: "rgba(59,111,255,0.12)",
  text: "#F0F4FF",
  textDim: "#4A5268",
  font: "'DM Sans', sans-serif",
  mono: "'DM Mono', monospace",
};

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [confirmPin, setConfirmPin] = useState(["", "", "", "", "", ""]);
  const [name, setName] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          router.push("/app");
        }
      } catch {}
    };
    checkAuth();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length !== 11) {
      toast.error("Enter valid 11-digit phone number");
      return;
    }
    if (pin.some((p) => !p)) {
      toast.error("Enter 6-digit PIN");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, pin: pin.join("") }),
      });

      const data = await res.json();
      if (res.ok && data.message) {
        toast.success("Login successful!");
        router.push("/app");
      } else {
        toast.error(data.error || "Login failed");
      }
    } catch {
      toast.error("Connection error");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || name.length < 2) {
      toast.error("Enter your full name");
      return;
    }
    if (!phone || phone.length !== 11) {
      toast.error("Enter valid 11-digit phone number");
      return;
    }
    if (pin.some((p) => !p)) {
      toast.error("Enter 6-digit PIN");
      return;
    }
    if (pin.join("") !== confirmPin.join("")) {
      toast.error("PINs don't match");
      return;
    }
    if (!acceptTerms) {
      toast.error("Accept terms and conditions");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          pin: pin.join(""),
          confirmPin: confirmPin.join(""),
          acceptTerms,
        }),
      });

      const data = await res.json();
      if (res.ok && data.message) {
        toast.success("Account created! Logging you in...");
        router.push("/app");
      } else {
        toast.error(data.error || "Signup failed");
      }
    } catch {
      toast.error("Connection error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{fontStyle}</style>
      <div
        style={{
          minHeight: "100vh",
          background: `linear-gradient(135deg, ${T.bg} 0%, #0D1A28 50%, #0A0D14 100%)`,
          fontFamily: T.font,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
      >
        {/* Background effects */}
        <div
          style={{
            position: "fixed",
            top: "10%",
            right: "10%",
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(212,168,67,0.1) 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "fixed",
            bottom: "15%",
            left: "5%",
            width: 250,
            height: 250,
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(59,111,255,0.08) 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            width: "100%",
            maxWidth: 420,
            position: "relative",
            zIndex: 10,
          }}
        >
          {/* Logo Section */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            style={{
              textAlign: "center",
              marginBottom: 40,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                margin: "0 auto 16px",
                borderRadius: 20,
                background: `linear-gradient(135deg, ${T.gold}, ${T.goldLight})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 8px 32px rgba(212,168,67,0.25)`,
              }}
            >
              <span style={{ fontSize: 32, fontWeight: 800, color: T.bg }}>SY</span>
            </div>
            <h1
              style={{
                fontFamily: T.font,
                fontWeight: 800,
                fontSize: 28,
                color: T.text,
                margin: "0 0 8px",
                letterSpacing: "-0.02em",
              }}
            >
              SY DATA SUB
            </h1>
            <p
              style={{
                fontFamily: T.font,
                fontWeight: 400,
                fontSize: 14,
                color: T.textDim,
                margin: 0,
              }}
            >
              Fast. Secure. Reliable.
            </p>
          </motion.div>

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              background: `linear-gradient(145deg, ${T.card} 0%, #161A2E 100%)`,
              borderRadius: 24,
              border: `1px solid rgba(212,168,67,0.15)`,
              padding: 32,
              boxShadow: `0 25px 60px rgba(0,0,0,0.6), 0 0 60px rgba(59,111,255,0.1)`,
            }}
          >
            {/* Tab Toggle */}
            <div
              style={{
                display: "flex",
                gap: 12,
                marginBottom: 28,
                background: T.surface,
                padding: 4,
                borderRadius: 12,
                border: `1px solid ${T.border}`,
              }}
            >
              {(["login", "signup"] as const).map((m) => (
                <motion.button
                  key={m}
                  onClick={() => {
                    setMode(m);
                    setPhone("");
                    setPin(["", "", "", "", "", ""]);
                    setConfirmPin(["", "", "", "", "", ""]);
                    setName("");
                  }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    borderRadius: 10,
                    background: mode === m ? T.card : "transparent",
                    border: "none",
                    fontFamily: T.font,
                    fontWeight: 600,
                    fontSize: 13,
                    color: mode === m ? T.blue : T.textDim,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {m === "login" ? "Login" : "Sign Up"}
                </motion.button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {mode === "login" && (
                <motion.form
                  key="login"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onSubmit={handleLogin}
                  style={{ display: "flex", flexDirection: "column", gap: 16 }}
                >
                  {/* Phone Input */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontFamily: T.font,
                        fontSize: 12,
                        fontWeight: 600,
                        color: T.textDim,
                        marginBottom: 8,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Phone Number
                    </label>
                    <div
                      style={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <User size={16} color={T.textDim} style={{ position: "absolute", left: 12 }} />
                      <input
                        type="tel"
                        maxLength={11}
                        placeholder="08012345678"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                        style={{
                          width: "100%",
                          padding: "13px 12px 13px 36px",
                          borderRadius: 14,
                          background: T.surface,
                          border: `1.5px solid ${T.border}`,
                          fontFamily: T.mono,
                          fontSize: 15,
                          color: T.text,
                          outline: "none",
                          boxSizing: "border-box",
                          transition: "all 0.2s",
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = T.blue;
                          e.target.style.boxShadow = `0 0 0 3px ${T.blueDim}`;
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = T.border;
                          e.target.style.boxShadow = "none";
                        }}
                      />
                    </div>
                  </div>

                  {/* PIN Input */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontFamily: T.font,
                        fontSize: 12,
                        fontWeight: 600,
                        color: T.textDim,
                        marginBottom: 8,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Transaction PIN
                    </label>
                    <div style={{ display: "flex", gap: 6 }}>
                      {pin.map((d, i) => (
                        <input
                          key={i}
                          id={`pin-login-${i}`}
                          type={showPin ? "text" : "password"}
                          maxLength={1}
                          value={d}
                          onChange={(e) => {
                            const np = [...pin];
                            np[i] = e.target.value;
                            setPin(np);
                            if (e.target.value && i < 5) {
                              document.getElementById(`pin-login-${i + 1}`)?.focus();
                            }
                          }}
                          style={{
                            flex: 1,
                            padding: "13px 0",
                            textAlign: "center",
                            borderRadius: 12,
                            background: d ? T.blueDim : T.surface,
                            border: `1.5px solid ${d ? T.blue : T.border}`,
                            fontFamily: T.mono,
                            fontSize: 18,
                            fontWeight: 700,
                            color: T.text,
                            outline: "none",
                            transition: "all 0.15s",
                          }}
                        />
                      ))}
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          background: T.surface,
                          border: `1.5px solid ${T.border}`,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {showPin ? (
                          <EyeOff size={16} color={T.textDim} />
                        ) : (
                          <Eye size={16} color={T.textDim} />
                        )}
                      </motion.button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: "14px 0",
                      marginTop: 12,
                      borderRadius: 14,
                      background: loading
                        ? T.border
                        : `linear-gradient(135deg, ${T.blue}, ${T.blueLight})`,
                      border: "none",
                      fontFamily: T.font,
                      fontWeight: 700,
                      fontSize: 15,
                      color: "#fff",
                      cursor: loading ? "not-allowed" : "pointer",
                      boxShadow: loading ? "none" : `0 8px 24px rgba(59,111,255,0.35)`,
                      transition: "all 0.2s",
                    }}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" /> Logging in...
                      </>
                    ) : (
                      <>
                        <LogIn size={18} /> Login
                      </>
                    )}
                  </motion.button>
                </motion.form>
              )}

              {mode === "signup" && (
                <motion.form
                  key="signup"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleSignup}
                  style={{ display: "flex", flexDirection: "column", gap: 14 }}
                >
                  {/* Name Input */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontFamily: T.font,
                        fontSize: 12,
                        fontWeight: 600,
                        color: T.textDim,
                        marginBottom: 6,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "11px 14px",
                        borderRadius: 12,
                        background: T.surface,
                        border: `1.5px solid ${T.border}`,
                        fontFamily: T.font,
                        fontSize: 14,
                        color: T.text,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  {/* Phone Input */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontFamily: T.font,
                        fontSize: 12,
                        fontWeight: 600,
                        color: T.textDim,
                        marginBottom: 6,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      maxLength={11}
                      placeholder="08012345678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                      style={{
                        width: "100%",
                        padding: "11px 14px",
                        borderRadius: 12,
                        background: T.surface,
                        border: `1.5px solid ${T.border}`,
                        fontFamily: T.mono,
                        fontSize: 14,
                        color: T.text,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  {/* PIN Input */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontFamily: T.font,
                        fontSize: 12,
                        fontWeight: 600,
                        color: T.textDim,
                        marginBottom: 6,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Create PIN
                    </label>
                    <div style={{ display: "flex", gap: 4 }}>
                      {pin.map((d, i) => (
                        <input
                          key={i}
                          id={`pin-signup-${i}`}
                          type={showPin ? "text" : "password"}
                          maxLength={1}
                          value={d}
                          onChange={(e) => {
                            const np = [...pin];
                            np[i] = e.target.value;
                            setPin(np);
                            if (e.target.value && i < 5) {
                              document.getElementById(`pin-signup-${i + 1}`)?.focus();
                            }
                          }}
                          style={{
                            flex: 1,
                            padding: "11px 0",
                            textAlign: "center",
                            borderRadius: 10,
                            background: d ? T.blueDim : T.surface,
                            border: `1.5px solid ${d ? T.blue : T.border}`,
                            fontFamily: T.mono,
                            fontSize: 16,
                            fontWeight: 700,
                            color: T.text,
                            outline: "none",
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Confirm PIN Input */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontFamily: T.font,
                        fontSize: 12,
                        fontWeight: 600,
                        color: T.textDim,
                        marginBottom: 6,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Confirm PIN
                    </label>
                    <div style={{ display: "flex", gap: 4 }}>
                      {confirmPin.map((d, i) => (
                        <input
                          key={i}
                          id={`confirm-pin-${i}`}
                          type={showConfirmPin ? "text" : "password"}
                          maxLength={1}
                          value={d}
                          onChange={(e) => {
                            const np = [...confirmPin];
                            np[i] = e.target.value;
                            setConfirmPin(np);
                            if (e.target.value && i < 5) {
                              document.getElementById(`confirm-pin-${i + 1}`)?.focus();
                            }
                          }}
                          style={{
                            flex: 1,
                            padding: "11px 0",
                            textAlign: "center",
                            borderRadius: 10,
                            background: d ? T.blueDim : T.surface,
                            border: `1.5px solid ${d ? T.blue : T.border}`,
                            fontFamily: T.mono,
                            fontSize: 16,
                            fontWeight: 700,
                            color: T.text,
                            outline: "none",
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Terms Checkbox */}
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontFamily: T.font,
                      fontSize: 12,
                      color: T.textDim,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      style={{ width: 16, height: 16, cursor: "pointer" }}
                    />
                    I accept the terms and conditions
                  </label>

                  {/* Submit Button */}
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: "12px 0",
                      marginTop: 8,
                      borderRadius: 14,
                      background: loading
                        ? T.border
                        : `linear-gradient(135deg, ${T.gold}, ${T.goldLight})`,
                      border: "none",
                      fontFamily: T.font,
                      fontWeight: 700,
                      fontSize: 15,
                      color: T.bg,
                      cursor: loading ? "not-allowed" : "pointer",
                      boxShadow: loading ? "none" : `0 8px 24px rgba(212,168,67,0.25)`,
                    }}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" /> Creating...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </motion.button>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Footer */}
          <p
            style={{
              fontFamily: T.font,
              fontSize: 12,
              color: T.textDim,
              textAlign: "center",
              marginTop: 24,
            }}
          >
            Secure • Fast • Reliable
          </p>
        </motion.div>
      </div>
    </>
  );
}
