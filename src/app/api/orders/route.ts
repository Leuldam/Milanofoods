import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { releaseExpiredReservations } from "@/lib/stock-reservations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESERVATION_MINUTES = 15;

function clean(value: unknown, max = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

type NormalizedItem = {
  productId: string;
  name: string;
  size: string | null;
  qty: number;
  unitPrice: number;
  lineTotal: number;
};



export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const name = clean(body?.customer?.name, 120);
    const phone = clean(body?.customer?.phone, 60);
    const email = clean(body?.customer?.email, 180);
    const method = body?.fulfillment?.method;
    const payment = clean(body?.payment, 80) || "Not specified";
    const fulfillment = body?.fulfillment || {};

    if (
      !name ||
      !phone ||
      !Array.isArray(body?.items) ||
      body.items.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Please provide your name, phone number, and at least one product.",
        },
        { status: 400 }
      );
    }

    if (!["delivery", "pickup"].includes(method)) {
      return NextResponse.json(
        { error: "Choose delivery or pickup." },
        { status: 400 }
      );
    }

    if (body.items.length > 50) {
      return NextResponse.json(
        { error: "Too many different products in one order." },
        { status: 400 }
      );
    }

    const city = clean(fulfillment.city, 120);
    const deliveryAddress = clean(fulfillment.address, 300);
    const pickupLocation = clean(fulfillment.pickupLocation, 250);
    const notes = clean(fulfillment.notes, 500);

    if (method === "delivery" && (!city || !deliveryAddress)) {
      return NextResponse.json(
        { error: "Please provide your delivery city and address." },
        { status: 400 }
      );
    }

    if (method === "pickup" && !pickupLocation) {
      return NextResponse.json(
        { error: "Please provide a preferred pickup location." },
        { status: 400 }
      );
    }

    const orderNumber = `MIL-${new Date()
      .toISOString()
      .slice(0, 10)
      .replaceAll("-", "")}-${randomUUID()
      .slice(0, 6)
      .toUpperCase()}`;

    const now = new Date();
    const reservationExpiresAt = new Date(
      now.getTime() + RESERVATION_MINUTES * 60 * 1000
    );

    const result = await prisma.$transaction(async (tx) => {
      // Release reservations belonging to expired pending orders.
      await releaseExpiredReservations(tx, now);

      const normalized: NormalizedItem[] = [];

      // Resolve every product from the database and reserve its stock.
      for (const line of body.items) {
        const productKey = clean(line?.id, 150);
        const qty = Number(line?.qty);

        if (
          !productKey ||
          !Number.isInteger(qty) ||
          qty < 1 ||
          qty > 99
        ) {
          throw new Error("INVALID_CART");
        }

        const product = await tx.product.findFirst({
          where: {
            OR: [
              { id: productKey },
              { slug: productKey },
            ],
          },
        });

        if (!product) {
          throw new Error("PRODUCT_UNAVAILABLE");
        }

        // Lock the product row so simultaneous orders cannot oversell it.
        await tx.$queryRaw(
          Prisma.sql`SELECT "id" FROM "Product" WHERE "id" = ${product.id} FOR UPDATE`
        );

        const currentProduct = await tx.product.findUnique({
          where: { id: product.id },
        });

        if (
          !currentProduct ||
          !currentProduct.isActive ||
          !currentProduct.isPublished
        ) {
          throw new Error("PRODUCT_UNAVAILABLE");
        }

        const availableStock =
          currentProduct.stock - currentProduct.reservedStock;

        if (availableStock < qty) {
          throw new Error(
            `INSUFFICIENT_STOCK:${currentProduct.name}:${Math.max(
              0,
              availableStock
            )}`
          );
        }

        await tx.product.update({
          where: { id: currentProduct.id },
          data: {
            reservedStock: { increment: qty },
          },
        });

        const unitPrice = Number(currentProduct.price);

        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
          throw new Error("INVALID_PRODUCT_PRICE");
        }

        const lineTotal = Math.round(unitPrice * 100) * qty;

        normalized.push({
          productId: currentProduct.id,
          name: currentProduct.name,
          size: currentProduct.size,
          qty,
          unitPrice: Math.round(unitPrice * 100),
          lineTotal,
        });
      }

      const subtotalCents = normalized.reduce(
        (sum, item) => sum + item.lineTotal,
        0
      );

      const money = (cents: number) => (cents / 100).toFixed(2);

      const order = await tx.order.create({
        data: {
          orderNumber,
          customerName: name,
          customerPhone: phone,
          customerEmail: email || null,
          fulfillment: method === "delivery" ? "DELIVERY" : "PICKUP",
          city: method === "delivery" ? city : null,
          deliveryAddress:
            method === "delivery" ? deliveryAddress : null,
          pickupLocation:
            method === "pickup" ? pickupLocation : null,
          paymentPreference: payment,
          notes: notes || null,
          status: "PENDING",
          subtotal: money(subtotalCents),
          deliveryFee: "0.00",
          total: money(subtotalCents),
          reservationExpiresAt,
          items: {
            create: normalized.map((item) => ({
              productId: item.productId,
              productName: item.name,
              productSize: item.size,
              unitPrice: money(item.unitPrice),
              quantity: item.qty,
              lineTotal: money(item.lineTotal),
            })),
          },
        },
        include: { items: true },
      });

      return {
        order,
        normalized,
        subtotal: subtotalCents / 100,
      };
    });

    // Notify Telegram only after the order is safely saved.
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    let telegramSent = false;

    if (token && chatId) {
      const textMessage = [
        "🛍️ NEW MILANO FOODS ORDER",
        `Order: ${orderNumber}`,
        "",
        `Customer: ${name}`,
        `Phone: ${phone}`,
        email ? `Email: ${email}` : "",
        `Fulfillment: ${method.toUpperCase()}`,
        `Location: ${
          method === "delivery"
            ? `${city} — ${deliveryAddress}`
            : pickupLocation
        }`,
        `Payment: ${payment}`,
        "",
        "ITEMS",
        ...result.normalized.map(
          (item) =>
            `• ${item.name} × ${item.qty} — ETB ${(
              item.lineTotal / 100
            ).toLocaleString("en-ET")}`
        ),
        "",
        `Subtotal: ETB ${result.subtotal.toLocaleString("en-ET")}`,
        "Status: PENDING CONFIRMATION",
        `Stock reserved for ${RESERVATION_MINUTES} minutes.`,
        `Notes: ${notes || "None"}`,
      ]
        .filter(Boolean)
        .join("\n");

      try {
        const response = await fetch(
          `https://api.telegram.org/bot${token}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: textMessage,
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "✅ Confirm order",
                      callback_data: `confirm:${orderNumber}`,
                    },
                    {
                      text: "❌ Reject order",
                      callback_data: `reject:${orderNumber}`,
                    },
                  ],
                ],
              },
            }),
            signal: AbortSignal.timeout(8000),
          }
        );

        telegramSent = response.ok;

        if (!response.ok) {
          console.error("Telegram notification failed:", response.status);
        }
      } catch (error) {
        console.error("Telegram notification could not be delivered:", error);
      }
    }

    return NextResponse.json(
      {
        ok: true,
        orderNumber,
        telegramSent,
        status: "PENDING",
        reservationExpiresAt: reservationExpiresAt.toISOString(),
        message:
          "Order received. Milano Foods will contact you to confirm the details.",
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "INVALID_CART") {
        return NextResponse.json(
          { error: "One or more cart items are invalid." },
          { status: 400 }
        );
      }

      if (error.message === "PRODUCT_UNAVAILABLE") {
        return NextResponse.json(
          {
            error:
              "One or more products are unavailable. Please refresh your cart.",
          },
          { status: 409 }
        );
      }

      if (error.message.startsWith("INSUFFICIENT_STOCK:")) {
        const [, productName, available] = error.message.split(":");

        return NextResponse.json(
          {
            error: `Not enough stock for ${productName}. Available quantity: ${available}.`,
          },
          { status: 409 }
        );
      }

      if (error.message === "INVALID_PRODUCT_PRICE") {
        return NextResponse.json(
          { error: "A product price is invalid. Please contact Milano Foods." },
          { status: 500 }
        );
      }
    }

    console.error("Order endpoint error:", error);

    return NextResponse.json(
      {
        error:
          "We could not submit your order. Please try again or contact Milano Foods.",
      },
      { status: 500 }
    );
  }
}