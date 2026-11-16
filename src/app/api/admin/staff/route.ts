import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin, hasPermission, hashPassword, logAdminAudit } from "@/lib/admin-auth";
import { PermissionKey } from "@/generated/prisma/client";
import { ALL_PERMISSION_KEYS } from "@/lib/admin-seed";
import { Prisma } from "@/generated/prisma/client";
import { isUniqueConstraintError } from "@/lib/admin-error";
import { normalizeAdminPhone } from "@/lib/admin-phone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || !hasPermission(admin, "staff_manage")) {
      return NextResponse.json({ error: "Unauthorized access to staff management." }, { status: 403 });
    }

    const staff = await prisma.adminUser.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        permissions: { select: { permissionKey: true } },
        _count: { select: { sessions: true } },
      },
    });

    return NextResponse.json({
      allPermissions: ALL_PERMISSION_KEYS,
      staff: staff.map((s) => ({
        id: s.id,
        phone: s.phone,
        telegramChatId: s.telegramChatId,
        name: s.name,
        isOwner: s.isOwner,
        createdAt: s.createdAt,
        activeSessions: s._count.sessions,
        permissions: s.permissions.map((p) => p.permissionKey),
      })),
    });
  } catch (error) {
    console.error("Admin staff GET error:", error);
    return NextResponse.json({ error: "Failed to load staff list." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || !hasPermission(admin, "staff_manage")) {
      return NextResponse.json({ error: "Unauthorized to create staff." }, { status: 403 });
    }

    const body = await req.json();
    const { phone, name, password, permissions, telegramChatId } = body;

    if (
      typeof phone !== "string" || !phone.trim() ||
      typeof password !== "string" || password.length < 12 || password.length > 200
    ) {
      return NextResponse.json({ error: "Enter a phone number and a password of at least 12 characters." }, { status: 400 });
    }
    if (
      telegramChatId !== undefined &&
      telegramChatId !== null &&
      (typeof telegramChatId !== "string" || !/^\d{1,16}$/.test(telegramChatId.trim()) ||
        !Number.isSafeInteger(Number(telegramChatId)) || Number(telegramChatId) <= 0)
    ) {
      return NextResponse.json({ error: "Enter a valid private Telegram user ID." }, { status: 400 });
    }

    const cleanPhone = normalizeAdminPhone(phone);
    if (!cleanPhone) {
      return NextResponse.json({ error: "A valid phone number is required." }, { status: 400 });
    }
    const passwordHash = await hashPassword(password);

    const newStaff = await prisma.$transaction(async (tx) => {
      const created = await tx.adminUser.create({
        data: {
          phone: cleanPhone,
          name: name ? name.trim() : null,
          passwordHash,
          mustChangePassword: true,
          telegramChatId: typeof telegramChatId === "string" && telegramChatId.trim()
            ? telegramChatId.trim()
            : null,
          isOwner: false,
        },
      });

      if (Array.isArray(permissions) && permissions.length > 0) {
        for (const pKey of permissions) {
          if (ALL_PERMISSION_KEYS.includes(pKey as PermissionKey)) {
            await tx.staffPermission.create({
              data: {
                userId: created.id,
                permissionKey: pKey as PermissionKey,
              },
            });
          }
        }
      }

      return created;
    });

    await logAdminAudit(admin.id, `STAFF_CREATE: ${newStaff.phone} (${newStaff.name})`);

    return NextResponse.json({ success: true, staff: newStaff });
  } catch (error) {
    console.error("Admin staff POST error:", error);
    if (isUniqueConstraintError(error)) {
      return NextResponse.json({ error: "Staff member with this phone number already exists." }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create staff account." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || !hasPermission(admin, "staff_manage")) {
      return NextResponse.json({ error: "Unauthorized to update staff." }, { status: 403 });
    }

    const body = await req.json();
    const { id, name, phone, password, permissions, revokeSessions, telegramChatId } = body;

    if (!id) {
      return NextResponse.json({ error: "Staff ID is required." }, { status: 400 });
    }
    if (phone !== undefined && (typeof phone !== "string" || !phone.trim())) {
      return NextResponse.json({ error: "Phone number cannot be empty." }, { status: 400 });
    }
    if (
      telegramChatId !== undefined &&
      telegramChatId !== null &&
      telegramChatId !== "" &&
      (typeof telegramChatId !== "string" || !/^\d{1,16}$/.test(telegramChatId.trim()) ||
        !Number.isSafeInteger(Number(telegramChatId)) || Number(telegramChatId) <= 0)
    ) {
      return NextResponse.json({ error: "Enter a valid private Telegram user ID." }, { status: 400 });
    }
    if (
      password &&
      (typeof password !== "string" || password.length < 12 || password.length > 200)
    ) {
      return NextResponse.json({ error: "Password must be between 12 and 200 characters." }, { status: 400 });
    }

    const targetStaff = await prisma.adminUser.findUnique({ where: { id } });
    if (!targetStaff) {
      return NextResponse.json({ error: "Staff member not found." }, { status: 404 });
    }

    // Only owner can modify another owner
    if (targetStaff.isOwner && !admin.isOwner) {
      return NextResponse.json({ error: "Only the owner can modify owner account." }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      const dataToUpdate: Prisma.AdminUserUpdateInput = {};
      if (name !== undefined) dataToUpdate.name = name ? name.trim() : null;
      if (phone) dataToUpdate.phone = normalizeAdminPhone(phone);
      if (password) {
        dataToUpdate.passwordHash = await hashPassword(password);
        dataToUpdate.mustChangePassword = true;
      }
      if (password || revokeSessions) {
        dataToUpdate.authVersion = { increment: 1 };
      }
      if (telegramChatId !== undefined) {
        dataToUpdate.telegramChatId = typeof telegramChatId === "string" && telegramChatId.trim()
          ? telegramChatId.trim()
          : null;
      }

      if (Object.keys(dataToUpdate).length > 0) {
        await tx.adminUser.update({ where: { id }, data: dataToUpdate });
      }

      // Update permissions if provided and target is not owner
      if (Array.isArray(permissions) && !targetStaff.isOwner) {
        await tx.staffPermission.deleteMany({ where: { userId: id } });
        for (const pKey of permissions) {
          if (ALL_PERMISSION_KEYS.includes(pKey as PermissionKey)) {
            await tx.staffPermission.create({
              data: {
                userId: id,
                permissionKey: pKey as PermissionKey,
              },
            });
          }
        }
      }

      if (password || revokeSessions) {
        await tx.adminSession.deleteMany({ where: { userId: id } });
      }
    });

    await logAdminAudit(admin.id, `STAFF_UPDATE: ${targetStaff.phone}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin staff PUT error:", error);
    if (isUniqueConstraintError(error)) {
      return NextResponse.json({ error: "That phone number or Telegram account is already assigned." }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to update staff member." }, { status: 500 });
  }
}
