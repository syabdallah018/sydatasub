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

interface SmeplugAirtimeParams {
  networkId: number;
  amount: number;
  phone: string;
  reference: string;
}

function getSmeplugConfig() {
  const baseUrl =
    process.env.SMEPLUG_BASE_URL ||
    process.env.SMEPLUG_API_URL ||
    "https://smeplug.ng/api/v1";
  const apiKey = process.env.SMEPLUG_API_KEY;

  if (!apiKey) {
    throw new Error("SMEPlug API key not configured");
  }

  return { baseUrl, apiKey };
}

function formatSmeplugPhone(phone: string) {
  if (phone.startsWith("234")) {
    return "0" + phone.substring(3);
  }

  if (!phone.startsWith("0")) {
    return "0" + phone;
  }

  return phone;
}

export async function purchaseData(params: SmeplugPurchaseParams): Promise<SmeplugResponse> {
  try {
    const { externalNetworkId, externalPlanId, phone, reference } = params;

    const { baseUrl, apiKey } = getSmeplugConfig();

    // Phone format: Keep as 09xxxxxxx (Nigerian local format)
    // Smeplug expects local format, not international
    const formattedPhone = formatSmeplugPhone(phone);

    const requestBody = {
      network_id: externalNetworkId,
      plan_id: externalPlanId,
      phone: formattedPhone,
    };

    console.log("[SMEPLUG REQUEST]", {
      url: `${baseUrl}/data/purchase`,
      body: requestBody,
      timestamp: new Date().toISOString(),
      reference,
    });

    const response = await axios.post(
      `${baseUrl}/data/purchase`,
      requestBody,
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
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

export async function purchaseAirtime(params: SmeplugAirtimeParams): Promise<SmeplugResponse> {
  try {
    const { networkId, amount, phone, reference } = params;
    const { baseUrl, apiKey } = getSmeplugConfig();

    const response = await axios.post(
      `${baseUrl}/airtime/purchase`,
      {
        network_id: networkId,
        amount,
        phone: formatSmeplugPhone(phone),
      },
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    if (response.data?.status === true && response.data?.data) {
      return {
        success: true,
        message: response.data.data.msg || "Airtime purchase successful",
        externalReference: response.data.data.reference || reference,
      };
    }

    return {
      success: false,
      message:
        response.data?.data?.msg ||
        response.data?.msg ||
        response.data?.message ||
        "Airtime purchase failed",
    };
  } catch (error: any) {
    console.error("[SMEPLUG AIRTIME ERROR]", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      reference: params.reference,
    });

    if (error.response) {
      return {
        success: false,
        message:
          error.response.data?.data?.msg ||
          error.response.data?.msg ||
          error.response.data?.message ||
          `API Error: ${error.response.status}`,
      };
    }

    if (error.code === "ECONNABORTED") {
      return {
        success: false,
        message: "Request timeout - please try again",
      };
    }

    return {
      success: false,
      message: "Network error - please try again",
    };
  }
}
