// sw.js — Rex Code AI Service Worker
// Version: bump this string whenever you deploy a new build
const CACHE_NAME = "rex-code-ai-v4";
const DB_VERSION = "v3"; // must match DB_VERSION in index.html

// App shell files to cache for offline use
const SHELL_FILES = [
  "/",
  "/index.html",
  "/manifest.json"
];

// ── INSTALL ───────────────────────────────────────────
// Cache the app shell on first install
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(SHELL_FILES);
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE ──────────────────────────────────────────
// Delete all old caches from previous versions
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log("SW: deleting old cache", key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim();
});

// ── FETCH ─────────────────────────────────────────────
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // ── codes.json: network first, cache fallback ──────
  // Always tries to get fresh data from server.
  // If offline, serves the last cached version.
  // This means the app works fully offline after first load.
  if (url.pathname.includes("codes.json")) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" })
        .then(response => {
          if (response && response.ok) {
            // Save fresh copy to cache for offline fallback
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put("codes.json", clone);
            });
          }
          return response;
        })
        .catch(() => {
          // Network failed — serve cached version if available
          console.log("SW: offline, serving cached codes.json");
          return caches.match("codes.json").then(cached => {
            if (cached) return cached;
            // No cache yet — return clear error message
            return new Response(
              JSON.stringify([]),
              {
                status: 200,
                headers: { "Content-Type": "application/json" }
              }
            );
          });
        })
    );
    return;
  }

  // ── All other requests: network first, cache fallback
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200 && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          if (event.request.mode === "navigate") {
            return caches.match("/index.html");
          }
          return new Response("Offline", { status: 503 });
        });
      })
  );
});
