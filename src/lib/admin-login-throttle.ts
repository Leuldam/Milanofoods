import { createHash } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const RECORD_RETENTION_MS = 24 * 60 * 60 * 1000;

function getThrottleKeys(request: Request, phone: string) {
  const phoneDigits = phone.replace(/\D/g, "");
  const normalizedPhone = phoneDigits.startsWith("251")
    ? `0${phoneDigits.slice(3)}`
    : phoneDigits.startsWith("9")
      ? `0${phoneDigits}`
      : phoneDigits;
  const ip = request.headers.get("x-real-ip")?.trim();
  const identifiers = [
    `phone:${normalizedPhone}`,
    ...(ip ? [`ip:${ip}`] : []),
  ];

  return identifiers.map((identifier) =>
    createHash("sha256").update(`admin-login:${identifier}`).digest("hex"),
  );
}

export async function isAdminLoginThrottled(request: Request, phone: string) {
  const keys = getThrottleKeys(request, phone);
  const lockouts = await prisma.adminLoginThrottle.findMany({
    where: { key: { in: keys }, lockedUntil: { gt: new Date() } },
    select: { lockedUntil: true },
  });
  return lockouts.some((attempt) => attempt.lockedUntil !== null);
}

export async function recordAdminLoginFailure(request: Request, phone: string) {
  const keys = getThrottleKeys(request, phone);

  await prisma.adminLoginThrottle.deleteMany({
    where: { updatedAt: { lt: new Date(Date.now() - RECORD_RETENTION_MS) } },
  });
  await Promise.all(keys.map((key) => prisma.$queryRaw(Prisma.sql`
    INSERT INTO "AdminLoginThrottle" ("key", "attempts", "windowStartedAt", "lockedUntil", "updatedAt")
    VALUES (${key}, 1, now(), NULL, now())
    ON CONFLICT ("key") DO UPDATE SET
      "attempts" = CASE
        WHEN "AdminLoginThrottle"."windowStartedAt" <= now() - (${WINDOW_MS} * INTERVAL '1 millisecond')
          OR ("AdminLoginThrottle"."lockedUntil" IS NOT NULL AND "AdminLoginThrottle"."lockedUntil" <= now())
        THEN 1
        ELSE "AdminLoginThrottle"."attempts" + 1
      END,
      "windowStartedAt" = CASE
        WHEN "AdminLoginThrottle"."windowStartedAt" <= now() - (${WINDOW_MS} * INTERVAL '1 millisecond')
          OR ("AdminLoginThrottle"."lockedUntil" IS NOT NULL AND "AdminLoginThrottle"."lockedUntil" <= now())
        THEN now()
        ELSE "AdminLoginThrottle"."windowStartedAt"
      END,
      "lockedUntil" = CASE
        WHEN "AdminLoginThrottle"."windowStartedAt" <= now() - (${WINDOW_MS} * INTERVAL '1 millisecond')
          OR ("AdminLoginThrottle"."lockedUntil" IS NOT NULL AND "AdminLoginThrottle"."lockedUntil" <= now())
        THEN NULL
        WHEN "AdminLoginThrottle"."attempts" + 1 >= ${MAX_ATTEMPTS}
        THEN now() + (${LOCKOUT_MS} * INTERVAL '1 millisecond')
        ELSE "AdminLoginThrottle"."lockedUntil"
      END,
      "updatedAt" = now()
  `)));
}

export async function clearAdminLoginFailures(request: Request, phone: string) {
  await prisma.adminLoginThrottle.deleteMany({
    where: { key: { in: getThrottleKeys(request, phone) } },
  });
}
