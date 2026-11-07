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

self.addEventListener("push", (event) => {
  let notification = {};
  try {
    notification = event.data ? event.data.json() : {};
  } catch {
    notification = { body: event.data?.text() || "" };
  }

  event.waitUntil(
    self.registration.showNotification(notification.title || "Milano Foods", {
      body: notification.body || "You have a new order update.",
      icon: "/miniapp-icon.svg",
      badge: "/miniapp-icon.svg",
      tag: notification.tag || "milano-miniapp-alert",
      data: { url: notification.url || APP_PATH },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || APP_PATH, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const matchingClient = clients.find((client) => new URL(client.url).origin === self.location.origin);
      if (matchingClient) {
        return matchingClient.navigate(url).then(() => matchingClient.focus());
      }
      return self.clients.openWindow(url);
    }),
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
