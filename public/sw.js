self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || e.request.mode !== "navigate") return;
  e.respondWith(
    fetch(e.request).catch(() => new Response("<p style='font-family:sans-serif;padding:24px'>You are offline. Your tracker will load when you reconnect.</p>", { headers: { "content-type": "text/html" } }))
  );
});
