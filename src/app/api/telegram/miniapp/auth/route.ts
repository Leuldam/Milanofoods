import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  createMiniAppSession,
  miniAppSessionCookie,
} from "@/lib/telegram-miniapp-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const failedAttempts = new Map<string, { count: number; resetAt: number }>();

function matches(value: string, expected: string) {
  const suppliedHash = createHash("sha256").update(value).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(suppliedHash, expectedHash);
}

export async function POST(request: NextRequest) {
  const expectedPhone = process.env.MINIAPP_LOGIN_PHONE?.replace(/\D/g, "");
  const expectedPasscode = process.env.MINIAPP_LOGIN_PASSCODE;
  const sessionSecret = process.env.MINIAPP_SESSION_SECRET;

  if (!expectedPhone || !expectedPasscode || !sessionSecret || sessionSecret.length < 32) {
    console.error("Mini App login is unavailable: required credentials or session secret are not configured.");
    return NextResponse.json(
      { error: "Admin login is not configured on this deployment." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter your phone number and passcode." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Enter your phone number and passcode." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const phone = typeof input.phone === "string" ? input.phone.replace(/\D/g, "") : "";
  const passcode = typeof input.passcode === "string" ? input.passcode : "";
  const clientIp =
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const now = Date.now();
  const attempt = failedAttempts.get(clientIp);

  if (attempt && attempt.resetAt <= now) failedAttempts.delete(clientIp);
  const activeAttempt = failedAttempts.get(clientIp);
  if (activeAttempt && activeAttempt.count >= MAX_FAILED_ATTEMPTS) {
    return NextResponse.json(
      { error: "Too many sign-in attempts. Try again in 15 minutes." },
      { status: 429 },
    );
  }

  const validPhone = matches(phone, expectedPhone);
  const validPasscode = matches(passcode, expectedPasscode);

  if (!validPhone || !validPasscode) {
    const updatedAttempt = activeAttempt
      ? { ...activeAttempt, count: activeAttempt.count + 1 }
      : { count: 1, resetAt: now + LOGIN_WINDOW_MS };
    failedAttempts.set(clientIp, updatedAttempt);
    if (failedAttempts.size > 10000) {
      for (const [ip, entry] of failedAttempts) {
        if (entry.resetAt <= now) failedAttempts.delete(ip);
      }
    }
    return NextResponse.json({ error: "Phone number or passcode is incorrect." }, { status: 401 });
  }

  failedAttempts.delete(clientIp);
  try {
    const session = createMiniAppSession();
    const response = NextResponse.json({ ok: true });
    response.cookies.set(miniAppSessionCookie, session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/telegram/miniapp",
      maxAge: session.maxAge,
    });
    return response;
  } catch (error) {
    console.error("Could not create Mini App login session:", error);
    return NextResponse.json({ error: "Unable to start an admin session." }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(miniAppSessionCookie, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/telegram/miniapp",
    maxAge: 0,
  });
  return response;
}
