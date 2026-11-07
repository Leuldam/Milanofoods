import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin, hasPermission } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || !hasPermission(admin, "dashboard_view")) {
      return NextResponse.json({ error: "Unauthorized access to dashboard." }, { status: 403 });
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      todayOrders,
      pendingOrdersCount,
      completedOrdersCount,
      allProducts,
      rawMaterials,
      packagingMaterials,
      todayBatches,
      recentOrders,
      recentBatches,
    ] = await Promise.all([
      // Today's orders
      prisma.order.findMany({
        where: {
          createdAt: { gte: startOfToday },
          status: { not: "CANCELLED" },
        },
        select: { total: true },
      }),
      // Pending orders
      prisma.order.count({ where: { status: "PENDING" } }),
      // Completed orders
      prisma.order.count({ where: { status: "COMPLETED" } }),
      // Finished products stock
      prisma.product.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          stock: true,
          reservedStock: true,
          price: true,
          minimumOrderQuantity: true,
        },
      }),
      // Raw materials
      prisma.inventoryItem.findMany({
        where: { type: "RAW_MATERIAL", isActive: true },
        select: { id: true, name: true, currentStock: true, reorderLevel: true, unit: true },
      }),
      // Packaging materials
      prisma.inventoryItem.findMany({
        where: { type: "PACKAGING", isActive: true },
        select: { id: true, name: true, currentStock: true, reorderLevel: true, unit: true },
      }),
      // Today's completed batches
      prisma.productionBatch.findMany({
        where: {
          status: "COMPLETED",
          completedAt: { gte: startOfToday },
        },
        select: { acceptedQuantity: true },
      }),
      // Recent orders
      prisma.order.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        include: {
          items: { select: { productName: true, quantity: true, lineTotal: true } },
        },
      }),
      // Recent production batches
      prisma.productionBatch.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        include: {
          product: { select: { name: true } },
        },
      }),
    ]);

    const todaySales = todayOrders.reduce((sum, order) => sum + Number(order.total), 0);
    const todayOrdersCount = todayOrders.length;
    const todayProductionQty = todayBatches.reduce((sum, b) => sum + b.acceptedQuantity, 0);

    const totalFinishedStock = allProducts.reduce((sum, p) => sum + p.stock, 0);
    const totalRawStock = rawMaterials.reduce((sum, m) => sum + Number(m.currentStock), 0);
    const totalPackagingStock = packagingMaterials.reduce((sum, m) => sum + Number(m.currentStock), 0);

    // Low stock items
    const lowStockProducts = allProducts
      .filter((p) => p.stock <= Math.max(10, p.minimumOrderQuantity * 2))
      .map((p) => ({
        id: p.id,
        name: p.name,
        type: "Finished Product",
        currentStock: p.stock,
        threshold: Math.max(10, p.minimumOrderQuantity * 2),
        unit: "units",
      }));

    const lowStockMaterials = [...rawMaterials, ...packagingMaterials]
      .filter((m) => Number(m.currentStock) <= Number(m.reorderLevel))
      .map((m) => ({
        id: m.id,
        name: m.name,
        type: "Material",
        currentStock: Number(m.currentStock),
        threshold: Number(m.reorderLevel),
        unit: m.unit,
      }));

    const lowStockAlerts = [...lowStockProducts, ...lowStockMaterials];

    // Sales over last 7 days
    const past7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      return d;
    });

    const pastWeekOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: past7Days[0] },
        status: { not: "CANCELLED" },
      },
      select: { createdAt: true, total: true },
    });

    const salesTrend = past7Days.map((dayDate) => {
      const dayEnd = new Date(dayDate);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayTotal = pastWeekOrders
        .filter((o) => o.createdAt >= dayDate && o.createdAt < dayEnd)
        .reduce((sum, o) => sum + Number(o.total), 0);

      const dayLabel = dayDate.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" });
      return { label: dayLabel, amount: dayTotal };
    });

    return NextResponse.json({
      canViewCrm: hasPermission(admin, "customers_view"),
      metrics: {
        todaySales,
        todayOrdersCount,
        pendingOrdersCount,
        completedOrdersCount,
        todayProductionQty,
        totalFinishedStock,
        totalRawStock,
        totalPackagingStock,
      },
      lowStockAlerts,
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        total: Number(o.total),
        status: o.status,
        paymentStatus: o.paymentStatus,
        source: o.source,
        createdAt: o.createdAt,
        itemsCount: o.items.length,
      })),
      recentBatches: recentBatches.map((b) => ({
        id: b.id,
        batchNumber: b.batchNumber,
        productName: b.product.name,
        plannedQuantity: b.plannedQuantity,
        acceptedQuantity: b.acceptedQuantity,
        status: b.status,
        productionDate: b.productionDate,
      })),
      salesTrend,
    });
  } catch (error) {
    console.error("Admin dashboard API error:", error);
    return NextResponse.json({ error: "Failed to load dashboard data." }, { status: 500 });
  }
}
