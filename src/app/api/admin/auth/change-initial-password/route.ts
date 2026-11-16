import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  clearAdminLoginFailures,
  isAdminLoginThrottled,
  recordAdminLoginFailure,
} from "@/lib/admin-login-throttle";
import {
  createAdminSession,
  hashPassword,
  logAdminAudit,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_DAYS,
  verifyPassword,
} from "@/lib/admin-auth";
import { getAdminPhoneCandidates, normalizeAdminPhone } from "@/lib/admin-phone";
import {
  createMiniAppSession,
  miniAppSessionCookie,
} from "@/lib/telegram-miniapp-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid password change request." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid password change request." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const rawPhone = typeof input.phone === "string" ? input.phone.trim() : "";
  const currentPassword = typeof input.currentPassword === "string" ? input.currentPassword : "";
  const newPassword = typeof input.newPassword === "string" ? input.newPassword : "";
  const app = input.app;
  const phone = normalizeAdminPhone(rawPhone);
  if (
    !rawPhone ||
    !currentPassword ||
    newPassword.length < 12 ||
    newPassword.length > 200 ||
    newPassword === currentPassword ||
    (app !== "admin" && app !== "miniapp")
  ) {
    return NextResponse.json(
      { error: "Enter your current password and a different new password of at least 12 characters." },
      { status: 400 },
    );
  }
  if (await isAdminLoginThrottled(request, phone)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in 15 minutes." },
      { status: 429 },
    );
  }

  try {
    const outcome = await prisma.$transaction(async (tx) => {
      const users = await tx.adminUser.findMany({
        where: { phone: { in: getAdminPhoneCandidates(rawPhone) } },
        include: { permissions: { select: { permissionKey: true } } },
        take: 2,
      });
      if (users.length !== 1) return { kind: "invalid" as const };

      const user = users[0];
      if (!user.mustChangePassword) return { kind: "not-required" as const };
      if (!(await verifyPassword(currentPassword, user.passwordHash))) {
        return { kind: "invalid" as const };
      }

      const updated = await tx.adminUser.update({
        where: { id: user.id },
        data: {
          passwordHash: await hashPassword(newPassword),
          mustChangePassword: false,
          authVersion: { increment: 1 },
        },
        include: { permissions: { select: { permissionKey: true } } },
      });
      await tx.adminSession.deleteMany({ where: { userId: user.id } });
      return { kind: "changed" as const, user: updated };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 10_000,
      timeout: 30_000,
    });

    if (outcome.kind === "invalid") {
      await recordAdminLoginFailure(request, phone);
      return NextResponse.json({ error: "Phone number or current password is incorrect." }, { status: 401 });
    }
    if (outcome.kind === "not-required") {
      return NextResponse.json(
        { error: "No initial password change is pending. Sign in with your current password." },
        { status: 409 },
      );
    }

    await clearAdminLoginFailures(request, phone);
    await logAdminAudit(outcome.user.id, "INITIAL_PASSWORD_CHANGED");

    if (app === "miniapp") {
      const session = createMiniAppSession({
        name: outcome.user.name || (outcome.user.isOwner ? "Owner" : "Admin"),
        adminUserId: outcome.user.id,
        authVersion: outcome.user.authVersion,
      });
      const response = NextResponse.json({
        ok: true,
        name: outcome.user.name || (outcome.user.isOwner ? "Owner" : "Admin"),
      });
      response.cookies.set(miniAppSessionCookie, session.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: session.maxAge,
      });
      return response;
    }

    const token = await createAdminSession(outcome.user.id);
    const response = NextResponse.json({
      success: true,
      user: {
        id: outcome.user.id,
        phone: outcome.user.phone,
        name: outcome.user.name,
        isOwner: outcome.user.isOwner,
        permissions: outcome.user.permissions.map(({ permissionKey }) => permissionKey),
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
    return response;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return NextResponse.json(
        { error: "The password change conflicted with another sign-in. Please try again." },
        { status: 409 },
      );
    }
    console.error("Initial password change failed:", error);
    return NextResponse.json({ error: "Could not change your password. Please try again." }, { status: 500 });
  }
}
