"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
  Phone,
  ShieldCheck,
  Sparkles,
  User,
  WalletCards,
  Fingerprint,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { BrandEntryScreen } from "@/components/app/BrandEntry";
import { getFriendlyMessage } from "@/lib/user-feedback";

const fontImportStyle = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=DM+Mono:wght@400;500&display=swap');`;

const shellStyle = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top left, rgba(0, 200, 150, 0.14), transparent 28%), radial-gradient(circle at top right, rgba(37, 99, 235, 0.14), transparent 24%), linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)",
};

const panelStyle = {
  background: "rgba(255, 255, 255, 0.84)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  border: "1px solid rgba(148, 163, 184, 0.18)",
  boxShadow: "0 28px 80px rgba(15, 23, 42, 0.12)",
};

const inputStyle =
  "w-full rounded-2xl border border-slate-200/90 bg-white/90 px-4 py-3.5 text-[15px] text-slate-900 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset] outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-500/10";

const pinStyle =
  "w-full rounded-2xl border border-slate-200/90 bg-slate-50/90 px-4 py-3.5 text-[18px] font-semibold tracking-[0.28em] text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/10";

function StatChip({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
        <Icon size={16} className="text-emerald-500" />
      </div>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function AuthField({
  label,
  icon: Icon,
  rightSlot,
  children,
  hint,
}: {
  label: string;
  icon: LucideIcon;
  rightSlot?: ReactNode;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</label>
        {rightSlot}
      </div>
      <div className="relative">
        <Icon size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        {children}
      </div>
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

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
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const cacheBuster = `_cb=${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        const res = await fetch(`/api/auth/me?${cacheBuster}`, {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        if (res.ok) {
          router.replace("/app");
          return;
        }
      } catch {
        // Fall through to the auth form.
      } finally {
        clearTimeout(timeout);
      }

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

  const resetToLogin = () => {
    setMode("login");
    setName("");
    setEmail("");
    setConfirmPin("");
    setShowConfirmPin(false);
    setShowPin(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length !== 11) {
      toast.error("Enter your 11-digit phone number to continue.");
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
        if (typeof window !== "undefined") {
          localStorage.setItem("saved_phone", phone);
        }
        toast.success("You are signed in.");
        router.replace("/app");
        return;
      }

      const data = await res.json();
      toast.error(getFriendlyMessage(data.error, "We could not sign you in right now."));
    } catch {
      toast.error("Connection is unstable right now. Please try again shortly.");
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!phone || phone.length !== 11) {
      toast.error("Enter your 11-digit phone number first.");
      return;
    }

    if (typeof window === "undefined" || !(window as any).AndroidBridge) {
      toast.error("Biometric login is only available in the Android app.");
      return;
    }

    setLoading(true);
    try {
      const token = await new Promise<string>((resolve, reject) => {
        (window as any).onBiometricTokenReceived = (t: string) => {
          resolve(t);
          delete (window as any).onBiometricTokenReceived;
          delete (window as any).onBiometricTokenFailed;
        };
        (window as any).onBiometricTokenFailed = (err: string) => {
          reject(new Error(err));
          delete (window as any).onBiometricTokenReceived;
          delete (window as any).onBiometricTokenFailed;
        };
        (window as any).AndroidBridge.getBiometricToken();
      });

      const res = await fetch("/api/auth/biometric-login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, token }),
      });

      if (res.ok) {
        if (typeof window !== "undefined") {
          localStorage.setItem("saved_phone", phone);
        }
        toast.success("Biometric login successful.");
        router.replace("/app");
        return;
      }

      const data = await res.json();
      toast.error(data.error || "Biometric login failed.");
    } catch (err: any) {
      toast.error(err.message || "Biometric verification failed or cancelled.");
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
        resetToLogin();
        setPhone(phone);
        return;
      }

      if (res.ok) {
        toast.success("Your account is ready.");
        router.replace("/app");
        return;
      }

      const data = await res.json();
      toast.error(getFriendlyMessage(data.error, "We could not create your account right now."));
    } catch {
      toast.error("Connection is unstable right now. Please try again shortly.");
    } finally {
      setLoading(false);
    }
  };

  const isLogin = mode === "login";

  if (!hasCheckedAuth) {
    return (
      <BrandEntryScreen
        subtitle="Loading secure sign in"
        message="We are checking whether you already have an active session on this device."
        accentLabel="Welcome back"
      />
    );
  }

  return (
    <>
      <style>{fontImportStyle}</style>
      <div style={shellStyle} className="overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl items-center gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="relative hidden overflow-hidden rounded-[32px] p-8 lg:block"
            style={panelStyle}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,200,150,0.16),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(37,99,235,0.16),transparent_28%)]" />
            <div className="relative">
              <div className="mb-8 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[linear-gradient(135deg,#00c896_0%,#2563eb_100%)] shadow-[0_18px_40px_rgba(0,200,150,0.24)]">
                  <img
                    src="/logo.jpeg"
                    alt="SY Data Sub"
                    className="h-12 w-12 rounded-[16px] bg-white object-cover p-1.5"
                  />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Smart mobile commerce
                  </p>
                  <h1
                    className="mt-1 text-4xl font-semibold tracking-tight text-slate-950"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Sign in with a better flow
                  </h1>
                </div>
              </div>

              <p className="max-w-xl text-base leading-7 text-slate-600">
                A cleaner entry screen, quicker access on returning devices, and a calmer
                design that still feels premium on Android webviews.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <StatChip label="Session" value="Fast, secure, resumed" icon={ShieldCheck} />
                <StatChip label="Payments" value="PIN-protected actions" icon={Lock} />
                <StatChip label="Performance" value="Lightweight startup" icon={Sparkles} />
                <StatChip label="Access" value="Smooth on mobile webviews" icon={WalletCards} />
              </div>

              <div className="mt-8 rounded-[28px] border border-white/75 bg-white/70 p-6 shadow-[0_14px_40px_rgba(15,23,42,0.07)] backdrop-blur-md">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">What you get</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Clean sign in, confident signup, and a more polished PIN entry for every
                      sensitive action inside the app.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                    <ArrowRight size={18} />
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="rounded-[32px] p-4 sm:p-6"
            style={panelStyle}
          >
            <div className="overflow-hidden rounded-[28px] border border-slate-200/70 bg-white/90 p-5 sm:p-7">
              <div className="mb-8 flex items-center justify-between gap-4">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    <Sparkles size={13} />
                    Secure access
                  </div>
                  <h2
                    className="text-[clamp(2rem,4vw,2.8rem)] leading-[1.02] tracking-tight text-slate-950"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {isLogin ? "Welcome back." : "Create your account."}
                  </h2>
                  <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
                    {isLogin
                      ? "Sign back in to manage your wallet, purchases, and account activity."
                      : "Set up a secure account in a minute and keep your transactions protected with a 6-digit PIN."}
                  </p>
                </div>

                <div className="hidden rounded-[22px] border border-slate-200 bg-slate-50 p-3 text-slate-600 sm:block">
                  <ShieldCheck size={20} className="text-emerald-500" />
                </div>
              </div>

              <div className="mb-7 grid grid-cols-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setShowConfirmPin(false);
                  }}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    isLogin ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setShowPin(false);
                  }}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    !isLogin ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Create account
                </button>
              </div>

              <AnimatePresence mode="wait">
                {isLogin ? (
                  <motion.form
                    key="login"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    onSubmit={handleLogin}
                    className="space-y-5"
                  >
                    <AuthField
                      label="Phone number"
                      icon={Phone}
                      hint={savedPhone ? `Saved number detected: ${savedPhone}` : "Use the mobile number linked to your account."}
                    >
                      <input
                        type="tel"
                        maxLength={11}
                        placeholder="08012345678"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                        className={`${inputStyle} pl-11 font-mono tracking-[0.08em]`}
                        autoComplete="tel"
                        inputMode="numeric"
                      />
                    </AuthField>

                    <AuthField
                      label="PIN"
                      icon={Lock}
                      rightSlot={
                        <button
                          type="button"
                          onClick={() => setShowPin((value) => !value)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 transition hover:text-sky-700"
                        >
                          {showPin ? <EyeOff size={13} /> : <Eye size={13} />}
                          {showPin ? "Hide" : "Show"}
                        </button>
                      }
                      hint="Your 6-digit PIN keeps purchases secure."
                    >
                      <div className="relative">
                        <input
                          type={showPin ? "text" : "password"}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          value={pin}
                          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          className={`${pinStyle} pl-11`}
                          autoComplete="current-password"
                        />
                      </div>
                    </AuthField>

                    <motion.button
                      type="submit"
                      disabled={loading}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.99 }}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#00c896_0%,#2563eb_100%)] px-5 py-4 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(0,200,150,0.22)] transition disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        <>
                          Sign In
                          <ArrowRight size={16} />
                        </>
                      )}
                    </motion.button>

                    {typeof window !== "undefined" && !!(window as any).AndroidBridge && (
                      <motion.button
                        type="button"
                        onClick={handleBiometricLogin}
                        disabled={loading || !phone || phone.length !== 11}
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.99 }}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Fingerprint size={18} className="text-emerald-500" />
                        Sign In with Biometrics
                      </motion.button>
                    )}

                    <p className="text-center text-sm text-slate-600">
                      No account yet?{" "}
                      <button
                        type="button"
                        onClick={() => setMode("signup")}
                        className="font-semibold text-sky-600 transition hover:text-sky-700"
                      >
                        Create one
                      </button>
                    </p>
                  </motion.form>
                ) : (
                  <motion.form
                    key="signup"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    onSubmit={handleSignup}
                    className="space-y-5"
                  >
                    <AuthField label="Full name" icon={User} hint="Use the name you want on the account.">
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={inputStyle}
                        autoComplete="name"
                      />
                    </AuthField>

                      <AuthField label="Email address" icon={Mail} hint="Optional, but useful for account recovery.">
                      <input
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value.trim())}
                        className={inputStyle}
                        autoComplete="email"
                      />
                    </AuthField>

                    <AuthField label="Phone number" icon={Phone} hint="We use this to identify your account.">
                      <input
                        type="tel"
                        maxLength={11}
                        placeholder="08012345678"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                        className={`${inputStyle} font-mono tracking-[0.08em]`}
                        autoComplete="tel"
                        inputMode="numeric"
                      />
                    </AuthField>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <AuthField
                        label="PIN"
                        icon={Lock}
                        rightSlot={
                          <button
                            type="button"
                            onClick={() => setShowPin((value) => !value)}
                            className="text-xs font-semibold text-sky-600 transition hover:text-sky-700"
                          >
                            {showPin ? "Hide" : "Show"}
                          </button>
                        }
                        hint="Choose a private 6-digit PIN."
                      >
                        <input
                          type={showPin ? "text" : "password"}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          value={pin}
                          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          className={`${pinStyle} pl-11`}
                          autoComplete="new-password"
                        />
                      </AuthField>

                      <AuthField
                        label="Confirm PIN"
                        icon={Lock}
                        rightSlot={
                          <button
                            type="button"
                            onClick={() => setShowConfirmPin((value) => !value)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 transition hover:text-sky-700"
                          >
                            {showConfirmPin ? <EyeOff size={13} /> : <Eye size={13} />}
                            {showConfirmPin ? "Hide" : "Show"}
                          </button>
                        }
                        hint="Type the same 6 digits again."
                      >
                        <input
                          type={showConfirmPin ? "text" : "password"}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          value={confirmPin}
                          onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          className={`${pinStyle} pl-11`}
                          autoComplete="new-password"
                        />
                      </AuthField>
                    </div>

                    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/90 p-4 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={acceptTerms}
                        onChange={(e) => setAcceptTerms(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                      />
                      <span className="leading-6">
                        I agree to the terms and understand that my account uses a 6-digit PIN for
                        secure actions.
                      </span>
                    </label>

                    <motion.button
                      type="submit"
                      disabled={loading}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.99 }}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#00c896_0%,#2563eb_100%)] px-5 py-4 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(0,200,150,0.22)] transition disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        <>
                          Create Account
                          <ArrowRight size={16} />
                        </>
                      )}
                    </motion.button>

                    <p className="text-center text-sm text-slate-600">
                      Already registered?{" "}
                      <button
                        type="button"
                        onClick={() => setMode("login")}
                        className="font-semibold text-sky-600 transition hover:text-sky-700"
                      >
                        Sign in instead
                      </button>
                    </p>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.section>
        </div>
      </div>
    </>
  );
}
