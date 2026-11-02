import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { processOrderAction, processReviewAction } from "@/lib/order-actions";
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
    await prisma.$transaction(
      (tx) => releaseExpiredReservations(tx, new Date()),
      { maxWait: 10_000, timeout: 30_000 },
    );

    const [products, orders, pendingReviews] = await Promise.all([
        prisma.product.findMany({
          where: { isActive: true },
          include: {
            category: true,
            stockMovements: { orderBy: { createdAt: "desc" }, take: 20 },
            priceChanges: { orderBy: { createdAt: "desc" }, take: 20 },
          },
          orderBy: { name: "asc" },
        }),
        prisma.order.findMany({
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { items: true },
        }),
        prisma.productReview.findMany({
          where: { isApproved: false, orderId: { not: null } },
          include: {
            product: { select: { name: true } },
            order: { select: { orderNumber: true } },
          },
          orderBy: { createdAt: "asc" },
          take: 50,
        }),
      ]);

    const totalUnits = products.reduce((sum, product) => sum + product.stock, 0);
    const reservedUnits = products.reduce((sum, product) => sum + product.reservedStock, 0);

    return NextResponse.json({
      operator: {
        name: [operator.first_name, operator.last_name].filter(Boolean).join(" ") || operator.username || "Operator",
        authMethod: operator.authMethod,
      },
      summary: {
        productCount: products.length,
        totalUnits,
        reservedUnits,
        availableUnits: totalUnits - reservedUnits,
        lowStockCount: products.filter((p) => p.stock - p.reservedStock <= 10).length,
        pendingOrders: orders.filter((order) => order.status === "PENDING").length,
        pendingReviews: pendingReviews.length,
      },
      products: products.map((product) => ({
        id: product.id,
        slug: product.slug,
        name: product.name,
        category: product.category.name,
        imageUrl: product.imageUrl,
        size: product.size,
        price: Number(product.price),
        priceChanges: product.priceChanges.map((change) => ({
          id: change.id,
          previousPrice: Number(change.previousPrice),
          newPrice: Number(change.newPrice),
          createdAt: change.createdAt.toISOString(),
        })),
        stock: product.stock,
        reservedStock: product.reservedStock,
        availableStock: product.stock - product.reservedStock,
        isPublished: product.isPublished,
        lowStock: product.stock - product.reservedStock <= 10,
        stockMovements: product.stockMovements.map((movement) => ({
          id: movement.id,
          change: movement.change,
          previousStock: movement.previousStock,
          newStock: movement.newStock,
          reason: movement.reason,
          orderNumber: movement.orderNumber,
          createdAt: movement.createdAt.toISOString(),
        })),
      })),
      orders: orders.map((order) => ({
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerEmail: order.customerEmail,
        fulfillment: order.fulfillment,
        city: order.city,
        deliveryAddress: order.deliveryAddress,
        pickupLocation: order.pickupLocation,
        paymentPreference: order.paymentPreference,
        notes: order.notes,
        total: Number(order.total),
        status: order.status,
        items: order.items.map((item) => ({
          id: item.id,
          name: item.productName,
          size: item.productSize,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          lineTotal: Number(item.lineTotal),
        })),
        itemCount: order.items.reduce((count, item) => count + item.quantity, 0),
        createdAt: order.createdAt.toISOString(),
      })),
      pendingReviews: pendingReviews.map((review) => ({
        id: review.id,
        productName: review.product.name,
        displayName: review.displayName,
        rating: review.rating,
        comment: review.comment,
        orderNumber: review.order?.orderNumber || "",
        createdAt: review.createdAt.toISOString(),
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
    const action = typeof body?.action === "string" ? body.action : "restock";

    if (action === "order-confirm" || action === "order-reject") {
      const orderNumber = typeof body?.orderNumber === "string" ? body.orderNumber.trim() : "";
      if (!orderNumber) {
        return NextResponse.json({ error: "Select a valid order." }, { status: 400 });
      }

      const result = await processOrderAction(
        orderNumber,
        action === "order-confirm" ? "confirm" : "reject",
        operator.authMethod === "telegram" ? String(operator.id) : "admin",
      );
      return NextResponse.json(result, { status: result.ok ? 200 : 409 });
    }

    if (action === "review-approve" || action === "review-reject") {
      const reviewId = typeof body?.reviewId === "string" ? body.reviewId.trim() : "";
      if (!reviewId) {
        return NextResponse.json({ error: "Select a valid review." }, { status: 400 });
      }

      const result = await processReviewAction(
        reviewId,
        action === "review-approve" ? "approve" : "reject",
      );
      return NextResponse.json(result, { status: result.ok ? 200 : 409 });
    }

    const productId = typeof body?.productId === "string" ? body.productId : "";
    if (action === "update-price") {
      const priceValue = typeof body?.price === "string" || typeof body?.price === "number"
        ? Number(body.price)
        : Number.NaN;
      const priceInCents = Math.round(priceValue * 100);
      if (!productId || !Number.isFinite(priceValue) || priceValue <= 0 || priceValue > 1_000_000_000 || Math.abs(priceInCents / 100 - priceValue) > 0.000001) {
        return NextResponse.json({ error: "Enter a valid product price with up to two decimal places." }, { status: 400 });
      }

      const updated = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Product" WHERE "id" = ${productId} FOR UPDATE`);
        const product = await tx.product.findUnique({ where: { id: productId } });
        if (!product || !product.isActive) throw new Error("PRODUCT_NOT_FOUND");
        if (Number(product.price) === priceInCents / 100) throw new Error("PRICE_UNCHANGED");

        const updatedProduct = await tx.product.update({
          where: { id: productId },
          data: { price: (priceInCents / 100).toFixed(2) },
        });
        await tx.productPriceChange.create({
          data: {
            productId,
            previousPrice: product.price,
            newPrice: updatedProduct.price,
            createdBy: operator.authMethod === "telegram" ? String(operator.id) : "admin",
          },
        });

        return { name: updatedProduct.name, price: Number(updatedProduct.price) };
      }, { maxWait: 10_000, timeout: 30_000 });

      return NextResponse.json({ ok: true, message: `${updated.name} price updated to ETB ${updated.price.toLocaleString("en-ET")}.`, price: updated.price });
    }

    const quantity = Number(body?.quantity);

    if (
      !productId ||
      (action === "restock" && (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100000)) ||
      (action !== "restock" && action !== "set-out-of-stock")
    ) {
      return NextResponse.json({ error: "Select a product and enter a valid restock quantity." }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Product" WHERE "id" = ${productId} FOR UPDATE`);

      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product || !product.isActive) throw new Error("PRODUCT_NOT_FOUND");

      if (action === "set-out-of-stock") {
        if (product.reservedStock > 0) throw new Error("STOCK_RESERVED");
        if (product.stock === 0) throw new Error("ALREADY_OUT_OF_STOCK");
      } else if (action !== "restock") {
        throw new Error("INVALID_ACTION");
      }

      const stock = action === "set-out-of-stock" ? 0 : product.stock + quantity;
      const result = await tx.product.updateMany({
        where: {
          id: productId,
          ...(action === "set-out-of-stock" ? { reservedStock: 0 } : {}),
        },
        data: { stock },
      });
      if (result.count !== 1) throw new Error("STOCK_RESERVED");

      await tx.productStockMovement.create({
        data: {
          productId,
          change: stock - product.stock,
          previousStock: product.stock,
          newStock: stock,
          reason: action === "set-out-of-stock" ? "SET_OUT_OF_STOCK" : "RESTOCK",
          createdBy: operator.authMethod === "telegram" ? String(operator.id) : "admin",
        },
      });

      return {
        product: await tx.product.findUniqueOrThrow({ where: { id: productId } }),
        previousStock: product.stock,
      };
    }, { maxWait: 10_000, timeout: 30_000 });

    return NextResponse.json({
      ok: true,
      product: updated.product.name,
      added: action === "restock" ? quantity : 0,
      change: updated.product.stock - updated.previousStock,
      stock: updated.product.stock,
      reservedStock: updated.product.reservedStock,
      availableStock: updated.product.stock - updated.product.reservedStock,
      updatedBy: operator.id,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") {
      return NextResponse.json({ error: "Product not found or inactive." }, { status: 404 });
    }
    if (error instanceof Error && error.message === "STOCK_RESERVED") {
      return NextResponse.json({ error: "Cannot mark out of stock while units are reserved for pending orders." }, { status: 409 });
    }
    if (error instanceof Error && error.message === "ALREADY_OUT_OF_STOCK") {
      return NextResponse.json({ error: "This product is already out of stock." }, { status: 409 });
    }
    if (error instanceof Error && error.message === "INVALID_ACTION") {
      return NextResponse.json({ error: "Unsupported inventory action." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "PRICE_UNCHANGED") {
      return NextResponse.json({ error: "The new price is the same as the current price." }, { status: 409 });
    }
    console.error("Mini App management action error:", error);
    return NextResponse.json({ error: "Management action failed. Please try again." }, { status: 500 });
  }
}
