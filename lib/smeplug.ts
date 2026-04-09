import axios from "axios";

interface SmeplugPurchaseParams {
  externalNetworkId: number;
  externalPlanId: number;
  phone: string;
  reference: string;
}

interface SmeplugResponse {
  success: boolean;
  message: string;
  externalReference?: string;
}

export async function purchaseData(params: SmeplugPurchaseParams): Promise<SmeplugResponse> {
  try {
    const { externalNetworkId, externalPlanId, phone, reference } = params;

    // SMEPlug API endpoint and authentication
    const SMEPLUG_API_URL = process.env.SMEPLUG_API_URL || "https://smeplug.ng/api/v1";
    const SMEPLUG_API_KEY = process.env.SMEPLUG_API_KEY;

    if (!SMEPLUG_API_KEY) {
      throw new Error("SMEPlug API key not configured");
    }

    const response = await axios.post(
      `${SMEPLUG_API_URL}/data/purchase`,
      {
        network_id: externalNetworkId,
        plan_id: externalPlanId,
        phone,
        customer_reference: reference,
      },
      {
        headers: {
          "Authorization": `Bearer ${SMEPLUG_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000, // 30 seconds
      }
    );

    // SMEPlug typically returns success/error in response
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
    console.error("[SMEPLUG API ERROR]", error);

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
