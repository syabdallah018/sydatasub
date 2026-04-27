"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Search, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type UserRole = "USER" | "AGENT" | "ADMIN";
type UserTier = "user" | "agent";
type AgentRequestStatus = "NONE" | "PENDING" | "APPROVED" | "REJECTED";

interface UserSummary {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  role: UserRole;
  tier: UserTier;
  balance: number;
  rewardBalance: number;
  agentRequestStatus: AgentRequestStatus;
  isBanned: boolean;
  isActive: boolean;
  transactionCount: number;
  bankAccountCount: number;
  joinedAt: string;
  updatedAt: string;
  lastTransactionAt: string | null;
}

interface UserBankAccount {
  id: string;
  bankCode: string;
  bankName: string;
  accountName: string | null;
  accountNumber: string;
  merchantReference: string;
  providerReference: string | null;
  isPrimary: boolean;
  createdAt: string;
}

interface UserDetails extends UserSummary {
  bankAccounts: UserBankAccount[];
  transactions: Array<{
    id: string;
    reference: string;
    type: string;
    status: string;
    amount: number;
    phone: string;
    createdAt: string;
  }>;
  _count: {
    transactions: number;
  };
}

function nairaFromKobo(kobo: number) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [openModal, setOpenModal] = useState(false);

  useEffect(() => {
    void fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      setError(null);
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function fetchUserDetails(userId: string) {
    try {
      setError(null);
      const response = await fetch(`/api/admin/users/${userId}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch user details");
      const data = await response.json();
      setSelectedUser(data);
      setOpenModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load details");
    }
  }

  async function handleBalanceAction(action: "ADD" | "DEDUCT", amount: number) {
    if (!selectedUser || amount <= 0) return;
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}/balance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, amount }),
      });
      if (!response.ok) throw new Error("Failed to update balance");
      await fetchUserDetails(selectedUser.id);
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update balance");
    }
  }

  async function handleUserAction(
    userId: string,
    changes: Partial<Pick<UserSummary, "role" | "tier" | "agentRequestStatus" | "isBanned" | "isActive">>
  ) {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      if (!response.ok) throw new Error("Failed to update user");
      if (selectedUser?.id === userId) await fetchUserDetails(userId);
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    }
  }

  async function handleResetPin(userId: string) {
    if (!confirm("Reset PIN to 000000?")) return;
    try {
      const response = await fetch(`/api/admin/users/${userId}/reset-pin`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to reset PIN");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset PIN");
    }
  }

  async function handleDeleteUser(userId: string) {
    if (!confirm("Deactivate this user?")) return;
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to deactivate user");
      if (selectedUser?.id === userId) {
        setOpenModal(false);
        setSelectedUser(null);
      }
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deactivate user");
    }
  }

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        user.fullName.toLowerCase().includes(q) ||
        user.phone.includes(q) ||
        (user.email || "").toLowerCase().includes(q);
      const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  if (loading) {
    return <div className="py-12 text-center text-slate-300">Loading users...</div>;
  }

  return (
    <div className="space-y-6 rounded-2xl border border-slate-800 bg-black p-5">
      <h1 className="text-3xl font-bold text-white">Users Management</h1>

      {error && (
        <Alert className="border-rose-500/50 bg-rose-900/20 text-rose-100">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search by name, phone, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-slate-700 bg-slate-950 pl-10 text-slate-100"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-36 border-slate-700 bg-slate-950 text-slate-100">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-slate-700 bg-slate-950 text-slate-100">
            <SelectItem value="ALL">All Roles</SelectItem>
            <SelectItem value="USER">User</SelectItem>
            <SelectItem value="AGENT">Agent</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden border-slate-800 bg-slate-950">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-sm text-slate-200">
            <thead className="border-b border-slate-800 bg-black">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Phone</th>
                <th className="px-4 py-3 text-left font-semibold">Email</th>
                <th className="px-4 py-3 text-left font-semibold">Role/Tier</th>
                <th className="px-4 py-3 text-left font-semibold">Wallet</th>
                <th className="px-4 py-3 text-left font-semibold">Txns</th>
                <th className="px-4 py-3 text-left font-semibold">Accounts</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-slate-900 hover:bg-slate-900/70">
                  <td className="px-4 py-3 font-medium">{user.fullName}</td>
                  <td className="px-4 py-3">{user.phone}</td>
                  <td className="px-4 py-3 text-slate-400">{user.email || "nil"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-slate-600 text-slate-200">{user.role}</Badge>
                      <Badge className={user.tier === "agent" ? "bg-emerald-700 text-emerald-100" : "bg-blue-700 text-blue-100"}>
                        {user.tier}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold">{nairaFromKobo(user.balance)}</td>
                  <td className="px-4 py-3">{user.transactionCount}</td>
                  <td className="px-4 py-3">{user.bankAccountCount}</td>
                  <td className="px-4 py-3">
                    <Badge className={user.isBanned || !user.isActive ? "bg-rose-700 text-rose-100" : "bg-emerald-700 text-emerald-100"}>
                      {user.isBanned || !user.isActive ? "Inactive" : "Active"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button size="sm" className="bg-slate-100 text-slate-900 hover:bg-white" onClick={() => void fetchUserDetails(user.id)}>
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {selectedUser && (
        <Dialog open={openModal} onOpenChange={setOpenModal}>
          <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto border-slate-800 bg-black text-slate-100">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
            </DialogHeader>

            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-800 bg-slate-950 p-4 md:grid-cols-4">
                <Field label="Name" value={selectedUser.fullName} />
                <Field label="Phone" value={selectedUser.phone} />
                <Field label="Email" value={selectedUser.email || "nil"} />
                <Field label="Joined" value={new Date(selectedUser.joinedAt).toLocaleString()} />
                <Field label="Role" value={selectedUser.role} />
                <Field label="Tier" value={selectedUser.tier} />
                <Field label="Wallet" value={nairaFromKobo(selectedUser.balance)} />
                <Field label="Rewards" value={nairaFromKobo(selectedUser.rewardBalance || 0)} />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <BalanceDialog onSubmit={(amount) => void handleBalanceAction("ADD", amount)} label="Add Balance" />
                <BalanceDialog onSubmit={(amount) => void handleBalanceAction("DEDUCT", amount)} label="Deduct Balance" />
              </div>

              <div className="grid gap-4 rounded-xl border border-slate-800 bg-slate-950 p-4 md:grid-cols-2">
                <div>
                  <Label className="mb-2 block text-slate-300">Role</Label>
                  <Select value={selectedUser.role} onValueChange={(role) => void handleUserAction(selectedUser.id, { role: role as UserRole })}>
                    <SelectTrigger className="border-slate-700 bg-black text-slate-100"><SelectValue /></SelectTrigger>
                    <SelectContent className="border-slate-700 bg-black text-slate-100">
                      <SelectItem value="USER">User</SelectItem>
                      <SelectItem value="AGENT">Agent</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2 block text-slate-300">Tier</Label>
                  <Select value={selectedUser.tier} onValueChange={(tier) => void handleUserAction(selectedUser.id, { tier: tier as UserTier })}>
                    <SelectTrigger className="border-slate-700 bg-black text-slate-100"><SelectValue /></SelectTrigger>
                    <SelectContent className="border-slate-700 bg-black text-slate-100">
                      <SelectItem value="user">Standard User</SelectItem>
                      <SelectItem value="agent">Agent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2 block text-slate-300">Agent Request</Label>
                  <Select
                    value={selectedUser.agentRequestStatus}
                    onValueChange={(status) =>
                      void handleUserAction(selectedUser.id, { agentRequestStatus: status as AgentRequestStatus })
                    }
                  >
                    <SelectTrigger className="border-slate-700 bg-black text-slate-100"><SelectValue /></SelectTrigger>
                    <SelectContent className="border-slate-700 bg-black text-slate-100">
                      <SelectItem value="NONE">NONE</SelectItem>
                      <SelectItem value="PENDING">PENDING</SelectItem>
                      <SelectItem value="APPROVED">APPROVED</SelectItem>
                      <SelectItem value="REJECTED">REJECTED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  {selectedUser.isBanned ? (
                    <Button className="w-full bg-emerald-700 hover:bg-emerald-600" onClick={() => void handleUserAction(selectedUser.id, { isBanned: false, isActive: true })}>
                      Unban User
                    </Button>
                  ) : (
                    <Button className="w-full bg-rose-700 hover:bg-rose-600" onClick={() => void handleUserAction(selectedUser.id, { isBanned: true, isActive: false })}>
                      Ban User
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Button variant="outline" className="border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-900" onClick={() => void handleResetPin(selectedUser.id)}>
                  Reset PIN to 000000
                </Button>
                <Button className="bg-rose-700 hover:bg-rose-600" onClick={() => void handleDeleteUser(selectedUser.id)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Deactivate User
                </Button>
              </div>

              <section className="space-y-2">
                <h3 className="text-base font-semibold">Bank Accounts</h3>
                <div className="space-y-2">
                  {selectedUser.bankAccounts.length === 0 ? (
                    <p className="text-sm text-slate-400">No account records.</p>
                  ) : (
                    selectedUser.bankAccounts.map((account) => (
                      <div key={account.id} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{account.bankName}</span>
                          {account.isPrimary ? <Badge className="bg-blue-700 text-blue-100">Primary</Badge> : null}
                        </div>
                        <p className="text-sm text-slate-300">{account.accountNumber}</p>
                        <p className="text-xs text-slate-500">{account.accountName || "Unnamed account"}</p>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold">Recent Transactions</h3>
                <div className="space-y-2">
                  {selectedUser.transactions.length === 0 ? (
                    <p className="text-sm text-slate-400">No transactions found.</p>
                  ) : (
                    selectedUser.transactions.map((tx) => (
                      <div key={tx.id} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{tx.type}</span>
                          <Badge className={tx.status === "SUCCESS" ? "bg-emerald-700 text-emerald-100" : "bg-amber-700 text-amber-100"}>
                            {tx.status}
                          </Badge>
                        </div>
                        <p className="text-sm">{tx.reference}</p>
                        <p className="text-xs text-slate-400">{new Date(tx.createdAt).toLocaleString()}</p>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-100">{value}</p>
    </div>
  );
}

function BalanceDialog({
  onSubmit,
  label,
}: {
  onSubmit: (amount: number) => void;
  label: string;
}) {
  const [amount, setAmount] = useState("");
  const [open, setOpen] = useState(false);

  const handleSubmit = () => {
    if (amount && Number(amount) > 0) {
      onSubmit(Number(amount));
      setAmount("");
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="w-full border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-900"
      >
        {label}
      </Button>
      <DialogContent className="border-slate-800 bg-black text-slate-100">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Amount (₦)</Label>
            <Input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="border-slate-700 bg-slate-950 text-slate-100"
            />
          </div>
          <Button onClick={handleSubmit} className="w-full bg-blue-700 hover:bg-blue-600">
            Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
