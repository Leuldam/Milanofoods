import { Prisma } from "@/generated/prisma/client";

export async function releaseExpiredReservations(
  tx: Prisma.TransactionClient,
  now: Date = new Date()
) {
  const expiredOrders = await tx.order.findMany({
    where: {
      status: "PENDING",
      stockDeductedAt: null,
      reservationExpiresAt: { lte: now },
    },
    include: { items: true },
    orderBy: { id: "asc" },
    take: 100,
  });

  let releasedOrders = 0;

  for (const order of expiredOrders) {
    const cancelled = await tx.order.updateMany({
      where: {
        id: order.id,
        status: "PENDING",
        stockDeductedAt: null,
        reservationExpiresAt: { lte: now },
      },
      data: {
        status: "CANCELLED",
        reservationExpiresAt: null,
      },
    });

    if (cancelled.count !== 1) continue;

    const items = [...order.items].sort((a, b) =>
      (a.productId ?? "").localeCompare(b.productId ?? "")
    );

    for (const item of items) {
      if (!item.productId) continue;

      const released = await tx.product.updateMany({
        where: {
          id: item.productId,
          reservedStock: { gte: item.quantity },
        },
        data: {
          reservedStock: { decrement: item.quantity },
        },
      });

      if (released.count !== 1) {
        throw new Error(
          `Could not release reserved stock for order ${order.orderNumber}`
        );
      }
    }

    releasedOrders++;
  }

  return releasedOrders;
}