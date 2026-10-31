import { NextRequest, NextResponse } from "next/server";
import { Bot } from "grammy";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let botInstance: Bot | undefined;

function getAuthorizedOperators(): Set<number> {
  return new Set(
    (process.env.TELEGRAM_OPERATOR_IDS ?? "")
      .split(",")
      .map((id) => Number(id.trim()))
      .filter((id) => Number.isSafeInteger(id) && id > 0)
  );
}

function registerHandlers(bot: Bot) {
  bot.use(async (ctx, next) => {
    const authorized = getAuthorizedOperators();
    const telegramId = ctx.from?.id;

    if (!telegramId || !authorized.has(telegramId)) {
      if (ctx.chat?.type === "private") {
        await ctx.reply("Access denied. You are not an authorized operator.");
      }
      return;
    }

    await next();
  });

  bot.command("start", async (ctx) => {
    await ctx.reply([
      "MILANO FOODS MANAGEMENT",
      "",
      "/products - List products",
      "/categories - List categories",
      "/orders - View recent orders",
      "/price <slug> <amount> - Update price",
      "/stock <slug> <quantity> - Record actual stock",
      "/publish <slug> - Publish product",
      "/unpublish <slug> - Unpublish product",
      "/order <order-number> - View order",
      "/status <order-number> <STATUS> - Update order status",
      "",
      "Example: /price mint-mojito-syrup 500",
      "Example: /stock mint-mojito-syrup 25",
      "",
      "Statuses: PENDING, CONFIRMED, PREPARING, READY_FOR_PICKUP, OUT_FOR_DELIVERY, COMPLETED, CANCELLED",
    ].join("\n"));
  });

  bot.command("products", async (ctx) => {
    const products = await prisma.product.findMany({
      include: { category: true },
      orderBy: { name: "asc" },
      take: 100,
    });

    if (!products.length) {
      await ctx.reply("No products found.");
      return;
    }

    const lines = products.map((p) =>
      [
        `• ${p.name}`,
        `Slug: ${p.slug}`,
        `Price: ${Number(p.price).toFixed(2)} ETB`,
        `Stock: ${p.stock}`,
        `Category: ${p.category.name}`,
        `Published: ${p.isPublished ? "Yes" : "No"}`,
      ].join("\n")
    );

    for (let i = 0; i < lines.length; i += 8) {
      await ctx.reply(lines.slice(i, i + 8).join("\n\n"));
    }
  });

  bot.command("categories", async (ctx) => {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });

    await ctx.reply(
      categories.length
        ? categories.map((c) =>
            `${c.name}\nSlug: ${c.slug}\nActive: ${c.isActive ? "Yes" : "No"}`
          ).join("\n\n")
        : "No categories found."
    );
  });

  bot.command("price", async (ctx) => {
    const match = ctx.match.trim().match(/^(\S+)\s+(\d+(?:\.\d{1,2})?)$/);

    if (!match) {
      await ctx.reply("Usage: /price <product-slug> <amount>");
      return;
    }

    const [, slug, rawPrice] = match;
    const price = Number(rawPrice);

    if (!Number.isFinite(price) || price <= 0 || price > 1_000_000_000) {
      await ctx.reply("Enter a valid price greater than zero.");
      return;
    }

    const product = await prisma.product.findUnique({ where: { slug } });

    if (!product) {
      await ctx.reply("Product not found. Use /products to see slugs.");
      return;
    }

    await prisma.product.update({
      where: { slug },
      data: { price },
    });

    await ctx.reply(
      `Price updated.\n${product.name}\nNew price: ${price.toFixed(2)} ETB`
    );
  });

  bot.command("stock", async (ctx) => {
    const match = ctx.match.trim().match(/^(\S+)\s+(\d+)$/);

    if (!match) {
      await ctx.reply("Usage: /stock <product-slug> <actual-quantity>");
      return;
    }

    const [, slug, rawQuantity] = match;
    const quantity = Number(rawQuantity);

    if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > 1_000_000_000) {
      await ctx.reply("Enter a valid non-negative whole-number quantity.");
      return;
    }

    const product = await prisma.product.findUnique({ where: { slug } });

    if (!product) {
      await ctx.reply("Product not found. Use /products to see slugs.");
      return;
    }

    await prisma.product.update({
      where: { slug },
      data: { stock: quantity },
    });

    await ctx.reply(
      `Stock recorded.\n${product.name}\nQuantity: ${quantity}\nUse /publish ${slug} to publish if stock is greater than zero.`
    );
  });

  bot.command("publish", async (ctx) => {
    const slug = ctx.match.trim().split(/\s+/)[0];

    if (!slug) {
      await ctx.reply("Usage: /publish <product-slug>");
      return;
    }

    const product = await prisma.product.findUnique({
      where: { slug },
      include: { category: true },
    });

    if (!product) {
      await ctx.reply("Product not found.");
      return;
    }

    if (!product.isActive || !product.category.isActive) {
      await ctx.reply("Cannot publish an inactive product or category.");
      return;
    }

    if (product.stock <= 0) {
      await ctx.reply("Cannot publish a product with zero stock.");
      return;
    }

    await prisma.product.update({
      where: { slug },
      data: { isPublished: true },
    });

    await ctx.reply(`${product.name} has been published.`);
  });

  bot.command("unpublish", async (ctx) => {
    const slug = ctx.match.trim().split(/\s+/)[0];

    if (!slug) {
      await ctx.reply("Usage: /unpublish <product-slug>");
      return;
    }

    const product = await prisma.product.findUnique({ where: { slug } });

    if (!product) {
      await ctx.reply("Product not found.");
      return;
    }

    await prisma.product.update({
      where: { slug },
      data: { isPublished: false },
    });

    await ctx.reply(`${product.name} has been unpublished.`);
  });

  bot.command("orders", async (ctx) => {
    const orders = await prisma.order.findMany({
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    if (!orders.length) {
      await ctx.reply("No orders found.");
      return;
    }

    await ctx.reply(
      orders.map((o) => [
        `Order: ${o.orderNumber}`,
        `Customer: ${o.customerName}`,
        `Phone: ${o.customerPhone}`,
        `Fulfillment: ${o.fulfillment}`,
        `Status: ${o.status}`,
        `Total: ${Number(o.total).toFixed(2)} ETB`,
        `Items: ${o.items.length}`,
        `Details: /order ${o.orderNumber}`,
      ].join("\n")).join("\n\n")
    );
  });

  bot.command("order", async (ctx) => {
    const orderNumber = ctx.match.trim().split(/\s+/)[0];

    if (!orderNumber) {
      await ctx.reply("Usage: /order <order-number>");
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

    await ctx.reply([
      `Order: ${order.orderNumber}`,
      `Customer: ${order.customerName}`,
      `Phone: ${order.customerPhone}`,
      `Email: ${order.customerEmail ?? "Not provided"}`,
      `Fulfillment: ${order.fulfillment}`,
      `Address: ${order.deliveryAddress ?? order.pickupLocation ?? "Not provided"}`,
      `Payment: ${order.paymentPreference}`,
      `Status: ${order.status}`,
      `Subtotal: ${Number(order.subtotal).toFixed(2)} ETB`,
      `Delivery fee: ${Number(order.deliveryFee).toFixed(2)} ETB`,
      `Total: ${Number(order.total).toFixed(2)} ETB`,
      `Notes: ${order.notes ?? "None"}`,
      "",
      "Items:",
      ...order.items.map((item) =>
        `${item.productName} x${item.quantity} — ${Number(item.lineTotal).toFixed(2)} ETB`
      ),
    ].join("\n"));
  });

  bot.command("status", async (ctx) => {
    const match = ctx.match.trim().match(/^(\S+)\s+([A-Z_]+)$/);

    if (!match) {
      await ctx.reply("Usage: /status <order-number> <STATUS>");
      return;
    }

    const [, orderNumber, status] = match;
    const allowedStatuses = [
      "PENDING",
      "CONFIRMED",
      "PREPARING",
      "READY_FOR_PICKUP",
      "OUT_FOR_DELIVERY",
      "COMPLETED",
      "CANCELLED",
    ] as const;

    if (!allowedStatuses.includes(status as (typeof allowedStatuses)[number])) {
      await ctx.reply(`Invalid status.\n${allowedStatuses.join("\n")}`);
      return;
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber },
    });

    if (!order) {
      await ctx.reply("Order not found.");
      return;
    }

    await prisma.order.update({
      where: { orderNumber },
      data: { status: status as (typeof allowedStatuses)[number] },
    });

    await ctx.reply(`Order ${orderNumber} updated to ${status}.`);
  });

  bot.catch((error) => {
    console.error("Telegram bot error:", error);
  });
}

function getBot(): Bot {
  if (botInstance) return botInstance;

  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured.");
  }

  const bot = new Bot(token);
  registerHandlers(bot);
  botInstance = bot;

  return bot;
}

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const receivedSecret = request.headers.get(
    "x-telegram-bot-api-secret-token"
  );

  if (!expectedSecret || receivedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const update = await request.json();
    await getBot().handleUpdate(update);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook failed:", error);

    return NextResponse.json(
      { error: "Unable to process Telegram update." },
      { status: 500 }
    );
  }
}