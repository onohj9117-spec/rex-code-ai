// sw.js — Rex Code AI Service Worker
// Version: bump this string whenever you deploy a new build
const CACHE_NAME = "rex-code-ai-v3";

// App shell files to cache for offline use
const SHELL_FILES = [
  "/",
  "/index.html",
  "/manifest.json"
];

// ─── INSTALL ──────────────────────────────────────────
// Cache the app shell on first install
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(SHELL_FILES);
    })
  );
  // Activate immediately — don't wait for old SW to idle
  self.skipWaiting();
});

// ─── ACTIVATE ─────────────────────────────────────────
// Delete old caches from previous versions
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  // Take control of all open clients immediately
  self.clients.claim();
});

// ─── FETCH ────────────────────────────────────────────
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // CRITICAL: Never cache codes.json — always fetch fresh from network.
  // If network fails, return a clear error rather than stale data.
  if (url.pathname.includes("codes.json")) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" })
        .catch(() => new Response(
          JSON.stringify({ error: "Offline — database unavailable" }),
          { status: 503, headers: { "Content-Type": "application/json" } }
        ))
    );
    return;
  }

  // For all other requests: try network first, fall back to cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Only cache valid responses for shell files
        if (response && response.status === 200 && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed — serve from cache if available
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // If it's a navigation request and nothing cached, return index.html
          if (event.request.mode === "navigate") {
            return caches.match("/index.html");
          }
          return new Response("Offline", { status: 503 });
        });
      })
  );
});
