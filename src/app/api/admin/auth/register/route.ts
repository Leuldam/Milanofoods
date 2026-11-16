import { createHash, timingSafeEqual } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAdminSession, hashPassword, SESSION_COOKIE_NAME, SESSION_DURATION_DAYS } from "@/lib/admin-auth";
import { ALL_PERMISSION_KEYS } from "@/lib/admin-seed";
import { getRequesterIp, issueAdminVerificationCode, consumeAdminVerificationCode } from "@/lib/admin-verification";
import { clearAdminLoginFailures, isAdminLoginThrottled, recordAdminLoginFailure } from "@/lib/admin-login-throttle";
import { normalizeAdminPhone } from "@/lib/admin-phone";
import { createMiniAppSession, miniAppSessionCookie } from "@/lib/telegram-miniapp-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isInitialSetupCodeValid(value: unknown) {
  const expected = process.env.ADMIN_INITIAL_SETUP_CODE;
  if (typeof value !== "string" || !expected || expected.length < 24) return false;
  const suppliedHash = createHash("sha256").update(value).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(suppliedHash, expectedHash);
}

function normalizeInput(body: Record<string, unknown>) {
  const phone = typeof body.phone === "string" ? normalizeAdminPhone(body.phone) : "";
  const telegramChatId = typeof body.telegramChatId === "string" ? body.telegramChatId.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const code = typeof body.code === "string" ? body.code.trim() : "";
  return { phone, telegramChatId, name, password, code };
}

function isValidTelegramChatId(value: string) {
  const numericId = Number(value);
  return /^\d{1,16}$/.test(value) && Number.isSafeInteger(numericId) && numericId > 0;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid registration request." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid registration request." }, { status: 400 });
  }

  const input = normalizeInput(body as Record<string, unknown>);
  const action = (body as Record<string, unknown>).action;
  if (action !== "request-code" && action !== "complete") {
    return NextResponse.json({ error: "Invalid registration request." }, { status: 400 });
  }
  if (!process.env.MINIAPP_SESSION_SECRET || process.env.MINIAPP_SESSION_SECRET.length < 32) {
    return NextResponse.json({ error: "Mini App session security is not configured on this deployment." }, { status: 503 });
  }
  const throttlePhone = input.phone || "owner-registration";
  if (await isAdminLoginThrottled(request, throttlePhone)) {
    return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
  }
  if (!isInitialSetupCodeValid((body as Record<string, unknown>).setupCode)) {
    await recordAdminLoginFailure(request, throttlePhone);
    return NextResponse.json({ error: "The one-time setup code is invalid or not configured." }, { status: 403 });
  }
  if (await prisma.adminUser.count() !== 0) {
    return NextResponse.json({ error: "First-owner registration is already closed." }, { status: 409 });
  }
  if (!input.phone || !isValidTelegramChatId(input.telegramChatId)) {
    return NextResponse.json({ error: "Enter a valid phone number and private Telegram user ID." }, { status: 400 });
  }

  if (action === "request-code") {
    try {
      await issueAdminVerificationCode({
        phone: input.phone,
        telegramChatId: input.telegramChatId,
        purpose: "OWNER_REGISTRATION",
        requesterIp: getRequesterIp(request),
      });
      return NextResponse.json({ ok: true, message: "A six-digit verification code was sent to your Telegram." });
    } catch (error) {
      if (error instanceof Error && error.message === "VERIFICATION_REQUEST_THROTTLED") {
        return NextResponse.json({ error: "Wait before requesting another verification code." }, { status: 429 });
      }
      if (error instanceof Error && error.message === "TELEGRAM_BOT_TOKEN is not configured.") {
        return NextResponse.json({ error: "Telegram verification is not configured on this deployment." }, { status: 503 });
      }
      console.error("First-owner verification request failed:", error);
      return NextResponse.json({ error: "Telegram could not deliver the code. Start the bot in a private chat, then try again." }, { status: 502 });
    }
  }

  if (
    !input.name || input.name.length > 120 ||
    input.password.length < 12 || input.password.length > 200 ||
    !/^\d{6}$/.test(input.code)
  ) {
    return NextResponse.json(
      { error: "Enter your name, a password of at least 12 characters, and the six-digit code." },
      { status: 400 },
    );
  }

  try {
    const passwordHash = await hashPassword(input.password);
    const outcome = await prisma.$transaction(async (tx) => {
      if (await tx.adminUser.count() !== 0) return { kind: "closed" as const };
      const codeMatches = await consumeAdminVerificationCode(tx, {
        phone: input.phone,
        telegramChatId: input.telegramChatId,
        purpose: "OWNER_REGISTRATION",
        code: input.code,
      });
      if (!codeMatches) return { kind: "invalid" as const };

      for (const key of ALL_PERMISSION_KEYS) {
        await tx.permission.upsert({
          where: { key },
          update: {},
          create: {
            key,
            description: key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
          },
        });
      }

      const created = await tx.adminUser.create({
        data: {
          phone: input.phone,
          name: input.name,
          passwordHash,
          telegramChatId: input.telegramChatId,
          isOwner: true,
        },
      });
      await tx.staffPermission.createMany({
        data: ALL_PERMISSION_KEYS.map((permissionKey) => ({
          userId: created.id,
          permissionKey,
        })),
      });
      return { kind: "created" as const, owner: created };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10_000, timeout: 30_000 });

    if (outcome.kind === "closed") {
      return NextResponse.json({ error: "First-owner registration is already closed." }, { status: 409 });
    }
    if (outcome.kind === "invalid") {
      return NextResponse.json({ error: "The code is invalid or expired." }, { status: 400 });
    }
    const owner = outcome.owner;
    await clearAdminLoginFailures(request, input.phone);
    const token = await createAdminSession(owner.id);
    const miniAppSession = createMiniAppSession({
      name: owner.name || "Milano Foods Owner",
      adminUserId: owner.id,
      authVersion: owner.authVersion,
    });
    const response = NextResponse.json({
      ok: true,
      user: {
        id: owner.id,
        name: owner.name,
        phone: owner.phone,
        isOwner: true,
        permissions: ALL_PERMISSION_KEYS,
      },
    });
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
      path: "/",
    });
    response.cookies.set(miniAppSessionCookie, miniAppSession.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: miniAppSession.maxAge,
      path: "/",
    });
    return response;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This phone or Telegram account is already registered." }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return NextResponse.json({ error: "First-owner registration is already closed." }, { status: 409 });
    }
    console.error("First-owner registration failed:", error);
    return NextResponse.json({ error: "Could not complete first-owner registration." }, { status: 500 });
  }
}
