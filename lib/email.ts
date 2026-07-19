import { HTML_PIN_RESET_TEMPLATE } from "./email-templates";

/**
 * Dispatches a PIN reset verification code email using Resend REST API
 */
export async function sendPinResetEmail(to: string, otp: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "SY DATA SUB <no-reply@sydatasub.com>";

  if (!apiKey) {
    console.error("[EMAIL ERROR] RESEND_API_KEY environment variable is not configured.");
    return { success: false, error: "Email configuration missing" };
  }

  try {
    // Resolve dynamic logo asset path
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://sydatasub.com");
    const logoUrl = `${appUrl}/logo.jpeg`;

    // Interpolate values in the template
    const html = HTML_PIN_RESET_TEMPLATE
      .replace("{{OTP_CODE}}", otp)
      .replace("{{LOGO_URL}}", logoUrl);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to,
        subject: "Reset Your Transaction PIN",
        html,
      }),
    });

    const data = await response.json();
    return { success: response.ok, data };
  } catch (error) {
    console.error("[EMAIL SEND FAILURE]", error);
    return { success: false, error };
  }
}
