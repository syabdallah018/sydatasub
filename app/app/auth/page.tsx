"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Loader2, Mail, Phone, User } from "lucide-react";
import { toast } from "sonner";

const T = {
  bg: "#f5f7fb",
  card: "#ffffff",
  mutedCard: "#f8fafc",
  border: "rgba(15,23,42,0.08)",
  text: "#0f172a",
  textSoft: "#475569",
  textDim: "#64748b",
  blue: "#0071E3",
  green: "#16a34a",
  shadow: "0 24px 60px rgba(15,23,42,0.10)",
  shadowSoft: "0 14px 30px rgba(15,23,42,0.06)",
  font: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Helvetica, Arial, sans-serif',
  mono: '"SF Mono", "DM Mono", ui-monospace, monospace',
};

function splitArrayUpdate(arr: string[], index: number, value: string) {
  const next = [...arr];
  next[index] = value;
  return next;
}

function PinGrid({
  value,
  onChange,
  refs,
  visible,
  accent,
  label,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  refs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  visible: boolean;
  accent: string;
  label: string;
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 700,
          color: T.textDim,
          marginBottom: 10,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
        {value.map((digit, index) => (
          <input
            key={`${label}-${index}`}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type={visible ? "text" : "password"}
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => {
              const clean = e.target.value.replace(/\D/g, "");
              if (clean.length > 1) return;
              const next = splitArrayUpdate(value, index, clean);
              onChange(next);
              if (clean && index < value.length - 1) {
                setTimeout(() => refs.current[index + 1]?.focus(), 0);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !digit && index > 0) {
                refs.current[index - 1]?.focus();
              }
            }}
            style={{
              width: "100%",
              minWidth: 0,
              padding: "14px 0",
              borderRadius: 16,
              border: `1.5px solid ${digit ? accent : T.border}`,
              background: digit ? `${accent}12` : T.mutedCard,
              color: T.text,
              fontFamily: T.mono,
              fontSize: 20,
              fontWeight: 700,
              textAlign: "center",
              outline: "none",
              boxSizing: "border-box",
              transition: "all 120ms ease",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  icon,
  mono = false,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  icon: React.ReactNode;
  mono?: boolean;
  maxLength?: number;
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 700,
          color: T.textDim,
          marginBottom: 10,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <div
          style={{
            position: "absolute",
            left: 14,
            top: "50%",
            transform: "translateY(-50%)",
            color: T.textDim,
          }}
        >
          {icon}
        </div>
        <input
          type={type}
          value={value}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: "100%",
            padding: "15px 14px 15px 42px",
            borderRadius: 16,
            border: `1.5px solid ${T.border}`,
            background: T.mutedCard,
            color: T.text,
            fontSize: 15,
            fontFamily: mono ? T.mono : T.font,
            outline: "none",
            boxSizing: "border-box",
            transition: "all 120ms ease",
          }}
        />
      </div>
    </div>
  );
}

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [confirmPin, setConfirmPin] = useState(["", "", "", "", "", ""]);
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const [savedPhone, setSavedPhone] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);

  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmPinRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          router.push("/app");
          return;
        }
      } catch {}

      if (typeof window !== "undefined") {
        const remembered = localStorage.getItem("saved_phone");
        if (remembered) {
          setSavedPhone(remembered);
          setPhone(remembered);
        }
      }
      setHasCheckedAuth(true);
    };

    checkAuth();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (phone.length !== 11) {
      toast.error("Enter a valid 11-digit phone number.");
      return;
    }
    if (pin.some((digit) => !digit)) {
      toast.error("Enter your complete 6-digit PIN.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, pin: pin.join("") }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Login failed");

      if (typeof window !== "undefined") {
        localStorage.setItem("saved_phone", phone);
      }

      toast.success("Login successful.");
      router.push("/app");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Connection error");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (name.trim().length < 2) {
      toast.error("Enter your full name.");
      return;
    }
    if (phone.length !== 11) {
      toast.error("Enter a valid 11-digit phone number.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid email address.");
      return;
    }
    if (pin.some((digit) => !digit) || confirmPin.some((digit) => !digit)) {
      toast.error("Enter and confirm your 6-digit PIN.");
      return;
    }
    if (pin.join("") !== confirmPin.join("")) {
      toast.error("PINs do not match.");
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone,
          pin: pin.join(""),
          confirmPin: confirmPin.join(""),
          acceptTerms,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        toast.error(data.error || "Account already exists. Please sign in.");
        if (data.error === "Phone number already registered") {
          setMode("login");
        }
        return;
      }
      if (!res.ok) throw new Error(data.details || data.error || "Signup failed");

      toast.success("Account created.");
      setSuccessData(data.user);
      setShowSuccessModal(true);
      if (typeof window !== "undefined") {
        localStorage.setItem("saved_phone", phone);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Connection error");
    } finally {
      setLoading(false);
    }
  };

  if (!hasCheckedAuth) {
    return <div style={{ minHeight: "100vh", background: T.bg }} />;
  }

  return (
    <>
      <div
        style={{
          minHeight: "100vh",
          background: `radial-gradient(circle at top left, rgba(0,113,227,0.10), transparent 32%), linear-gradient(180deg, #f8fbff 0%, ${T.bg} 46%, #ffffff 100%)`,
          fontFamily: T.font,
          padding: "24px 18px 36px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <section
          style={{
            width: "100%",
            maxWidth: 460,
            borderRadius: 36,
            padding: "28px 24px",
            background: T.card,
            border: `1px solid ${T.border}`,
            boxShadow: T.shadow,
          }}
        >
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
            <div
              style={{
                width: 78,
                height: 78,
                borderRadius: 24,
                overflow: "hidden",
                border: `1px solid ${T.border}`,
                boxShadow: T.shadowSoft,
                background: "#fff",
                position: "relative",
              }}
            >
              <Image src="/brand/logo-mark.svg" alt="SY Data" fill sizes="78px" style={{ objectFit: "contain" }} priority />
            </div>
          </div>

          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 12, color: T.textDim, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
              SY Data
            </div>
            <h1 style={{ margin: 0, fontSize: 30, lineHeight: 1.05, letterSpacing: "-0.05em", color: T.text }}>
              {mode === "login" ? "Login" : "Signup"}
            </h1>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginBottom: 24,
              padding: 6,
              background: T.mutedCard,
              borderRadius: 18,
              border: `1px solid ${T.border}`,
            }}
          >
            {(["login", "signup"] as const).map((tab) => {
              const active = mode === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setMode(tab)}
                  style={{
                    border: "none",
                    borderRadius: 14,
                    padding: "13px 12px",
                    background: active ? T.card : "transparent",
                    boxShadow: active ? T.shadowSoft : "none",
                    color: active ? T.text : T.textDim,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {tab === "login" ? "Login" : "Signup"}
                </button>
              );
            })}
          </div>

          {mode === "login" ? (
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <Field
                label="Phone number"
                value={phone}
                onChange={(value) => setPhone(value.replace(/\D/g, "").slice(0, 11))}
                placeholder="08012345678"
                type="tel"
                icon={<Phone size={16} />}
                mono
                maxLength={11}
              />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: -4 }}>
                <span style={{ fontSize: 12, color: T.textDim, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  PIN
                </span>
                <button
                  type="button"
                  onClick={() => setShowPin((value) => !value)}
                  style={{ border: "none", background: "transparent", color: T.blue, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  {showPin ? "Hide" : "Show"}
                </button>
              </div>

              <PinGrid value={pin} onChange={setPin} refs={pinRefs} visible={showPin} accent={T.blue} label="PIN" />

              {savedPhone && (
                <button
                  type="button"
                  onClick={() => setPhone(savedPhone)}
                  style={{
                    border: `1px solid ${T.border}`,
                    background: T.mutedCard,
                    borderRadius: 14,
                    padding: "12px 14px",
                    color: T.textSoft,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Use saved phone
                </button>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  border: "none",
                  borderRadius: 18,
                  padding: "16px 18px",
                  background: T.blue,
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: loading ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  boxShadow: "0 16px 34px rgba(0,113,227,0.22)",
                }}
              >
                {loading ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : <ArrowRight size={18} />}
                {loading ? "Signing in..." : "Continue"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <Field label="Full name" value={name} onChange={setName} placeholder="Abdullahi Adam" icon={<User size={16} />} />
              <Field
                label="Phone number"
                value={phone}
                onChange={(value) => setPhone(value.replace(/\D/g, "").slice(0, 11))}
                placeholder="08012345678"
                type="tel"
                icon={<Phone size={16} />}
                mono
                maxLength={11}
              />
              <Field label="Email address" value={email} onChange={(value) => setEmail(value.trim())} placeholder="you@example.com" type="email" icon={<Mail size={16} />} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: -4 }}>
                <span style={{ fontSize: 12, color: T.textDim, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Create PIN
                </span>
                <button
                  type="button"
                  onClick={() => setShowPin((value) => !value)}
                  style={{ border: "none", background: "transparent", color: T.blue, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  {showPin ? "Hide" : "Show"}
                </button>
              </div>
              <PinGrid value={pin} onChange={setPin} refs={pinRefs} visible={showPin} accent={T.blue} label="PIN" />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: -4 }}>
                <span style={{ fontSize: 12, color: T.textDim, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Confirm PIN
                </span>
                <button
                  type="button"
                  onClick={() => setShowConfirmPin((value) => !value)}
                  style={{ border: "none", background: "transparent", color: T.green, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  {showConfirmPin ? "Hide" : "Show"}
                </button>
              </div>
              <PinGrid value={confirmPin} onChange={setConfirmPin} refs={confirmPinRefs} visible={showConfirmPin} accent={T.green} label="Confirm" />

              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "14px 14px",
                  borderRadius: 16,
                  border: `1px solid ${T.border}`,
                  background: T.mutedCard,
                  cursor: "pointer",
                }}
              >
                <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} style={{ marginTop: 2, accentColor: T.blue }} />
                <span style={{ fontSize: 13, color: T.textSoft, lineHeight: 1.6 }}>I agree to create my account and funding wallet.</span>
              </label>

              <button
                type="submit"
                disabled={loading}
                style={{
                  border: "none",
                  borderRadius: 18,
                  padding: "16px 18px",
                  background: "linear-gradient(135deg, #0071E3, #3b82f6)",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: loading ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  boxShadow: "0 16px 34px rgba(0,113,227,0.22)",
                }}
              >
                {loading ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : <ArrowRight size={18} />}
                {loading ? "Creating..." : "Create account"}
              </button>
            </form>
          )}
        </section>
      </div>

      {showSuccessModal && successData && (
        <div
          onClick={() => {
            setShowSuccessModal(false);
            router.push("/app");
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(248,250,252,0.72)",
            backdropFilter: "blur(14px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            fontFamily: T.font,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 460,
              borderRadius: 30,
              background: "#ffffff",
              border: `1px solid ${T.border}`,
              boxShadow: T.shadow,
              padding: "28px 24px",
            }}
          >
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: "50%",
                background: "rgba(22,163,74,0.10)",
                color: T.green,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 18px",
              }}
            >
              <CheckCircle2 size={34} />
            </div>

            <h3 style={{ margin: "0 0 8px", color: T.text, fontSize: 24, fontWeight: 800, textAlign: "center", letterSpacing: "-0.04em" }}>
              Account created
            </h3>
            <p style={{ margin: "0 0 22px", color: T.textSoft, fontSize: 14, textAlign: "center", lineHeight: 1.7 }}>
              Your account is ready.
            </p>

            <div
              style={{
                borderRadius: 24,
                padding: 18,
                background: "linear-gradient(135deg, rgba(0,113,227,0.08), rgba(255,255,255,0.90))",
                border: `1px solid ${T.border}`,
                marginBottom: 20,
              }}
            >
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: T.textDim, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
                  Account number
                </div>
                <div style={{ fontSize: 28, color: T.text, fontWeight: 800, fontFamily: T.mono }}>
                  {successData.accountNumber || "--"}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: T.textDim, marginBottom: 4 }}>Bank</div>
                  <div style={{ fontSize: 14, color: T.text, fontWeight: 700 }}>{successData.bankName || "--"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: T.textDim, marginBottom: 4 }}>Account name</div>
                  <div style={{ fontSize: 14, color: T.text, fontWeight: 700 }}>{successData.accountName || successData.name}</div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowSuccessModal(false);
                router.push("/app");
              }}
              style={{
                width: "100%",
                border: "none",
                borderRadius: 18,
                padding: "15px 18px",
                background: T.blue,
                color: "#fff",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </>
  );
}
