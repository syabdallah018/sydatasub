import axios from "axios";

const DEFAULT_BASE_URL = "https://alrahuzdata.com.ng/api";

function joinUrl(baseUrl, path) {
  return `${String(baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "")}/${String(path).replace(/^\/+/, "")}`;
}

function getConfig(overrides = {}) {
  const token =
    overrides.token ||
    process.env.ALRAHUZ_API_TOKEN ||
    process.env.ALRAHUZ_TOKEN ||
    process.env.ALRAHUZ_API_KEY;

  if (!token) {
    throw new Error("Alrahuz API token not configured");
  }

  return {
    baseUrl: overrides.baseUrl || process.env.ALRAHUZ_BASE_URL || DEFAULT_BASE_URL,
    token,
  };
}

function buildHeaders(token) {
  return {
    Authorization: `Token ${token}`,
    "Content-Type": "application/json",
  };
}

function isTruthyStatus(value) {
  if (value === true) return true;
  if (typeof value !== "string") return false;
  return ["success", "successful", "ok", "pending", "processing", "processed"].includes(
    value.toLowerCase()
  );
}

function isExplicitFailure(value) {
  if (value === false) return true;
  if (typeof value !== "string") return false;
  return ["failed", "failure", "error", "declined", "rejected"].includes(value.toLowerCase());
}

function extractMessage(payload, fallback) {
  return (
    payload?.message ||
    payload?.msg ||
    payload?.description ||
    payload?.data?.message ||
    payload?.data?.msg ||
    payload?.data?.description ||
    fallback
  );
}

function extractExternalReference(payload) {
  return (
    payload?.reference ||
    payload?.request_id ||
    payload?.transaction_id ||
    payload?.transactionId ||
    payload?.ident ||
    payload?.data?.reference ||
    payload?.data?.request_id ||
    payload?.data?.transaction_id ||
    payload?.data?.transactionId ||
    payload?.data?.ident ||
    undefined
  );
}

function normalizeProviderResponse(response, fallbackMessage) {
  const payload = response?.data?.data ?? response?.data ?? response;
  const explicitSuccess =
    isTruthyStatus(payload?.success) ||
    isTruthyStatus(payload?.status) ||
    isTruthyStatus(payload?.Status);
  const explicitFailure =
    isExplicitFailure(payload?.success) ||
    isExplicitFailure(payload?.status) ||
    isExplicitFailure(payload?.Status) ||
    payload?.error ||
    payload?.errors;

  if (explicitFailure) {
    return {
      success: false,
      message: extractMessage(payload, fallbackMessage),
      externalReference: extractExternalReference(payload),
    };
  }

  if (explicitSuccess || (response?.status >= 200 && response?.status < 300 && !payload?.error)) {
    return {
      success: true,
      message: extractMessage(payload, fallbackMessage),
      externalReference: extractExternalReference(payload),
    };
  }

  return {
    success: false,
    message: extractMessage(payload, fallbackMessage),
    externalReference: extractExternalReference(payload),
  };
}

async function postJson(path, body, options = {}) {
  const { baseUrl, token } = getConfig(options);
  const postImpl = options.postImpl || axios.post;
  const url = joinUrl(baseUrl, path);

  const response = await postImpl(url, body, {
    headers: buildHeaders(token),
    timeout: options.timeoutMs ?? 30000,
  });

  return response;
}

export async function purchaseData(params, options = {}) {
  const response = await postJson(
    "/data/",
    {
      network: params.network,
      mobile_number: params.phone,
      plan: params.plan,
      Ported_number: true,
    },
    options
  );

  return normalizeProviderResponse(response, "Data purchase successful");
}

export async function purchaseAirtime(params, options = {}) {
  const response = await postJson(
    "/topup/",
    {
      network: params.network ?? params.networkId,
      amount: params.amount,
      mobile_number: params.phone,
      Ported_number: true,
      airtime_type: "VTU",
    },
    options
  );

  return normalizeProviderResponse(response, "Airtime purchase successful");
}

export { getConfig as getAlrahuzConfig, normalizeProviderResponse as normalizeAlrahuzResponse };
