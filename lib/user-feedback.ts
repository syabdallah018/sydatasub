export function getFriendlyMessage(input?: string | null, fallback = "Something went wrong. Please try again in a moment.") {
  const message = String(input || "").trim();
  const normalized = message.toLowerCase();

  if (!message) return fallback;
  if (normalized.includes("invalid credentials")) return "That phone number or PIN does not look right. Please check and try again.";
  if (normalized.includes("invalid pin") || normalized.includes("current pin is incorrect")) {
    return "That PIN does not look right. Please check it and try again.";
  }
  if (normalized.includes("pin not set")) return "Your transaction PIN is not ready yet. Please contact support if this continues.";
  if (normalized.includes("insufficient")) return "Your wallet balance is too low for this request right now.";
  if (normalized.includes("account is banned") || normalized.includes("account suspended")) return "This account cannot complete transactions right now. Please contact support.";
  if (normalized.includes("plan not available now")) return "That plan is not available right now. Please choose another one.";
  if (normalized.includes("purchase failed") || normalized.includes("unable to") || normalized.includes("server error")) {
    return "We could not complete that right now. Please try again in a moment.";
  }
  if (normalized.includes("network") || normalized.includes("connection")) {
    return "Connection is unstable right now. Please try again shortly.";
  }
  if (normalized.includes("duplicate transaction")) {
    return "A similar request was noticed. Please confirm before continuing.";
  }

  return message;
}
