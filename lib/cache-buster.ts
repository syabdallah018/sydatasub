/**
 * Cache-Busting Utilities for WebView Compatibility
 * 
 * Prevents Android WebView and browsers from serving stale cached responses.
 * This is critical for real-time data like balance updates after purchases.
 * 
 * Usage:
 * - fetch(addCacheBuster("/api/auth/me"), fetchOptions)
 * - fetch(buildUrl("/api/data/plans", { network: "MTN" }), fetchOptions)
 */

/**
 * Generate a unique cache-busting parameter
 * @returns {string} Formatted cache buster like "_cb=1712856543202_a1b2c3d4e5"
 */
export function generateCacheBuster(): string {
  return `_cb=${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Add cache-busting parameter to a URL path
 * @param {string} path - API path like "/api/auth/me"
 * @returns {string} URL with cache buster appended
 */
export function addCacheBuster(path: string): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${generateCacheBuster()}`;
}

/**
 * Build a URL with query parameters and cache busting
 * @param {string} path - API path
 * @param {Record<string, any>} params - Query parameters
 * @returns {string} Full URL with parameters and cache buster
 */
export function buildUrlWithCacheBuster(path: string, params?: Record<string, any>): string {
  const url = new URL(path, typeof window !== "undefined" ? window.location.origin : "http://localhost");
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  }
  
  url.searchParams.append("_cb", `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`);
  
  return url.pathname + url.search;
}

/**
 * Enhanced fetch with cache-busting and WebView-friendly options
 * @param {string} path - API path
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<Response>} API response
 */
export async function fetchWithCacheBuster(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = addCacheBuster(path);
  const enhancedOptions: RequestInit = {
    ...options,
    cache: "no-store", // Force fresh fetch
    headers: {
      ...options.headers,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
    },
  };
  
  console.log(`[CACHE-BUSTER] Fetching ${url} with no-cache options`);
  return fetch(url, enhancedOptions);
}

/**
 * Get current Cache-Control policy for a given path
 * Useful for debugging cache issues
 */
export function getCachePolicyForPath(path: string): string {
  if (path.startsWith("/api/")) {
    return "no-store (no caching)";
  } else if (path.startsWith("/app/")) {
    return "max-age=0, must-revalidate";
  } else {
    return "max-age=3600 (1 hour)";
  }
}
