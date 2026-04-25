"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, MessageCircle, Plus, Minus, DollarSign, History, X, ExternalLink } from "lucide-react";
import { toast } from "sonner";

// ─── DESIGN TOKENS ───────────────────────────────────────────────
const T = {
  bgCard:     "#0F1320",
  bgElevated: "#161B2E",
  blue:       "#3B82F6",
  violet:     "#8B5CF6",
  textPrimary:   "#F1F5FF",
  textSecondary: "#8B93B0",
  textMuted:     "#4B5370",
  border:     "rgba(255,255,255,0.07)",
  green:      "#10B981",
  red:        "#EF4444",
};

const font = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Helvetica, Arial, sans-serif';

interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  balance: number;
  tier: string;
  createdAt: string;
  accountNumber?: string | null;
  bankName?: string | null;
  accountName?: string | null;
}

interface UserTransaction {
  id: string;
  planName: string;
  size?: string;
  amount: number;
  status: string;
  createdAt: string;
}

export default function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userTransactions, setUserTransactions] = useState<UserTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [balanceOperation, setBalanceOperation] = useState<"" | "add" | "subtract" | "set">("");
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [roleLoading, setRoleLoading] = useState(false);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/admin/users", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch users");
        const json = await res.json();
        if (Array.isArray(json)) {
          setUsers(json);
        } else {
          throw new Error("Invalid users data");
        }
      } catch (error) {
        toast.error("Failed to load users");
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Fetch user transactions
  const fetchUserTransactions = async (userId: string) => {
    setTransactionsLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/transactions`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch transactions");
      const json = await res.json();
      if (Array.isArray(json)) {
        setUserTransactions(json);
      }
    } catch (error) {
      toast.error("Failed to load user transactions");
      setUserTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  };

  // Handle user selection
  const handleSelectUser = async (user: AdminUser) => {
    setSelectedUser(user);
    await fetchUserTransactions(user.id);
    setBalanceOperation("");
    setBalanceAmount("");
  };

  // Handle balance operation
  const handleBalanceOperation = async () => {
    if (!balanceOperation || !balanceAmount || !selectedUser) {
      toast.error("Please select operation and enter amount");
      return;
    }

    const amount = parseFloat(balanceAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setBalanceLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          operation: balanceOperation,
          amount,
        }),
      });

      if (!res.ok) throw new Error("Failed to update balance");
      const result = await res.json();

      // Update selected user balance
      const operationText = 
        balanceOperation === "add" ? "Added" : 
        balanceOperation === "subtract" ? "Deducted" : 
        "Set";
      
      setSelectedUser({
        ...selectedUser,
        balance: result.balance,
      });

      // Update users list
      setUsers(
        users.map((u) =>
          u.id === selectedUser.id ? { ...u, balance: result.balance } : u
        )
      );

      toast.success(`Balance ${operationText} successfully`);
      setBalanceAmount("");
      setBalanceOperation("");
    } catch (error) {
      toast.error("Failed to update balance");
    } finally {
      setBalanceLoading(false);
    }
  };

  // Handle role toggle
  const handleRoleToggle = async () => {
    if (!selectedUser) return;

    const newRole = selectedUser.tier === "user" ? "AGENT" : "USER";
    setRoleLoading(true);

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) throw new Error("Failed to update role");
      const result = await res.json();

      // Update selected user role
      const updatedUser = { ...selectedUser, tier: newRole.toLowerCase() };
      setSelectedUser(updatedUser);

      // Update users list
      setUsers(
        users.map((u) =>
          u.id === selectedUser.id ? { ...u, tier: newRole.toLowerCase() } : u
        )
      );

      toast.success(`User ${newRole === "AGENT" ? "upgraded to Agent" : "downgraded to User"}`);
    } catch (error) {
      toast.error("Failed to update user role");
    } finally {
      setRoleLoading(false);
    }
  };

  // Generate WhatsApp URL
  const getWhatsAppUrl = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    return `https://wa.me/${cleanPhone}`;
  };

  const filteredUsers = users.filter(
    (user) => {
      const emailLower = String(user.email || "").toLowerCase();
      const fullNameLower = String(user.fullName || "").toLowerCase();
      const phoneLower = String(user.phone || "").toLowerCase();
      const queryLower = searchQuery.toLowerCase();
      return (
        emailLower.includes(queryLower) ||
        fullNameLower.includes(queryLower) ||
        phoneLower.includes(queryLower)
      );
    }
  );

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "40px 20px", fontFamily: font }}>
        <Loader2 size={32} style={{ color: T.blue, animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: font }}>
      <div style={{
        display: "flex",
        gap: 12,
        alignItems: "center",
        marginBottom: 16,
        flexWrap: "wrap",
      }}>
        <div style={{ position: "relative", flex: "1 1 280px", maxWidth: 420 }}>
          <Search size={16} color={T.textMuted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            placeholder="Search by name, email, or phone"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setSearchQuery(searchInput.trim());
            }}
            style={{
              width: "100%",
              padding: "11px 12px 11px 36px",
              borderRadius: 10,
              background: T.bgElevated,
              border: `1px solid ${T.border}`,
              color: T.textPrimary,
              fontSize: 14,
              fontFamily: font,
              boxSizing: "border-box",
            }}
          />
        </div>
        <button
          onClick={() => setSearchQuery(searchInput.trim())}
          style={{
            padding: "11px 16px",
            borderRadius: 10,
            background: T.blue,
            border: "none",
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: font,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Search size={16} />
          Search
        </button>
        {(searchQuery || searchInput) && (
          <button
            onClick={() => {
              setSearchInput("");
              setSearchQuery("");
            }}
            style={{
              padding: "11px 16px",
              borderRadius: 10,
              background: T.bgElevated,
              border: `1px solid ${T.border}`,
              color: T.textSecondary,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: font,
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Users table */}
      <div style={{
        padding: 20,
        borderRadius: 12,
        background: T.bgCard,
        border: `1px solid ${T.border}`,
        overflowX: "auto",
      }}>
        <table style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 13,
          minWidth: "700px",
        }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}` }}>
              <th style={{ padding: "12px 8px", textAlign: "left", color: T.textMuted, fontWeight: 600 }}>
                Email
              </th>
              <th style={{ padding: "12px 8px", textAlign: "left", color: T.textMuted, fontWeight: 600 }}>
                Name
              </th>
              <th style={{ padding: "12px 8px", textAlign: "left", color: T.textMuted, fontWeight: 600 }}>
                Phone
              </th>
              <th style={{ padding: "12px 8px", textAlign: "left", color: T.textMuted, fontWeight: 600 }}>
                Account #
              </th>
              <th style={{ padding: "12px 8px", textAlign: "left", color: T.textMuted, fontWeight: 600 }}>
                Bank
              </th>
              <th style={{ padding: "12px 8px", textAlign: "right", color: T.textMuted, fontWeight: 600 }}>
                Balance
              </th>
              <th style={{ padding: "12px 8px", textAlign: "left", color: T.textMuted, fontWeight: 600 }}>
                Tier
              </th>
              <th style={{ padding: "12px 8px", textAlign: "left", color: T.textMuted, fontWeight: 600 }}>
                Joined
              </th>
              <th style={{ padding: "12px 8px", textAlign: "center", color: T.textMuted, fontWeight: 600 }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr
                key={user.id || Math.random()}
                style={{ borderBottom: `1px solid ${T.border}`, cursor: "pointer" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.background = T.bgElevated;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.background = "transparent";
                }}
              >
                <td 
                  style={{ padding: "12px 8px", color: T.textSecondary }}
                  onClick={() => handleSelectUser(user)}
                >
                  {user.email || "—"}
                </td>
                <td 
                  style={{ padding: "12px 8px", color: T.textSecondary }}
                  onClick={() => handleSelectUser(user)}
                >
                  {user.fullName || "—"}
                </td>
                <td style={{ padding: "12px 8px", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: T.textSecondary }}>{user.phone || "—"}</span>
                  {user.phone && (
                    <a
                      href={getWhatsAppUrl(user.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "4px 8px",
                        borderRadius: 6,
                        background: "rgba(37,211,102,0.2)",
                        color: "#25D366",
                        fontSize: 12,
                        fontWeight: 600,
                        textDecoration: "none",
                        cursor: "pointer",
                      }}
                      title="Open WhatsApp"
                    >
                      <MessageCircle size={14} />
                    </a>
                  )}
                </td>
                <td 
                  style={{ padding: "12px 8px", color: T.textSecondary, fontFamily: "monospace", fontSize: 12 }}
                  onClick={() => handleSelectUser(user)}
                >
                  {user.accountNumber || "—"}
                </td>
                <td 
                  style={{ padding: "12px 8px", color: T.textSecondary }}
                  onClick={() => handleSelectUser(user)}
                >
                  {user.bankName || "—"}
                </td>
                <td 
                  style={{ padding: "12px 8px", textAlign: "right", color: T.textPrimary, fontWeight: 600 }}
                  onClick={() => handleSelectUser(user)}
                >
                  ₦{((user.balance || 0)).toLocaleString()}
                </td>
                <td style={{ padding: "12px 8px" }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "4px 8px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      background: (user.tier || "user") === "user" ? `${T.blue}20` : `${T.textSecondary}20`,
                      color: (user.tier || "user") === "user" ? T.blue : T.textSecondary,
                      textTransform: "capitalize",
                    }}
                  >
                    {user.tier || "user"}
                  </span>
                </td>
                <td 
                  style={{ padding: "12px 8px", color: T.textMuted, fontSize: 12 }}
                  onClick={() => handleSelectUser(user)}
                >
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
                </td>
                <td style={{ padding: "12px 8px", textAlign: "center" }}>
                  <button
                    onClick={() => handleSelectUser(user)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 6,
                      background: T.blue,
                      border: "none",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: font,
                    }}
                  >
                    Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div style={{
            padding: "40px 20px",
            textAlign: "center",
            color: T.textSecondary,
          }}>
            {searchQuery ? "No users match your search" : "No users yet"}
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div
          onClick={() => setSelectedUser(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "flex-end",
            fontFamily: font,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: T.bgCard,
              border: `1px solid ${T.border}`,
              borderRadius: "28px 28px 0 0",
              padding: "32px 20px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: T.textPrimary }}>
                User Details
              </h2>
              <button
                onClick={() => setSelectedUser(null)}
                style={{
                  background: T.bgElevated,
                  border: `1px solid ${T.border}`,
                  borderRadius: 12,
                  width: 38,
                  height: 38,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: T.textSecondary,
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* User Info Card */}
            <div style={{
              padding: 20,
              borderRadius: 16,
              background: `linear-gradient(135deg, ${T.bgElevated}, ${T.bgCard})`,
              border: `1px solid ${T.border}`,
              marginBottom: 20,
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <p style={{ margin: "0 0 4px", fontSize: 12, color: T.textMuted, fontWeight: 600 }}>Name</p>
                  <p style={{ margin: 0, fontSize: 16, color: T.textPrimary, fontWeight: 600 }}>
                    {selectedUser.fullName || "—"}
                  </p>
                </div>
                <div>
                  <p style={{ margin: "0 0 4px", fontSize: 12, color: T.textMuted, fontWeight: 600 }}>Email</p>
                  <p style={{ margin: 0, fontSize: 14, color: T.textSecondary }}>
                    {selectedUser.email || "—"}
                  </p>
                </div>
                <div>
                  <p style={{ margin: "0 0 4px", fontSize: 12, color: T.textMuted, fontWeight: 600 }}>Phone</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <p style={{ margin: 0, fontSize: 14, color: T.textSecondary }}>
                      {selectedUser.phone || "—"}
                    </p>
                    {selectedUser.phone && (
                      <a
                        href={getWhatsAppUrl(selectedUser.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "4px 8px",
                          borderRadius: 6,
                          background: "rgba(37,211,102,0.2)",
                          color: "#25D366",
                          fontSize: 12,
                          fontWeight: 600,
                          textDecoration: "none",
                          cursor: "pointer",
                        }}
                        title="Open WhatsApp"
                      >
                        <MessageCircle size={14} />
                      </a>
                    )}
                  </div>
                </div>
                <div>
                  <p style={{ margin: "0 0 4px", fontSize: 12, color: T.textMuted, fontWeight: 600 }}>Tier</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      display: "inline-block",
                      padding: "4px 8px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      background: (selectedUser.tier || "user") === "user" ? `${T.blue}20` : `${T.textSecondary}20`,
                      color: (selectedUser.tier || "user") === "user" ? T.blue : T.textSecondary,
                      textTransform: "capitalize",
                    }}>
                      {selectedUser.tier || "user"}
                    </span>
                    <button
                      onClick={handleRoleToggle}
                      disabled={roleLoading}
                      style={{
                        padding: "4px 12px",
                        borderRadius: 6,
                        background: selectedUser.tier === "user" ? T.violet : `${T.blue}20`,
                        border: `1px solid ${selectedUser.tier === "user" ? T.violet : T.blue}`,
                        color: selectedUser.tier === "user" ? "#fff" : T.blue,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: roleLoading ? "not-allowed" : "pointer",
                        opacity: roleLoading ? 0.7 : 1,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {roleLoading ? (
                        <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                      ) : (
                        selectedUser.tier === "user" ? "Upgrade" : "Downgrade"
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Virtual Account Section */}
              {(selectedUser.accountNumber || selectedUser.bankName) && (
                <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 16, marginBottom: 16 }}>
                  <p style={{ margin: "0 0 12px", fontSize: 12, color: T.textMuted, fontWeight: 600 }}>Virtual Account</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    {selectedUser.accountNumber && (
                      <div>
                        <p style={{ margin: "0 0 4px", fontSize: 11, color: T.textMuted, fontWeight: 600 }}>Account Number</p>
                        <p style={{ margin: 0, fontSize: 14, color: T.textPrimary, fontFamily: "monospace", fontWeight: 600 }}>
                          {selectedUser.accountNumber}
                        </p>
                      </div>
                    )}
                    {selectedUser.bankName && (
                      <div>
                        <p style={{ margin: "0 0 4px", fontSize: 11, color: T.textMuted, fontWeight: 600 }}>Bank</p>
                        <p style={{ margin: 0, fontSize: 14, color: T.textPrimary, fontWeight: 600 }}>
                          {selectedUser.bankName}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 16 }}>
                <p style={{ margin: "0 0 8px", fontSize: 12, color: T.textMuted, fontWeight: 600 }}>Current Balance</p>
                <p style={{ margin: 0, fontSize: 32, fontWeight: 800, color: T.green }}>
                  ₦{(selectedUser.balance || 0).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Balance Operations */}
            <div style={{
              padding: 20,
              borderRadius: 16,
              background: T.bgElevated,
              border: `1px solid ${T.border}`,
              marginBottom: 20,
            }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: T.textPrimary }}>
                <DollarSign size={18} style={{ display: "inline", marginRight: 8 }} />
                Manage Balance
              </h3>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <select
                  value={balanceOperation}
                  onChange={(e) => setBalanceOperation(e.target.value as any)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: T.bgCard,
                    border: `1px solid ${T.border}`,
                    color: T.textPrimary,
                    fontSize: 14,
                    fontFamily: font,
                  }}
                >
                  <option value="">Select Operation</option>
                  <option value="add">Add Balance</option>
                  <option value="subtract">Deduct Balance</option>
                  <option value="set">Set Balance</option>
                </select>

                <input
                  type="number"
                  placeholder="Amount (₦)"
                  value={balanceAmount}
                  onChange={(e) => setBalanceAmount(e.target.value)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: T.bgCard,
                    border: `1px solid ${T.border}`,
                    color: T.textPrimary,
                    fontSize: 14,
                    fontFamily: font,
                  }}
                />
              </div>

              <button
                onClick={handleBalanceOperation}
                disabled={balanceLoading || !balanceOperation || !balanceAmount}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: 8,
                  background: balanceOperation && balanceAmount && !balanceLoading ? T.blue : T.bgCard,
                  border: `1px solid ${T.border}`,
                  color: balanceOperation && balanceAmount && !balanceLoading ? "#fff" : T.textMuted,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: balanceOperation && balanceAmount && !balanceLoading ? "pointer" : "not-allowed",
                  opacity: balanceLoading ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  fontFamily: font,
                }}
              >
                {balanceLoading && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
                {balanceLoading ? "Processing..." : "Apply"}
              </button>
            </div>

            {/* User Transactions */}
            <div style={{
              padding: 20,
              borderRadius: 16,
              background: T.bgElevated,
              border: `1px solid ${T.border}`,
            }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: T.textPrimary }}>
                <History size={18} style={{ display: "inline", marginRight: 8 }} />
                Transaction History
              </h3>

              {transactionsLoading ? (
                <div style={{ textAlign: "center", padding: "40px 20px" }}>
                  <Loader2 size={32} style={{ color: T.blue, animation: "spin 1s linear infinite" }} />
                </div>
              ) : userTransactions.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {userTransactions.map((tx) => (
                    <div
                      key={tx.id || Math.random()}
                      style={{
                        padding: 12,
                        borderRadius: 8,
                        background: T.bgCard,
                        border: `1px solid ${T.border}`,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600, color: T.textPrimary }}>
                          {tx.planName || "Data Plan"} {tx.size ? `(${tx.size})` : ""}
                        </p>
                        <p style={{ margin: 0, fontSize: 12, color: T.textMuted }}>
                          {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : "—"}
                        </p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: T.textPrimary }}>
                          ₦{(tx.amount || 0).toLocaleString()}
                        </p>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: tx.status === "SUCCESS" ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)",
                          color: tx.status === "SUCCESS" ? T.green : T.red,
                          textTransform: "uppercase",
                        }}>
                          {tx.status || "Pending"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, color: T.textMuted, textAlign: "center", padding: "20px" }}>
                  No transactions yet
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
