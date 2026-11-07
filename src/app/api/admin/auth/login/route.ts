import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyPassword,
  createAdminSession,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_DAYS,
  logAdminAudit,
} from "@/lib/admin-auth";
import {
  clearAdminLoginFailures,
  isAdminLoginThrottled,
  recordAdminLoginFailure,
} from "@/lib/admin-login-throttle";
import { getAdminPhoneCandidates } from "@/lib/admin-phone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Phone number and password are required." },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Phone number and password are required." },
        { status: 400 }
      );
    }

    const { phone, password } = body as { phone?: unknown; password?: unknown };
    if (typeof phone !== "string" || typeof password !== "string" || !phone.trim() || !password) {
      return NextResponse.json(
        { error: "Phone number and password are required." },
        { status: 400 }
      );
    }

    const cleanPhone = phone.trim();
    if (await isAdminLoginThrottled(req, cleanPhone)) {
      return NextResponse.json(
        { error: "Too many failed sign-in attempts. Try again in 15 minutes." },
        { status: 429 }
      );
    }

    // Find admin user by phone
    const users = await prisma.adminUser.findMany({
      where: { phone: { in: getAdminPhoneCandidates(cleanPhone) } },
      include: { permissions: { select: { permissionKey: true } } },
      take: 2,
    });
    const user = users.length === 1 ? users[0] : null;

    if (!user) {
      await recordAdminLoginFailure(req, cleanPhone);
      return NextResponse.json(
        { error: "Invalid phone number or password." },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      await recordAdminLoginFailure(req, cleanPhone);
      return NextResponse.json(
        { error: "Invalid phone number or password." },
        { status: 401 }
      );
    }

    await clearAdminLoginFailures(req, cleanPhone);

    // Create session token
    const token = await createAdminSession(user.id);

    // Audit log
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";
    await logAdminAudit(user.id, "LOGIN_SUCCESS", { ipAddress: ip, userAgent });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        isOwner: user.isOwner,
        permissions: user.permissions.map(({ permissionKey }) => permissionKey),
      },
    });

    // Set HttpOnly cookie
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
    console.error("Admin login error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during login." },
      { status: 500 }
    );
  }
}
