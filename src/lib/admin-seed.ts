import { prisma } from "@/lib/prisma";
import { PermissionKey } from "@/generated/prisma/client";

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

export async function seedPermissions() {
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
}
