const CACHE_NAME = "sy-data-app-v1";
const STATIC_ASSETS = [
  "/app",
  "/favicon.ico",
  "/manifest.json",
];

// Install Event - Pre-cache Core App Shell
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[SW] Pre-cache partial warning:", err);
      });
    })
  );
});

// Activate Event - Clean Up Old Caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Cache-First for Static Assets & Next.js Bundles, Network-First for Navigation
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and API calls from caching
  if (request.method !== "GET" || url.pathname.startsWith("/api/")) {
    return;
  }

  // Cache-First for Next.js static bundles, fonts, images, and static assets
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf|css|js)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Refresh cache in background
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
            }
          }).catch(() => {});
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Network-First with Cache Fallback for HTML Page Navigation (/app)
  if (request.mode === "navigate" || url.pathname === "/app") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put("/app", responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match("/app").then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            return caches.match(request);
          });
        })
    );
    return;
  }
});
