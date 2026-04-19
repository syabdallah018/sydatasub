// Service Worker for SY DATA SUB
// Handles cache invalidation and real-time balance updates for WebView compatibility

const CACHE_NAME = "sydatasub-v3";
const API_CACHE = "sydatasub-api-v3";

// Critical routes that should NEVER be cached
const NO_CACHE_ROUTES = [
  "/api/auth/me",
  "/api/transactions",
  "/api/data/purchase",
  "/api/airtime/purchase",
  "/api/flutterwave/webhook"
];

// Install event: Set up caches
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");
  self.skipWaiting();
});

// Activate event: Clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE) {
            console.log("[SW] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event: Handle requests with smart caching strategy
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // ===== CRITICAL FOR WEBVIEW: Never cache API responses =====
  if (NO_CACHE_ROUTES.some((route) => url.pathname.startsWith(route))) {
    console.log(`[SW] Network-first for: ${url.pathname}`);
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then((response) => {
          // Always fetch fresh, never cache
          return response;
        })
        .catch(() => {
          // Offline fallback: serve stale if available
          return caches.match(request);
        })
    );
    return;
  }

  // ===== HTML Pages (app routes): Network first with fallback =====
  if (request.method === "GET" && url.pathname.startsWith("/app/")) {
    console.log(`[SW] Network-first for page: ${url.pathname}`);
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then((response) => {
          if (!response || response.status !== 200 || response.type === "error") {
            return response;
          }
          // Clone and cache
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

// ===== Static assets (CSS, JS, fonts): Network first to avoid stale UI after deploy =====
  if (
    request.method === "GET" &&
    (url.pathname.endsWith(".css") ||
      url.pathname.endsWith(".js") ||
      url.pathname.endsWith(".woff2") ||
      url.pathname.endsWith(".woff") ||
      url.pathname.startsWith("/fonts/"))
  ) {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then((response) => {
          if (!response || response.status !== 200 || response.type === "error") {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });

          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // ===== Default: Network first =====
  event.respondWith(
    fetch(request, { cache: "no-store" })
      .then((response) => {
        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});

// ===== Background Sync for offline transactions =====
self.addEventListener("sync", (event) => {
  console.log("[SW] Background sync event:", event.tag);
  if (event.tag === "sync-balance") {
    event.waitUntil(
      fetch("/api/auth/me?_cb=" + Date.now(), { cache: "no-store" })
        .then(() => console.log("[SW] Balance synced"))
        .catch(() => console.error("[SW] Sync failed"))
    );
  }
});

console.log("[SW] Service Worker registered - WebView cache bypass enabled");
