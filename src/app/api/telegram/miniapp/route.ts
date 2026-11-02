import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { processOrderAction, processReviewAction, updatePendingOrder } from "@/lib/order-actions";
import { releaseExpiredReservations } from "@/lib/stock-reservations";
import { getTelegramMiniAppUser } from "@/lib/telegram-miniapp-auth";
import { sendTelegramNotification } from "@/lib/telegram-notifications";

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

    const [products, orders, pendingReviews, approvedReviews] = await Promise.all([
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
          include: { items: true },
        }),
        prisma.productReview.findMany({
          where: { isApproved: false, orderId: { not: null } },
          include: {
            product: { select: { name: true } },
            order: { select: { orderNumber: true } },
          },
          orderBy: { createdAt: "asc" },
        }),
        prisma.productReview.findMany({
          where: { isApproved: true, orderId: { not: null } },
          include: {
            product: { select: { name: true } },
            order: { select: { orderNumber: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
      ]);

    const totalUnits = products.reduce((sum, product) => sum + product.stock, 0);
    const reservedUnits = products.reduce((sum, product) => sum + product.reservedStock, 0);
    const orderStatusCounts = orders.reduce<Record<string, number>>((counts, order) => {
      counts[order.status] = (counts[order.status] ?? 0) + 1;
      return counts;
    }, {});

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
        orderStatusCounts,
        pendingReviews: pendingReviews.length,
        approvedReviews: approvedReviews.length,
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
        company: order.company,
        fulfillment: order.fulfillment,
        city: order.city,
        deliveryAddress: order.deliveryAddress,
        pickupLocation: order.pickupLocation,
        paymentPreference: order.paymentPreference,
        notes: order.notes,
        deliveryFee: Number(order.deliveryFee),
        total: Number(order.total),
        status: order.status,
        items: order.items.map((item) => ({
          id: item.id,
          productId: item.productId,
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
      approvedReviews: approvedReviews.map((review) => ({
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
      if (!result.ok) return NextResponse.json(result, { status: 409 });

      const actionLabel = action === "order-confirm" ? "CONFIRMED" : "REJECTED";
      const telegramNotified = await sendTelegramNotification([
        `MINI APP — ORDER ${actionLabel}`,
        `Order: ${orderNumber}`,
        `By: ${operator.first_name || operator.username || "Admin"}`,
        result.message,
      ].join("\n"));
      return NextResponse.json({ ...result, telegramNotified });
    }

    if (action === "order-update") {
      const orderNumber = typeof body?.orderNumber === "string" ? body.orderNumber.trim() : "";
      if (!orderNumber) {
        return NextResponse.json({ error: "Select a valid order." }, { status: 400 });
      }

      const updated = await updatePendingOrder(orderNumber, body);
      const telegramNotified = await sendTelegramNotification([
        "MINI APP — PENDING ORDER EDITED",
        `Order: ${orderNumber}`,
        `Total: ETB ${updated.previousTotal.toLocaleString("en-ET")} → ETB ${updated.total.toLocaleString("en-ET")}`,
        `Items: ${updated.products.join(", ")}`,
        `By: ${operator.first_name || operator.username || "Admin"}`,
      ].join("\n"));
      return NextResponse.json({
        ok: true,
        message: `Order ${orderNumber} updated. Total: ETB ${updated.total.toLocaleString("en-ET")}.`,
        telegramNotified,
      });
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
      if (!result.ok) return NextResponse.json(result, { status: 409 });

      const actionLabel = action === "review-approve" ? "APPROVED & PUBLISHED" : "REJECTED";
      const telegramNotified = await sendTelegramNotification([
        `MINI APP — REVIEW ${actionLabel}`,
        `Review ID: ${reviewId}`,
        `By: ${operator.first_name || operator.username || "Admin"}`,
        result.message,
      ].join("\n"));
      return NextResponse.json({ ...result, telegramNotified });
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

        return {
          name: updatedProduct.name,
          previousPrice: Number(product.price),
          price: Number(updatedProduct.price),
        };
      }, { maxWait: 10_000, timeout: 30_000 });

      const telegramNotified = await sendTelegramNotification([
        "MINI APP — PRODUCT PRICE UPDATED",
        `Product: ${updated.name}`,
        `Price: ETB ${updated.previousPrice.toLocaleString("en-ET")} → ETB ${updated.price.toLocaleString("en-ET")}`,
        `By: ${operator.first_name || operator.username || "Admin"}`,
      ].join("\n"));
      return NextResponse.json({
        ok: true,
        message: `${updated.name} price updated to ETB ${updated.price.toLocaleString("en-ET")}.`,
        price: updated.price,
        telegramNotified,
      });
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

    const telegramNotified = await sendTelegramNotification([
      action === "restock" ? "MINI APP — PRODUCT RESTOCKED" : "MINI APP — PRODUCT MARKED OUT OF STOCK",
      `Product: ${updated.product.name}`,
      `Stock: ${updated.previousStock} → ${updated.product.stock}`,
      action === "restock" ? `Units added: ${quantity}` : "",
      `By: ${operator.first_name || operator.username || "Admin"}`,
    ].filter(Boolean).join("\n"));

    return NextResponse.json({
      ok: true,
      product: updated.product.name,
      added: action === "restock" ? quantity : 0,
      change: updated.product.stock - updated.previousStock,
      stock: updated.product.stock,
      reservedStock: updated.product.reservedStock,
      availableStock: updated.product.stock - updated.product.reservedStock,
      updatedBy: operator.id,
      telegramNotified,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") {
      return NextResponse.json({ error: "Product not found or inactive." }, { status: 404 });
    }
    if (error instanceof Error && error.message === "ORDER_NOT_FOUND") {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    if (error instanceof Error && error.message === "ORDER_NOT_EDITABLE") {
      return NextResponse.json({ error: "Only pending orders can be edited." }, { status: 409 });
    }
    if (error instanceof Error && error.message === "ORDER_RESERVATION_EXPIRED") {
      return NextResponse.json({ error: "This order's stock reservation has expired. Refresh orders before editing." }, { status: 409 });
    }
    if (error instanceof Error && error.message === "INVALID_ORDER_EDIT") {
      return NextResponse.json({ error: "Check the customer details, fulfillment, prices, and order items." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "DUPLICATE_ORDER_PRODUCT") {
      return NextResponse.json({ error: "Each product can appear only once. Combine its quantity into one line." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "ORDER_PRODUCT_NOT_FOUND") {
      return NextResponse.json({ error: "One of the selected products is unavailable." }, { status: 404 });
    }
    if (error instanceof Error && error.message.startsWith("ORDER_PRODUCT_UNAVAILABLE:")) {
      return NextResponse.json({ error: `${error.message.split(":")[1]} is no longer available for additional units.` }, { status: 409 });
    }
    if (error instanceof Error && error.message.startsWith("ORDER_INSUFFICIENT_STOCK:")) {
      const [, productName, available] = error.message.split(":");
      return NextResponse.json({ error: `Not enough stock for ${productName}. Only ${available} additional unit(s) are available.` }, { status: 409 });
    }
    if (error instanceof Error && error.message.startsWith("ORDER_RESERVATION_MISMATCH:")) {
      console.error("Order edit found inconsistent reserved stock:", error.message);
      return NextResponse.json({ error: "Reserved stock could not be reconciled. No order changes were saved." }, { status: 409 });
    }
    if (error instanceof Error && error.message === "ORDER_TOTAL_TOO_LARGE") {
      return NextResponse.json({ error: "The order total is too large." }, { status: 400 });
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
