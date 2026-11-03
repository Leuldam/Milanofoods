import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decodeImageDataUrl, type ProductImageOwner } from "@/lib/product-images";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; id: string }> },
) {
  const { owner, id } = await params;
  if (owner !== "products" && owner !== "categories") {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }

  try {
    const galleryIndex = request.nextUrl.searchParams.get("gallery");
    const imageUrl = await getImageUrl(
      owner as ProductImageOwner,
      id,
      galleryIndex === null ? null : Number(galleryIndex),
    );
    if (!imageUrl?.startsWith("data:image/")) {
      return NextResponse.json({ error: "Image not found." }, { status: 404 });
    }

    const { mimeType, buffer } = decodeImageDataUrl(imageUrl);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(buffer.length),
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Product image retrieval error:", error);
    return NextResponse.json({ error: "Unable to load image." }, { status: 500 });
  }
}

async function getImageUrl(owner: ProductImageOwner, id: string, galleryIndex: number | null) {
  if (owner === "products") {
    const product = await prisma.product.findUnique({
      where: { id },
      select: { imageUrl: true, galleryImageUrls: true },
    });
    if (!product) return null;
    if (galleryIndex === null) return product.imageUrl;
    if (!Number.isSafeInteger(galleryIndex) || galleryIndex < 0) return null;
    return product.galleryImageUrls[galleryIndex] || null;
  }

  if (galleryIndex !== null) return null;
  const category = await prisma.category.findUnique({
    where: { id },
    select: { imageUrl: true },
  });
  return category?.imageUrl;
}
