import axios from "axios";

interface DatabillsPurchaseParams {
  plan: number; // DataBills external plan ID
  network: number; // DataBills external network ID (e.g. 1)
  phone: string; // Recipient phone number
  reference?: string; // Unique transaction reference
}

interface DatabillsResponse {
  success: boolean;
  message: string;
  externalReference?: string;
}

const shouldLogProviderTraffic =
  process.env.NODE_ENV !== "production" && process.env.DEBUG_PROVIDER_LOGS === "1";

const logProviderTraffic = (...args: unknown[]) => {
  if (shouldLogProviderTraffic) {
    console.log(...args);
  }
};

function getDatabillsConfig() {
  const baseUrl =
    process.env.DATABILLS_BASE_URL ||
    "https://databills.com/api";
  const apiKey =
    process.env.DATABILLS_API_KEY ||
    process.env.DATABILLS_TOKEN ||
    process.env.DATABILLS_KEY;

  if (!apiKey) {
    throw new Error("DataBills API key not configured");
  }

  return { baseUrl, apiKey };
}

function formatDatabillsPhone(phone: string) {
  if (phone.startsWith("234")) {
    return "0" + phone.substring(3);
  }
  if (!phone.startsWith("0")) {
    return "0" + phone;
  }
  return phone;
}

export async function purchaseData(
  params: DatabillsPurchaseParams,
  options?: { postImpl?: any }
): Promise<DatabillsResponse> {
  try {
    const { plan, network, phone, reference } = params;
    const { baseUrl, apiKey } = getDatabillsConfig();
    const formattedPhone = formatDatabillsPhone(phone);
    const traceId = reference || `DB-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const requestBody = {
      network: Number(network),
      phone: formattedPhone,
      data_plan: Number(plan),
      bypass: false,
      "request-id": traceId,
    };

    const targetUrl = baseUrl.endsWith("/data") ? baseUrl : `${baseUrl.replace(/\/+$/, "")}/data`;

    logProviderTraffic("[DATABILLS REQUEST]", {
      url: targetUrl,
      body: requestBody,
      timestamp: new Date().toISOString(),
      reference: traceId,
    });

    const postFn = options?.postImpl || axios.post;
    const response = await postFn(
      targetUrl,
      requestBody,
      {
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": `Token ${apiKey}`,
        },
        timeout: 30000,
        validateStatus: () => true,
      }
    );

    logProviderTraffic("[DATABILLS RESPONSE]", {
      status: response.status,
      data: response.data,
      timestamp: new Date().toISOString(),
      reference: traceId,
    });

    const data = response.data;
    const statusVal = data?.status || data?.Status;
    const isSuccess =
      (response.status >= 200 && response.status < 300) &&
      (statusVal === true ||
        (typeof statusVal === "string" &&
          ["success", "successful", "ok"].includes(statusVal.toLowerCase())));

    const msg =
      data?.message ||
      data?.msg ||
      data?.description ||
      (isSuccess ? "Data Purchase Successful." : "Data purchase failed.");

    const extRef =
      data?.["request-id"] ||
      data?.requestId ||
      data?.reference ||
      data?.ident ||
      undefined;

    if (isSuccess) {
      return {
        success: true,
        message: msg,
        externalReference: extRef,
      };
    }

    return {
      success: false,
      message: msg,
      externalReference: extRef,
    };
  } catch (error: any) {
    console.error("[DATABILLS ERROR]", error?.message || error);
    return {
      success: false,
      message: error?.response?.data?.message || error?.message || "DataBills network error",
    };
  }
}
