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
      tag: notification.tag || "milano-admin-alert",
      data: { url: notification.url || "/admin/orders" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/admin/orders", self.location.origin).href;
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
