import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTelegramMiniAppUser } from "@/lib/telegram-miniapp-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const periodNames = ["daily", "weekly", "monthly", "yearly"] as const;
type SalesPeriod = (typeof periodNames)[number];

const addisAbabaOffset = 3 * 60 * 60 * 1000;

function getPeriodStart(period: SalesPeriod, now: Date): Date {
  const localNow = new Date(now.getTime() + addisAbabaOffset);
  const year = localNow.getUTCFullYear();
  const month = localNow.getUTCMonth();
  const date = localNow.getUTCDate();

  if (period === "yearly") {
    return new Date(Date.UTC(year, 0, 1) - addisAbabaOffset);
  }
  if (period === "monthly") {
    return new Date(Date.UTC(year, month, 1) - addisAbabaOffset);
  }

  const daysSinceMonday = (localNow.getUTCDay() + 6) % 7;
  const startDate = period === "weekly" ? date - daysSinceMonday : date;
  return new Date(Date.UTC(year, month, startDate) - addisAbabaOffset);
}

export async function GET(request: NextRequest) {
  const operator = getTelegramMiniAppUser(request);
  if (!operator) {
    return NextResponse.json({ error: "Unauthorized Telegram session." }, { status: 401 });
  }

  const requestedPeriod = request.nextUrl.searchParams.get("period");
  if (!periodNames.some((period) => period === requestedPeriod)) {
    return NextResponse.json({ error: "Select a valid sales period." }, { status: 400 });
  }

  const period = requestedPeriod as SalesPeriod;
  const now = new Date();
  const start = getPeriodStart(period, now);

  try {
    const sales = await prisma.orderItem.groupBy({
      by: ["productId", "productName", "productSize"],
      where: {
        order: {
          stockDeductedAt: { gte: start, lte: now },
          status: {
            in: ["CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "COMPLETED"],
          },
        },
      },
      _sum: { quantity: true, lineTotal: true },
    });

    const products = sales
      .map((item) => ({
        productId: item.productId,
        name: item.productName,
        size: item.productSize,
        units: item._sum.quantity ?? 0,
        revenue: Number(item._sum.lineTotal ?? 0),
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return NextResponse.json({
      period,
      start: start.toISOString(),
      end: now.toISOString(),
      totalUnits: products.reduce((sum, product) => sum + product.units, 0),
      totalRevenue: products.reduce((sum, product) => sum + product.revenue, 0),
      products,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Mini App sales report error:", error);
    return NextResponse.json({ error: "Unable to load sales report." }, { status: 500 });
  }
}
