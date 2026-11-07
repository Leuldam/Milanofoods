import React from "react";
import type { Metadata } from "next";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: "Milano Foods Admin",
  description: "Private Milano Foods operations dashboard.",
  manifest: "/admin.webmanifest",
  applicationName: "Milano Admin",
  appleWebApp: {
    capable: true,
    title: "Milano Admin",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/admin-icon.svg",
    apple: "/admin-icon.svg",
  },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return <>{children}</>;
  }

  return (
    <AdminShell
      admin={{
        id: admin.id,
        phone: admin.phone,
        name: admin.name,
        isOwner: admin.isOwner,
        permissions: admin.permissions.map((p) => p.permissionKey),
      }}
    >
      {children}
    </AdminShell>
  );
}
