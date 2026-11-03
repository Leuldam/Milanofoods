import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegramNotification } from "@/lib/telegram-notifications";
import { isSecureOrderNumber } from "@/lib/order-number";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_COMMENT_LENGTH = 10;
const MAX_COMMENT_LENGTH = 1000;

export async function GET() {
  try {
    const reviews = await prisma.productReview.findMany({
      where: { isApproved: true, orderId: { not: null } },
      include: { product: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(
      reviews.map((review) => ({
        id: review.id,
        productName: review.product.name,
        displayName: review.displayName,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt.toISOString(),
      })),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Product reviews API error:", error);
    return NextResponse.json(
      { error: "Unable to load reviews." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid review." }, { status: 400 });
    }

    const input = body as Record<string, unknown>;
    const productId = typeof input.productId === "string" ? input.productId.trim() : "";
    const orderNumber = typeof input.orderNumber === "string" ? input.orderNumber.trim().toUpperCase() : "";
    const phone = typeof input.phone === "string" ? input.phone.replace(/\D/g, "") : "";
    const comment = typeof input.comment === "string" ? input.comment.trim() : "";
    const rating = input.rating;

    if (!productId) {
      return NextResponse.json({ error: "Choose a product to review." }, { status: 400 });
    }
    if (!isSecureOrderNumber(orderNumber)) {
      return NextResponse.json(
        { error: "Enter the secure order number from your confirmed order." },
        { status: 400 },
      );
    }
    if (phone.length < 7 || phone.length > 20) {
      return NextResponse.json({ error: "Enter the phone number used for your order." }, { status: 400 });
    }
    if (
      typeof rating !== "number" ||
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      return NextResponse.json({ error: "Choose a rating from 1 to 5 stars." }, { status: 400 });
    }
    if (comment.length < MIN_COMMENT_LENGTH || comment.length > MAX_COMMENT_LENGTH) {
      return NextResponse.json(
        { error: `Review must be between ${MIN_COMMENT_LENGTH} and ${MAX_COMMENT_LENGTH} characters.` },
        { status: 400 },
      );
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        status: true,
        stockDeductedAt: true,
        items: { select: { productId: true } },
      },
    });

    if (
      !order ||
      order.customerPhone.replace(/\D/g, "") !== phone ||
      !order.stockDeductedAt ||
      !["CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "COMPLETED"].includes(order.status)
    ) {
      return NextResponse.json(
        { error: "We couldn't verify a confirmed purchase with those details." },
        { status: 400 },
      );
    }

    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id: productId }, { slug: productId }],
        isActive: true,
        isPublished: true,
        category: { isActive: true },
      },
      select: { id: true, name: true },
    });

    if (!product || !order.items.some((item) => item.productId === product.id)) {
      return NextResponse.json(
        { error: "That product wasn't included in the confirmed order." },
        { status: 400 },
      );
    }

    let review;
    try {
      review = await prisma.productReview.create({
        data: {
          productId: product.id,
          orderId: order.id,
          displayName: order.customerName,
          rating,
          comment,
          isApproved: true,
        },
      });
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2002"
      ) {
        return NextResponse.json(
          { error: "A review has already been submitted for this product and order." },
          { status: 409 },
        );
      }

      throw error;
    }

    await sendTelegramNotification([
      "NEW CUSTOMER REVIEW — PUBLISHED",
      `Review: ${review.id}`,
      `Order: ${orderNumber}`,
      `Customer: ${order.customerName}`,
      `Product: ${product.name}`,
      `Rating: ${rating}/5`,
      "",
      comment,
    ].join("\n"));

    return NextResponse.json(
      {
        message: "Thanks! Your review is now published.",
        review: {
          id: review.id,
          productName: product.name,
          displayName: review.displayName,
          rating: review.rating,
          comment: review.comment,
          createdAt: review.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Product review submission error:", error);
    return NextResponse.json(
      { error: "Unable to submit your review. Please try again." },
      { status: 500 },
    );
  }
}
