import axios from "axios";

interface AmysubPurchaseParams {
  plan: number; // Amysub external plan ID (integer from DB)
  sizeLabel?: string; // e.g. "1GB", "500MB" (fallback for mapping string plan)
  network: number; // Amysub external network ID (e.g. 1)
  phone: string; // Recipient phone number
  reference?: string; // Unique transaction reference (optional)
}

interface AmysubResponse {
  success: boolean;
  message: string;
  externalReference?: string;
}

const PLAN_MAPPING: Record<number, string> = {
  500: "SME_500MB",
  1000: "SME_1GB",
  2000: "SME_2GB",
  3000: "SME_3GB",
  5000: "SME_5GB",
  10000: "SME_10GB",
};

const shouldLogProviderTraffic =
  process.env.NODE_ENV !== "production" && process.env.DEBUG_PROVIDER_LOGS === "1";

const logProviderTraffic = (...args: unknown[]) => {
  if (shouldLogProviderTraffic) {
    console.log(...args);
  }
};

function getAmysubConfig() {
  const baseUrl =
    process.env.AMYSUB_BASE_URL ||
    "https://app.amysub.ng/api";
  const apiKey = process.env.AMYSUB_API_KEY;

  if (!apiKey) {
    throw new Error("Amysub API key not configured");
  }

  return { baseUrl, apiKey };
}

function formatAmysubPhone(phone: string) {
  if (phone.startsWith("234")) {
    return "0" + phone.substring(3);
  }

  if (!phone.startsWith("0")) {
    return "0" + phone;
  }

  return phone;
}

export async function purchaseData(params: AmysubPurchaseParams): Promise<AmysubResponse> {
  try {
    const { plan, sizeLabel, network, phone, reference } = params;
    const { baseUrl, apiKey } = getAmysubConfig();
    const formattedPhone = formatAmysubPhone(phone);

    // Resolve string plan code, prioritizing sizeLabel parsing (e.g. "1gb" -> "SME_1GB")
    let planCode = "";
    if (sizeLabel) {
      const match = sizeLabel.match(/(\d+(?:\.\d+)?)\s*(GB|MB)/i);
      if (match) {
        const amount = match[1];
        const unit = match[2].toUpperCase();
        planCode = `SME_${amount}${unit}`;
      }
    }

    if (!planCode) {
      planCode = PLAN_MAPPING[plan] || String(plan);
    }

    const requestBody = {
      mobile_number: formattedPhone,
      plan: planCode,
      network: network,
    };

    logProviderTraffic("[AMYSUB REQUEST]", {
      url: `${baseUrl}/data`,
      body: requestBody,
      timestamp: new Date().toISOString(),
      reference,
    });

    const response = await axios.post(
      `${baseUrl}/data`,
      requestBody,
      {
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        timeout: 30000,
      }
    );

    logProviderTraffic("[AMYSUB RESPONSE]", {
      status: response.status,
      data: response.data,
      timestamp: new Date().toISOString(),
      reference,
    });

    // Check for success status (can be "success" or "successful")
    if (response.data && (response.data.status === "success" || response.data.status === "successful")) {
      const returnData = {
        success: true,
        message: response.data.api_response || response.data.description || "Data purchase successful",
        externalReference: String(response.data.reference || response.data.id || ""),
      };
      logProviderTraffic("[AMYSUB SUCCESS]", returnData);
      return returnData;
    } else {
      const errorMsg = response.data?.api_response || response.data?.description || response.data?.message || "Data purchase failed";
      logProviderTraffic("[AMYSUB FAILED]", { message: errorMsg, response: response.data });
      return {
        success: false,
        message: errorMsg,
      };
    }
  } catch (error: any) {
    console.error("[AMYSUB API ERROR]", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      timestamp: new Date().toISOString(),
    });

    if (error.response) {
      const errorMessage = error.response.data?.api_response || error.response.data?.description || error.response.data?.message || `API Error: ${error.response.status}`;
      return {
        success: false,
        message: errorMessage,
      };
    } else if (error.code === "ECONNABORTED") {
      return {
        success: false,
        message: "Request timeout - please try again",
      };
    } else {
      return {
        success: false,
        message: "Network error - please try again",
      };
    }
  }
}
