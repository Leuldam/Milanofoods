import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { releaseExpiredReservations } from "@/lib/stock-reservations";
import { getProductGalleryImageUrls, getProductImageUrl } from "@/lib/product-images";
import { getMojitoSyrupImage } from "@/lib/products";

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
      const minimumOrderQuantity = product.minimumOrderQuantity;
      const mojitoImage = product.category.slug === "mojito-syrups"
        ? getMojitoSyrupImage(product.flavor, product.name, product.slug)
        : undefined;
      const storedImage = getProductImageUrl(
        product.imageUrl,
        product.id,
        product.updatedAt,
        product.category.imageUrl,
        product.category.id,
        product.category.slug,
        product.category.updatedAt,
      );
      const databaseGalleryImageUrls = getProductGalleryImageUrls(
        product.imageUrl,
        product.galleryImageUrls,
        product.id,
        product.updatedAt,
        product.category.imageUrl,
        product.category.id,
        product.category.slug,
        product.category.updatedAt,
      );
      const image = mojitoImage || storedImage || "/images/milano-mint-bottle-cutout.png";
      const galleryImageUrls = mojitoImage
        ? [mojitoImage, ...databaseGalleryImageUrls.filter((galleryImage) => galleryImage !== storedImage)]
        : databaseGalleryImageUrls;

      return {
        id: product.slug,
        databaseId: product.id,
        sku: product.sku,
        slug: product.slug,
        name: product.name,
        category: product.category.name,
        categorySlug: product.category.slug,
        minimumOrderQuantity,
        packagingOptions: product.packagingOptions.map((option) => ({
          id: option.id,
          label: option.label,
          unitsPerPackage: option.unitsPerPackage,
        })),
        galleryImageUrls,
        image,
        imageUrl: image,
        description: product.description || "",
        badge: product.badge || undefined,
        size: product.size || "",
        flavor: product.flavor,
        variantType: product.variantType,
        stock: product.stock,
        reservedStock: product.reservedStock,
        availableStock,
        isPublished: product.isPublished,
        inStock: product.isPublished && availableStock >= minimumOrderQuantity,
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