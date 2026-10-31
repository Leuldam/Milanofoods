import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { releaseExpiredReservations } from "@/lib/stock-reservations";
import { getTelegramMiniAppUser } from "@/lib/telegram-miniapp-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const operator = getTelegramMiniAppUser(request);
  if (!operator) {
    return NextResponse.json({ error: "Unauthorized Telegram session." }, { status: 401 });
  }

  try {
    const data = await prisma.$transaction(async (tx) => {
      await releaseExpiredReservations(tx, new Date());

      const [products, orders] = await Promise.all([
        tx.product.findMany({
          where: { isActive: true },
          include: { category: true },
          orderBy: { name: "asc" },
        }),
        tx.order.findMany({
          orderBy: { createdAt: "desc" },
          take: 8,
          include: { items: true },
        }),
      ]);

      return { products, orders };
    });

    const totalUnits = data.products.reduce((sum, product) => sum + product.stock, 0);
    const reservedUnits = data.products.reduce((sum, product) => sum + product.reservedStock, 0);

    return NextResponse.json({
      operator: {
        name: [operator.first_name, operator.last_name].filter(Boolean).join(" ") || operator.username || "Operator",
      },
      summary: {
        productCount: data.products.length,
        totalUnits,
        reservedUnits,
        availableUnits: totalUnits - reservedUnits,
        lowStockCount: data.products.filter((p) => p.stock - p.reservedStock <= 10).length,
        pendingOrders: data.orders.filter((order) => order.status === "PENDING").length,
      },
      products: data.products.map((product) => ({
        id: product.id,
        slug: product.slug,
        name: product.name,
        category: product.category.name,
        imageUrl: product.imageUrl,
        size: product.size,
        stock: product.stock,
        reservedStock: product.reservedStock,
        availableStock: product.stock - product.reservedStock,
        isPublished: product.isPublished,
        lowStock: product.stock - product.reservedStock <= 10,
      })),
      orders: data.orders.map((order) => ({
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        total: Number(order.total),
        status: order.status,
        itemCount: order.items.length,
        createdAt: order.createdAt.toISOString(),
      })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Mini App dashboard error:", error);
    return NextResponse.json({ error: "Unable to load management data." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const operator = getTelegramMiniAppUser(request);
  if (!operator) {
    return NextResponse.json({ error: "Unauthorized Telegram session." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const productId = typeof body?.productId === "string" ? body.productId : "";
    const quantity = Number(body?.quantity);

    if (!productId || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100000) {
      return NextResponse.json({ error: "Select a product and enter a valid restock quantity." }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Product" WHERE "id" = ${productId} FOR UPDATE`);

      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product || !product.isActive) throw new Error("PRODUCT_NOT_FOUND");

      return tx.product.update({
        where: { id: productId },
        data: { stock: { increment: quantity } },
      });
    });

    return NextResponse.json({
      ok: true,
      product: updated.name,
      added: quantity,
      stock: updated.stock,
      reservedStock: updated.reservedStock,
      availableStock: updated.stock - updated.reservedStock,
      updatedBy: operator.id,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") {
      return NextResponse.json({ error: "Product not found or inactive." }, { status: 404 });
    }
    console.error("Mini App restock error:", error);
    return NextResponse.json({ error: "Restock failed. Please try again." }, { status: 500 });
  }
}
