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

    // Phone format: Keep as 09xxxxxxx (Nigerian local format)
    // Smeplug expects local format, not international
    let formattedPhone = phone;
    if (phone.startsWith("234")) {
      // Convert 234xxxxxxxxx to 09xxxxxxxxx
      formattedPhone = "0" + phone.substring(3);
    } else if (!phone.startsWith("0")) {
      // If starts with digit but not 0, prepend 0
      formattedPhone = "0" + phone;
    }
    // Otherwise keep as is (already 09...)

    const requestBody = {
      network_id: externalNetworkId,
      plan_id: externalPlanId,
      phone: formattedPhone,
    };

    console.log("[SMEPLUG REQUEST]", {
      url: `${SMEPLUG_API_URL}/data/purchase`,
      body: requestBody,
      timestamp: new Date().toISOString(),
      reference,
    });

    const response = await axios.post(
      `${SMEPLUG_API_URL}/data/purchase`,
      requestBody,
      {
        headers: {
          "Authorization": `Bearer ${SMEPLUG_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    console.log("[SMEPLUG RESPONSE]", {
      status: response.status,
      data: response.data,
      timestamp: new Date().toISOString(),
      reference,
    });

    // SMEPlug returns status as boolean (true/false)
    if (response.data && response.data.status === true && response.data.data) {
      const returnData = {
        success: true,
        message: response.data.data.msg || "Data purchase successful",
        externalReference: response.data.data.reference,
      };
      console.log("[SMEPLUG SUCCESS]", returnData);
      return returnData;
    } else {
      const errorMsg = response.data?.data?.msg || response.data?.msg || response.data?.message || "Data purchase failed";
      console.log("[SMEPLUG FAILED]", { message: errorMsg, response: response.data });
      return {
        success: false,
        message: errorMsg,
      };
    }
  } catch (error: any) {
    console.error("[SMEPLUG API ERROR]", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      timestamp: new Date().toISOString(),
    });

    if (error.response) {
      // API returned an error response
      const errorMessage = error.response.data?.msg || error.response.data?.message || `API Error: ${error.response.status}`;
      console.error("[SMEPLUG API DETAILS]", {
        errorMessage,
        apiResponse: error.response.data,
      });
      return {
        success: false,
        message: errorMessage,
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
