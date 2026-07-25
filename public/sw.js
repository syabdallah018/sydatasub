const CACHE_NAME = "sy-data-app-v2";
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

// Fetch Event
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and API calls from SW caching
  if (request.method !== "GET" || url.pathname.startsWith("/api/")) {
    return;
  }

  const isRscRequest =
    request.headers.get("rsc") === "1" ||
    url.searchParams.has("_rsc") ||
    (request.headers.get("accept") && request.headers.get("accept").includes("text/x-component"));

  // 1. Next.js RSC Data Stream Requests
  if (isRscRequest) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            // Return empty 200 response for missing RSC streams when offline to prevent raw text dumps
            return new Response("", {
              status: 200,
              headers: { "Content-Type": "text/x-component" },
            });
          });
        })
    );
    return;
  }

  // 2. Next.js Static Bundles, Fonts, Images, CSS & JS Assets (Cache-First)
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf|css|js)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
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

  // 3. Full Page Document Navigation (/app, HTML document requests)
  if (request.mode === "navigate" || (request.headers.get("accept") && request.headers.get("accept").includes("text/html"))) {
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
