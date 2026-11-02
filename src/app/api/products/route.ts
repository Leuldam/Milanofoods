import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { releaseExpiredReservations } from "@/lib/stock-reservations";

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
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });

    const products = databaseProducts.map((product) => {
      const availableStock = Math.max(
        0,
        product.stock - product.reservedStock
      );

      return {
        id: product.slug,
        databaseId: product.id,
        slug: product.slug,
        name: product.name,
        category: product.category.name,
        categorySlug: product.category.slug,
        price: Number(product.price),
        image: product.imageUrl || "/images/bottle.png",
        imageUrl: product.imageUrl || "/images/bottle.png",
        description: product.description || "",
        badge: product.badge || undefined,
        size: product.size || "",
        stock: product.stock,
        reservedStock: product.reservedStock,
        availableStock,
        inStock: availableStock > 0,
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