// Premium, responsive, brand-colored HTML template for OTP verification emails.
// It supports dynamic replacement of the {{OTP_CODE}} and {{LOGO_URL}} placeholders.

export const HTML_PIN_RESET_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Transaction PIN</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0A0F0E; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #FFFFFF;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0A0F0E; padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Card Container -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 480px; background-color: #111B18; border: 1px solid #1E2E2A; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);">
          
          <!-- Header Logo -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <img src="{{LOGO_URL}}" alt="SY DATA SUB" style="width: auto; height: 50px; border-radius: 10px; display: block;" onerror="this.style.display='none'; document.getElementById('text-logo').style.display='block';" />
              <span id="text-logo" style="font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #14B8A6; font-family: sans-serif; display: none;">SY DATA SUB</span>
            </td>
          </tr>
          
          <!-- Title -->
          <tr>
            <td align="left" style="padding-bottom: 16px;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #FFFFFF; line-height: 28px;">Reset Your Transaction PIN</h1>
            </td>
          </tr>
          
          <!-- Body Text -->
          <tr>
            <td align="left" style="padding-bottom: 28px;">
              <p style="margin: 0; font-size: 14px; color: #A0AEC0; line-height: 22px;">
                We received a request to reset the transaction PIN for your account. Use the 6-digit verification code below to authorize this reset. This code is valid for <strong>10 minutes</strong>.
              </p>
            </td>
          </tr>
          
          <!-- Verification Code Box -->
          <tr>
            <td align="center" style="padding-bottom: 28px;">
              <table border="0" cellpadding="0" cellspacing="0" style="background-color: #0A1412; border: 1px dashed #14B8A6; border-radius: 8px; width: 100%; padding: 20px;">
                <tr>
                  <td align="center">
                    <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #14B8A6;">{{OTP_CODE}}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Expiration Notice -->
          <tr>
            <td align="left" style="padding-bottom: 24px; border-bottom: 1px solid #1E2E2A;">
              <p style="margin: 0; font-size: 12px; color: #718096; line-height: 18px;">
                If you did not request a PIN reset, please ignore this email or change your account password immediately to stay secure.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 24px;">
              <p style="margin: 0; font-size: 11px; color: #4A5568;">
                &copy; 2026 SY DATA SUB. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
