import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      admin: {
        id: admin.id,
        phone: admin.phone,
        name: admin.name,
        isOwner: admin.isOwner,
        permissions: admin.permissions.map((p) => p.permissionKey),
      },
    });
  } catch (error) {
    console.error("Admin me error:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
