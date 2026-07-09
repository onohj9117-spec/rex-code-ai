const CACHE = "rex-ai-v5"; // Bumped from v1 to force update
const ASSETS = ["./","./index.html","./codes.json","./manifest.json"];

self.addEventListener("install", e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)) // delete old v1 cache
    )).then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch", e=>{
  // Cache-first for everything, especially codes.json
  e.respondWith(
    caches.match(e.request).then(r=> r || fetch(e.request).catch(()=>caches.match("./codes.json")))
  );
});
