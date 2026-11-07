const CACHE_NAME = "milano-miniapp-shell-v1";
const APP_PATH = "/miniapp";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith("milano-miniapp-shell-") && cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName)),
      ),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  const isAppNavigation =
    request.mode === "navigate" &&
    (url.pathname === APP_PATH || url.pathname.startsWith(`${APP_PATH}/`));
  const isAppAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/miniapp.webmanifest" ||
    url.pathname === "/miniapp-icon.svg";

  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    (!isAppNavigation && !isAppAsset)
  ) {
    return;
  }

  event.respondWith(
    fetch(request).then(async (response) => {
      if (response.ok && response.type === "basic") {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    }).catch(async () => {
      const cachedResponse = await caches.match(request) ||
        (isAppNavigation ? await caches.match(APP_PATH) : undefined);
      return cachedResponse || Response.error();
    }),
  );
});
