import { createHmac, timingSafeEqual } from "node:crypto";
import { PermissionKey } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const MINIAPP_SESSION_COOKIE = "milano-miniapp-session";
const MINIAPP_SESSION_TTL_SECONDS = 60 * 60 * 12;

export type TelegramMiniAppUser = {
  id: number;
  authMethod?: "telegram" | "password";
  adminUserId?: string;
  isOwner?: boolean;
  permissions?: PermissionKey[];
  first_name?: string;
  last_name?: string;
  username?: string;
};

function getMiniAppSessionSecret() {
  const secret = process.env.MINIAPP_SESSION_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

function getCookie(request: Request, name: string) {
  try {
    if ("cookies" in request && typeof (request as { cookies?: { get?: (n: string) => { value?: string } } }).cookies?.get === "function") {
      const c = (request as { cookies: { get: (n: string) => { value?: string } } }).cookies.get(name);
      if (c?.value) return c.value;
    }
  } catch {
    // fallback
  }

  const cookies = request.headers.get("cookie") || "";
  const entry = cookies
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`));

  return entry ? entry.slice(name.length + 1) : "";
}

export function createMiniAppSession(userInfo?: {
  name?: string;
  adminUserId?: string;
}) {
  const secret = getMiniAppSessionSecret();
  if (!secret) throw new Error("MINIAPP_SESSION_SECRET must be at least 32 characters.");

  const expiresAt = Math.floor(Date.now() / 1000) + MINIAPP_SESSION_TTL_SECONDS;
  const payload = Buffer.from(
    JSON.stringify({
      role: "admin",
      expiresAt,
      root: !userInfo?.adminUserId,
      ...(userInfo || {}),
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");

  return {
    token: `${payload}.${signature}`,
    maxAge: MINIAPP_SESSION_TTL_SECONDS,
  };
}

function verifyMiniAppSession(request: Request): {
  role: string;
  name?: string;
  adminUserId?: string;
  root: boolean;
} | null {
  const secret = getMiniAppSessionSecret();
  const token = getCookie(request, MINIAPP_SESSION_COOKIE);
  if (!secret || !token) return null;

  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;

  const expected = createHmac("sha256", secret).update(payload).digest();
  const supplied = Buffer.from(signature, "base64url");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return null;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      role?: unknown;
      expiresAt?: unknown;
      name?: unknown;
      adminUserId?: unknown;
      root?: unknown;
    };
    if (
      session.role === "admin" &&
      typeof session.expiresAt === "number" &&
      session.expiresAt > Math.floor(Date.now() / 1000) &&
      (typeof session.adminUserId === "string" || session.root === true)
    ) {
      return {
        role: "admin",
        name: typeof session.name === "string" ? session.name : undefined,
        adminUserId: typeof session.adminUserId === "string" ? session.adminUserId : undefined,
        root: session.root === true,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function verifyTelegramMiniApp(initData: string): TelegramMiniAppUser | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !initData) return null;

  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash");
  const authDate = Number(params.get("auth_date"));

  if (!receivedHash || !Number.isFinite(authDate)) return null;
  if (Math.abs(Date.now() / 1000 - authDate) > 60 * 60 * 24) return null;

  params.delete("hash");
  params.delete("signature");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(token).digest();
  const calculatedHash = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest();

  let suppliedHash: Buffer;
  try {
    suppliedHash = Buffer.from(receivedHash, "hex");
  } catch {
    return null;
  }

  if (
    suppliedHash.length !== calculatedHash.length ||
    !timingSafeEqual(suppliedHash, calculatedHash)
  ) return null;

  try {
    const user = JSON.parse(params.get("user") || "null") as TelegramMiniAppUser | null;
    if (!user || !Number.isSafeInteger(user.id)) return null;

    const operators = (process.env.TELEGRAM_OPERATOR_IDS || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    return operators.includes(String(user.id)) ? user : null;
  } catch {
    return null;
  }
}

export async function getTelegramMiniAppUser(request: Request): Promise<TelegramMiniAppUser | null> {
  const initData = request.headers.get("x-telegram-init-data") || "";
  const telegramUser = verifyTelegramMiniApp(initData);
  if (telegramUser) return { ...telegramUser, authMethod: "telegram" };

  const session = verifyMiniAppSession(request);
  if (!session) return null;
  if (session.root) {
    return {
      id: 0,
      first_name: session.name || "Administrator",
      authMethod: "password",
      isOwner: true,
    };
  }
  if (!session.adminUserId) return null;

  const admin = await prisma.adminUser.findUnique({
    where: { id: session.adminUserId },
    select: {
      id: true,
      name: true,
      isOwner: true,
      permissions: { select: { permissionKey: true } },
    },
  });
  if (!admin) return null;

  return {
    id: 0,
    first_name: admin.name || session.name || "Administrator",
    authMethod: "password",
    adminUserId: admin.id,
    isOwner: admin.isOwner,
    permissions: admin.permissions.map(({ permissionKey }) => permissionKey),
  };
}

export function hasMiniAppPermission(
  user: TelegramMiniAppUser,
  permissions: PermissionKey | PermissionKey[],
) {
  if (user.authMethod === "telegram" || user.isOwner || !user.adminUserId) return true;
  const required = Array.isArray(permissions) ? permissions : [permissions];
  return required.every((permission) => user.permissions?.includes(permission));
}

export const miniAppSessionCookie = MINIAPP_SESSION_COOKIE;
