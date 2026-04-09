"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Search } from "lucide-react";

interface User {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  role: string;
  balance: number;
  isBanned: boolean;
  accountNumber?: string;
  bankName?: string;
  transactionCount: number;
  joinedAt: string;
}

interface UserDetails extends User {
  virtualAccount?: {
    accountNumber: string;
    bankName: string;
  };
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

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [openModal, setOpenModal] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`);
      if (!response.ok) throw new Error("Failed to fetch user details");
      const data = await response.json();
      setSelectedUser(data);
      setOpenModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load details");
    }
  };

  const handleBalanceAction = async (action: "ADD" | "DEDUCT", amount: number) => {
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
      setError(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const handleUserAction = async (userId: string, role?: string, banned?: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(role && { role }),
          ...(banned !== undefined && { isBanned: banned }),
        }),
      });
      if (!response.ok) throw new Error("Failed to update user");
      if (selectedUser?.id === userId) {
        await fetchUserDetails(userId);
      }
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const handleResetPin = async (userId: string) => {
    if (!confirm("Reset PIN to 000000?")) return;
    try {
      const response = await fetch(`/api/admin/users/${userId}/reset-pin`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to reset PIN");
      await fetchUserDetails(userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset PIN");
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.fullName.toLowerCase().includes(search.toLowerCase()) ||
      user.phone.includes(search);
    const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return <div className="text-center py-12">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Users Management</h1>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Roles</SelectItem>
            <SelectItem value="USER">User</SelectItem>
            <SelectItem value="AGENT">Agent</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Phone</th>
                <th className="px-4 py-3 text-left font-semibold">Role</th>
                <th className="px-4 py-3 text-left font-semibold">Balance</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Txns</th>
                <th className="px-4 py-3 text-left font-semibold">Joined</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{user.fullName}</td>
                  <td className="px-4 py-3 text-sm">{user.phone}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{user.role}</Badge>
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    ₦{(user.balance / 100).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={
                        user.isBanned
                          ? "bg-red-100 text-red-800"
                          : "bg-green-100 text-green-800"
                      }
                    >
                      {user.isBanned ? "Banned" : "Active"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{user.transactionCount}</td>
                  <td className="px-4 py-3 text-xs">
                    {new Date(user.joinedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      onClick={() => fetchUserDetails(user.id)}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* User Detail Modal */}
      {selectedUser && (
        <Dialog open={openModal} onOpenChange={setOpenModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* User Info Card */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl">
                    {selectedUser.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      {selectedUser.fullName}
                    </h3>
                    <p className="text-sm text-slate-600">{selectedUser.phone}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-600">Role</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {selectedUser.role}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Balance</p>
                    <p className="text-lg font-bold text-green-600">
                      ₦{(selectedUser.balance / 100).toLocaleString()}
                    </p>
                  </div>
                  {selectedUser.virtualAccount && (
                    <>
                      <div>
                        <p className="text-xs text-slate-600">Account Number</p>
                        <p className="text-sm font-mono font-semibold">
                          {selectedUser.virtualAccount.accountNumber}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600">Bank</p>
                        <p className="text-sm font-semibold">
                          {selectedUser.virtualAccount.bankName}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-900">Actions</h4>

                <div className="grid grid-cols-2 gap-3">
                  <BalanceDialog
                    onSubmit={(amount) => handleBalanceAction("ADD", amount)}
                    label="Add Balance"
                  />
                  <BalanceDialog
                    onSubmit={(amount) => handleBalanceAction("DEDUCT", amount)}
                    label="Deduct Balance"
                  />
                </div>

                <div>
                  <Label className="text-sm mb-2">Change Role</Label>
                  <Select
                    value={selectedUser.role}
                    onValueChange={(role) => handleUserAction(selectedUser.id, role)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USER">User</SelectItem>
                      <SelectItem value="AGENT">Agent</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  {selectedUser.isBanned ? (
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => handleUserAction(selectedUser.id, undefined, false)}
                    >
                      Unban User
                    </Button>
                  ) : (
                    <Button
                      className="flex-1 bg-red-600 hover:bg-red-700"
                      onClick={() => handleUserAction(selectedUser.id, undefined, true)}
                    >
                      Ban User
                    </Button>
                  )}
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleResetPin(selectedUser.id)}
                >
                  Reset PIN to 000000
                </Button>
              </div>

              {/* Recent Transactions */}
              {selectedUser.transactions.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-900 mb-3">
                    Recent Transactions
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedUser.transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="bg-slate-50 rounded p-3 text-sm space-y-1"
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-mono text-xs text-slate-600">
                            {tx.reference.slice(0, 15)}...
                          </span>
                          <Badge className={tx.status === "SUCCESS" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                            {tx.status}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">{tx.type}</span>
                          <span className="font-bold">₦{tx.amount.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
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
    if (amount && parseFloat(amount) > 0) {
      onSubmit(parseFloat(amount));
      setAmount("");
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" onClick={() => setOpen(true)} className="w-full">
        {label}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Amount (₦)</Label>
            <Input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
            />
          </div>
          <Button onClick={handleSubmit} className="w-full">
            Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
