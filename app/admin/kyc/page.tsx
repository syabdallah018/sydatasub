"use client";

import { useEffect, useState } from "react";
import { 
  Loader2, 
  ShieldAlert, 
  UserCheck, 
  Search, 
  AlertCircle,
  Calendar,
  Phone,
  Wallet,
  ArrowRight,
  Info
} from "lucide-react";
import { toast } from "sonner";

interface LockedUser {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  balance: number;
  tier: string;
  kycLocked: boolean;
  kycLockReason: string | null;
  kycLockedAt: string | null;
  joinedAt: string;
}

export default function AdminKycPage() {
  const [users, setUsers] = useState<LockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchLockedUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/kyc");
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
      } else {
        toast.error(data.error || "Failed to load locked users");
      }
    } catch {
      toast.error("Connection error loading KYC locked accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLockedUsers();
  }, []);

  const handleUnlock = async (userId: string) => {
    if (!confirm("Are you sure you want to unlock this account and restore transaction privileges?")) return;
    
    setActionLoadingId(userId);
    try {
      const res = await fetch(`/api/admin/kyc/${userId}/unlock`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Account unlocked successfully.");
        // Remove unlocked user from list
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      } else {
        toast.error(data.error || "Unlock action failed");
      }
    } catch {
      toast.error("Network error unlocking user profile");
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.includes(searchQuery) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-8">
      {/* Header Info */}
      <div className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldAlert className="text-red-500" size={22} />
            KYC & Fraud Review Portal
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Review and unlock client accounts flagged for high frequency transaction velocity triggers.
          </p>
        </div>

        <div className="relative w-72">
          <input
            type="text"
            placeholder="Search flagged accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition"
          />
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200/60 shadow-sm">
          <Loader2 className="animate-spin mx-auto text-blue-600 mb-3" size={36} />
          <p className="text-sm text-slate-500 font-semibold">Retrieving flagged database logs...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/60 p-12 text-center shadow-sm space-y-3">
          <div className="h-12 w-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto">
            <UserCheck size={24} />
          </div>
          <h3 className="font-bold text-slate-800 text-base">All Clear!</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No user profiles are flagged or locked under velocity threshold controls right now.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredUsers.map((u) => (
            <div 
              key={u.id} 
              className="bg-white rounded-3xl border border-red-100 shadow-sm p-6 space-y-6 hover:border-red-200 transition duration-150 relative overflow-hidden"
            >
              {/* Alert Ribbon */}
              <div className="absolute right-0 top-0 bg-red-500 text-white font-bold text-[9px] uppercase px-3 py-1 rounded-bl-xl tracking-wider flex items-center gap-1 shadow-sm">
                <AlertCircle size={10} /> Flagged
              </div>

              {/* User profile segment */}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold text-base shrink-0">
                  {u.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">{u.fullName}</h4>
                  <span className="text-xs text-slate-400 font-medium block truncate max-w-[200px]">{u.email || "No Email"}</span>
                </div>
              </div>

              {/* Info Details Grid */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50/70 border border-slate-100 p-4 rounded-2xl text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-slate-400" />
                  <span>{u.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Wallet size={14} className="text-slate-400" />
                  <span>₦{(u.balance / 100).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 col-span-2 border-t border-slate-200/50 pt-2 text-[11px] text-red-700">
                  <AlertCircle size={14} className="shrink-0" />
                  <span className="truncate">{u.kycLockReason || "Suspicious transaction frequency"}</span>
                </div>
                {u.kycLockedAt && (
                  <div className="flex items-center gap-2 col-span-2 text-[10px] text-slate-400 font-medium">
                    <Calendar size={12} />
                    <span>Flagged on {new Date(u.kycLockedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Action Unlock Button */}
              <button
                onClick={() => handleUnlock(u.id)}
                disabled={actionLoadingId === u.id}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {actionLoadingId === u.id ? (
                  <Loader2 className="animate-spin" size={14} />
                ) : (
                  <>
                    Unlock Account
                    <ArrowRight size={12} />
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
