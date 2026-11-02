import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const reviewableStatuses = [
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "COMPLETED",
] as const;

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid order details." }, { status: 400 });
    }

    const input = body as Record<string, unknown>;
    const orderNumber = typeof input.orderNumber === "string"
      ? input.orderNumber.trim().toUpperCase()
      : "";
    const phone = typeof input.phone === "string"
      ? input.phone.replace(/\D/g, "")
      : "";

    if (!orderNumber || phone.length < 7 || phone.length > 20) {
      return NextResponse.json({ error: "Order details are incomplete." }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      select: {
        id: true,
        customerPhone: true,
        status: true,
        stockDeductedAt: true,
        items: {
          where: { productId: { not: null } },
          select: {
            productId: true,
            product: { select: { slug: true, name: true } },
          },
        },
        reviews: { select: { productId: true } },
      },
    });

    if (!order || order.customerPhone.replace(/\D/g, "") !== phone) {
      return NextResponse.json({ error: "Order details could not be verified." }, { status: 404 });
    }

    const canReview =
      Boolean(order.stockDeductedAt) &&
      reviewableStatuses.includes(order.status as (typeof reviewableStatuses)[number]);
    const submittedProductIds = order.reviews.map((review) => review.productId);
    const products = canReview
      ? order.items
          .flatMap((item) => {
            if (
              !item.product ||
              !item.productId ||
              submittedProductIds.includes(item.productId)
            ) {
              return [];
            }

            return [{ id: item.product.slug, name: item.product.name }];
          })
      : [];

    return NextResponse.json({
      canReview,
      products,
      message: canReview
        ? products.length
          ? ""
          : "A review has already been submitted for every product in this order."
        : order.status === "CANCELLED"
          ? "Only confirmed purchases can be reviewed."
          : "The review form will be available after your order is confirmed.",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Review eligibility check failed:", error);
    return NextResponse.json(
      { error: "Unable to check review eligibility." },
      { status: 500 },
    );
  }
}
