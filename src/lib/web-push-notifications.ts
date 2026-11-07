import { sendNotification, setVapidDetails } from "web-push";
import { prisma } from "@/lib/prisma";

type OrderPushDetails = {
  orderNumber: string;
};

function getVapidConfiguration() {
  const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
  const subject = process.env.WEB_PUSH_SUBJECT;

  return publicKey && privateKey && subject
    ? { publicKey, privateKey, subject }
    : null;
}

export function getWebPushPublicKey() {
  return getVapidConfiguration()?.publicKey ?? null;
}

export async function sendNewOrderPushNotification({ orderNumber }: OrderPushDetails) {
  const vapid = getVapidConfiguration();
  if (!vapid) return 0;

  const subscriptions = await prisma.pushSubscription.findMany();
  if (!subscriptions.length) return 0;

  setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

  let delivered = 0;
  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          JSON.stringify({
            title: "New Milano Foods order",
            body: `Order ${orderNumber} is waiting for review.`,
            url: subscription.app === "admin" ? "/admin/orders" : "/miniapp",
            tag: `new-order-${orderNumber}`,
          }),
          { TTL: 60 * 60, timeout: 5000 },
        );
        delivered += 1;
      } catch (error) {
        const statusCode =
          typeof error === "object" && error !== null && "statusCode" in error
            ? Number(error.statusCode)
            : null;

        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.deleteMany({ where: { id: subscription.id } });
          return;
        }

        console.error("Web Push order notification failed:", {
          app: subscription.app,
          statusCode,
          error,
        });
      }
    }),
  );

  return delivered;
}
