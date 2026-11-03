import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTelegramMiniAppUser } from "@/lib/telegram-miniapp-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ orderNumber: string }> },
) {
  if (!getTelegramMiniAppUser(request)) {
    return NextResponse.json({ error: "Unauthorized Mini App session." }, { status: 401 });
  }

  try {
    const { orderNumber } = await context.params;
    const proof = await prisma.orderPaymentProof.findFirst({
      where: { order: { orderNumber } },
      select: { data: true, mimeType: true },
    });

    if (!proof) {
      return NextResponse.json({ error: "Payment screenshot not found." }, { status: 404 });
    }

    return new NextResponse(proof.data, {
      headers: {
        "Content-Type": proof.mimeType,
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Could not load payment proof:", error);
    return NextResponse.json({ error: "Unable to load payment screenshot." }, { status: 500 });
  }
}
