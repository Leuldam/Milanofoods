import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { createOrderNumber } from "@/lib/order-number";
import { releaseExpiredReservations } from "@/lib/stock-reservations";
import {
  calculatePackageTotalCents,
  calculateUnitPriceCents,
  decimalToCents,
} from "@/lib/product-pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESERVATION_MINUTES = 15;
const MAX_PAYMENT_PROOF_BYTES = 5 * 1024 * 1024;

function clean(value: unknown, max = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

type NormalizedItem = {
  productId: string;
  sku: string;
  slug: string;
  name: string;
  size: string | null;
  flavor: string | null;
  variantType: string | null;
  packagingLabel: string;
  unitsPerPackage: number;
  packageQuantity: number;
  quantity: number;
  unitPriceCents: number;
  listUnitPriceCents: number;
  promotionApplied: boolean;
  promotionDiscountPercent: string | null;
  lineTotal: number;
};

function getPaymentProofMimeType(data: Buffer): string | null {
  if (
    data.length >= 8 &&
    data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) return "image/png";
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    data.length >= 12 &&
    data.toString("ascii", 0, 4) === "RIFF" &&
    data.toString("ascii", 8, 12) === "WEBP"
  ) return "image/webp";
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const requestType = req.headers.get("content-type") || "";
    let body: Record<string, unknown>;
    let paymentProof: { data: Buffer; mimeType: string } | null = null;

    if (requestType.includes("multipart/form-data")) {
      const contentLength = Number(req.headers.get("content-length") || 0);
      if (contentLength > MAX_PAYMENT_PROOF_BYTES + 100_000) {
        return NextResponse.json({ error: "Payment screenshot must be 5 MB or smaller." }, { status: 413 });
      }

      const formData = await req.formData();
      const orderData = formData.get("order");
      if (typeof orderData !== "string") {
        return NextResponse.json({ error: "Order details are missing or invalid." }, { status: 400 });
      }
      let parsedOrder: unknown;
      try {
        parsedOrder = JSON.parse(orderData);
      } catch {
        return NextResponse.json({ error: "Order details are missing or invalid." }, { status: 400 });
      }
      if (!parsedOrder || typeof parsedOrder !== "object" || Array.isArray(parsedOrder)) {
        return NextResponse.json({ error: "Order details are missing or invalid." }, { status: 400 });
      }
      body = parsedOrder as Record<string, unknown>;

      const file = formData.get("paymentProof");
      if (file instanceof File && file.size > 0) {
        if (file.size > MAX_PAYMENT_PROOF_BYTES) {
          return NextResponse.json({ error: "Payment screenshot must be 5 MB or smaller." }, { status: 413 });
        }
        const data = Buffer.from(await file.arrayBuffer());
        const mimeType = getPaymentProofMimeType(data);
        if (!mimeType) {
          return NextResponse.json({ error: "Upload a valid PNG, JPEG, or WebP payment screenshot." }, { status: 400 });
        }
        paymentProof = { data, mimeType };
      } else if (file && (typeof file === "string" ? file.length > 0 : file.size !== 0)) {
        return NextResponse.json({ error: "The payment screenshot upload is invalid." }, { status: 400 });
      }
    } else {
      let parsedOrder: unknown;
      try {
        parsedOrder = await req.json();
      } catch {
        return NextResponse.json({ error: "Order details are missing or invalid." }, { status: 400 });
      }
      if (!parsedOrder || typeof parsedOrder !== "object" || Array.isArray(parsedOrder)) {
        return NextResponse.json({ error: "Order details are missing or invalid." }, { status: 400 });
      }
      body = parsedOrder as Record<string, unknown>;
    }

    const name = clean((body.customer as Record<string, unknown> | undefined)?.name, 120);
    const phone = clean((body.customer as Record<string, unknown> | undefined)?.phone, 60);
    const email = clean((body.customer as Record<string, unknown> | undefined)?.email, 180);
    const company = clean((body.customer as Record<string, unknown> | undefined)?.company, 160);
    const method = (body.fulfillment as Record<string, unknown> | undefined)?.method;
    const selectedPaymentCode = clean(body.payment, 40);
    const fulfillment = (body.fulfillment as Record<string, unknown> | undefined) || {};
    const items = body.items;

    const paymentConfig = selectedPaymentCode
      ? await prisma.paymentMethodConfig.findFirst({
          where: {
            code: selectedPaymentCode,
            isEnabled: true,
            accountName: { not: "" },
            accountNumber: { not: "" },
          },
        })
      : null;
    if (selectedPaymentCode && !paymentConfig) {
      return NextResponse.json({ error: "That payment method is not currently available. Refresh checkout and try again." }, { status: 400 });
    }
    const payment = paymentConfig?.displayName || "Not specified";

    if (
      !name ||
      !phone ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Please provide your name, phone number, and at least one product.",
        },
        { status: 400 }
      );
    }

    if (typeof method !== "string" || !["delivery", "pickup"].includes(method)) {
      return NextResponse.json(
        { error: "Choose delivery or pickup." },
        { status: 400 }
      );
    }

    if (items.length > 50) {
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

    const orderNumber = createOrderNumber();

    const now = new Date();
    const reservationExpiresAt = new Date(
      now.getTime() + RESERVATION_MINUTES * 60 * 1000
    );

    const result = await prisma.$transaction(async (tx) => {
      // Release reservations belonging to expired pending orders.
      await releaseExpiredReservations(tx, now);

      const normalized: NormalizedItem[] = [];

      // Resolve every product from the database and reserve its stock.
      for (const line of items) {
        const productKey = clean(line?.id, 150);
        const packageQuantity = Number(line?.qty);
        const packagingOptionId = clean(line?.packagingOptionId, 150);

        if (
          !productKey ||
          !Number.isSafeInteger(packageQuantity) ||
          packageQuantity < 1 ||
          packageQuantity > 10_000
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
          include: {
            category: { select: { isActive: true } },
            packagingOptions: {
              where: { isEnabled: true },
            },
          },
        });

        if (
          !currentProduct ||
          !currentProduct.isActive ||
          !currentProduct.isPublished ||
          !currentProduct.category.isActive
        ) {
          throw new Error("PRODUCT_UNAVAILABLE");
        }

        const packagingOption = packagingOptionId
          ? currentProduct.packagingOptions.find((option) => option.id === packagingOptionId)
          : null;
        if (packagingOptionId && !packagingOption) {
          throw new Error("PACKAGING_UNAVAILABLE");
        }
        const unitsPerPackage = packagingOption?.unitsPerPackage ?? 1;
        const quantity = packageQuantity * unitsPerPackage;
        if (!Number.isSafeInteger(quantity) || quantity > 100_000) {
          throw new Error("INVALID_CART");
        }
        if (quantity < currentProduct.minimumOrderQuantity) {
          throw new Error("MINIMUM_ORDER_QUANTITY");
        }

        const availableStock =
          currentProduct.stock - currentProduct.reservedStock;

        if (availableStock < quantity) {
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
            reservedStock: { increment: quantity },
          },
        });

        let listUnitPriceCents: number;
        let unitPriceCents: number;
        try {
          listUnitPriceCents = decimalToCents(currentProduct.price.toString());
          unitPriceCents = calculateUnitPriceCents(
            listUnitPriceCents,
            currentProduct.promotionEnabled,
            currentProduct.promotionDiscountPercent?.toString() || null,
          );
          if (listUnitPriceCents <= 0 || unitPriceCents <= 0) {
            throw new Error("INVALID_PRODUCT_PRICE");
          }
        } catch {
          throw new Error("INVALID_PRODUCT_PRICE");
        }

        const lineTotal = calculatePackageTotalCents(
          unitPriceCents,
          unitsPerPackage,
          packageQuantity,
        );

        normalized.push({
          productId: currentProduct.id,
          sku: currentProduct.sku,
          slug: currentProduct.slug,
          name: currentProduct.name,
          size: currentProduct.size,
          flavor: currentProduct.flavor,
          variantType: currentProduct.variantType,
          packagingLabel: packagingOption?.label || "Single unit",
          unitsPerPackage,
          packageQuantity,
          quantity,
          unitPriceCents,
          listUnitPriceCents,
          promotionApplied: currentProduct.promotionEnabled && Boolean(currentProduct.promotionDiscountPercent),
          promotionDiscountPercent: currentProduct.promotionEnabled
            ? currentProduct.promotionDiscountPercent?.toString() || null
            : null,
          lineTotal,
        });
      }

      const subtotalCents = normalized.reduce(
        (sum, item) => sum + item.lineTotal,
        0
      );

      const money = (cents: number) => (cents / 100).toFixed(2);

      const customer = await tx.customer.upsert({
        where: { phone: phone.trim() },
        update: {
          name: name.trim(),
          email: email || undefined,
          company: company || undefined,
          address: deliveryAddress || undefined,
          city: city || undefined,
        },
        create: {
          phone: phone.trim(),
          name: name.trim(),
          email: email || null,
          company: company || null,
          address: deliveryAddress || null,
          city: city || null,
          customerType: "RETAIL",
        },
      });

      const order = await tx.order.create({
        data: {
          orderNumber,
          customerName: name,
          customerPhone: phone,
          customerEmail: email || null,
          company: company || null,
          customerId: customer.id,
          source: "WEBSITE",
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
          statusHistory: {
            create: {
              status: "PENDING",
              changedBy: "Customer (Website)",
              notes: "Order placed on customer website",
            },
          },
          ...(paymentProof ? {
            paymentProof: {
              create: {
                mimeType: paymentProof.mimeType,
                data: Uint8Array.from(paymentProof.data),
              },
            },
          } : {}),
          items: {
            create: normalized.map((item) => ({
              productId: item.productId,
              productSku: item.sku,
              productName: item.name,
              productSize: item.size,
              productFlavor: item.flavor,
              productVariantType: item.variantType,
              packagingLabel: item.packagingLabel,
              unitsPerPackage: item.unitsPerPackage,
              packageQuantity: item.packageQuantity,
              unitPrice: money(item.unitPriceCents),
              listUnitPrice: money(item.listUnitPriceCents),
              promotionApplied: item.promotionApplied,
              promotionDiscountPercent: item.promotionDiscountPercent,
              quantity: item.quantity,
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
    }, { maxWait: 10_000, timeout: 30_000 });

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
        paymentProof ? "Payment screenshot: attached for admin review." : "",
        "",
        "ITEMS",
        ...result.normalized.map(
          (item) =>
              `• ${item.name} [${item.sku}]${item.size ? ` · ${item.size}` : ""}${item.flavor ? ` · ${item.flavor}` : ""} — ${item.packageQuantity} × ${item.packagingLabel} (${item.quantity} individual units) — ETB ${(
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
        createdAt: result.order.createdAt.toISOString(),
        items: result.order.items.map((item) => ({
          slug: result.normalized.find((normalizedItem) => normalizedItem.productId === item.productId)?.slug || "",
          sku: item.productSku || "",
          name: item.productName,
          size: item.productSize,
          flavor: item.productFlavor,
          variantType: item.productVariantType,
          packagingLabel: item.packagingLabel,
          unitsPerPackage: item.unitsPerPackage,
          packageQuantity: item.packageQuantity,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          listUnitPrice: Number(item.listUnitPrice ?? item.unitPrice),
          promotionApplied: item.promotionApplied,
          promotionDiscountPercent: item.promotionDiscountPercent?.toString() || null,
          lineTotal: Number(item.lineTotal),
        })),
        subtotal: Number(result.order.subtotal),
        deliveryFee: Number(result.order.deliveryFee),
        total: Number(result.order.total),
        paymentAccountName: paymentConfig?.accountName || "",
        paymentAccountNumber: paymentConfig?.accountNumber || "",
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

      if (error.message === "PACKAGING_UNAVAILABLE") {
        return NextResponse.json(
          { error: "A selected package is no longer available. Refresh your cart and choose a current option." },
          { status: 409 },
        );
      }

      if (error.message === "MINIMUM_ORDER_QUANTITY") {
        return NextResponse.json(
          { error: "One or more products do not meet their minimum order quantity." },
          { status: 400 },
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