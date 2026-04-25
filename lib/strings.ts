/**
 * Centralized string constants to eliminate UTF-8 encoding problems
 * All strings use proper Unicode characters, no broken bytes
 */

export const STRINGS = {
  // Emojis - using proper Unicode names
  WAVE_HAND: "👋",
  CHECK_MARK: "✓",
  CHECKMARK_ALT: "✔",
  BULLET_POINT: "•",
  ELLIPSIS: "…",
  
  // Currency
  NAIRA: "₦",
  DASH: "–",
  EQUALS: "=",
  
  // Loading & Waiting
  LOADING: "Loading admin dashboard…",
  SECURING_SESSION: "Securing your session…",
  VERIFYING: "Verifying...",
  AUTHENTICATING: "Authenticating...",
  
  // Form-related
  ENTER_PASSWORD: "Enter admin password",
  ACCESS_DASHBOARD: "Access Dashboard",
  ADMIN_ACCESS: "Admin Access",
  ADMIN_PASSWORD_PROMPT: "Enter the admin password to access the dashboard.",
  
  // Buttons
  LOGOUT: "Logout",
  BACK: "Back",
  CONFIRM: "Confirm",
  CANCEL: "Cancel",
  SAVE: "Save",
  DELETE: "Delete",
  
  // Navigation
  HOME: "Home",
  TRANSACTIONS: "Transactions",
  SETTINGS: "Settings",
  
  // Account
  WELCOME_BACK: "Welcome back",
  REGISTERED_PHONE: "Registered Phone",
  COPY: "Copy",
  
  // Services
  DATA: "Data",
  AIRTIME: "Airtime",
  CABLE_TV: "Cable TV",
  POWER: "Power",
  EXAMS: "Exams",
  COMING_SOON: "Coming Soon",
  IN_DEVELOPMENT: "In development",
  
  // Admin
  ADMIN_PANEL: "Admin Panel",
  MANAGE_PLATFORM: "Manage your platform",
  ANALYTICS: "Analytics",
  DATA_PLANS: "Data Plans",
  USERS: "Users",
  
  // Transactions
  TRANSACTION_SUCCESS: (amount: string | number, size: string, phone: string) => 
    `${STRINGS.NAIRA}${amount} ${STRINGS.DASH} ${size} sent to ${phone} ${STRINGS.CHECK_MARK}`,
  
  // Error & Status
  INVALID_PASSWORD: "Invalid admin password",
  AUTH_SUCCESSFUL: "Authentication successful",
  AUTH_FAILED: "Authentication failed",
  CONNECTION_ERROR: "Check your connection",
  FAILED_TO_LOAD: "Failed to load",
  NO_TRANSACTIONS: "No transactions yet",
  
  // Balance display
  BALANCE_HIDDEN: "••••••",
  
  // PIN placeholders
  PIN_PLACEHOLDER: "••••••",
  
  // Section headers
  SELECT_NETWORK: "Select Network",
  RECIPIENT_PHONE: "Recipient Phone Number",
  SELECT_PLAN: "Select Plan",
  ENTER_PIN: "Enter your 6-digit PIN",
  QUICK_SERVICES: "Quick Services",
  
  // Modal titles
  CHANGE_PIN: "Change PIN",
  TRANSACTION_HISTORY: "Transaction History",
  SETTINGS_TITLE: "Settings",
  
  // Validation
  SECURED_MESSAGE: "Securing your session…",
};

/**
 * Helper function to safely render emoji in JSX
 */
export const emoji = (key: keyof typeof STRINGS) => {
  const value = STRINGS[key];
  return typeof value === 'string' ? value : '';
};
