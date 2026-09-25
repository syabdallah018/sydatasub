import axios from "axios";

interface SmeplugPurchaseParams {
  externalNetworkId: number;
  externalPlanId: number;
  phone: string;
  reference: string;
}

export interface SmeplugResponse {
  success: boolean;
  message: string;
  externalReference?: string;
  isTimeout?: boolean;
}

interface SmeplugAirtimeParams {
  networkId: number;
  amount: number;
  phone: string;
  reference: string;
}

const shouldLogProviderTraffic =
  process.env.NODE_ENV !== "production" && process.env.DEBUG_PROVIDER_LOGS === "1";

const logProviderTraffic = (...args: unknown[]) => {
  if (shouldLogProviderTraffic) {
    console.log(...args);
  }
};

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
    const formattedPhone = formatSmeplugPhone(phone);

    const requestBody = {
      network_id: externalNetworkId,
      plan_id: externalPlanId,
      phone: formattedPhone,
    };

    logProviderTraffic("[SMEPLUG REQUEST]", {
      url: `${baseUrl}/data/purchase`,
      body: requestBody,
      timestamp: new Date().toISOString(),
      reference,
    });

    const timeoutMs = Number(process.env.SMEPLUG_TIMEOUT_MS || 12000);

    const response = await axios.post(
      `${baseUrl}/data/purchase`,
      requestBody,
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: timeoutMs,
        validateStatus: () => true,
      }
    );

    logProviderTraffic("[SMEPLUG RESPONSE]", {
      status: response.status,
      data: response.data,
      timestamp: new Date().toISOString(),
      reference,
    });

    const data = response.data;
    const statusVal = data?.status;
    const isSuccess =
      (response.status >= 200 && response.status < 300) &&
      (statusVal === true ||
        statusVal === "true" ||
        statusVal === 1 ||
        (typeof statusVal === "string" && ["success", "successful", "ok"].includes(statusVal.toLowerCase())) ||
        (data?.data && typeof data.data === "object" && (data.data.status === true || data.data.status === "success" || data.data.status === "successful")));

    const returnMsg =
      data?.data?.msg ||
      data?.data?.message ||
      data?.msg ||
      data?.message ||
      (isSuccess ? "Data purchase successful" : "Data purchase failed");

    const extRef =
      data?.data?.reference ||
      data?.reference ||
      data?.data?.order_id ||
      data?.order_id ||
      reference;

    if (isSuccess) {
      const returnData = {
        success: true,
        message: returnMsg,
        externalReference: extRef,
      };
      logProviderTraffic("[SMEPLUG SUCCESS]", returnData);
      return returnData;
    }

    const isHttpStatusTimeout = [408, 502, 504, 524].includes(response.status);
    const rawDataStr = typeof response.data === "string"
      ? response.data.toLowerCase()
      : JSON.stringify(response.data || "").toLowerCase();
    const isPayloadTimeout =
      rawDataStr.includes("timeout") ||
      rawDataStr.includes("gateway") ||
      rawDataStr.includes("in flight") ||
      rawDataStr.includes("processing") ||
      rawDataStr.includes("econnaborted");

    if (isHttpStatusTimeout || isPayloadTimeout) {
      const timeoutData = {
        success: false,
        isTimeout: true,
        message: returnMsg && returnMsg !== "Data purchase failed" ? returnMsg : "Provider gateway timeout - request in flight or processing",
        externalReference: extRef,
      };
      logProviderTraffic("[SMEPLUG TIMEOUT]", timeoutData);
      return timeoutData;
    }

    logProviderTraffic("[SMEPLUG FAILED]", { message: returnMsg, response: response.data });
    return {
      success: false,
      message: returnMsg,
      externalReference: extRef,
    };
  } catch (error: any) {
    console.error("[SMEPLUG API ERROR]", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      timestamp: new Date().toISOString(),
    });

    const errorMsgLower = (error.message || "").toLowerCase();
    const isTimeout =
      error.code === "ECONNABORTED" ||
      error.code === "ETIMEDOUT" ||
      error.code === "ESOCKETTIMEDOUT" ||
      errorMsgLower.includes("timeout") ||
      errorMsgLower.includes("socket hang up") ||
      error.response?.status === 504 ||
      error.response?.status === 524 ||
      error.response?.status === 408;

    if (isTimeout) {
      return {
        success: false,
        isTimeout: true,
        message: "Provider gateway timeout - request in flight or processing",
      };
    }

    if (error.response) {
      const errorMessage =
        error.response.data?.data?.msg ||
        error.response.data?.msg ||
        error.response.data?.message ||
        `API Error: ${error.response.status}`;
      return {
        success: false,
        message: errorMessage,
      };
    } else {
      return {
        success: false,
        message: error.message || "Network error - please try again",
      };
    }
  }
}

export async function purchaseAirtime(params: SmeplugAirtimeParams): Promise<SmeplugResponse> {
  try {
    const { networkId, amount, phone, reference } = params;
    const { baseUrl, apiKey } = getSmeplugConfig();
    const formattedPhone = formatSmeplugPhone(phone);
    const requestBody = {
      network_id: networkId,
      amount,
      phone: formattedPhone,
    };

    logProviderTraffic(
      "[SMEPLUG AIRTIME REQUEST]",
      JSON.stringify({
        stage: "request",
        at: new Date().toISOString(),
        reference,
        url: `${baseUrl}/airtime/purchase`,
        payload: requestBody,
      })
    );

    const timeoutMs = Number(process.env.SMEPLUG_TIMEOUT_MS || 12000);

    const response = await axios.post(
      `${baseUrl}/airtime/purchase`,
      requestBody,
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: timeoutMs,
        validateStatus: () => true,
      }
    );

    logProviderTraffic(
      "[SMEPLUG AIRTIME RESPONSE]",
      JSON.stringify({
        stage: "response",
        at: new Date().toISOString(),
        reference,
        status: response.status,
        body: response.data,
      })
    );

    const data = response.data;
    const statusVal = data?.status;
    const isSuccess =
      (response.status >= 200 && response.status < 300) &&
      (statusVal === true ||
        statusVal === "true" ||
        statusVal === 1 ||
        (typeof statusVal === "string" && ["success", "successful", "ok"].includes(statusVal.toLowerCase())) ||
        (data?.data && typeof data.data === "object" && (data.data.status === true || data.data.status === "success" || data.data.status === "successful")));

    const returnMsg =
      data?.data?.msg ||
      data?.data?.message ||
      data?.msg ||
      data?.message ||
      (isSuccess ? "Airtime purchase successful" : "Airtime purchase failed");

    const extRef =
      data?.data?.reference ||
      data?.reference ||
      data?.data?.order_id ||
      data?.order_id ||
      reference;

    if (isSuccess) {
      return {
        success: true,
        message: returnMsg,
        externalReference: extRef,
      };
    }

    const isHttpStatusTimeout = [408, 502, 504, 524].includes(response.status);
    const rawDataStr = typeof response.data === "string"
      ? response.data.toLowerCase()
      : JSON.stringify(response.data || "").toLowerCase();
    const isPayloadTimeout =
      rawDataStr.includes("timeout") ||
      rawDataStr.includes("gateway") ||
      rawDataStr.includes("in flight") ||
      rawDataStr.includes("processing") ||
      rawDataStr.includes("econnaborted");

    if (isHttpStatusTimeout || isPayloadTimeout) {
      return {
        success: false,
        isTimeout: true,
        message: returnMsg && returnMsg !== "Airtime purchase failed" ? returnMsg : "Provider gateway timeout - request in flight or processing",
        externalReference: extRef,
      };
    }

    return {
      success: false,
      message: returnMsg,
      externalReference: extRef,
    };
  } catch (error: any) {
    console.error(
      "[SMEPLUG AIRTIME ERROR]",
      JSON.stringify({
        stage: "error",
        at: new Date().toISOString(),
        reference: params.reference,
        message: error.message,
        status: error.response?.status,
        body: error.response?.data,
      })
    );

    const errorMsgLower = (error.message || "").toLowerCase();
    const isTimeout =
      error.code === "ECONNABORTED" ||
      error.code === "ETIMEDOUT" ||
      error.code === "ESOCKETTIMEDOUT" ||
      errorMsgLower.includes("timeout") ||
      errorMsgLower.includes("socket hang up") ||
      error.response?.status === 504 ||
      error.response?.status === 524 ||
      error.response?.status === 408;

    if (isTimeout) {
      return {
        success: false,
        isTimeout: true,
        message: "Provider gateway timeout - request in flight or processing",
      };
    }

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

    return {
      success: false,
      message: error.message || "Network error - please try again",
    };
  }
}
