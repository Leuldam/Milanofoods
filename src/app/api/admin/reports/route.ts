import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin, hasPermission } from "@/lib/admin-auth";
import { Prisma } from "@/generated/prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || !hasPermission(admin, "reports_view")) {
      return NextResponse.json({ error: "Unauthorized access to reports." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "30d"; // "7d", "30d", "90d", "all"

    let startDate: Date | undefined;
    const now = new Date();
    if (range === "7d") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (range === "30d") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (range === "90d") {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    }

    const whereOrder: Prisma.OrderWhereInput = {};
    if (startDate) {
      whereOrder.createdAt = { gte: startDate };
    }

    const [orders, payments, categories] = await Promise.all([
      prisma.order.findMany({
        where: whereOrder,
        include: {
          items: true,
          payments: true,
        },
      }),
      prisma.payment.findMany({
        where: startDate ? { createdAt: { gte: startDate } } : {},
      }),
      prisma.category.findMany({
        select: { id: true, name: true },
      }),
    ]);

    // Financial totals
    const totalOrderValue = orders
      .filter((o) => o.status !== "CANCELLED")
      .reduce((sum, o) => sum + Number(o.total), 0);

    const completedOrdersValue = orders
      .filter((o) => o.status === "COMPLETED")
      .reduce((sum, o) => sum + Number(o.total), 0);

    const actualCashCollected = payments
      .filter((p) => p.status === "CONFIRMED")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const refundsTotal = payments
      .filter((p) => p.status === "REFUNDED" || Number(p.amount) < 0)
      .reduce((sum, p) => sum + Math.abs(Number(p.amount)), 0);

    const outstandingReceivables = Math.max(0, totalOrderValue - actualCashCollected);

    // Order counts
    const totalOrdersCount = orders.length;
    const completedCount = orders.filter((o) => o.status === "COMPLETED").length;
    const cancelledCount = orders.filter((o) => o.status === "CANCELLED").length;
    const pendingCount = orders.filter((o) => o.status === "PENDING" || o.status === "CONFIRMED" || o.status === "PREPARING").length;

    // Sales channel: Website vs Manual
    const websiteSales = orders
      .filter((o) => o.source === "WEBSITE" && o.status !== "CANCELLED")
      .reduce((sum, o) => sum + Number(o.total), 0);

    const manualSales = orders
      .filter((o) => o.source !== "WEBSITE" && o.status !== "CANCELLED")
      .reduce((sum, o) => sum + Number(o.total), 0);

    // Sales by product & category
    const productStatsMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    for (const order of orders) {
      if (order.status === "CANCELLED") continue;
      for (const item of order.items) {
        const key = item.productName || "Unknown Product";
        const current = productStatsMap.get(key) || { name: key, quantity: 0, revenue: 0 };
        current.quantity += item.quantity;
        current.revenue += Number(item.lineTotal);
        productStatsMap.set(key, current);
      }
    }

    const productSales = Array.from(productStatsMap.values()).sort((a, b) => b.revenue - a.revenue);

    // Payment method breakdown
    const paymentMethodsMap = new Map<string, number>();
    for (const p of payments) {
      if (p.status !== "CONFIRMED") continue;
      const method = p.paymentMethod || "OTHER";
      paymentMethodsMap.set(method, (paymentMethodsMap.get(method) || 0) + Number(p.amount));
    }

    const paymentMethodBreakdown = Array.from(paymentMethodsMap.entries()).map(([method, amount]) => ({
      method,
      amount,
    }));

    return NextResponse.json({
      range,
      summary: {
        totalOrderValue,
        completedOrdersValue,
        actualCashCollected,
        refundsTotal,
        outstandingReceivables,
        totalOrdersCount,
        completedCount,
        cancelledCount,
        pendingCount,
        websiteSales,
        manualSales,
      },
      productSales,
      paymentMethodBreakdown,
    });
  } catch (error) {
    console.error("Admin reports GET error:", error);
    return NextResponse.json({ error: "Failed to generate reports." }, { status: 500 });
  }
}
