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
