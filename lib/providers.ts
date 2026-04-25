export function getProviderAConfig() {
  return {
    baseUrl: process.env.SMEPLUG_BASE_URL || "https://smeplug.ng/api/v1",
    token: process.env.SMEPLUG_API_KEY || "",
  };
}

export function getProviderBConfig() {
  return {
    baseUrl: process.env.SAIFUL_BASE_URL || "",
    token: process.env.SAIFUL_API_KEY || "",
  };
}

export function getProviderCConfig() {
  return {
    baseUrl: process.env.PROVIDER_C_BASE_URL || "",
    token: process.env.PROVIDER_C_TOKEN || "",
  };
}
