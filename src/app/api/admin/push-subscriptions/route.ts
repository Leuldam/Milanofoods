import { NextRequest, NextResponse } from "next/server";
import { PermissionKey } from "@/generated/prisma/client";
import { getCurrentAdmin, hasPermission } from "@/lib/admin-auth";
import {
  getTelegramMiniAppUser,
  hasMiniAppPermission,
} from "@/lib/telegram-miniapp-auth";
import { prisma } from "@/lib/prisma";
import { getWebPushPublicKey } from "@/lib/web-push-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getAuthorizedUser(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (admin) {
    if (!hasPermission(admin, PermissionKey.orders_view)) {
      return { userId: null, response: NextResponse.json({ error: "You do not have permission to receive order alerts." }, { status: 403 }) };
    }
    return { userId: admin.id, response: null };
  }

  const miniAppUser = await getTelegramMiniAppUser(request);
  if (!miniAppUser || !hasMiniAppPermission(miniAppUser, PermissionKey.orders_view)) {
    return { userId: null, response: NextResponse.json({ error: "Sign in with order-view access to manage notifications." }, { status: 401 }) };
  }
  return { userId: miniAppUser.adminUserId ?? null, response: null };
}

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function GET() {
  return NextResponse.json({
    configured: Boolean(getWebPushPublicKey()),
    publicKey: getWebPushPublicKey(),
  });
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const authorization = await getAuthorizedUser(request);
  if (authorization.response) return authorization.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid subscription request." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid subscription request." }, { status: 400 });
  }
  const { app, subscription } = body as {
    app?: unknown;
    subscription?: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  };
  const endpoint = subscription?.endpoint;
  const p256dh = subscription?.keys?.p256dh;
  const auth = subscription?.keys?.auth;
  let endpointUrl: URL | null = null;
  if (typeof endpoint === "string") {
    try {
      endpointUrl = new URL(endpoint);
    } catch {
      endpointUrl = null;
    }
  }
  const endpointHost = endpointUrl?.hostname.toLowerCase() || "";
  const isPushServiceHost =
    endpointHost === "fcm.googleapis.com" ||
    endpointHost.endsWith(".push.services.mozilla.com") ||
    endpointHost.endsWith(".notify.windows.com") ||
    endpointHost.endsWith(".push.apple.com") ||
    endpointHost.endsWith(".push.samsung.com");

  if (
    (app !== "admin" && app !== "miniapp") ||
    typeof endpoint !== "string" ||
    endpoint.length > 2048 ||
    endpointUrl?.protocol !== "https:" ||
    !isPushServiceHost ||
    typeof p256dh !== "string" ||
    typeof auth !== "string" ||
    p256dh.length > 256 ||
    auth.length > 128 ||
    !p256dh ||
    !auth
  ) {
    return NextResponse.json({ error: "Invalid push subscription." }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      endpoint,
      p256dh,
      auth,
      app,
      userId: authorization.userId,
    },
    update: {
      p256dh,
      auth,
      app,
      userId: authorization.userId,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const authorization = await getAuthorizedUser(request);
  if (authorization.response) return authorization.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid unsubscribe request." }, { status: 400 });
  }
  const endpoint =
    body && typeof body === "object" && "endpoint" in body
      ? body.endpoint
      : null;
  if (typeof endpoint !== "string" || endpoint.length > 2048) {
    return NextResponse.json({ error: "Invalid push subscription." }, { status: 400 });
  }

  await prisma.pushSubscription.deleteMany({
    where: {
      endpoint,
      ...(authorization.userId ? { userId: authorization.userId } : {}),
    },
  });
  return NextResponse.json({ ok: true });
}
