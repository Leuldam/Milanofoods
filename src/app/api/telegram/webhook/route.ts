import { NextRequest, NextResponse } from "next/server";
import { Bot } from "grammy";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { releaseExpiredReservations } from "@/lib/stock-reservations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


let botInstance: Bot | null = null;

function getOperators(): string[] {
  return (process.env.TELEGRAM_OPERATOR_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function authorized(id?: number): boolean {
  return Boolean(id && getOperators().includes(String(id)));
}

async function releaseOrderReservation(
  tx: Prisma.TransactionClient,
  order: {
    id: string;
    orderNumber: string;
    items: Array<{ productId: string | null; quantity: number }>;
  }
) {
  const sortedItems = [...order.items].sort((a, b) =>
    (a.productId ?? "").localeCompare(b.productId ?? "")
  );

  for (const item of sortedItems) {
    if (!item.productId) continue;

    await tx.$queryRaw(
      Prisma.sql`SELECT "id" FROM "Product" WHERE "id" = ${item.productId} FOR UPDATE`
    );

    const result = await tx.product.updateMany({
      where: {
        id: item.productId,
        reservedStock: { gte: item.quantity },
      },
      data: {
        reservedStock: { decrement: item.quantity },
      },
    });

    if (result.count !== 1) {
      throw new Error(
        `Could not release reserved stock for ${order.orderNumber}`
      );
    }
  }
}

async function processOrderAction(
  orderNumber: string,
  action: "confirm" | "reject"
) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw(
      Prisma.sql`SELECT "id" FROM "Order" WHERE "orderNumber" = ${orderNumber} FOR UPDATE`
    );

    const order = await tx.order.findUnique({
      where: { orderNumber },
      include: { items: true },
    });

    if (!order) {
      return { ok: false, message: "Order not found." };
    }

    if (order.status !== "PENDING" || order.stockDeductedAt) {
      return {
        ok: false,
        message: `This order has already been processed. Status: ${order.status}.`,
      };
    }

    const now = new Date();

    if (
      !order.reservationExpiresAt ||
      order.reservationExpiresAt <= now
    ) {
      await releaseOrderReservation(tx, order);

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "CANCELLED",
          reservationExpiresAt: null,
        },
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
        data: {
          status: "CANCELLED",
          reservationExpiresAt: null,
        },
      });

      return {
        ok: true,
        status: "CANCELLED",
        message: "Order rejected. Reserved stock released.",
      };
    }

    // Confirm: deduct physical stock and release reserved stock.
    const sortedItems = [...order.items].sort((a, b) =>
    (a.productId ?? "").localeCompare(b.productId ?? "")
  );

  for (const item of sortedItems) {
      if (!item.productId) {
        throw new Error("An order item has no linked product.");
      }

      await tx.$queryRaw(
        Prisma.sql`SELECT "id" FROM "Product" WHERE "id" = ${item.productId} FOR UPDATE`
      );

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

      if (updated.count !== 1) {
        throw new Error(
          `Stock validation failed for ${item.productName}.`
        );
      }
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
  });
}

async function cleanupExpiredReservations() {
  return prisma.$transaction(async (tx) => {
    return releaseExpiredReservations(tx, new Date());
  });
}
function createBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is missing.");
  }

  const bot = new Bot(token);

  // All bot commands and button actions require an authorized operator.
  bot.use(async (ctx, next) => {
    if (!authorized(ctx.from?.id)) {
      if (ctx.callbackQuery) {
        await ctx.answerCallbackQuery({
          text: "You are not authorized to manage Milano Foods.",
          show_alert: true,
        });
      } else if (ctx.message) {
        await ctx.reply("You are not authorized to use this bot.");
      }
      return;
    }

    await next();
  });

  bot.command("start", async (ctx) => {
    await ctx.reply(
      [
        "MILANO FOODS MANAGEMENT",
        "",
        "/products - View products",
        "/stock - View stock",
        "/stock product-slug 50 - Update stock",
        "/publish product-slug - Publish product",
        "/unpublish product-slug - Hide product",
        "/orders - View pending orders",
        "/order ORDER-NUMBER - View an order",
      ].join("\n")
    );
  });

  bot.command("products", async (ctx) => {
    await cleanupExpiredReservations();
    const products = await prisma.product.findMany({
      orderBy: { name: "asc" },
      take: 50,
    });

    if (!products.length) {
      await ctx.reply("No products found.");
      return;
    }

    const message = products.map((p) =>
      [
        `📦 ${p.name}`,
        `Slug: ${p.slug}`,
        `Stock: ${p.stock}`,
        `Reserved: ${p.reservedStock}`,
        `Available: ${p.stock - p.reservedStock}`,
        `Published: ${p.isPublished ? "Yes" : "No"}`,
      ].join("\n")
    ).join("\n\n");

    await ctx.reply(message.slice(0, 4000));
  });

  bot.command("stock", async (ctx) => {
    await cleanupExpiredReservations();
    const args = ctx.match.trim().split(/\s+/).filter(Boolean);

    if (args.length === 0) {
      const products = await prisma.product.findMany({
        orderBy: { name: "asc" },
        take: 50,
      });

      if (!products.length) {
        await ctx.reply("No products found.");
        return;
      }

      const message = products.map((p) =>
        `${p.name}\nStock: ${p.stock} | Reserved: ${p.reservedStock} | Available: ${p.stock - p.reservedStock}\nSlug: ${p.slug}`
      ).join("\n\n");

      await ctx.reply(message.slice(0, 4000));
      return;
    }

    if (args.length !== 2) {
      await ctx.reply("Usage: /stock product-slug quantity");
      return;
    }

    const [slug, rawQuantity] = args;
    const quantity = Number(rawQuantity);

    if (!Number.isSafeInteger(quantity) || quantity < 0) {
      await ctx.reply("Enter a valid stock quantity (zero or greater).");
      return;
    }

    const updated = await prisma.product.updateMany({
      where: {
        slug,
        reservedStock: { lte: quantity },
      },
      data: { stock: quantity },
    });

    if (updated.count !== 1) {
      const product = await prisma.product.findUnique({
        where: { slug },
      });

      await ctx.reply(
        product
          ? `Cannot set stock below its reserved quantity (${product.reservedStock}).`
          : "Product not found. Check the product slug."
      );
      return;
    }

    await ctx.reply(`✅ Stock updated.\n${slug}: ${quantity}`);
  });

  bot.command("publish", async (ctx) => {
    const slug = ctx.match.trim();

    if (!slug) {
      await ctx.reply("Usage: /publish product-slug");
      return;
    }

    const result = await prisma.product.updateMany({
      where: { slug, isActive: true },
      data: { isPublished: true },
    });

    await ctx.reply(
      result.count
        ? `✅ ${slug} is now published.`
        : "Product not found or inactive."
    );
  });

  bot.command("unpublish", async (ctx) => {
    const slug = ctx.match.trim();

    if (!slug) {
      await ctx.reply("Usage: /unpublish product-slug");
      return;
    }

    const result = await prisma.product.updateMany({
      where: { slug },
      data: { isPublished: false },
    });

    await ctx.reply(
      result.count
        ? `✅ ${slug} is now hidden from the store.`
        : "Product not found."
    );
  });

  bot.command("orders", async (ctx) => {
    await cleanupExpiredReservations();
    const orders = await prisma.order.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 15,
      include: { items: true },
    });

    if (!orders.length) {
      await ctx.reply("No pending orders.");
      return;
    }

    const message = orders.map((order) =>
      [
        `🛍️ ${order.orderNumber}`,
        `Customer: ${order.customerName}`,
        `Phone: ${order.customerPhone}`,
        `Total: ETB ${Number(order.total).toLocaleString("en-ET")}`,
        `Expires: ${order.reservationExpiresAt?.toLocaleString() || "Unknown"}`,
        `Items: ${order.items.length}`,
      ].join("\n")
    ).join("\n\n");

    await ctx.reply(message.slice(0, 4000));
  });

  bot.command("order", async (ctx) => {
    const orderNumber = ctx.match.trim();

    if (!orderNumber) {
      await ctx.reply("Usage: /order MIL-YYYYMMDD-XXXXXX");
      return;
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: { items: true },
    });

    if (!order) {
      await ctx.reply("Order not found.");
      return;
    }

    const message = [
      `ORDER ${order.orderNumber}`,
      `Customer: ${order.customerName}`,
      `Phone: ${order.customerPhone}`,
      `Status: ${order.status}`,
      `Total: ETB ${Number(order.total).toLocaleString("en-ET")}`,
      "",
      ...order.items.map(
        (item) => `• ${item.productName} × ${item.quantity}`
      ),
    ].join("\n");

    await ctx.reply(message);
  });

  bot.on("callback_query:data", async (ctx) => {
    const data = ctx.callbackQuery.data;
    const match = /^(confirm|reject):(MIL-[A-Z0-9-]+)$/.exec(data);

    if (!match) {
      await ctx.answerCallbackQuery({ text: "Invalid action." });
      return;
    }

    const action = match[1] as "confirm" | "reject";
    const orderNumber = match[2];

    try {
      const result = await processOrderAction(orderNumber, action);

      await ctx.answerCallbackQuery({
        text: result.message,
        show_alert: !result.ok,
      });

      if (ctx.callbackQuery.message) {
        const originalText =
          "Order: " + orderNumber;

        await ctx.editMessageText(
          [
            "MILANO FOODS ORDER",
            originalText,
            "",
            `Status: ${result.status || "UNCHANGED"}`,
            result.message,
          ].join("\n")
        ).catch((error) => {
          console.error("Could not update Telegram order message:", error);
        });
      }
    } catch (error) {
      console.error("Order action failed:", error);

      await ctx.answerCallbackQuery({
        text: "Could not process this order. Please try again or check the order.",
        show_alert: true,
      });
    }
  });

  return bot;
}

function getBot() {
  if (!botInstance) {
    botInstance = createBot();
  }

  return botInstance;
}

export async function POST(req: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "Webhook secret is not configured." },
      { status: 500 }
    );
  }

  const suppliedSecret = req.headers.get(
    "x-telegram-bot-api-secret-token"
  );

  if (suppliedSecret !== secret) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 }
    );
  }

  try {
    const update = await req.json();
    await getBot().handleUpdate(update);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);

    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 }
    );
  }
}
