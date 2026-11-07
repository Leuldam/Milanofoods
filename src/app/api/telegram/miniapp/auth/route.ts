import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import {
  clearAdminLoginFailures,
  isAdminLoginThrottled,
  recordAdminLoginFailure,
} from "@/lib/admin-login-throttle";
import {
  createMiniAppSession,
  miniAppSessionCookie,
} from "@/lib/telegram-miniapp-auth";
import { sendTelegramNotification } from "@/lib/telegram-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeEthiopianPhone(p: string): string {
  const digits = p.replace(/\D/g, "");
  if (digits.startsWith("251")) return "0" + digits.slice(3);
  if (digits.startsWith("9")) return "0" + digits;
  return digits;
}

function matches(value: string, expected: string) {
  const suppliedHash = createHash("sha256").update(value).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(suppliedHash, expectedHash);
}

export async function POST(request: NextRequest) {
  const expectedPhoneRaw = process.env.MINIAPP_LOGIN_PHONE || "";
  const expectedPhone = normalizeEthiopianPhone(expectedPhoneRaw);
  const expectedPasscode = process.env.MINIAPP_LOGIN_PASSCODE || "";
  const sessionSecret = process.env.MINIAPP_SESSION_SECRET;

  if (!sessionSecret || sessionSecret.length < 32) {
    console.error("Mini App login is unavailable: session secret is not configured.");
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
  const rawPhone = typeof input.phone === "string" ? input.phone.trim() : "";
  const normalizedPhone = normalizeEthiopianPhone(rawPhone);
  const passcode = typeof input.passcode === "string" ? input.passcode : "";
  if (!rawPhone || !passcode) {
    return NextResponse.json({ error: "Enter your phone number and passcode." }, { status: 400 });
  }
  if (await isAdminLoginThrottled(request, normalizedPhone)) {
    return NextResponse.json(
      { error: "Too many sign-in attempts. Try again in 15 minutes." },
      { status: 429 },
    );
  }

  let authenticatedName = "Administrator";
  let isAuthenticated = false;
  let adminUserId: string | undefined;

  // 1. Check env credentials
  if (expectedPhone && expectedPasscode && normalizedPhone === expectedPhone) {
    if (matches(passcode, expectedPasscode)) {
      isAuthenticated = true;
      authenticatedName = "Milano Foods Admin";
    }
  }

  // 2. Check AdminUser database credentials (supports owner and staff accounts)
  if (!isAuthenticated && rawPhone && passcode) {
    try {
      const candidates = await prisma.adminUser.findMany();
      for (const admin of candidates) {
        const adminNorm = normalizeEthiopianPhone(admin.phone);
        if (adminNorm === normalizedPhone || admin.phone === rawPhone) {
          const match = await bcrypt.compare(passcode, admin.passwordHash);
          if (match) {
            isAuthenticated = true;
            authenticatedName = admin.name || (admin.isOwner ? "Owner" : "Admin");
            adminUserId = admin.id;
            break;
          }
        }
      }
    } catch (dbErr) {
      console.error("Error verifying admin credentials in database:", dbErr);
      return NextResponse.json({ error: "Unable to verify admin credentials." }, { status: 500 });
    }
  }

  if (!isAuthenticated) {
    await recordAdminLoginFailure(request, normalizedPhone);
    return NextResponse.json({ error: "Phone number or passcode is incorrect." }, { status: 401 });
  }

  await clearAdminLoginFailures(request, normalizedPhone);
  try {
    const session = createMiniAppSession({ name: authenticatedName, adminUserId });
    const response = NextResponse.json({ ok: true, name: authenticatedName });
    response.cookies.set(miniAppSessionCookie, session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: session.maxAge,
    });

    // Send notification in background without blocking login
    sendTelegramNotification(`🔐 <b>Milano Foods Mini App</b>\n\nAdmin signed in: <b>${authenticatedName}</b>`).catch(() => {});

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
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
