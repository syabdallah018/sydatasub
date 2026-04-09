import axios from "axios";

interface SaifulPurchaseParams {
  plan: string;
  mobileNumber: string;
  network: string;
  reference: string;
}

interface SaifulResponse {
  success: boolean;
  message: string;
  externalReference?: string;
}

export async function purchaseData(params: SaifulPurchaseParams): Promise<SaifulResponse> {
  try {
    const { plan, mobileNumber, network, reference } = params;

    // Saiful API endpoint and authentication
    const SAIFUL_API_URL = process.env.SAIFUL_API_URL || "https://app.saifulegendconnect.com/api";
    const SAIFUL_API_KEY = process.env.SAIFUL_API_KEY;

    if (!SAIFUL_API_KEY) {
      throw new Error("Saiful API key not configured");
    }

    // Append reference to URL for idempotency
    const response = await axios.post(
      `${SAIFUL_API_URL}/data/${reference}`,
      {
        plan,
        mobile_number: mobileNumber,
        network,
      },
      {
        headers: {
          "Authorization": `Bearer ${SAIFUL_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000, // 30 seconds
      }
    );

    // Saiful typically returns success/error in response
    if (response.data && response.data.status === "success") {
      return {
        success: true,
        message: response.data.message || "Data purchase successful",
        externalReference: response.data.reference,
      };
    } else {
      return {
        success: false,
        message: response.data?.message || "Data purchase failed",
      };
    }
  } catch (error: any) {
    console.error("[SAIFUL API ERROR]", error);

    if (error.response) {
      // API returned an error response
      return {
        success: false,
        message: error.response.data?.message || `API Error: ${error.response.status}`,
      };
    } else if (error.code === "ECONNABORTED") {
      // Timeout
      return {
        success: false,
        message: "Request timeout - please try again",
      };
    } else {
      // Network or other error
      return {
        success: false,
        message: "Network error - please try again",
      };
    }
  }
}

interface AirtimePurchaseParams {
  mobileNumber: string;
  amount: number;
  network: number; // Network ID: MTN=1, Glo=2, 9Mobile=3, Airtel=4
}

export async function purchaseAirtime(params: AirtimePurchaseParams): Promise<SaifulResponse> {
  try {
    const { mobileNumber, amount, network } = params;

    // Saiful API endpoint and authentication
    const SAIFUL_API_URL = process.env.SAIFUL_API_URL || "https://app.saifulegendconnect.com/api";
    const SAIFUL_API_KEY = process.env.SAIFUL_API_KEY;

    if (!SAIFUL_API_KEY) {
      throw new Error("Saiful API key not configured");
    }

    const response = await axios.post(
      `${SAIFUL_API_URL}/topup`,
      {
        mobile_number: mobileNumber,
        amount: amount.toString(),
        network,
      },
      {
        headers: {
          "Authorization": `Bearer ${SAIFUL_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000, // 30 seconds
      }
    );

    // Saiful typically returns success/error in response
    if (response.data && response.data.status === "success") {
      return {
        success: true,
        message: response.data.message || "Airtime purchase successful",
        externalReference: response.data.reference,
      };
    } else {
      return {
        success: false,
        message: response.data?.message || "Airtime purchase failed",
      };
    }
  } catch (error: any) {
    console.error("[SAIFUL AIRTIME ERROR]", error);

    if (error.response) {
      // API returned an error response
      return {
        success: false,
        message: error.response.data?.message || `API Error: ${error.response.status}`,
      };
    } else if (error.code === "ECONNABORTED") {
      // Timeout
      return {
        success: false,
        message: "Request timeout - please try again",
      };
    } else {
      // Network or other error
      return {
        success: false,
        message: "Network error - please try again",
      };
    }
  }
}
