"use client";

import { useEffect, useState } from "react";
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
  User,
  Terminal,
  Database,
  Globe
} from "lucide-react";
import { toast } from "sonner";
import { getFriendlyMessage } from "@/lib/user-feedback";

export default function DesktopAuthPage() {
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

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (res.ok) {
          router.replace("/dashboard");
          return;
        }
      } catch {
        // Fall through
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
      toast.error("Enter your 11-digit phone number.");
      return;
    }
    if (pin.length !== 6) {
      toast.error("Enter your 6-digit PIN.");
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
        toast.success("Signed in successfully.");
        router.replace("/dashboard");
        return;
      }

      const data = await res.json();
      toast.error(getFriendlyMessage(data.error, "Could not sign you in right now."));
    } catch {
      toast.error("Network connection unstable. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || name.length < 2) {
      toast.error("Enter your full name.");
      return;
    }
    if (!phone || phone.length !== 11) {
      toast.error("Enter your 11-digit phone number.");
      return;
    }
    if (pin.length !== 6) {
      toast.error("Choose a 6-digit PIN.");
      return;
    }
    if (pin !== confirmPin) {
      toast.error("PIN entries do not match.");
      return;
    }
    if (!acceptTerms) {
      toast.error("Accept the terms to proceed.");
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
        toast.error("An account already exists with that phone. Signing in.");
        resetToLogin();
        setPhone(phone);
        return;
      }

      if (res.ok) {
        toast.success("Account created successfully!");
        router.replace("/dashboard");
        return;
      }

      const data = await res.json();
      toast.error(data.error || "Signup failed");
    } catch {
      toast.error("Network connection error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!hasCheckedAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbfbfd]">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Branding Column */}
      <div className="hidden lg:flex flex-col justify-between bg-slate-900 text-white p-12 relative overflow-hidden select-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.18),transparent_40%)]" />
        
        {/* Top Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <img src="/logo.jpeg" alt="SY DATA" className="h-10 w-10 rounded-xl object-cover" />
          <span className="font-extrabold text-xl tracking-tight">SY DATA SUB</span>
        </div>

        {/* Core Selling Points */}
        <div className="space-y-8 relative z-10 max-w-md">
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
            Comprehensive Desktop Portal & Developer System
          </h1>
          <p className="text-slate-400 text-sm">
            Access developer keys, configure custom endpoints, buy data bundles at scale, and track transactions in real-time.
          </p>

          <div className="space-y-4 pt-6">
            <div className="flex items-start gap-4">
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                <Terminal size={16} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-100">Robust Developer APIs</h3>
                <p className="text-xs text-slate-400 mt-1">Integrate automated data delivery APIs to scale distributions directly from your server.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                <Database size={16} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-100">Interactive Catalog Sandbox</h3>
                <p className="text-xs text-slate-400 mt-1">Browse active network plans and execute test purchases within our sandbox playground.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                <Globe size={16} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-100">Signed Webhooks</h3>
                <p className="text-xs text-slate-400 mt-1">Receive secure HMAC-signed HTTP POST transaction update callbacks.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-xs text-slate-500 relative z-10">
          © {new Date().getFullYear()} SY DATA SUB. All rights reserved.
        </p>
      </div>

      {/* Form Column */}
      <div className="flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {mode === "login" ? "Sign In to Dashboard" : "Create Developer Account"}
            </h2>
            <p className="text-slate-500 mt-2 text-sm">
              {mode === "login"
                ? "Enter your credentials to manage desktop portal features."
                : "Register a profile to request Client API sandbox credentials."}
            </p>
          </div>

          <AnimatePresence mode="wait">
            <motion.form
              key={mode}
              initial={{ opacity: 0, x: mode === "login" ? -15 : 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: mode === "login" ? 15 : -15 }}
              transition={{ duration: 0.15 }}
              onSubmit={mode === "login" ? handleLogin : handleSignup}
              className="space-y-4"
            >
              {mode === "signup" && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-3 text-slate-400" size={16} />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ahmad Naziru"
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                </div>
              )}

              {mode === "signup" && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5 font-sans">Email Address (Optional)</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-3 text-slate-400" size={16} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="developer@example.com"
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-3 text-slate-400" size={16} />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                    placeholder="08012345678"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">6-Digit PIN</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3 text-slate-400" size={16} />
                  <input
                    type={showPin ? "text" : "password"}
                    required
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="••••••"
                    className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition tracking-[0.2em] font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {mode === "signup" && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Confirm PIN</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-3 text-slate-400" size={16} />
                    <input
                      type={showConfirmPin ? "text" : "password"}
                      required
                      maxLength={6}
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="••••••"
                      className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition tracking-[0.2em] font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPin(!showConfirmPin)}
                      className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPin ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              {mode === "signup" && (
                <div className="flex items-start gap-2.5 pt-2">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-1 accent-blue-600"
                  />
                  <label htmlFor="terms" className="text-xs text-slate-500 font-medium leading-relaxed">
                    I accept the terms and conditions for developer API usage.
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 mt-4"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : (
                  <>
                    {mode === "login" ? "Sign In" : "Register Profile"}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </motion.form>
          </AnimatePresence>

          <div className="text-center pt-4 border-t border-slate-100">
            <button
              onClick={() => (mode === "login" ? setMode("signup") : resetToLogin())}
              className="text-xs text-blue-600 hover:text-blue-700 font-bold transition"
            >
              {mode === "login" ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
