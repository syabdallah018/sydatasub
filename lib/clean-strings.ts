"use client";

/**
 * Character constants module - provides clean UTF-8 string literals
 * This prevents encoding issues by centralizing character definitions
 */

// Clean emoji definitions  
export const EMOJI = {
  WAVE: "👋",
  CHECK: "✓",
  BULLET: "•",
  ELLIPSIS: "…",
  NAIRA: "₦",
  DASH: "–",
} as const;

// Message templates using clean characters
export const MESSAGES = {
  WELCOME: `Welcome back ${EMOJI.WAVE}`,
  TRANSACTION_TOAST: (amount: string | number, size: string, phone: string) =>
    `${EMOJI.NAIRA}${amount} ${EMOJI.DASH} ${size} sent to ${phone} ${EMOJI.CHECK}`,
  SECURING: `Securing your session${EMOJI.ELLIPSIS}`,
  BALANCE_HIDDEN: `${EMOJI.BULLET}${EMOJI.BULLET}${EMOJI.BULLET}${EMOJI.BULLET}${EMOJI.BULLET}${EMOJI.BULLET}`,
} as const;

// UI button labels
export const LABELS = {
  LOGOUT: "Logout",
  BACK: "Back",
  COPY: "Copy",
  CONFIRM: "Confirm",
  YES: "Yes",
  NO: "No",
  CLOSE: "Close",
  SAVE: "Save",
  DELETE: "Delete",
  CANCEL: "Cancel",
} as const;

// Titles and headings
export const TITLES = {
  SELECT_NETWORK: "Select Network",
  RECIPIENT_PHONE: "Recipient Phone Number",
  SELECT_PLAN: "Select Plan",
  ENTER_PIN: "Enter your 6-digit PIN",
  ADMIN_PANEL: "Admin Panel",
  TRANSACTIONS: "Transactions",
} as const;

// Error and status messages
export const STATUS = {
  LOADING: "Loading admin dashboard…",
  AUTHENTICATING: "Authenticating...",
  AUTH_SUCCESS: "Authentication successful",
  AUTH_FAILED: "Authentication failed",
  NO_TRANSACTIONS: "No transactions found",
  INVALID_PASSWORD: "Invalid admin password",
  CONNECTION_ERROR: "Check your connection",
} as const;
