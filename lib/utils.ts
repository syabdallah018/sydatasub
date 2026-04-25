import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, "");

  // Handle different formats
  if (cleaned.length === 11 && cleaned.startsWith("0")) {
    return "+234" + cleaned.slice(1);
  }

  if (cleaned.length === 12 && cleaned.startsWith("234")) {
    return "+" + cleaned;
  }

  if (cleaned.length === 10) {
    return "+234" + cleaned;
  }

  return phone;
}

export function truncateText(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + "...";
}

export function generateTransactionRef(): string {
  return `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function generateReference(prefix: string = "REF"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function getNetworkFromPhone(phone: string): string {
  const formatted = formatPhoneNumber(phone);
  const firstDigits = formatted.slice(-10, -7);

  const networkMap: { [key: string]: string } = {
    "703": "MTN",
    "704": "MTN",
    "706": "MTN",
    "803": "MTN",
    "903": "MTN",
    "701": "AIRTEL",
    "714": "AIRTEL",
    "802": "AIRTEL",
    "808": "AIRTEL",
    "902": "AIRTEL",
    "705": "GLO",
    "815": "GLO",
    "905": "GLO",
    "807": "9MOBILE",
    "811": "9MOBILE",
    "909": "9MOBILE",
  };

  return networkMap[firstDigits] || "UNKNOWN";
}

/**
 * Get the correct price based on user tier
 * @param plan - Plan object with user_price and agent_price fields
 * @param tier - User tier: 'user' or 'agent'
 * @returns The appropriate price in naira
 */
export function getPriceForTier(plan: any, tier: string = 'user'): number {
  if (tier === 'agent' && plan.agent_price > 0) {
    return plan.agent_price;
  }
  return plan.user_price > 0 ? plan.user_price : plan.price;
}
