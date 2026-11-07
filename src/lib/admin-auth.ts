import crypto from "crypto";
import bcrypt from "bcrypt";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { PermissionKey } from "@/generated/prisma/client";

export const SESSION_COOKIE_NAME = "milano_admin_session";
export const SESSION_DURATION_DAYS = 7;

export type AdminWithPermissions = {
  id: string;
  phone: string;
  name: string | null;
  isOwner: boolean;
  permissions: { permissionKey: PermissionKey }[];
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createAdminSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.adminSession.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return token;
}

export async function revokeAdminSession(token: string): Promise<void> {
  const tokenHash = hashSessionToken(token);
  await prisma.adminSession.deleteMany({
    where: { tokenHash },
  });
}

export async function getAdminBySessionToken(token: string): Promise<AdminWithPermissions | null> {
  if (!token) return null;
  const tokenHash = hashSessionToken(token);

  const session = await prisma.adminSession.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          permissions: {
            select: { permissionKey: true },
          },
        },
      },
    },
  });

  if (!session) return null;

  if (session.expiresAt < new Date()) {
    await prisma.adminSession.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return {
    id: session.user.id,
    phone: session.user.phone,
    name: session.user.name,
    isOwner: session.user.isOwner,
    permissions: session.user.permissions,
  };
}

export async function getCurrentAdmin(): Promise<AdminWithPermissions | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return await getAdminBySessionToken(token);
  } catch {
    return null;
  }
}

export function hasPermission(admin: AdminWithPermissions, permissionKey?: PermissionKey): boolean {
  if (!permissionKey) return true;
  if (admin.isOwner) return true;
  return admin.permissions.some((p) => p.permissionKey === permissionKey);
}

export async function logAdminAudit(
  userId: string | null,
  action: string,
  meta?: { ipAddress?: string; userAgent?: string }
) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        userId,
        action,
        ipAddress: meta?.ipAddress || null,
        userAgent: meta?.userAgent || null,
      },
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
