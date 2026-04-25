export function getWalletLimitForRole(role?: string | null) {
  const normalizedRole = String(role || "USER").toUpperCase();
  if (normalizedRole === "AGENT" || normalizedRole === "ADMIN") {
    return 150000;
  }
  return 50000;
}

export function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
