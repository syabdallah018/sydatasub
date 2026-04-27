"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import {
  ChevronLeft,
  Phone,
  Lock,
  Sun,
  Moon,
  LogOut,
  HelpCircle,
  FileText,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAppStore } from "@/store/appStore";

interface User {
  id: string;
  fullName: string;
  phone: string;
  role: string;
  joinedAt: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { logout } = useAppStore();
  const [showTermsSheet, setShowTermsSheet] = useState(false);
  const [showPrivacySheet, setShowPrivacySheet] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        return res.json();
      }
      throw new Error("Failed to fetch user");
    },
  });

  // Redirect to login if user fetch fails
  useEffect(() => {
    if (isLoading === false && !user) {
      router.push("/app");
    }
  }, [isLoading, user, router]);

  const handleLogout = async () => {
    try {
      // Clear cookie
      document.cookie = "sy_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

      // Clear store
      logout();

      // Redirect
      router.push("/app");
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-red-500/20 text-red-200 border-red-500/50";
      case "AGENT":
        return "bg-yellow-500/20 text-yellow-200 border-yellow-500/50";
      default:
        return "bg-green-500/20 text-green-200 border-green-500/50";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--app-bg,#0A0F0E)] text-white">
        {/* Header */}
        <div className="sticky top-0 z-50 backdrop-blur-sm bg-[var(--app-bg,#0A0F0E)]/80 border-b border-white/10 p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <h1 className="text-lg font-bold">Settings</h1>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          <Skeleton className="h-48 w-full bg-white/10 rounded-xl" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-8 w-24 bg-white/10" />
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="h-12 w-full bg-white/10" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!user) return null;

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
          <h1 className="text-lg font-bold">Settings</h1>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6 pb-8">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-teal-600/20 to-emerald-600/20 border border-teal-500/30 rounded-xl p-6"
        >
          <div className="flex flex-col items-center text-center">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center mb-4">
              <span className="text-2xl font-bold text-white">
                {user?.fullName ? getInitials(user.fullName) : "US"}
              </span>
            </div>

            {/* Name */}
            <h2 className="text-xl font-bold">{user?.fullName || "User"}</h2>

            {/* Role Badge */}
            {user?.role && (
              <Badge className={`mt-2 border ${getRoleBadgeColor(user.role)}`}>
                {user.role}
              </Badge>
            )}

            {/* Phone */}
            <p className="text-white/70 text-sm mt-3">{user?.phone || "N/A"}</p>

            {/* Member Since */}
            <p className="text-white/60 text-xs mt-2">
              Member since {user?.joinedAt ? format(new Date(user.joinedAt), "MMMM d, yyyy") : "Unknown"}
            </p>
          </div>
        </motion.div>

        {/* Account Details */}
        <div>
          <h3 className="text-sm font-semibold text-white/70 mb-3">Account</h3>
          {user?.phone && (
            <SettingsItem
              icon={<Phone className="h-5 w-5" />}
              label="Phone"
              value={user.phone}
            />
          )}
          {user?.role && (
            <SettingsItem
              icon={<Badge className="h-4 w-4" />}
              label="Role"
              value={
                <Badge className={`${getRoleBadgeColor(user.role)}`}>
                  {user.role}
                </Badge>
              }
            />
          )}
        </div>

        <Separator className="bg-white/10" />

        {/* Security */}
        <div>
          <h3 className="text-sm font-semibold text-white/70 mb-3">Security</h3>
          <motion.button
            whileHover={{ x: 4 }}
            onClick={() => router.push("/app/dashboard/settings/change-pin")}
            className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition"
          >
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-teal-400" />
              <span>Change PIN</span>
            </div>
            <span className="text-white/60">→</span>
          </motion.button>
          <p className="text-xs text-white/60 mt-2">
            Your 6-digit PIN secures all transactions
          </p>
        </div>

        <Separator className="bg-white/10" />

        {/* Preferences */}
        <div>
          <h3 className="text-sm font-semibold text-white/70 mb-3">Preferences</h3>

          {/* Appearance */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
            <div className="flex items-center gap-3">
              {theme === "dark" ? (
                <Moon className="h-5 w-5 text-teal-400" />
              ) : (
                <Sun className="h-5 w-5 text-teal-400" />
              )}
              <span>Appearance</span>
            </div>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="px-3 py-1 bg-teal-500/20 hover:bg-teal-500/30 rounded-full text-sm transition"
            >
              {theme === "dark" ? "Light" : "Dark"}
            </button>
          </div>

          {/* Notifications */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 mt-2">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-teal-400" />
              <span>Notifications</span>
            </div>
            <button
              onClick={() => toast.info("Coming soon!")}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full text-sm transition"
            >
              Off
            </button>
          </div>
        </div>

        <Separator className="bg-white/10" />

        {/* Support */}
        <div>
          <h3 className="text-sm font-semibold text-white/70 mb-3">Support</h3>

          <a
            href="tel:+2348000000000"
            className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition mb-2"
          >
            <div className="flex items-center gap-3">
              <HelpCircle className="h-5 w-5 text-teal-400" />
              <span>Contact Support</span>
            </div>
            <span className="text-white/60">→</span>
          </a>

          <button
            onClick={() => setShowTermsSheet(true)}
            className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition mb-2"
          >
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-teal-400" />
              <span>Terms of Service</span>
            </div>
            <span className="text-white/60">→</span>
          </button>

          <button
            onClick={() => setShowPrivacySheet(true)}
            className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition"
          >
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-teal-400" />
              <span>Privacy Policy</span>
            </div>
            <span className="text-white/60">→</span>
          </button>
        </div>

        <Separator className="bg-white/10" />

        {/* Danger Zone */}
        <div>
          <h3 className="text-sm font-semibold text-red-500 mb-3">Danger Zone</h3>
          <Button
            onClick={handleLogout}
            className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/50"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log Out
          </Button>
        </div>
      </div>

      {/* Terms Sheet */}
      <Sheet open={showTermsSheet} onOpenChange={setShowTermsSheet}>
        <SheetContent side="bottom" className="bg-[var(--app-bg,#0A0F0E)] border-white/10 text-white max-h-96 overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Terms of Service</SheetTitle>
          </SheetHeader>
          <div className="text-sm text-white/70 space-y-4">
            <p>
              <strong>1. Acceptance of Terms</strong>
              <br />
              By using SY DATA SUB, you agree to these Terms of Service and all applicable laws and regulations.
            </p>
            <p>
              <strong>2. Use License</strong>
              <br />
              Permission is granted to temporarily download one copy of the materials on our service for personal, non-commercial transitory viewing only.
            </p>
            <p>
              <strong>3. Disclaimer</strong>
              <br />
              The materials on SY DATA SUB are provided without warranties of any kind, either expressed or implied.
            </p>
            <p>
              <strong>4. Limitation of Liability</strong>
              <br />
              In no case shall SY DATA SUB or its suppliers be liable for any damages resulting from use or inability to use the materials.
            </p>
            <p>
              <strong>5. Accuracy of Materials</strong>
              <br />
              The materials appearing on SY DATA SUB could include technical, typographical, or photographic errors. We do not warrant that any materials are accurate, complete, or current.
            </p>
          </div>
        </SheetContent>
      </Sheet>

      {/* Privacy Sheet */}
      <Sheet open={showPrivacySheet} onOpenChange={setShowPrivacySheet}>
        <SheetContent side="bottom" className="bg-[var(--app-bg,#0A0F0E)] border-white/10 text-white max-h-96 overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Privacy Policy</SheetTitle>
          </SheetHeader>
          <div className="text-sm text-white/70 space-y-4">
            <p>
              <strong>1. Information We Collect</strong>
              <br />
              We collect information you provide directly, such as name, phone number, and transaction history.
            </p>
            <p>
              <strong>2. How We Use Information</strong>
              <br />
              We use the information to provide, maintain, and improve our services, process transactions, and send service-related announcements.
            </p>
            <p>
              <strong>3. Data Security</strong>
              <br />
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access.
            </p>
            <p>
              <strong>4. Third-Party Sharing</strong>
              <br />
              We do not share your personal information with third parties except as necessary for transaction processing or legal compliance.
            </p>
            <p>
              <strong>5. Your Rights</strong>
              <br />
              You may request access to, correction of, or deletion of your personal data by contacting our support team.
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

interface SettingsItemProps {
  icon: React.ReactNode;
  label: string;
  value?: string | React.ReactNode;
}

function SettingsItem({
  icon,
  label,
  value,
}: SettingsItemProps) {
  return (
    <motion.div
      whileHover={{ x: 2 }}
      className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition mb-2"
    >
      <div className="flex items-center gap-3 flex-1">
        <span className="text-teal-400">{icon}</span>
        <span className="text-sm text-white/70">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {typeof value === "string" ? (
          <span className="text-sm text-white font-mono">{value}</span>
        ) : (
          value
        )}
      </div>
    </motion.div>
  );
}
