import { prisma } from "@/lib/prisma";
import { PermissionKey } from "@/generated/prisma/client";
import { hashPassword } from "./admin-auth";

export const ALL_PERMISSION_KEYS: PermissionKey[] = [
  "dashboard_view",
  "products_view",
  "products_manage",
  "categories_manage",
  "inventory_view",
  "inventory_receive",
  "inventory_adjust",
  "production_view",
  "production_create",
  "production_complete",
  "orders_view",
  "orders_create",
  "orders_update",
  "customers_view",
  "customers_manage",
  "payments_view",
  "payments_record",
  "reports_view",
  "reports_export",
  "staff_manage",
  "settings_manage",
  "audit_view",
];

export async function seedPermissionsAndOwner() {
  // 1. Seed all permissions
  for (const key of ALL_PERMISSION_KEYS) {
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: {
        key,
        description: key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      },
    });
  }

  // 2. Check if owner or any admin exists
  const count = await prisma.adminUser.count();
  if (count === 0) {
    const ownerPhone = process.env.OWNER_PHONE?.trim();
    const ownerPassword = process.env.OWNER_PASSWORD;
    if (!ownerPhone || !ownerPassword || ownerPassword.length < 12) {
      throw new Error(
        "Set OWNER_PHONE and OWNER_PASSWORD (at least 12 characters) before seeding the first admin.",
      );
    }
    const passwordHash = await hashPassword(ownerPassword);

    const owner = await prisma.adminUser.create({
      data: {
        phone: ownerPhone,
        name: "Milano Operations Owner",
        passwordHash,
        isOwner: true,
      },
    });

    // Assign all permissions to owner
    for (const key of ALL_PERMISSION_KEYS) {
      await prisma.staffPermission.create({
        data: {
          userId: owner.id,
          permissionKey: key,
        },
      });
    }

    console.log(`[SEED] Initialized Owner: ${ownerPhone}`);
  }
}
