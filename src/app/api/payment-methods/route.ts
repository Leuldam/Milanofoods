import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const methods = await prisma.paymentMethodConfig.findMany({
      where: { isEnabled: true, accountName: { not: "" }, accountNumber: { not: "" } },
      select: {
        code: true,
        displayName: true,
        accountName: true,
        accountNumber: true,
      },
      orderBy: { displayName: "asc" },
    });

    return NextResponse.json({ methods }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Payment methods could not be loaded:", error);
    return NextResponse.json(
      { error: "Unable to load payment account details." },
      { status: 500 },
    );
  }
}
