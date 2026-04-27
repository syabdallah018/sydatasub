// Service Worker for SY DATA SUB
// Conservative strategy: do not cache app shell/chunks to avoid stale-deploy WebView freezes.

const SW_VERSION = "sydatasub-v4";
const STATIC_CACHE = `${SW_VERSION}-static`;

const STATIC_EXTENSIONS = [".png", ".jpg", ".jpeg", ".svg", ".webp", ".ico", ".woff", ".woff2"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => !key.startsWith(SW_VERSION)).map((key) => caches.delete(key)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event?.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function isStaticAsset(pathname) {
  return STATIC_EXTENSIONS.some((ext) => pathname.endsWith(ext));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const pathname = url.pathname;

  // Never cache app pages, Next chunks, or API responses.
  if (pathname.startsWith("/api/") || pathname.startsWith("/app") || pathname.startsWith("/_next/")) {
    event.respondWith(fetch(request, { cache: "no-store" }));
    return;
  }

  // Only cache passive static assets (icons/images/fonts).
  if (isStaticAsset(pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;

        try {
          const response = await fetch(request, { cache: "no-store" });
          if (response && response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  event.respondWith(fetch(request, { cache: "no-store" }));
});
