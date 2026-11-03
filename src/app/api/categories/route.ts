import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCategoryImageUrl } from "@/lib/product-images";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(
      categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description || "",
        imageUrl: getCategoryImageUrl(
          category.imageUrl,
          category.id,
          category.slug,
          category.updatedAt,
        ),
      })),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Categories API error:", error);
    return NextResponse.json({ error: "Unable to load categories." }, { status: 500 });
  }
}
