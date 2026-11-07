import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin, hasPermission } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || !hasPermission(admin, "audit_view")) {
      return NextResponse.json({ error: "Unauthorized access to audit logs." }, { status: 403 });
    }

    const logs = await prisma.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        user: { select: { name: true, phone: true } },
      },
    });

    return NextResponse.json(
      logs.map((log) => ({
        id: log.id,
        action: log.action,
        staffName: log.user?.name || log.user?.phone || "System",
        staffPhone: log.user?.phone || "",
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        createdAt: log.createdAt,
      }))
    );
  } catch (error) {
    console.error("Admin audit GET error:", error);
    return NextResponse.json({ error: "Failed to load audit logs." }, { status: 500 });
  }
}
