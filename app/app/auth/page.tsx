"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { getFriendlyMessage } from "@/lib/user-feedback";

const T = {
  bg: "#ffffff",
  surface: "#f3f4f6",
  card: "#ffffff",
  border: "#e5e7eb",
  blue: "#2563eb",
  blueLight: "#dbeafe",
  blueDim: "rgba(37, 99, 235, 0.1)",
  green: "#10b981",
  greenDim: "rgba(16, 185, 129, 0.1)",
  text: "#1f2937",
  textMid: "#6b7280",
  textDim: "#9ca3af",
  font: "'DM Sans', sans-serif",
  mono: "'DM Mono', monospace",
};

const fontImportStyle = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=DM+Mono:wght@400;500&display=swap');`;

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const [savedPhone, setSavedPhone] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const cacheBuster = `_cb=${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const res = await fetch(`/api/auth/me?${cacheBuster}`, { 
          credentials: "include",
          cache: "no-store"
        });
        if (res.ok) {
          router.push("/app");
          return;
        }
      } catch {}
      
      // Load saved phone for smart login
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("saved_phone");
        if (saved) {
          setSavedPhone(saved);
          setPhone(saved);
        }
      }
      setHasCheckedAuth(true);
    };
    checkAuth();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length !== 11) {
      toast.error("Enter your 11-digit phone number to continue.");
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid email address to continue.");
      return;
    }
    if (pin.length !== 6) {
      toast.error("Enter your 6-digit PIN to sign in.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, pin }),
      });

      if (res.ok) {
        // Save phone number for smart login next time
        if (typeof window !== "undefined") {
          localStorage.setItem("saved_phone", phone);
        }
        toast.success("You are signed in.");
        router.push("/app");
      } else {
        const data = await res.json();
        toast.error(getFriendlyMessage(data.error, "We could not sign you in right now."));
      }
    } catch {
      toast.error("Connection is unstable right now. Please try again shortly.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || name.length < 2) {
      toast.error("Enter your full name to continue.");
      return;
    }
    if (!phone || phone.length !== 11) {
      toast.error("Enter your 11-digit phone number to continue.");
      return;
    }
    if (pin.length !== 6) {
      toast.error("Choose a 6-digit PIN for your account.");
      return;
    }
    if (pin !== confirmPin) {
      toast.error("Those PIN entries do not match yet.");
      return;
    }
    if (!acceptTerms) {
      toast.error("Accept the terms to continue.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          pin,
          confirmPin,
          acceptTerms,
        }),
      });

      if (res.status === 409) {
        toast.error("That phone number already has an account. Please sign in instead.");
        setMode("login");
        setPhone(phone);
        return;
      }

      if (res.ok) {
        toast.success("Your account is ready.");
        router.push("/app");
      } else {
        const data = await res.json();
        toast.error(getFriendlyMessage(data.error, "We could not create your account right now."));
      }
    } catch {
      toast.error("Connection is unstable right now. Please try again shortly.");
    } finally {
      setLoading(false);
    }
  };

  if (!hasCheckedAuth) {
    return <div style={{ minHeight: "100vh", background: T.bg }} />;
  }

  return (
    <>
      <style>{fontImportStyle}</style>
      <div
        style={{
          minHeight: "100vh",
          background: `linear-gradient(135deg, #f9fafb 0%, ${T.surface} 50%, #ffffff 100%)`,
          fontFamily: T.font,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            background: T.card,
            borderRadius: 24,
            border: `1px solid ${T.border}`,
            padding: "40px 24px",
            maxWidth: 380,
            width: "100%",
            boxShadow: "0 10px 30px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            style={{
              width: 72,
              height: 72,
              margin: "0 auto 24px",
              borderRadius: 20,
              background: T.surface,
              border: `2px solid ${T.border}`,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src="/logo.jpeg"
              alt="SY DATA SUB"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </motion.div>

          {/* Title */}
          <h1 style={{ textAlign: "center", fontSize: 24, fontWeight: 700, color: T.text, margin: "0 0 8px" }}>
            {mode === "login" ? "Welcome Back" : "Create Account"}
          </h1>
          <p style={{ textAlign: "center", fontSize: 13, color: T.textMid, margin: "0 0 32px" }}>
            {mode === "login" ? "Sign in to your account" : "Get started in seconds"}
          </p>

          <AnimatePresence mode="wait">
            {mode === "login" ? (
              <motion.form
                key="login"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleLogin}
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                {/* Phone */}
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.textDim, marginBottom: 8, textTransform: "uppercase" }}>Phone</label>
                  <div style={{ position: "relative" }}>
                    <User size={16} color={T.textDim} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
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
                        (e.target as HTMLInputElement).style.borderColor = T.blue;
                        (e.target as HTMLInputElement).style.backgroundColor = T.blueLight;
                      }}
                      onBlur={(e) => {
                        (e.target as HTMLInputElement).style.borderColor = T.border;
                        (e.target as HTMLInputElement).style.backgroundColor = T.surface;
                      }}
                    />
                  </div>
                </div>

                {/* PIN */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: T.textDim, textTransform: "uppercase" }}>PIN</label>
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: T.blue, fontSize: 12, fontWeight: 600 }}
                    >
                      {showPin ? "Hide" : "Show"}
                    </button>
                  </div>
                  <input
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    style={{
                      width: "100%",
                      padding: "13px 14px",
                      borderRadius: 14,
                      background: pin ? T.blueDim : T.surface,
                      border: `1.5px solid ${pin ? T.blue : T.border}`,
                      fontFamily: T.mono,
                      fontSize: 18,
                      fontWeight: 700,
                      color: T.text,
                      outline: "none",
                      transition: "all 0.2s",
                      boxSizing: "border-box",
                      letterSpacing: "0.18em",
                    }}
                  />
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    marginTop: 20,
                    padding: "14px 24px",
                    borderRadius: 14,
                    background: T.blue,
                    border: "none",
                    color: "#fff",
                    fontFamily: T.font,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    opacity: loading ? 0.7 : 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  {loading && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
                  {loading ? "Signing in..." : "Sign In"}
                </motion.button>

                <p style={{ textAlign: "center", fontSize: 13, color: T.textMid, marginTop: 16 }}>
                  No account?{" "}
                  <button
                    type="button"
                      onClick={() => {
                        setMode("signup");
                        setName("");
                        setEmail("");
                        setPhone("");
                        setPin("");
                        setConfirmPin("");
                      }}
                    style={{ background: "none", border: "none", color: T.blue, cursor: "pointer", fontWeight: 600, fontSize: 13 }}
                  >
                    Create
                  </button>
                </p>
              </motion.form>
            ) : (
              <motion.form
                key="signup"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSignup}
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                {/* Name */}
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.textDim, marginBottom: 8, textTransform: "uppercase" }}>Name</label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "13px 12px",
                      borderRadius: 14,
                      background: T.surface,
                      border: `1.5px solid ${T.border}`,
                      fontFamily: T.font,
                      fontSize: 15,
                      color: T.text,
                      outline: "none",
                      boxSizing: "border-box",
                      transition: "all 0.2s",
                    }}
                  />
                </div>

                {/* Email */}
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.textDim, marginBottom: 8, textTransform: "uppercase" }}>Email</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.trim())}
                    style={{
                      width: "100%",
                      padding: "13px 12px",
                      borderRadius: 14,
                      background: T.surface,
                      border: `1.5px solid ${T.border}`,
                      fontFamily: T.font,
                      fontSize: 15,
                      color: T.text,
                      outline: "none",
                      boxSizing: "border-box",
                      transition: "all 0.2s",
                    }}
                  />
                </div>

                {/* Phone */}
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.textDim, marginBottom: 8, textTransform: "uppercase" }}>Phone</label>
                  <input
                    type="tel"
                    maxLength={11}
                    placeholder="08012345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    style={{
                      width: "100%",
                      padding: "13px 12px",
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
                  />
                </div>

                {/* PIN */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: T.textDim, textTransform: "uppercase" }}>PIN</label>
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: T.blue, fontSize: 12, fontWeight: 600 }}
                    >
                      {showPin ? "Hide" : "Show"}
                    </button>
                  </div>
                  <input
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    style={{
                      width: "100%",
                      padding: "13px 14px",
                      borderRadius: 14,
                      background: pin ? T.blueDim : T.surface,
                      border: `1.5px solid ${pin ? T.blue : T.border}`,
                      fontFamily: T.mono,
                      fontSize: 18,
                      fontWeight: 700,
                      color: T.text,
                      outline: "none",
                      transition: "all 0.2s",
                      boxSizing: "border-box",
                      letterSpacing: "0.18em",
                    }}
                  />
                </div>

                {/* Confirm PIN */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: T.textDim, textTransform: "uppercase" }}>Confirm</label>
                    <button
                      type="button"
                      onClick={() => setShowConfirmPin(!showConfirmPin)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: T.blue, fontSize: 12, fontWeight: 600 }}
                    >
                      {showConfirmPin ? "Hide" : "Show"}
                    </button>
                  </div>
                  <input
                    type={showConfirmPin ? "text" : "password"}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    style={{
                      width: "100%",
                      padding: "13px 14px",
                      borderRadius: 14,
                      background: confirmPin ? T.greenDim : T.surface,
                      border: `1.5px solid ${confirmPin ? T.green : T.border}`,
                      fontFamily: T.mono,
                      fontSize: 18,
                      fontWeight: 700,
                      color: T.text,
                      outline: "none",
                      transition: "all 0.2s",
                      boxSizing: "border-box",
                      letterSpacing: "0.18em",
                    }}
                  />
                </div>

                {/* Terms */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    style={{ marginTop: 4, width: 18, height: 18, cursor: "pointer", accentColor: T.blue }}
                  />
                  <label style={{ fontSize: 12, color: T.textMid, cursor: "pointer" }}>I agree to terms</label>
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    marginTop: 20,
                    padding: "14px 24px",
                    borderRadius: 14,
                    background: T.green,
                    border: "none",
                    color: "#fff",
                    fontFamily: T.font,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    opacity: loading ? 0.7 : 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  {loading && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
                  {loading ? "Creating..." : "Create Account"}
                </motion.button>

                <p style={{ textAlign: "center", fontSize: 13, color: T.textMid, marginTop: 16 }}>
                  Have account?{" "}
                  <button
                    type="button"
                      onClick={() => {
                        setMode("login");
                        setName("");
                        setEmail("");
                        setPhone("");
                        setPin("");
                        setConfirmPin("");
                      }}
                    style={{ background: "none", border: "none", color: T.blue, cursor: "pointer", fontWeight: 600, fontSize: 13 }}
                  >
                    Sign in
                  </button>
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
