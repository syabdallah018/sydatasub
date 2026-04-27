export function getFriendlyMessage(input?: string | null, fallback = "Something went wrong. Please try again in a moment.") {
  const message = String(input || "").trim();
  const normalized = message.toLowerCase();

  if (!message) return `Ahh, sorry, ${fallback.charAt(0).toLowerCase()}${fallback.slice(1)}`;
  if (normalized.includes("invalid credentials")) return "Ahh, sorry, that phone number or PIN does not look right. Please check and try again.";
  if (normalized.includes("invalid pin") || normalized.includes("current pin is incorrect")) {
    return "Ahh, sorry, that PIN does not look right. Please check it and try again.";
  }
  if (normalized.includes("pin not set")) return "Ahh, sorry, your transaction PIN is not ready yet. Please contact support if this continues.";
  if (normalized.includes("insufficient")) return "Ahh, sorry, your wallet balance is too low for this request right now.";
  if (normalized.includes("account is banned") || normalized.includes("account suspended")) return "Ahh, sorry, this account cannot complete transactions right now. Please contact support.";
  if (normalized.includes("plan not available now")) return "Ahh, sorry, that plan is not available right now. Please choose another one.";
  if (normalized.includes("purchase failed") || normalized.includes("unable to") || normalized.includes("server error")) {
    return "Ahh, sorry, we could not complete that right now. Please try again in a moment.";
  }
  if (normalized.includes("network") || normalized.includes("connection")) {
    return "Ahh, sorry, the connection is unstable right now. Please try again shortly.";
  }
  if (normalized.includes("duplicate transaction")) {
    return "Ahh, sorry, a similar request was noticed. Please confirm before continuing.";
  }

  return message.startsWith("Ahh, sorry") ? message : `Ahh, sorry, ${message.charAt(0).toLowerCase()}${message.slice(1)}`;
}
