import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, logAdminAudit } from "@/lib/admin-auth";
import {
  consumeAdminVerificationCode,
  getRequesterIp,
  issueAdminVerificationCode,
} from "@/lib/admin-verification";
import {
  clearAdminLoginFailures,
  isAdminLoginThrottled,
  recordAdminLoginFailure,
} from "@/lib/admin-login-throttle";
import { getAdminPhoneCandidates, normalizeAdminPhone } from "@/lib/admin-phone";
import { Prisma } from "@/generated/prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const genericRequestMessage =
  "If the account exists and has a linked Telegram, a verification code was sent.";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid password recovery request." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid password recovery request." }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  const action = data.action;
  const rawPhone = typeof data.phone === "string" ? data.phone.trim() : "";
  const phone = normalizeAdminPhone(rawPhone);
  if (!rawPhone || !phone) {
    return NextResponse.json({ error: "Enter the phone number for your account." }, { status: 400 });
  }
  if (action === "reset" && await isAdminLoginThrottled(request, phone)) {
    return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
  }

  if (action === "request-code") {
    try {
      const users = await prisma.adminUser.findMany({
        where: { phone: { in: getAdminPhoneCandidates(phone) } },
        take: 2,
      });
      if (users.length === 1 && users[0].telegramChatId) {
        await issueAdminVerificationCode({
          phone: users[0].phone,
          telegramChatId: users[0].telegramChatId,
          purpose: "PASSWORD_RESET",
          requesterIp: getRequesterIp(request),
        });
      }
      return NextResponse.json({ ok: true, message: genericRequestMessage });
    } catch (error) {
      if (error instanceof Error && error.message === "VERIFICATION_REQUEST_THROTTLED") {
        return NextResponse.json({ error: "Wait before requesting another verification code." }, { status: 429 });
      }
      if (error instanceof Error && error.message === "TELEGRAM_BOT_TOKEN is not configured.") {
        return NextResponse.json({ error: "Telegram verification is not configured on this deployment." }, { status: 503 });
      }
      console.error("Password recovery code request failed:", error);
      if (error instanceof Error && error.message === "TELEGRAM_CODE_DELIVERY_FAILED") {
        return NextResponse.json(
          { error: "Telegram could not deliver the code. Start the bot in a private chat, then try again." },
          { status: 502 },
        );
      }
      return NextResponse.json({ error: "Could not request a password recovery code." }, { status: 500 });
    }
  }

  const code = typeof data.code === "string" ? data.code.trim() : "";
  const newPassword = typeof data.newPassword === "string" ? data.newPassword : "";
  if (action !== "reset" || !/^\d{6}$/.test(code) || newPassword.length < 12 || newPassword.length > 200) {
    return NextResponse.json(
      { error: "Enter the six-digit code and a new password of at least 12 characters." },
      { status: 400 },
    );
  }

  try {
    const passwordHash = await hashPassword(newPassword);
    const result = await prisma.$transaction(async (tx) => {
      const users = await tx.adminUser.findMany({
        where: { phone: { in: getAdminPhoneCandidates(phone) } },
        take: 2,
      });
      if (users.length !== 1 || !users[0].telegramChatId) return { kind: "invalid" as const };
      const user = users[0];
      const telegramChatId = user.telegramChatId;
      if (!telegramChatId) return { kind: "invalid" as const };
      const codeMatches = await consumeAdminVerificationCode(tx, {
        phone: user.phone,
        telegramChatId,
        purpose: "PASSWORD_RESET",
        code,
      });
      if (!codeMatches) return { kind: "invalid" as const };

      await tx.adminUser.update({
        where: { id: user.id },
        data: { passwordHash, mustChangePassword: false, authVersion: { increment: 1 } },
      });
      await tx.adminSession.deleteMany({ where: { userId: user.id } });
      return { kind: "reset" as const, id: user.id, phone: user.phone };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10_000, timeout: 30_000 });

    if (result.kind === "invalid") {
      await recordAdminLoginFailure(request, phone);
      return NextResponse.json({ error: "The phone number or code is invalid or expired." }, { status: 400 });
    }

    await clearAdminLoginFailures(request, result.phone);
    await logAdminAudit(result.id, "PASSWORD_RESET");
    return NextResponse.json({ ok: true, message: "Password updated. Sign in with your new password." });
  } catch (error) {
    console.error("Password reset failed:", error);
    return NextResponse.json({ error: "Could not reset the password. Please try again." }, { status: 500 });
  }
}
