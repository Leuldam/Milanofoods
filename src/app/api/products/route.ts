import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { releaseExpiredReservations } from "@/lib/stock-reservations";
import { getProductGalleryImageUrls, getProductImageUrl } from "@/lib/product-images";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$transaction(
      (tx) => releaseExpiredReservations(tx, new Date()),
      { maxWait: 10_000, timeout: 30_000 },
    );

    const databaseProducts = await prisma.product.findMany({
      where: {
        isActive: true,
        isPublished: true,
        category: { isActive: true },
      },
      include: { category: true, packagingOptions: { where: { isEnabled: true }, orderBy: { unitsPerPackage: "asc" } } },
      orderBy: { createdAt: "desc" },
    });

    const products = databaseProducts.map((product) => {
      const availableStock = Math.max(
        0,
        product.stock - product.reservedStock
      );
      const price = Number(product.price);
      const minimumOrderQuantity = product.minimumOrderQuantity;
      const promotionDiscountPercent = product.promotionDiscountPercent?.toString() || null;
      const galleryImageUrls = getProductGalleryImageUrls(
        product.imageUrl,
        product.galleryImageUrls,
        product.id,
        product.updatedAt,
        product.category.imageUrl,
        product.category.id,
        product.category.slug,
        product.category.updatedAt,
      );

      return {
        id: product.slug,
        databaseId: product.id,
        sku: product.sku,
        slug: product.slug,
        name: product.name,
        category: product.category.name,
        categorySlug: product.category.slug,
        price,
        minimumOrderQuantity,
        promotionEnabled: product.promotionEnabled,
        promotionDiscountPercent,
        packagingOptions: product.packagingOptions.map((option) => ({
          id: option.id,
          label: option.label,
          unitsPerPackage: option.unitsPerPackage,
        })),
        galleryImageUrls,
        image:
          getProductImageUrl(
            product.imageUrl,
            product.id,
            product.updatedAt,
            product.category.imageUrl,
            product.category.id,
            product.category.slug,
            product.category.updatedAt,
          ) ||
          "/images/milano-mint-bottle-cutout.png",
        imageUrl:
          getProductImageUrl(
            product.imageUrl,
            product.id,
            product.updatedAt,
            product.category.imageUrl,
            product.category.id,
            product.category.slug,
            product.category.updatedAt,
          ) ||
          "/images/milano-mint-bottle-cutout.png",
        description: product.description || "",
        badge: product.badge || undefined,
        size: product.size || "",
        flavor: product.flavor,
        variantType: product.variantType,
        stock: product.stock,
        reservedStock: product.reservedStock,
        availableStock,
        isPublished: product.isPublished,
        inStock: product.isPublished && price > 0 && availableStock >= minimumOrderQuantity,
      };
    });

    return NextResponse.json(products, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Products API error:", error);

    return NextResponse.json(
      { error: "Unable to load products." },
      { status: 500 }
    );
  }
}