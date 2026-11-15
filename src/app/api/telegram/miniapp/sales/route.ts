import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getTelegramMiniAppUser, hasMiniAppPermission } from "@/lib/telegram-miniapp-auth";

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
  const operator = await getTelegramMiniAppUser(request);
  if (!operator) {
    return NextResponse.json({ error: "Unauthorized Telegram session." }, { status: 401 });
  }
  if (!hasMiniAppPermission(operator, "reports_view")) {
    return NextResponse.json(
      { error: "Your account does not have permission to view sales reports." },
      { status: 403 },
    );
  }

  const requestedPeriod = request.nextUrl.searchParams.get("period");
  if (!periodNames.some((period) => period === requestedPeriod)) {
    return NextResponse.json({ error: "Select a valid sales period." }, { status: 400 });
  }

  const period = requestedPeriod as SalesPeriod;
  const now = new Date();
  const start = getPeriodStart(period, now);
  const bucketUnit = period === "daily" ? "hour" : period === "yearly" ? "month" : "day";
  const bucketFormat = period === "daily"
    ? "YYYY-MM-DD HH24:00"
    : period === "yearly"
      ? "YYYY-MM"
      : "YYYY-MM-DD";

  try {
    const salesStatusFilter: Prisma.OrderWhereInput["status"] = {
      in: ["CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "COMPLETED"],
    };
    const salesWhere: Prisma.OrderWhereInput = {
      stockDeductedAt: { gte: start, lte: now },
      status: salesStatusFilter,
    };
    const [sales, timeline, orderCount] = await Promise.all([
      prisma.orderItem.groupBy({
        by: ["productId", "productName", "productSize"],
        where: {
          order: salesWhere,
        },
        _sum: { quantity: true },
      }),
      prisma.$queryRaw<Array<{ label: string; units: number; orders: number }>>(Prisma.sql`
        WITH "salesOrders" AS (
          SELECT
            o."id",
            DATE_TRUNC(
              ${bucketUnit},
              (o."stockDeductedAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Africa/Addis_Ababa'
            ) AS "bucket"
          FROM "Order" o
          WHERE o."stockDeductedAt" >= ${start}
            AND o."stockDeductedAt" <= ${now}
            AND o."status" IN ('CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'COMPLETED')
        ),
        "orderMetrics" AS (
          SELECT "bucket", COUNT(*)::int AS "orders"
          FROM "salesOrders"
          GROUP BY "bucket"
        ),
        "itemMetrics" AS (
          SELECT s."bucket", COALESCE(SUM(i."quantity"), 0)::int AS "units"
          FROM "salesOrders" s
          LEFT JOIN "OrderItem" i ON i."orderId" = s."id"
          GROUP BY s."bucket"
        )
        SELECT
          TO_CHAR(o."bucket", ${bucketFormat}) AS "label",
          COALESCE(i."units", 0)::int AS "units",
          o."orders"
        FROM "orderMetrics" o
        LEFT JOIN "itemMetrics" i ON i."bucket" = o."bucket"
        ORDER BY o."bucket"
      `),
      prisma.order.count({ where: salesWhere }),
    ]);

    const productIds = sales.map((item) => item.productId).filter((id): id is string => id !== null);
    const productInventory = productIds.length
      ? await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: {
            id: true,
            stock: true,
            reservedStock: true,
            category: { select: { name: true } },
          },
        })
      : [];
    const inventoryByProductId = new Map(productInventory.map((product) => [product.id, product]));

    const products = sales
      .map((item) => ({
        productId: item.productId,
        name: item.productName,
        size: item.productSize,
        category: item.productId ? inventoryByProductId.get(item.productId)?.category.name ?? null : null,
        units: item._sum?.quantity ?? 0,
        availableStock: item.productId
          ? Math.max(0, (inventoryByProductId.get(item.productId)?.stock ?? 0) - (inventoryByProductId.get(item.productId)?.reservedStock ?? 0))
          : null,
      }))
      .sort((a, b) => b.units - a.units);

    const bestSeller = products[0] ?? null;

    return NextResponse.json({
      period,
      start: start.toISOString(),
      end: now.toISOString(),
      totalUnits: products.reduce((sum, product) => sum + product.units, 0),
      totalOrders: orderCount,
      bestSeller,
      timeline,
      products,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Mini App sales report error:", error);
    return NextResponse.json({ error: "Unable to load sales report." }, { status: 500 });
  }
}
