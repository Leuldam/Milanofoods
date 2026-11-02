import { NextRequest, NextResponse } from "next/server";
import { Bot, type Context } from "grammy";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { processOrderAction, processReviewAction } from "@/lib/order-actions";
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

async function cleanupExpiredReservations() {
  return prisma.$transaction(async (tx) => {
    return releaseExpiredReservations(tx, new Date());
  });
}

async function sendPendingReview(ctx: Context, review: {
  id: string;
  displayName: string;
  rating: number;
  comment: string;
  order: { orderNumber: string } | null;
  product: { name: string };
}) {
  await ctx.reply(
    [
      "PRODUCT REVIEW — APPROVAL REQUIRED",
      `Review: ${review.id}`,
      `Order: ${review.order?.orderNumber || "Legacy review"}`,
      `Customer: ${review.displayName}`,
      `Product: ${review.product.name}`,
      `Rating: ${review.rating}/5`,
      "",
      review.comment,
    ].join("\n"),
    {
      reply_markup: {
        inline_keyboard: [[
          { text: "Approve and publish", callback_data: `review:approve:${review.id}` },
          { text: "Reject", callback_data: `review:reject:${review.id}` },
        ]],
      },
    },
  );
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
      "MILANO FOODS\\n\\nManagement Panel\\n\\nOpen the Mini App to manage products, inventory, restocking and orders. You can also use the quick menu below.",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Open Management App", web_app: { url: "https://milanofoods.vercel.app/miniapp" } }],
            [
              { text: "Products", callback_data: "menu:products" },
              { text: "Inventory", callback_data: "menu:inventory" },
            ],
            [
              { text: "Orders", callback_data: "menu:orders" },
              { text: "Pending Orders", callback_data: "menu:pending" },
            ],
            [{ text: "Low Stock", callback_data: "menu:lowstock" }],
          ],
        },
      }
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
        `ðŸ“¦ ${p.name}`,
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

    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Product" WHERE "slug" = ${slug} FOR UPDATE`);
      const product = await tx.product.findUnique({ where: { slug } });
      if (!product) return { error: "NOT_FOUND" as const };
      if (product.reservedStock > quantity) {
        return { error: "RESERVED" as const, reservedStock: product.reservedStock };
      }

      const updated = await tx.product.update({
        where: { id: product.id },
        data: { stock: quantity },
      });
      if (updated.stock !== product.stock) {
        await tx.productStockMovement.create({
          data: {
            productId: product.id,
            change: updated.stock - product.stock,
            previousStock: product.stock,
            newStock: updated.stock,
            reason: "MANUAL_STOCK_UPDATE",
            createdBy: String(ctx.from?.id || "telegram-admin"),
          },
        });
      }
      return { product: updated };
    });

    if ("error" in result) {
      await ctx.reply(
        result.error === "RESERVED"
          ? `Cannot set stock below its reserved quantity (${result.reservedStock}).`
          : "Product not found. Check the product slug.",
      );
      return;
    }

    await ctx.reply(`âœ… Stock updated.\n${slug}: ${quantity}`);
  });

  bot.command("addstock", async (ctx) => {
    const args = ctx.match.trim().split(/\s+/).filter(Boolean);

    if (args.length !== 2) {
      await ctx.reply(
        "RESTOCK\n\nUsage:\n/addstock product-slug quantity\n\nExample:\n/addstock strawberry-mojito 50"
      );
      return;
    }

    const [slug, rawQuantity] = args;
    const quantity = Number(rawQuantity);

    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      await ctx.reply("Enter a valid quantity greater than zero.");
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Product" WHERE "slug" = ${slug} FOR UPDATE`);
      const product = await tx.product.findUnique({ where: { slug } });
      if (!product) return null;

      const updated = await tx.product.update({
        where: { id: product.id },
        data: { stock: { increment: quantity } },
      });
      await tx.productStockMovement.create({
        data: {
          productId: product.id,
          change: quantity,
          previousStock: product.stock,
          newStock: updated.stock,
          reason: "RESTOCK",
          createdBy: String(ctx.from?.id || "telegram-admin"),
        },
      });
      return { previousStock: product.stock, updated };
    });

    if (!result) {
      await ctx.reply("Product not found. Check the product slug.");
      return;
    }

    await ctx.reply(
      [
        "STOCK UPDATED",
        "",
        result.updated.name,
        `Added: ${quantity}`,
        `Previous stock: ${result.previousStock}`,
        `New total stock: ${result.updated.stock}`,
        `Reserved: ${result.updated.reservedStock}`,
        `Available: ${result.updated.stock - result.updated.reservedStock}`,
      ].join("\n")
    );
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
        ? `âœ… ${slug} is now published.`
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
        ? `âœ… ${slug} is now hidden from the store.`
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
        `ðŸ›ï¸ ${order.orderNumber}`,
        `Customer: ${order.customerName}`,
        `Phone: ${order.customerPhone}`,
        `Total: ETB ${Number(order.total).toLocaleString("en-ET")}`,
        `Expires: ${order.reservationExpiresAt?.toLocaleString() || "Unknown"}`,
        `Items: ${order.items.length}`,
      ].join("\n")
    ).join("\n\n");

    await ctx.reply(message.slice(0, 4000));
  });

  bot.command("reviews", async (ctx) => {
    const reviews = await prisma.productReview.findMany({
      where: { isApproved: false, orderId: { not: null } },
      include: {
        order: { select: { orderNumber: true } },
        product: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 10,
    });

    if (!reviews.length) {
      await ctx.reply("No reviews are waiting for approval.");
      return;
    }

    await ctx.reply(`There ${reviews.length === 1 ? "is" : "are"} ${reviews.length} review${reviews.length === 1 ? "" : "s"} awaiting approval:`);
    for (const review of reviews) {
      await sendPendingReview(ctx, review);
    }
  });

  bot.callbackQuery(
    /^review:(approve|reject):([a-zA-Z0-9_-]+)$/,
    async (ctx) => {
      const action = ctx.match[1] as "approve" | "reject";
      const reviewId = ctx.match[2];

      let result: Awaited<ReturnType<typeof processReviewAction>>;
      try {
        result = await processReviewAction(reviewId, action);
      } catch (error) {
        console.error("Review action failed:", error);
        await ctx.answerCallbackQuery({
          text: "Could not process this review. Please try again.",
          show_alert: true,
        });
        return;
      }

      await ctx.answerCallbackQuery({
        text: result.message,
        show_alert: !result.ok,
      });

      if (result.ok && ctx.callbackQuery.message) {
        await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } }).catch((error) => {
          console.error("Could not remove review approval buttons:", error);
        });
        await ctx.reply(result.message).catch((error) => {
          console.error("Could not send review moderation result:", error);
        });
      }
    },
  );

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
        (item) => `â€¢ ${item.productName} Ã— ${item.quantity}`
      ),
    ].join("\n");

    await ctx.reply(message);
  });

  bot.callbackQuery(/^menu:(home|products|inventory|orders|pending|lowstock)$/, async (ctx) => {
    await ctx.answerCallbackQuery();

    const action = ctx.match[1];

    const menu = {
      inline_keyboard: [
        [
          { text: "Products", callback_data: "menu:products" },
          { text: "Inventory", callback_data: "menu:inventory" },
        ],
        [
          { text: "Orders", callback_data: "menu:orders" },
          { text: "Pending Orders", callback_data: "menu:pending" },
        ],
        [
          { text: "Low Stock", callback_data: "menu:lowstock" },
        ],
        [
          { text: "Main Menu", callback_data: "menu:home" },
        ],
      ],
    };

    try {
      await cleanupExpiredReservations();

      let message = "";

      if (action === "home") {
        message = "MILANO FOODS\n\nManagement Panel\n\nSelect an action:";
      }

      if (action === "products") {
        const products = await prisma.product.findMany({
          orderBy: { name: "asc" },
          take: 30,
        });

        message = products.length
          ? "PRODUCTS\n\n" + products.map((p) =>
              `${p.name}\nStock: ${p.stock} | Available: ${p.stock - p.reservedStock}\n${p.isPublished ? "Published" : "Hidden"}`
            ).join("\n\n")
          : "No products found.";
      }

      if (action === "inventory") {
        const products = await prisma.product.findMany({
          where: { isActive: true },
        });

        const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
        const reserved = products.reduce((sum, p) => sum + p.reservedStock, 0);
        const available = totalStock - reserved;

        message = [
          "INVENTORY SUMMARY",
          "",
          `Products: ${products.length}`,
          `Total stock: ${totalStock}`,
          `Reserved stock: ${reserved}`,
          `Available stock: ${available}`,
        ].join("\n");
      }

      if (action === "orders" || action === "pending") {
        const orders = await prisma.order.findMany({
          where: action === "pending"
            ? { status: "PENDING" }
            : { status: { not: "CANCELLED" } },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { items: true },
        });

        message = orders.length
          ? (action === "pending" ? "PENDING ORDERS" : "RECENT ORDERS") +
            "\n\n" +
            orders.map((order) => [
              order.orderNumber,
              `Customer: ${order.customerName}`,
              `Total: ETB ${Number(order.total).toLocaleString("en-ET")}`,
              `Status: ${order.status}`,
              `Items: ${order.items.length}`,
            ].join("\n")).join("\n\n")
          : "No orders found.";
      }

      if (action === "lowstock") {
        const products = await prisma.product.findMany({
          where: { isActive: true },
          orderBy: { name: "asc" },
        });

        const lowStock = products.filter(
          (p) => p.stock - p.reservedStock <= 10
        );

        message = lowStock.length
          ? "LOW STOCK ALERT\n\n" + lowStock.map((p) =>
              `${p.name}\nAvailable: ${p.stock - p.reservedStock}\nSlug: ${p.slug}`
            ).join("\n\n")
          : "No low-stock products. All active products have more than 10 available units.";
      }

      await ctx.editMessageText(message.slice(0, 4000), {
        reply_markup: menu,
      });
    } catch (error) {
      console.error("Telegram menu error:", error);
      await ctx.reply("Unable to load this section. Please try again.");
    }
  });
  bot.on("callback_query:data", async (ctx) => {
    const data = ctx.callbackQuery.data;
    const match = /^(confirm|reject):(MIL-[A-Z0-9-]+)$/.exec(data);

    if (!match) {
      await ctx.answerCallbackQuery({
        text: data.startsWith("review:")
          ? "Invalid review action. Use the latest review message."
          : "Invalid action.",
      });
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
    const bot = getBot();
    await bot.init();
    await bot.handleUpdate(update);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);

    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 }
    );
  }
}
