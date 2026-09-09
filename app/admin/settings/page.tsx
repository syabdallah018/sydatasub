"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Database,
  Lock,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminSettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasDbPassword, setHasDbPassword] = useState(false);
  const [adminProfile, setAdminProfile] = useState<{
    fullName: string;
    phone?: string;
    email?: string;
  } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/settings/password");
      const data = await res.json();
      if (res.ok && data.success) {
        setHasDbPassword(data.hasDbPassword);
        setAdminProfile(data.admin);
      }
    } catch (err) {
      console.error("[FETCH ADMIN SETTINGS ERROR]", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error("Please enter your current admin password.");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || "Admin password successfully updated in database!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setHasDbPassword(true);
      } else {
        toast.error(data.error || "Failed to update password.");
      }
    } catch (err) {
      toast.error("Network error while updating password.");
    } finally {
      setSaving(false);
    }
  };

  // Password strength helper
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: "Empty", color: "bg-slate-200" };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 12) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { score: 1, label: "Weak", color: "bg-red-500" };
    if (score <= 2) return { score: 2, label: "Fair", color: "bg-amber-500" };
    if (score <= 3) return { score: 3, label: "Good", color: "bg-blue-500" };
    return { score: 4, label: "Strong", color: "bg-emerald-500" };
  };

  const strength = getPasswordStrength(newPassword);

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          <KeyRound className="h-8 w-8 text-blue-600" />
          Admin Security Settings
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Manage your administrative credentials and database authentication security.
        </p>
      </div>

      {/* Status Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">Authentication Source</h3>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                ) : hasDbPassword ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Neon Database Password Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Default Environment (.env) Fallback
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {hasDbPassword
                  ? "Admin sign-in verifies directly against your encrypted Neon database password."
                  : "No custom password has been saved to the database yet. Admin login uses ADMIN_PASSWORD from your server environment."}
              </p>
            </div>
          </div>
          {adminProfile && (
            <div className="text-right sm:border-l sm:border-slate-100 sm:pl-6 text-xs text-slate-500">
              <span className="font-bold text-slate-800 block text-sm">{adminProfile.fullName}</span>
              <span>{adminProfile.phone || adminProfile.email || "Master Admin"}</span>
            </div>
          )}
        </div>
      </div>

      {/* Password Change Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Lock className="h-5 w-5 text-blue-600" />
            <h2 className="font-bold text-slate-900 text-lg">Update Admin Password</h2>
          </div>
          <span className="text-xs font-medium text-slate-500">
            Encrypted with bcrypt (cost 12)
          </span>
        </div>

        <form onSubmit={handleUpdatePassword} className="p-6 sm:p-8 space-y-6">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                placeholder="Enter current admin password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={saving}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-sm transition pr-11"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Enter the password currently in use to authorize this change.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* New Password */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={saving}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-sm transition pr-11"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Strength Meter */}
              {newPassword && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Strength:</span>
                    <span className="font-semibold text-slate-700">{strength.label}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-1">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`h-full flex-1 transition-all ${
                          strength.score >= step ? strength.color : "bg-slate-200"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-type your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={saving}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-sm transition pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1 font-medium">
                  <AlertTriangle className="h-3 w-3" /> Passwords do not match
                </p>
              )}
            </div>
          </div>

          {/* Security Notice Alert */}
          <div className="rounded-xl p-4 bg-blue-50/60 border border-blue-100 text-xs text-blue-800 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              Password-Only Login Active
            </div>
            <p className="text-blue-700 leading-relaxed">
              Once saved, the admin login screen will directly require your new database password. Phone number and PIN are abolished for admin sign-in.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={saving || !currentPassword || !newPassword || newPassword !== confirmPassword}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-sm shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving to Database...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Update Admin Password
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
