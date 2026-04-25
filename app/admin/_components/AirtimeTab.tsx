"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface AirtimeTransaction {
  id: number;
  user_id: string;
  ident: string;
  network: number;
  network_name: string;
  mobile_number: string;
  amount: number;
  status: string;
  api_response: string;
  balance_before: string;
  balance_after: string;
  created_at: string;
  updated_at: string;
}

const T = {
  bg: "#07090F",
  bgCard: "#0F1320",
  bgElevated: "#161B2E",
  border: "rgba(255,255,255,0.07)",
  textPrimary: "#F1F5FF",
  textSecondary: "#8B93B0",
  textMuted: "#4B5370",
  green: "#10B981",
  red: "#EF4444",
  amber: "#F59E0B",
  blue: "#3B82F6",
};

const font = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Helvetica, Arial, sans-serif';
const formatMoney = (value: number | string) => {
  const amount = typeof value === "number" ? value : parseFloat(String(value || 0));
  return amount.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export default function AirtimeTab() {
  const [transactions, setTransactions] = useState<AirtimeTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");
  const [network, setNetwork] = useState("");
  const [search, setSearch] = useState("");

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(status && { status }),
        ...(network && { network }),
        ...(search && { search }),
      });

      const res = await fetch(`/api/admin/transactions/airtime?${params}`, {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setTransactions(data.data);
        setTotal(data.total);
      } else if (res.status === 403) {
        console.error("Admin access required");
      }
    } catch (error) {
      console.error("Failed to fetch airtime transactions", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page, status, network, search]);

  const getStatusColor = (s: string) => {
    switch (s.toUpperCase()) {
      case "SUCCESS": return T.green;
      case "PENDING": return T.amber;
      case "FAILED": return T.red;
      default: return T.textMuted;
    }
  };

  return (
    <div style={{ padding: "20px 0" }}>
      {/* Filters */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 12,
        marginBottom: 24,
      }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: T.textSecondary, display: "block", marginBottom: 6 }}>
            Status
          </label>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            style={{
              width: "100%", padding: 8, borderRadius: 8, background: T.bgCard, border: `1px solid ${T.border}`,
              color: T.textPrimary, fontSize: 13, fontFamily: font,
            }}>
            <option value="">All Statuses</option>
            <option value="SUCCESS">Successful</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: T.textSecondary, display: "block", marginBottom: 6 }}>
            Network
          </label>
          <select value={network} onChange={(e) => { setNetwork(e.target.value); setPage(1); }}
            style={{
              width: "100%", padding: 8, borderRadius: 8, background: T.bgCard, border: `1px solid ${T.border}`,
              color: T.textPrimary, fontSize: 13, fontFamily: font,
            }}>
            <option value="">All Networks</option>
            <option value="1">MTN</option>
            <option value="2">Glo</option>
            <option value="3">9mobile</option>
            <option value="4">Airtel</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: T.textSecondary, display: "block", marginBottom: 6 }}>
            Search
          </label>
          <input type="text" placeholder="Phone or Ident" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{
              width: "100%", padding: 8, borderRadius: 8, background: T.bgCard, border: `1px solid ${T.border}`,
              color: T.textPrimary, fontSize: 13, fontFamily: font,
            }} />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: T.textMuted }}>
          <Loader2 size={24} style={{ animation: "spin 1s linear infinite", marginBottom: 16, display: "inline-block" }} />
          <p>Loading transactions...</p>
        </div>
      ) : transactions.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: T.textMuted }}>
          No airtime transactions found
        </div>
      ) : (
        <>
          <div style={{
            overflowX: "auto", marginBottom: 20,
          }}>
            <table style={{
              width: "100%", borderCollapse: "collapse", fontFamily: font, fontSize: 13,
            }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: T.textSecondary }}>Date</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: T.textSecondary }}>Ident</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: T.textSecondary }}>User ID</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: T.textSecondary }}>Network</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: T.textSecondary }}>Phone</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600, color: T.textSecondary }}>Amount</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: T.textSecondary }}>Status</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: T.textSecondary }}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: "12px 16px", color: T.textPrimary }}>
                      {new Date(tx.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "12px 16px", color: T.textPrimary, fontFamily: "monospace", fontSize: 12 }}>
                      {tx.ident?.substring(0, 12)}...
                    </td>
                    <td style={{ padding: "12px 16px", color: T.textSecondary, fontSize: 12 }}>
                      {tx.user_id?.substring(0, 8)}...
                    </td>
                    <td style={{ padding: "12px 16px", color: T.textPrimary, fontWeight: 600 }}>
                      {tx.network_name}
                    </td>
                    <td style={{ padding: "12px 16px", color: T.textPrimary }}>{tx.mobile_number}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right", color: T.green, fontWeight: 600 }}>
                      ₦{formatMoney(tx.amount)}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        display: "inline-block", padding: "4px 8px", borderRadius: 4,
                        background: `${getStatusChar(tx.status)}20`, color: getStatusColor(tx.status),
                        fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                      }}>
                        {tx.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", color: T.textSecondary, fontSize: 12 }}>
                      ₦{formatMoney(tx.balance_before)} → ₦{formatMoney(tx.balance_after)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13,
          }}>
            <span style={{ color: T.textSecondary }}>
              Showing {transactions.length} of {total} transactions
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{
                  padding: "6px 12px", borderRadius: 6, background: page === 1 ? T.bgElevated : T.bgCard,
                  border: `1px solid ${T.border}`, color: T.textPrimary, cursor: page === 1 ? "not-allowed" : "pointer",
                  fontFamily: font, opacity: page === 1 ? 0.5 : 1,
                }}>Previous</button>
              <span style={{ padding: "6px 12px", color: T.textSecondary }}>Page {page}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page * 20 >= total}
                style={{
                  padding: "6px 12px", borderRadius: 6, background: page * 20 >= total ? T.bgElevated : T.bgCard,
                  border: `1px solid ${T.border}`, color: T.textPrimary, cursor: page * 20 >= total ? "not-allowed" : "pointer",
                  fontFamily: font, opacity: page * 20 >= total ? 0.5 : 1,
                }}>Next</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function getStatusChar(s: string) {
  switch (s.toUpperCase()) {
    case "SUCCESS": return T.green;
    case "PENDING": return T.amber;
    case "FAILED": return T.red;
    default: return T.textMuted;
  }
}
