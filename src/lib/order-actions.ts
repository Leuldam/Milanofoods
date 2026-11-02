import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

async function releaseOrderReservation(
  tx: Prisma.TransactionClient,
  order: {
    id: string;
    orderNumber: string;
    items: Array<{ productId: string | null; quantity: number }>;
  },
) {
  const sortedItems = [...order.items].sort((a, b) =>
    (a.productId ?? "").localeCompare(b.productId ?? ""),
  );

  for (const item of sortedItems) {
    if (!item.productId) continue;

    await tx.$queryRaw(
      Prisma.sql`SELECT "id" FROM "Product" WHERE "id" = ${item.productId} FOR UPDATE`,
    );
    const released = await tx.product.updateMany({
      where: { id: item.productId, reservedStock: { gte: item.quantity } },
      data: { reservedStock: { decrement: item.quantity } },
    });

    if (released.count !== 1) {
      throw new Error(`Could not release reserved stock for ${order.orderNumber}`);
    }
  }
}

export async function processOrderAction(
  orderNumber: string,
  action: "confirm" | "reject",
  actor = "telegram-admin",
) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw(
      Prisma.sql`SELECT "id" FROM "Order" WHERE "orderNumber" = ${orderNumber} FOR UPDATE`,
    );
    const order = await tx.order.findUnique({
      where: { orderNumber },
      include: { items: true },
    });

    if (!order) return { ok: false, message: "Order not found." };
    if (order.status !== "PENDING" || order.stockDeductedAt) {
      return {
        ok: false,
        message: `This order has already been processed. Status: ${order.status}.`,
      };
    }

    const now = new Date();
    if (!order.reservationExpiresAt || order.reservationExpiresAt <= now) {
      await releaseOrderReservation(tx, order);
      await tx.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED", reservationExpiresAt: null },
      });
      return {
        ok: false,
        status: "CANCELLED",
        message: "Reservation expired. The reserved stock has been released.",
      };
    }

    if (action === "reject") {
      await releaseOrderReservation(tx, order);
      await tx.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED", reservationExpiresAt: null },
      });
      return {
        ok: true,
        status: "CANCELLED",
        message: "Order rejected. Reserved stock released.",
      };
    }

    const sortedItems = [...order.items].sort((a, b) =>
      (a.productId ?? "").localeCompare(b.productId ?? ""),
    );

    for (const item of sortedItems) {
      if (!item.productId) {
        throw new Error("An order item has no linked product.");
      }

      await tx.$queryRaw(
        Prisma.sql`SELECT "id" FROM "Product" WHERE "id" = ${item.productId} FOR UPDATE`,
      );
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: { stock: true },
      });
      const updated = await tx.product.updateMany({
        where: {
          id: item.productId,
          stock: { gte: item.quantity },
          reservedStock: { gte: item.quantity },
        },
        data: {
          stock: { decrement: item.quantity },
          reservedStock: { decrement: item.quantity },
        },
      });

      if (updated.count !== 1 || !product) {
        throw new Error(`Stock validation failed for ${item.productName}.`);
      }

      await tx.productStockMovement.create({
        data: {
          productId: item.productId,
          change: -item.quantity,
          previousStock: product.stock,
          newStock: product.stock - item.quantity,
          reason: "ORDER_CONFIRMED",
          orderNumber: order.orderNumber,
          createdBy: actor,
        },
      });
    }

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "CONFIRMED",
        stockDeductedAt: now,
        reservationExpiresAt: null,
      },
    });

    return {
      ok: true,
      status: "CONFIRMED",
      message: "Order confirmed. Stock deducted successfully.",
    };
  }, { maxWait: 10_000, timeout: 30_000 });
}

export async function updatePendingOrder(
  orderNumber: string,
  input: unknown,
) {
  if (!input || typeof input !== "object") throw new Error("INVALID_ORDER_EDIT");
  const data = input as Record<string, unknown>;
  const customerName = typeof data.customerName === "string" ? data.customerName.trim() : "";
  const customerPhone = typeof data.customerPhone === "string" ? data.customerPhone.trim() : "";
  const customerEmail = typeof data.customerEmail === "string" ? data.customerEmail.trim() : "";
  const company = typeof data.company === "string" ? data.company.trim() : "";
  const fulfillment = data.fulfillment;
  const city = typeof data.city === "string" ? data.city.trim() : "";
  const deliveryAddress = typeof data.deliveryAddress === "string" ? data.deliveryAddress.trim() : "";
  const pickupLocation = typeof data.pickupLocation === "string" ? data.pickupLocation.trim() : "";
  const paymentPreference = typeof data.paymentPreference === "string" ? data.paymentPreference.trim() : "";
  const notes = typeof data.notes === "string" ? data.notes.trim() : "";
  const deliveryFeeValue = Number(data.deliveryFee);
  const deliveryFeeCents = Math.round(deliveryFeeValue * 100);
  const rawItems = data.items;

  if (
    !customerName || customerName.length > 120 ||
    !customerPhone || customerPhone.length > 60 ||
    customerEmail.length > 180 ||
    company.length > 160 ||
    !["DELIVERY", "PICKUP"].includes(String(fulfillment)) ||
    (fulfillment === "DELIVERY" && (!city || city.length > 120 || !deliveryAddress || deliveryAddress.length > 300)) ||
    (fulfillment === "PICKUP" && (!pickupLocation || pickupLocation.length > 250)) ||
    !paymentPreference || paymentPreference.length > 80 ||
    notes.length > 500 ||
    !Number.isFinite(deliveryFeeValue) || deliveryFeeValue < 0 ||
    deliveryFeeValue > 1_000_000_000 ||
    Math.abs(deliveryFeeCents / 100 - deliveryFeeValue) > 0.000001 ||
    !Array.isArray(rawItems) || rawItems.length < 1 || rawItems.length > 50
  ) {
    throw new Error("INVALID_ORDER_EDIT");
  }

  const items = rawItems.map((rawItem) => {
    if (!rawItem || typeof rawItem !== "object") throw new Error("INVALID_ORDER_EDIT");
    const item = rawItem as Record<string, unknown>;
    const productId = typeof item.productId === "string" ? item.productId.trim() : "";
    const quantity = Number(item.quantity);
    const unitPriceValue = Number(item.unitPrice);
    const unitPriceCents = Math.round(unitPriceValue * 100);
    if (
      !productId || productId.length > 150 ||
      !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99 ||
      !Number.isFinite(unitPriceValue) || unitPriceValue <= 0 ||
      unitPriceValue > 1_000_000_000 ||
      Math.abs(unitPriceCents / 100 - unitPriceValue) > 0.000001
    ) {
      throw new Error("INVALID_ORDER_EDIT");
    }
    return { productId, quantity, unitPriceCents };
  });

  if (new Set(items.map((item) => item.productId)).size !== items.length) {
    throw new Error("DUPLICATE_ORDER_PRODUCT");
  }

  const subtotalCents = items.reduce(
    (total, item) => total + item.quantity * item.unitPriceCents,
    0,
  );
  if (subtotalCents + deliveryFeeCents > 999_999_999_999) {
    throw new Error("ORDER_TOTAL_TOO_LARGE");
  }

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw(
      Prisma.sql`SELECT "id" FROM "Order" WHERE "orderNumber" = ${orderNumber} FOR UPDATE`,
    );
    const order = await tx.order.findUnique({
      where: { orderNumber },
      include: { items: true },
    });
    if (!order) throw new Error("ORDER_NOT_FOUND");
    if (order.status !== "PENDING" || order.stockDeductedAt) {
      throw new Error("ORDER_NOT_EDITABLE");
    }
    if (!order.reservationExpiresAt || order.reservationExpiresAt <= new Date()) {
      throw new Error("ORDER_RESERVATION_EXPIRED");
    }

    const previousQuantities = new Map<string, number>();
    for (const item of order.items) {
      if (item.productId) {
        previousQuantities.set(
          item.productId,
          (previousQuantities.get(item.productId) ?? 0) + item.quantity,
        );
      }
    }
    const desiredQuantities = new Map(items.map((item) => [item.productId, item.quantity]));
    const productIds = [...new Set([...previousQuantities.keys(), ...desiredQuantities.keys()])].sort();
    for (const productId of productIds) {
      await tx.$queryRaw(
        Prisma.sql`SELECT "id" FROM "Product" WHERE "id" = ${productId} FOR UPDATE`,
      );
    }

    const products = await tx.product.findMany({
      where: { id: { in: items.map((item) => item.productId) } },
      select: { id: true, name: true, size: true, stock: true, reservedStock: true, isActive: true, isPublished: true },
    });
    const productsById = new Map(products.map((product) => [product.id, product]));
    const normalizedItems = items.map((item) => {
      const product = productsById.get(item.productId);
      if (!product) throw new Error("ORDER_PRODUCT_NOT_FOUND");
      const previousQuantity = previousQuantities.get(product.id) ?? 0;
      if ((!product.isActive || !product.isPublished) && item.quantity > previousQuantity) {
        throw new Error(`ORDER_PRODUCT_UNAVAILABLE:${product.name}`);
      }
      return {
        productId: product.id,
        productName: product.name,
        productSize: product.size,
        quantity: item.quantity,
        unitPrice: (item.unitPriceCents / 100).toFixed(2),
        lineTotal: ((item.quantity * item.unitPriceCents) / 100).toFixed(2),
      };
    });

    for (const productId of productIds) {
      const product = productsById.get(productId) ?? await tx.product.findUnique({
        where: { id: productId },
        select: { id: true, name: true, stock: true, reservedStock: true },
      });
      if (!product) throw new Error("ORDER_PRODUCT_NOT_FOUND");
      const difference = (desiredQuantities.get(productId) ?? 0) - (previousQuantities.get(productId) ?? 0);
      if (difference > 0) {
        if (product.stock - product.reservedStock < difference) {
          throw new Error(`ORDER_INSUFFICIENT_STOCK:${product.name}:${Math.max(0, product.stock - product.reservedStock)}`);
        }
        const reserved = await tx.product.updateMany({
          where: { id: productId, stock: { gte: product.reservedStock + difference }, reservedStock: product.reservedStock },
          data: { reservedStock: { increment: difference } },
        });
        if (reserved.count !== 1) throw new Error(`ORDER_INSUFFICIENT_STOCK:${product.name}:0`);
      } else if (difference < 0) {
        const released = await tx.product.updateMany({
          where: { id: productId, reservedStock: { gte: -difference } },
          data: { reservedStock: { decrement: -difference } },
        });
        if (released.count !== 1) throw new Error(`ORDER_RESERVATION_MISMATCH:${product.name}`);
      }
    }

    await tx.orderItem.deleteMany({ where: { orderId: order.id } });
    await tx.orderItem.createMany({
      data: normalizedItems.map((item) => ({ ...item, orderId: order.id })),
    });
    const deliveryFee = (deliveryFeeCents / 100).toFixed(2);
    const total = ((subtotalCents + deliveryFeeCents) / 100).toFixed(2);
    await tx.order.update({
      where: { id: order.id },
      data: {
        customerName,
        customerPhone,
        customerEmail: customerEmail || null,
        company: company || null,
        fulfillment: fulfillment as "DELIVERY" | "PICKUP",
        city: fulfillment === "DELIVERY" ? city : null,
        deliveryAddress: fulfillment === "DELIVERY" ? deliveryAddress : null,
        pickupLocation: fulfillment === "PICKUP" ? pickupLocation : null,
        paymentPreference,
        notes: notes || null,
        subtotal: (subtotalCents / 100).toFixed(2),
        deliveryFee,
        total,
      },
    });

    return {
      previousTotal: Number(order.total),
      total: Number(total),
      itemCount: items.reduce((count, item) => count + item.quantity, 0),
      products: normalizedItems.map((item) => `${item.productName} × ${item.quantity}`),
    };
  }, { maxWait: 10_000, timeout: 30_000 });
}

export async function processReviewAction(
  reviewId: string,
  action: "approve" | "reject",
) {
  if (action === "approve") {
    const result = await prisma.productReview.updateMany({
      where: { id: reviewId, isApproved: false, orderId: { not: null } },
      data: { isApproved: true },
    });

    return result.count === 1
      ? { ok: true, message: "Review approved and published on the website." }
      : { ok: false, message: "Review not found or already processed." };
  }

  const result = await prisma.productReview.deleteMany({
    where: { id: reviewId, isApproved: false, orderId: { not: null } },
  });

  return result.count === 1
    ? { ok: true, message: "Review rejected and removed." }
    : { ok: false, message: "Review not found or already processed." };
}
