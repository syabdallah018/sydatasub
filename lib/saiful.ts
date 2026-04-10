import axios from "axios";

interface SaifulPurchaseParams {
  plan: number;  // Plan ID as integer
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

    const SAIFUL_API_URL = process.env.SAIFUL_API_URL || "https://app.saifulegendconnect.com/api";
    const SAIFUL_API_KEY = process.env.SAIFUL_API_KEY;

    if (!SAIFUL_API_KEY) {
      throw new Error("Saiful API key not configured");
    }

    // Convert network enum to number for API
    const networkMap: { [key: string]: number } = {
      "MTN": 1,
      "GLO": 2,
      "NINEMOBILE": 3,
      "AIRTEL": 4,
    };
    
    const networkId = networkMap[network.toUpperCase()] || 1;

    const requestBody = {
      plan: plan,  // Send plan as integer ID, not string
      mobile_number: mobileNumber,
      network: networkId,
    };

    console.log("[SAIFUL REQUEST]", {
      url: `${SAIFUL_API_URL}/data/${reference}`,
      body: requestBody,
      timestamp: new Date().toISOString(),
      reference,
    });

    // Append reference to URL for idempotency
    const response = await axios.post(
      `${SAIFUL_API_URL}/data/${reference}`,
      requestBody,
      {
        headers: {
          "Authorization": `Bearer ${SAIFUL_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    console.log("[SAIFUL RESPONSE]", {
      status: response.status,
      data: response.data,
      timestamp: new Date().toISOString(),
      reference,
    });

    // Parse response - Saiful returns data nested under 'data' key
    const responseData = response.data?.data || response.data;
    
    if (responseData && (responseData.Status === "successful" || responseData.status === "successful")) {
      const returnData = {
        success: true,
        message: responseData.description || "Data purchase successful",
        externalReference: responseData.ident,
      };
      console.log("[SAIFUL SUCCESS]", returnData);
      return returnData;
    } else if (responseData?.Status === "pending" || responseData?.status === "pending") {
      const returnData = {
        success: true,
        message: responseData.description || "Data purchase pending",
        externalReference: responseData.ident,
      };
      console.log("[SAIFUL PENDING]", returnData);
      return returnData;
    } else {
      const errorMsg = responseData?.description || responseData?.message || "Data purchase failed";
      console.log("[SAIFUL FAILED]", { message: errorMsg, response: responseData });
      return {
        success: false,
        message: errorMsg,
      };
    }
  } catch (error: any) {
    console.error("[SAIFUL API ERROR]", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      timestamp: new Date().toISOString(),
    });

    if (error.response) {
      // API returned an error response
      const errorMessage = error.response.data?.description || error.response.data?.message || `API Error: ${error.response.status}`;
      console.error("[SAIFUL API DETAILS]", {
        errorMessage,
        apiResponse: error.response.data,
      });
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
        amount,
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

    // Parse response - Saiful returns data nested under 'data' key
    const responseData = response.data?.data || response.data;
    
    // Check for successful status - can be "successful" or "pending"
    if (responseData && (responseData.Status === "successful" || responseData.status === "successful")) {
      return {
        success: true,
        message: responseData.description || "Airtime purchase successful",
        externalReference: responseData.ident,
      };
    } else if (responseData?.Status === "pending") {
      // Pending transactions should be treated as success for now
      return {
        success: true,
        message: responseData.description || "Airtime purchase pending",
        externalReference: responseData.ident,
      };
    } else {
      return {
        success: false,
        message: responseData?.description || responseData?.message || "Airtime purchase failed",
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
