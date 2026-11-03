import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { processOrderAction, processReviewAction, updatePendingOrder } from "@/lib/order-actions";
import { releaseExpiredReservations } from "@/lib/stock-reservations";
import { getTelegramMiniAppUser } from "@/lib/telegram-miniapp-auth";
import { sendTelegramNotification } from "@/lib/telegram-notifications";
import { getCategoryImageUrl, getProductGalleryImageUrls, getProductImageUrl, validateImageDataUrl } from "@/lib/product-images";
import { parsePackagingConfigurations, percentToBasisPoints } from "@/lib/product-pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function createCatalogSlug(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getProductConfiguration(body: Record<string, unknown>) {
  const minimumOrderQuantity = Number(body.minimumOrderQuantity ?? 1);
  const promotionEnabled = body.promotionEnabled === true;
  const discountInput = body.promotionDiscountPercent;
  const promotionDiscountPercent =
    typeof discountInput === "string" || typeof discountInput === "number"
      ? String(discountInput).trim()
      : "";

  if (!Number.isSafeInteger(minimumOrderQuantity) || minimumOrderQuantity < 1 || minimumOrderQuantity > 100_000) {
    throw new Error("INVALID_PRODUCT_CONFIGURATION");
  }
  if (promotionDiscountPercent) {
    let discount: number;
    try {
      discount = percentToBasisPoints(promotionDiscountPercent);
    } catch {
      throw new Error("INVALID_PRODUCT_CONFIGURATION");
    }
    if (discount === 0) throw new Error("INVALID_PRODUCT_CONFIGURATION");
  }
  if (promotionEnabled && !promotionDiscountPercent) {
    throw new Error("INVALID_PRODUCT_CONFIGURATION");
  }

  return {
    minimumOrderQuantity,
    promotionEnabled,
    promotionDiscountPercent: promotionDiscountPercent || null,
    packagingOptions: parsePackagingConfigurations(body.packagingOptions),
  };
}

function getGalleryImages(value: unknown) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 5) throw new Error("INVALID_IMAGE");
  return value.map((image) => validateImageDataUrl(image));
}

export async function GET(request: NextRequest) {
  const operator = getTelegramMiniAppUser(request);
  if (!operator) {
    return NextResponse.json({ error: "Unauthorized Telegram session." }, { status: 401 });
  }

  try {
    await prisma.$transaction(
      (tx) => releaseExpiredReservations(tx, new Date()),
      { maxWait: 10_000, timeout: 30_000 },
    );

    const [products, categories, orders, pendingReviews, approvedReviews, paymentMethods] = await Promise.all([
        prisma.product.findMany({
          include: {
            category: true,
            packagingOptions: { orderBy: { unitsPerPackage: "asc" } },
            stockMovements: { orderBy: { createdAt: "desc" }, take: 20 },
            priceChanges: { orderBy: { createdAt: "desc" }, take: 20 },
          },
          orderBy: { name: "asc" },
        }),
        prisma.category.findMany({
          include: { _count: { select: { products: true } } },
          orderBy: { name: "asc" },
        }),
        prisma.order.findMany({
          orderBy: { createdAt: "desc" },
          include: {
            items: true,
            paymentProof: { select: { orderId: true } },
          },
        }),
        prisma.productReview.findMany({
          where: { isApproved: false, orderId: { not: null } },
          include: {
            product: { select: { name: true } },
            order: { select: { orderNumber: true } },
          },
          orderBy: { createdAt: "asc" },
        }),
        prisma.productReview.findMany({
          where: { isApproved: true, orderId: { not: null } },
          include: {
            product: { select: { name: true } },
            order: { select: { orderNumber: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.paymentMethodConfig.findMany({ orderBy: { displayName: "asc" } }),
      ]);

    const activeProducts = products.filter((product) => product.isActive);
    const totalUnits = activeProducts.reduce((sum, product) => sum + product.stock, 0);
    const reservedUnits = activeProducts.reduce((sum, product) => sum + product.reservedStock, 0);
    const orderStatusCounts = orders.reduce<Record<string, number>>((counts, order) => {
      counts[order.status] = (counts[order.status] ?? 0) + 1;
      return counts;
    }, {});

    return NextResponse.json({
      operator: {
        name: [operator.first_name, operator.last_name].filter(Boolean).join(" ") || operator.username || "Operator",
        authMethod: operator.authMethod,
      },
      summary: {
        productCount: activeProducts.length,
        totalUnits,
        reservedUnits,
        availableUnits: totalUnits - reservedUnits,
        lowStockCount: activeProducts.filter((p) => p.stock - p.reservedStock <= 10).length,
        pendingOrders: orders.filter((order) => order.status === "PENDING").length,
        orderStatusCounts,
        pendingReviews: pendingReviews.length,
        approvedReviews: approvedReviews.length,
      },
      products: products.map((product) => ({
        id: product.id,
        sku: product.sku,
        categoryId: product.categoryId,
        categoryIsActive: product.category.isActive,
        slug: product.slug,
        name: product.name,
        description: product.description || "",
        category: product.category.name,
        imageUrl:
          getProductImageUrl(
            product.imageUrl,
            product.id,
            product.updatedAt,
            product.category.imageUrl,
            product.category.id,
            product.category.slug,
            product.category.updatedAt,
          ),
        galleryImageUrls: getProductGalleryImageUrls(
          product.imageUrl,
          product.galleryImageUrls,
          product.id,
          product.updatedAt,
          product.category.imageUrl,
          product.category.id,
          product.category.slug,
          product.category.updatedAt,
        ),
        size: product.size,
        flavor: product.flavor,
        variantType: product.variantType,
        price: Number(product.price),
        minimumOrderQuantity: product.minimumOrderQuantity,
        promotionEnabled: product.promotionEnabled,
        promotionDiscountPercent: product.promotionDiscountPercent?.toString() || null,
        packagingOptions: product.packagingOptions.map((option) => ({
          id: option.id,
          label: option.label,
          unitsPerPackage: option.unitsPerPackage,
          isEnabled: option.isEnabled,
        })),
        priceChanges: product.priceChanges.map((change) => ({
          id: change.id,
          previousPrice: Number(change.previousPrice),
          newPrice: Number(change.newPrice),
          createdAt: change.createdAt.toISOString(),
        })),
        stock: product.stock,
        reservedStock: product.reservedStock,
        availableStock: product.stock - product.reservedStock,
        isPublished: product.isPublished,
        isActive: product.isActive,
        lowStock: product.stock - product.reservedStock <= 10,
        stockMovements: product.stockMovements.map((movement) => ({
          id: movement.id,
          change: movement.change,
          previousStock: movement.previousStock,
          newStock: movement.newStock,
          reason: movement.reason,
          orderNumber: movement.orderNumber,
          createdAt: movement.createdAt.toISOString(),
        })),
      })),
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description || "",
        isActive: category.isActive,
        productCount: category._count.products,
        imageUrl: getCategoryImageUrl(
          category.imageUrl,
          category.id,
          category.slug,
          category.updatedAt,
        ),
      })),
      orders: orders.map((order) => ({
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerEmail: order.customerEmail,
        company: order.company,
        fulfillment: order.fulfillment,
        city: order.city,
        deliveryAddress: order.deliveryAddress,
        pickupLocation: order.pickupLocation,
        paymentPreference: order.paymentPreference,
        hasPaymentProof: Boolean(order.paymentProof),
        notes: order.notes,
        deliveryFee: Number(order.deliveryFee),
        total: Number(order.total),
        status: order.status,
        items: order.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          sku: item.productSku || "",
          promotionApplied: item.promotionApplied,
          promotionDiscountPercent: item.promotionDiscountPercent?.toString() || null,
          name: item.productName,
          size: item.productSize,
          flavor: item.productFlavor,
          variantType: item.productVariantType,
          packagingLabel: item.packagingLabel,
          unitsPerPackage: item.unitsPerPackage,
          packageQuantity: item.packageQuantity,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          listUnitPrice: item.listUnitPrice === null ? Number(item.unitPrice) : Number(item.listUnitPrice),
          lineTotal: Number(item.lineTotal),
        })),
        itemCount: order.items.reduce((count, item) => count + item.quantity, 0),
        createdAt: order.createdAt.toISOString(),
      })),
      pendingReviews: pendingReviews.map((review) => ({
        id: review.id,
        productName: review.product.name,
        displayName: review.displayName,
        rating: review.rating,
        comment: review.comment,
        orderNumber: review.order?.orderNumber || "",
        createdAt: review.createdAt.toISOString(),
      })),
      approvedReviews: approvedReviews.map((review) => ({
        id: review.id,
        productName: review.product.name,
        displayName: review.displayName,
        rating: review.rating,
        comment: review.comment,
        orderNumber: review.order?.orderNumber || "",
        createdAt: review.createdAt.toISOString(),
      })),
      paymentMethods: paymentMethods.map((method) => ({
        code: method.code,
        displayName: method.displayName,
        accountName: method.accountName,
        accountNumber: method.accountNumber,
        isEnabled: method.isEnabled,
      })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Mini App dashboard error:", error);
    return NextResponse.json({ error: "Unable to load management data." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const operator = getTelegramMiniAppUser(request);
  if (!operator) {
    return NextResponse.json({ error: "Unauthorized Telegram session." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const action = typeof body?.action === "string" ? body.action : "restock";

    if (action === "category-create") {
      const name = typeof body?.name === "string" ? body.name.trim() : "";
      const description = typeof body?.description === "string" ? body.description.trim() : "";
      if (!name || name.length > 100 || description.length > 500) {
        return NextResponse.json({ error: "Enter a category name (up to 100 characters) and a description up to 500 characters." }, { status: 400 });
      }

      const slug = createCatalogSlug(name) || "category";
      if (await prisma.category.findFirst({ where: { OR: [{ name }, { slug }] } })) {
        return NextResponse.json({ error: "A category with this name already exists." }, { status: 409 });
      }
      const imageUrl = body?.imageData ? validateImageDataUrl(body.imageData) : null;
      const category = await prisma.category.create({
        data: { name, slug, description: description || null, imageUrl },
      });
      const telegramNotified = await sendTelegramNotification([
        "MINI APP — PRODUCT CATEGORY CREATED",
        `Category: ${category.name}`,
        `By: ${operator.first_name || operator.username || "Admin"}`,
      ].join("\n"));
      return NextResponse.json({
        ok: true,
        message: `${category.name} category created.`,
        telegramNotified,
      });
    }

    if (action === "category-image-update") {
      const categoryId = typeof body?.categoryId === "string" ? body.categoryId : "";
      if (!categoryId) return NextResponse.json({ error: "Select a valid category." }, { status: 400 });
      const imageUrl = validateImageDataUrl(body?.imageData);
      const category = await prisma.category.update({
        where: { id: categoryId },
        data: { imageUrl },
      });
      return NextResponse.json({ ok: true, message: `${category.name} photo updated.` });
    }

    if (action === "category-update") {
      const categoryId = typeof body?.categoryId === "string" ? body.categoryId : "";
      const name = typeof body?.name === "string" ? body.name.trim() : "";
      const description = typeof body?.description === "string" ? body.description.trim() : "";
      if (!categoryId || !name || name.length > 100 || description.length > 500) {
        return NextResponse.json({ error: "Enter a category name (up to 100 characters) and a description up to 500 characters." }, { status: 400 });
      }

      const existing = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!existing) return NextResponse.json({ error: "The selected category no longer exists." }, { status: 404 });
      const slug = createCatalogSlug(name) || "category";
      if (await prisma.category.findFirst({
        where: { id: { not: categoryId }, OR: [{ name }, { slug }] },
        select: { id: true },
      })) {
        return NextResponse.json({ error: "A category with this name already exists." }, { status: 409 });
      }

      const category = await prisma.category.update({
        where: { id: categoryId },
        data: { name, slug, description: description || null },
      });
      return NextResponse.json({ ok: true, message: `${category.name} category updated.` });
    }

    if (action === "category-status-update") {
      const categoryId = typeof body?.categoryId === "string" ? body.categoryId : "";
      const isActive = body?.isActive;
      if (!categoryId || typeof isActive !== "boolean") {
        return NextResponse.json({ error: "Select a category and a valid visibility status." }, { status: 400 });
      }

      const category = await prisma.category.update({
        where: { id: categoryId },
        data: { isActive },
      });
      return NextResponse.json({
        ok: true,
        message: `${category.name} category ${isActive ? "restored" : "hidden"} from the storefront.`,
      });
    }

    if (action === "category-delete") {
      const categoryId = typeof body?.categoryId === "string" ? body.categoryId : "";
      if (!categoryId) return NextResponse.json({ error: "Select a valid category." }, { status: 400 });

      const category = await prisma.category.findUnique({
        where: { id: categoryId },
        include: { _count: { select: { products: true } } },
      });
      if (!category) return NextResponse.json({ error: "The selected category no longer exists." }, { status: 404 });
      if (category._count.products > 0) {
        return NextResponse.json({
          error: `This category still contains ${category._count.products} product(s). Hide it instead, or move its products before deleting.`,
        }, { status: 409 });
      }

      await prisma.category.delete({ where: { id: categoryId } });
      return NextResponse.json({ ok: true, message: `${category.name} category deleted.` });
    }

    if (action === "product-create") {
      const name = typeof body?.name === "string" ? body.name.trim() : "";
      const categoryId = typeof body?.categoryId === "string" ? body.categoryId : "";
      const flavor = typeof body?.flavor === "string" ? body.flavor.trim() : "";
      const variantType = typeof body?.variantType === "string" ? body.variantType.trim() : "";
      const size = typeof body?.size === "string" ? body.size.trim() : "";
      const description = typeof body?.description === "string" ? body.description.trim() : "";
      if (
        !name || name.length > 180 || !categoryId ||
        flavor.length > 80 || variantType.length > 80 ||
        size.length > 60 || description.length > 2000
      ) {
        return NextResponse.json({ error: "Enter a product name and category. Check the maximum lengths for the other fields." }, { status: 400 });
      }
      const category = await prisma.category.findFirst({
        where: { id: categoryId, isActive: true },
      });
      if (!category) return NextResponse.json({ error: "Select an active category." }, { status: 400 });

      const configuration = getProductConfiguration(body);
      const slug = createCatalogSlug([category.slug, name, flavor, variantType, size].filter(Boolean).join(" ")) || "product";
      const sku = typeof body.sku === "string" && body.sku.trim()
        ? body.sku.trim().toUpperCase()
        : slug.toUpperCase();
      if (!/^[A-Z0-9][A-Z0-9._-]{0,119}$/.test(sku)) {
        return NextResponse.json({ error: "Enter a SKU using up to 120 letters, numbers, dots, underscores, or hyphens." }, { status: 400 });
      }
      if (await prisma.product.findUnique({ where: { slug }, select: { id: true } })) {
        return NextResponse.json({ error: "A product with this name, flavor, type, and size already exists." }, { status: 409 });
      }
      const galleryImages = body.galleryData !== undefined
        ? getGalleryImages(body.galleryData)
        : body.imageData
          ? [validateImageDataUrl(body.imageData)]
          : [];
      const imageUrl = galleryImages[0] || category.imageUrl;
      const product = await prisma.$transaction(async (tx) => {
        const created = await tx.product.create({
          data: {
            name,
            sku,
            slug,
            categoryId,
            description: description || null,
            size: size || null,
            flavor: flavor || null,
            variantType: variantType || null,
            imageUrl,
            galleryImageUrls: galleryImages.slice(1),
            minimumOrderQuantity: configuration.minimumOrderQuantity,
            promotionEnabled: configuration.promotionEnabled,
            promotionDiscountPercent: configuration.promotionDiscountPercent,
            price: 0,
            stock: 0,
            isPublished: false,
            isActive: true,
          },
        });
        if (configuration.packagingOptions.length) {
          await tx.productPackagingOption.createMany({
            data: configuration.packagingOptions.map((option) => ({ ...option, productId: created.id })),
          });
        }
        return created;
      });
      const telegramNotified = await sendTelegramNotification([
        "MINI APP — PRODUCT CREATED",
        `Product: ${product.name}${size ? ` · ${size}` : ""}`,
        `Category: ${category.name}`,
        `By: ${operator.first_name || operator.username || "Admin"}`,
      ].join("\n"));
      return NextResponse.json({
        ok: true,
        message: `${product.name} added as hidden. Set its price and stock, then publish when ready.`,
        telegramNotified,
      });
    }

    if (action === "product-update") {
      const productId = typeof body?.productId === "string" ? body.productId : "";
      const name = typeof body?.name === "string" ? body.name.trim() : "";
      const categoryId = typeof body?.categoryId === "string" ? body.categoryId : "";
      const flavor = typeof body?.flavor === "string" ? body.flavor.trim() : "";
      const variantType = typeof body?.variantType === "string" ? body.variantType.trim() : "";
      const size = typeof body?.size === "string" ? body.size.trim() : "";
      const description = typeof body?.description === "string" ? body.description.trim() : "";
      if (
        !productId || !name || name.length > 180 || !categoryId ||
        flavor.length > 80 || variantType.length > 80 ||
        size.length > 60 || description.length > 2000
      ) {
        return NextResponse.json({ error: "Enter a product name and category. Check the maximum lengths for the other fields." }, { status: 400 });
      }

      const [product, category] = await Promise.all([
        prisma.product.findUnique({ where: { id: productId } }),
        prisma.category.findUnique({ where: { id: categoryId } }),
      ]);
      if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });
      if (!category || (!category.isActive && product.categoryId !== categoryId)) {
        return NextResponse.json({ error: "Select an active category before moving this product." }, { status: 400 });
      }

      const configuration = getProductConfiguration(body);
      const slug = createCatalogSlug([category.slug, name, flavor, variantType, size].filter(Boolean).join(" ")) || "product";
      const sku = typeof body.sku === "string" && body.sku.trim()
        ? body.sku.trim().toUpperCase()
        : product.sku;
      if (!/^[A-Z0-9][A-Z0-9._-]{0,119}$/.test(sku)) {
        return NextResponse.json({ error: "Enter a SKU using up to 120 letters, numbers, dots, underscores, or hyphens." }, { status: 400 });
      }
      if (await prisma.product.findFirst({
        where: { id: { not: productId }, slug },
        select: { id: true },
      })) {
        return NextResponse.json({ error: "A product with these name and variant details already exists." }, { status: 409 });
      }

      const updated = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Product" WHERE "id" = ${productId} FOR UPDATE`);
        const result = await tx.product.update({
          where: { id: productId },
          data: {
            name,
            sku,
            slug,
            categoryId,
            flavor: flavor || null,
            variantType: variantType || null,
            size: size || null,
            description: description || null,
            minimumOrderQuantity: configuration.minimumOrderQuantity,
            promotionEnabled: configuration.promotionEnabled,
            promotionDiscountPercent: configuration.promotionDiscountPercent,
          },
        });
        await tx.productPackagingOption.deleteMany({ where: { productId } });
        if (configuration.packagingOptions.length) {
          await tx.productPackagingOption.createMany({
            data: configuration.packagingOptions.map((option) => ({ ...option, productId })),
          });
        }
        return result;
      });
      return NextResponse.json({ ok: true, message: `${updated.name} product details updated.` });
    }

    if (action === "product-gallery-update") {
      const productId = typeof body?.productId === "string" ? body.productId : "";
      if (!productId) return NextResponse.json({ error: "Select a valid product." }, { status: 400 });
      const galleryImages = getGalleryImages(body.galleryData);
      const existing = await prisma.product.findUnique({ where: { id: productId }, select: { id: true, category: { select: { imageUrl: true } } } });
      if (!existing) return NextResponse.json({ error: "Product not found." }, { status: 404 });
      const updated = await prisma.product.update({
        where: { id: productId },
        data: {
          imageUrl: galleryImages[0] || existing.category.imageUrl,
          galleryImageUrls: galleryImages.slice(1),
        },
      });
      return NextResponse.json({ ok: true, message: `${updated.name} image gallery updated.` });
    }

    if (action === "product-image-update") {
      const productId = typeof body?.productId === "string" ? body.productId : "";
      if (!productId) return NextResponse.json({ error: "Select a valid product." }, { status: 400 });
      const imageUrl = validateImageDataUrl(body?.imageData);
      const product = await prisma.product.update({
        where: { id: productId },
        data: { imageUrl },
      });
      return NextResponse.json({ ok: true, message: `${product.name} photo updated.` });
    }

    if (action === "payment-method-update") {
      const code = typeof body?.code === "string" ? body.code.trim() : "";
      const accountName = typeof body?.accountName === "string" ? body.accountName.trim() : "";
      const accountNumber = typeof body?.accountNumber === "string" ? body.accountNumber.trim() : "";
      const isEnabled = body?.isEnabled === true;

      if (
        !["cbe", "telebirr", "awash", "boa"].includes(code) ||
        accountName.length > 120 ||
        accountNumber.length > 80 ||
        (isEnabled && (!accountName || !accountNumber))
      ) {
        return NextResponse.json(
          { error: "Provide an account name and account number before enabling this method." },
          { status: 400 },
        );
      }

      const updated = await prisma.paymentMethodConfig.update({
        where: { code },
        data: { accountName, accountNumber, isEnabled },
        select: { displayName: true, isEnabled: true },
      });
      const telegramNotified = await sendTelegramNotification([
        "MINI APP — PAYMENT ACCOUNT UPDATED",
        `Method: ${updated.displayName}`,
        `Status: ${updated.isEnabled ? "Enabled" : "Disabled"}`,
        `By: ${operator.first_name || operator.username || "Admin"}`,
      ].join("\n"));
      return NextResponse.json({
        ok: true,
        message: `${updated.displayName} payment settings saved.`,
        telegramNotified,
      });
    }

    if (action === "product-publish-update") {
      const productId = typeof body?.productId === "string" ? body.productId : "";
      const isPublished = body?.isPublished;
      if (!productId || typeof isPublished !== "boolean") {
        return NextResponse.json({ error: "Select a valid product and storefront status." }, { status: 400 });
      }

      const updated = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Product" WHERE "id" = ${productId} FOR UPDATE`);
        const product = await tx.product.findUnique({
          where: { id: productId },
          include: { category: { select: { isActive: true } } },
        });
        if (!product || !product.isActive) throw new Error("PRODUCT_NOT_FOUND");
        if (isPublished && Number(product.price) <= 0) throw new Error("PRODUCT_PRICE_REQUIRED");
        if (isPublished && product.stock <= product.reservedStock) throw new Error("PRODUCT_STOCK_REQUIRED");
        if (isPublished && !product.category.isActive) throw new Error("CATEGORY_INACTIVE");

        return tx.product.update({
          where: { id: productId },
          data: { isPublished },
        });
      }, { maxWait: 10_000, timeout: 30_000 });

      const telegramNotified = await sendTelegramNotification([
        `MINI APP — PRODUCT ${updated.isPublished ? "PUBLISHED" : "HIDDEN"}`,
        `Product: ${updated.name}`,
        `By: ${operator.first_name || operator.username || "Admin"}`,
      ].join("\n"));
      return NextResponse.json({
        ok: true,
        message: `${updated.name} ${updated.isPublished ? "published on" : "hidden from"} the storefront.`,
        telegramNotified,
      });
    }

    if (action === "product-status-update") {
      const productId = typeof body?.productId === "string" ? body.productId : "";
      const isActive = body?.isActive;
      if (!productId || typeof isActive !== "boolean") {
        return NextResponse.json({ error: "Select a product and a valid archive status." }, { status: 400 });
      }

      const product = await prisma.product.update({
        where: { id: productId },
        data: { isActive, ...(!isActive ? { isPublished: false } : {}) },
        select: { name: true, isActive: true },
      });
      return NextResponse.json({
        ok: true,
        message: `${product.name} ${product.isActive ? "restored to inventory" : "archived and hidden from the storefront"}.`,
      });
    }

    if (action === "order-confirm" || action === "order-reject") {
      const orderNumber = typeof body?.orderNumber === "string" ? body.orderNumber.trim() : "";
      if (!orderNumber) {
        return NextResponse.json({ error: "Select a valid order." }, { status: 400 });
      }

      const result = await processOrderAction(
        orderNumber,
        action === "order-confirm" ? "confirm" : "reject",
        operator.authMethod === "telegram" ? String(operator.id) : "admin",
      );
      if (!result.ok) return NextResponse.json(result, { status: 409 });

      const actionLabel = action === "order-confirm" ? "CONFIRMED" : "REJECTED";
      const telegramNotified = await sendTelegramNotification([
        `MINI APP — ORDER ${actionLabel}`,
        `Order: ${orderNumber}`,
        `By: ${operator.first_name || operator.username || "Admin"}`,
        result.message,
      ].join("\n"));
      return NextResponse.json({ ...result, telegramNotified });
    }

    if (action === "order-update") {
      const orderNumber = typeof body?.orderNumber === "string" ? body.orderNumber.trim() : "";
      if (!orderNumber) {
        return NextResponse.json({ error: "Select a valid order." }, { status: 400 });
      }

      const updated = await updatePendingOrder(orderNumber, body);
      const telegramNotified = await sendTelegramNotification([
        "MINI APP — PENDING ORDER EDITED",
        `Order: ${orderNumber}`,
        `Total: ETB ${updated.previousTotal.toLocaleString("en-ET")} → ETB ${updated.total.toLocaleString("en-ET")}`,
        `Items: ${updated.products.join(", ")}`,
        `By: ${operator.first_name || operator.username || "Admin"}`,
      ].join("\n"));
      return NextResponse.json({
        ok: true,
        message: `Order ${orderNumber} updated. Total: ETB ${updated.total.toLocaleString("en-ET")}.`,
        telegramNotified,
      });
    }

    if (action === "review-approve" || action === "review-reject") {
      const reviewId = typeof body?.reviewId === "string" ? body.reviewId.trim() : "";
      if (!reviewId) {
        return NextResponse.json({ error: "Select a valid review." }, { status: 400 });
      }

      const result = await processReviewAction(
        reviewId,
        action === "review-approve" ? "approve" : "reject",
      );
      if (!result.ok) return NextResponse.json(result, { status: 409 });

      const actionLabel = action === "review-approve" ? "APPROVED & PUBLISHED" : "REJECTED";
      const telegramNotified = await sendTelegramNotification([
        `MINI APP — REVIEW ${actionLabel}`,
        `Review ID: ${reviewId}`,
        `By: ${operator.first_name || operator.username || "Admin"}`,
        result.message,
      ].join("\n"));
      return NextResponse.json({ ...result, telegramNotified });
    }

    const productId = typeof body?.productId === "string" ? body.productId : "";
    if (action === "update-price") {
      const priceValue = typeof body?.price === "string" || typeof body?.price === "number"
        ? Number(body.price)
        : Number.NaN;
      const priceInCents = Math.round(priceValue * 100);
      if (!productId || !Number.isFinite(priceValue) || priceValue <= 0 || priceValue > 1_000_000_000 || Math.abs(priceInCents / 100 - priceValue) > 0.000001) {
        return NextResponse.json({ error: "Enter a valid product price with up to two decimal places." }, { status: 400 });
      }

      const updated = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Product" WHERE "id" = ${productId} FOR UPDATE`);
        const product = await tx.product.findUnique({ where: { id: productId } });
        if (!product || !product.isActive) throw new Error("PRODUCT_NOT_FOUND");
        if (Number(product.price) === priceInCents / 100) throw new Error("PRICE_UNCHANGED");

        const updatedProduct = await tx.product.update({
          where: { id: productId },
          data: { price: (priceInCents / 100).toFixed(2) },
        });
        await tx.productPriceChange.create({
          data: {
            productId,
            previousPrice: product.price,
            newPrice: updatedProduct.price,
            createdBy: operator.authMethod === "telegram" ? String(operator.id) : "admin",
          },
        });

        return {
          name: updatedProduct.name,
          previousPrice: Number(product.price),
          price: Number(updatedProduct.price),
        };
      }, { maxWait: 10_000, timeout: 30_000 });

      const telegramNotified = await sendTelegramNotification([
        "MINI APP — PRODUCT PRICE UPDATED",
        `Product: ${updated.name}`,
        `Price: ETB ${updated.previousPrice.toLocaleString("en-ET")} → ETB ${updated.price.toLocaleString("en-ET")}`,
        `By: ${operator.first_name || operator.username || "Admin"}`,
      ].join("\n"));
      return NextResponse.json({
        ok: true,
        message: `${updated.name} price updated to ETB ${updated.price.toLocaleString("en-ET")}.`,
        price: updated.price,
        telegramNotified,
      });
    }

    const quantity = Number(body?.quantity);

    if (
      !productId ||
      (action === "restock" && (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100000)) ||
      (action !== "restock" && action !== "set-out-of-stock")
    ) {
      return NextResponse.json({ error: "Select a product and enter a valid restock quantity." }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Product" WHERE "id" = ${productId} FOR UPDATE`);

      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product || !product.isActive) throw new Error("PRODUCT_NOT_FOUND");

      if (action === "set-out-of-stock") {
        if (product.reservedStock > 0) throw new Error("STOCK_RESERVED");
        if (product.stock === 0) throw new Error("ALREADY_OUT_OF_STOCK");
      } else if (action !== "restock") {
        throw new Error("INVALID_ACTION");
      }

      const stock = action === "set-out-of-stock" ? 0 : product.stock + quantity;
      const result = await tx.product.updateMany({
        where: {
          id: productId,
          ...(action === "set-out-of-stock" ? { reservedStock: 0 } : {}),
        },
        data: { stock },
      });
      if (result.count !== 1) throw new Error("STOCK_RESERVED");

      await tx.productStockMovement.create({
        data: {
          productId,
          change: stock - product.stock,
          previousStock: product.stock,
          newStock: stock,
          reason: action === "set-out-of-stock" ? "SET_OUT_OF_STOCK" : "RESTOCK",
          createdBy: operator.authMethod === "telegram" ? String(operator.id) : "admin",
        },
      });

      return {
        product: await tx.product.findUniqueOrThrow({ where: { id: productId } }),
        previousStock: product.stock,
      };
    }, { maxWait: 10_000, timeout: 30_000 });

    const telegramNotified = await sendTelegramNotification([
      action === "restock" ? "MINI APP — PRODUCT RESTOCKED" : "MINI APP — PRODUCT MARKED OUT OF STOCK",
      `Product: ${updated.product.name}`,
      `Stock: ${updated.previousStock} → ${updated.product.stock}`,
      action === "restock" ? `Units added: ${quantity}` : "",
      `By: ${operator.first_name || operator.username || "Admin"}`,
    ].filter(Boolean).join("\n"));

    return NextResponse.json({
      ok: true,
      product: updated.product.name,
      added: action === "restock" ? quantity : 0,
      change: updated.product.stock - updated.previousStock,
      stock: updated.product.stock,
      reservedStock: updated.product.reservedStock,
      availableStock: updated.product.stock - updated.product.reservedStock,
      updatedBy: operator.id,
      telegramNotified,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_IMAGE") {
      return NextResponse.json({ error: "Upload a valid PNG or JPG image no larger than 2 MB." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "INVALID_PACKAGING_OPTIONS") {
      return NextResponse.json({ error: "Enter carton options as one per line using Label=units (for example, Carton of 6=6). Units must be 2–1000 and each size and label must be unique." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "INVALID_PRODUCT_CONFIGURATION") {
      return NextResponse.json({ error: "Set a whole-number minimum order quantity and a valid optional promotion between 0.01% and 99.99%." }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "A category or product with those details already exists." }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "The selected category or product no longer exists." }, { status: 404 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return NextResponse.json({ error: "This category is still in use. Hide it instead, or move its products before deleting." }, { status: 409 });
    }
    if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") {
      return NextResponse.json({ error: "Product not found or inactive." }, { status: 404 });
    }
    if (error instanceof Error && error.message === "PRODUCT_PRICE_REQUIRED") {
      return NextResponse.json({ error: "Set a price greater than zero before publishing this product." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "PRODUCT_STOCK_REQUIRED") {
      return NextResponse.json({ error: "Add available stock before publishing this product." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "CATEGORY_INACTIVE") {
      return NextResponse.json({ error: "Restore this product's category before publishing the product." }, { status: 409 });
    }
    if (error instanceof Error && error.message === "ORDER_NOT_FOUND") {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    if (error instanceof Error && error.message === "ORDER_NOT_EDITABLE") {
      return NextResponse.json({ error: "Only pending orders can be edited." }, { status: 409 });
    }
    if (error instanceof Error && error.message === "ORDER_RESERVATION_EXPIRED") {
      return NextResponse.json({ error: "This order's stock reservation has expired. Refresh orders before editing." }, { status: 409 });
    }
    if (error instanceof Error && error.message === "INVALID_ORDER_EDIT") {
      return NextResponse.json({ error: "Check the customer details, fulfillment, prices, and order items." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "DUPLICATE_ORDER_PRODUCT") {
      return NextResponse.json({ error: "Each product can appear only once. Combine its quantity into one line." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "ORDER_PRODUCT_NOT_FOUND") {
      return NextResponse.json({ error: "One of the selected products is unavailable." }, { status: 404 });
    }
    if (error instanceof Error && error.message.startsWith("ORDER_PRODUCT_UNAVAILABLE:")) {
      return NextResponse.json({ error: `${error.message.split(":")[1]} is no longer available for additional units.` }, { status: 409 });
    }
    if (error instanceof Error && error.message.startsWith("ORDER_INSUFFICIENT_STOCK:")) {
      const [, productName, available] = error.message.split(":");
      return NextResponse.json({ error: `Not enough stock for ${productName}. Only ${available} additional unit(s) are available.` }, { status: 409 });
    }
    if (error instanceof Error && error.message.startsWith("ORDER_RESERVATION_MISMATCH:")) {
      console.error("Order edit found inconsistent reserved stock:", error.message);
      return NextResponse.json({ error: "Reserved stock could not be reconciled. No order changes were saved." }, { status: 409 });
    }
    if (error instanceof Error && error.message === "ORDER_TOTAL_TOO_LARGE") {
      return NextResponse.json({ error: "The order total is too large." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "STOCK_RESERVED") {
      return NextResponse.json({ error: "Cannot mark out of stock while units are reserved for pending orders." }, { status: 409 });
    }
    if (error instanceof Error && error.message === "ALREADY_OUT_OF_STOCK") {
      return NextResponse.json({ error: "This product is already out of stock." }, { status: 409 });
    }
    if (error instanceof Error && error.message === "INVALID_ACTION") {
      return NextResponse.json({ error: "Unsupported inventory action." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "PRICE_UNCHANGED") {
      return NextResponse.json({ error: "The new price is the same as the current price." }, { status: 409 });
    }
    console.error("Mini App management action error:", error);
    return NextResponse.json({ error: "Management action failed. Please try again." }, { status: 500 });
  }
}
