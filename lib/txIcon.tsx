import { Zap, Wallet, Gift, CreditCard } from "lucide-react";
import { ReactNode } from "react";

export type TransactionType =
  | "DATA_PURCHASE"
  | "AIRTIME_PURCHASE"
  | "WALLET_FUNDING"
  | "REWARD_CREDIT";

export function getTxIcon(type: TransactionType): ReactNode {
  switch (type) {
    case "DATA_PURCHASE":
      return <Zap className="w-5 h-5" />;
    case "AIRTIME_PURCHASE":
      return <CreditCard className="w-5 h-5" />;
    case "WALLET_FUNDING":
      return <Wallet className="w-5 h-5" />;
    case "REWARD_CREDIT":
      return <Gift className="w-5 h-5" />;
    default:
      return <Wallet className="w-5 h-5" />;
  }
}

export function getTxLabel(type: TransactionType): string {
  switch (type) {
    case "DATA_PURCHASE":
      return "Data Purchase";
    case "AIRTIME_PURCHASE":
      return "Airtime Purchase";
    case "WALLET_FUNDING":
      return "Wallet Funding";
    case "REWARD_CREDIT":
      return "Reward Credit";
    default:
      return "Transaction";
  }
}

export function getTxColor(
  type: TransactionType
): "text-success" | "text-warning" | "text-error" | "text-info" {
  switch (type) {
    case "DATA_PURCHASE":
      return "text-info";
    case "AIRTIME_PURCHASE":
      return "text-warning";
    case "WALLET_FUNDING":
      return "text-success";
    case "REWARD_CREDIT":
      return "text-success";
    default:
      return "text-info";
  }
}

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  // For older dates, show formatted date
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = months[date.getMonth()];
  const day = date.getDate();

  // If same year, don't show year
  if (date.getFullYear() === now.getFullYear()) {
    return `${month} ${day}`;
  }

  return `${month} ${day}, ${date.getFullYear()}`;
}
