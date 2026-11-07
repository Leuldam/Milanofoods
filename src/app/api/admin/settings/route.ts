import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin, hasPermission, logAdminAudit } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || !hasPermission(admin, "settings_manage")) {
      return NextResponse.json({ error: "Unauthorized access to settings." }, { status: 403 });
    }

    const settings = await prisma.systemSetting.findMany();
    const settingsMap: Record<string, string> = {
      factoryName: "Milano Foods Manufacturing & Processing",
      contactPhone1: "+251 980637293",
      contactPhone2: "+251 933330065",
      contactEmail: "milanofoodprocessing@gmail.com",
      factoryAddress: "Addis Ababa, Ethiopia",
      telegramNotificationsEnabled: "true",
      currency: "ETB",
    };

    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }

    return NextResponse.json(settingsMap);
  } catch (error) {
    console.error("Admin settings GET error:", error);
    return NextResponse.json({ error: "Failed to load settings." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || !hasPermission(admin, "settings_manage")) {
      return NextResponse.json({ error: "Unauthorized to update settings." }, { status: 403 });
    }

    const body = await req.json();

    for (const [key, val] of Object.entries(body)) {
      if (typeof val === "string") {
        await prisma.systemSetting.upsert({
          where: { key },
          update: { value: val },
          create: { key, value: val },
        });
      }
    }

    await logAdminAudit(admin.id, "SETTINGS_UPDATE");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin settings POST error:", error);
    return NextResponse.json({ error: "Failed to save settings." }, { status: 500 });
  }
}
