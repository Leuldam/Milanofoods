import { NextRequest, NextResponse } from "next/server";
import { revokeAdminSession, SESSION_COOKIE_NAME } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      await revokeAdminSession(token);
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  } catch (error) {
    console.error("Admin logout error:", error);
    return NextResponse.json({ success: true });
  }
}
