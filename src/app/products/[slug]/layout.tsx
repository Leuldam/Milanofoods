import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getProductImageUrl } from "@/lib/product-images";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getPublicProduct(slug: string) {
  return prisma.product.findFirst({
    where: {
      slug,
      isActive: true,
      isPublished: true,
      category: { isActive: true },
    },
    include: { category: true },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublicProduct(slug);
  if (!product) notFound();

  const description =
    product.description ||
    `${product.name} from the Milano Foods ${product.category.name} range. Check current availability and ordering details.`;
  const image =
    getProductImageUrl(
      product.imageUrl,
      product.id,
      product.updatedAt,
      product.category.imageUrl,
      product.category.id,
      product.category.slug,
      product.category.updatedAt,
    ) || "/images/milanoshowcase.png";

  return {
    title: `${product.name} | ${product.category.name}`,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      type: "website",
      title: `${product.name} | Milano Foods Ethiopia`,
      description,
      url: `/products/${product.slug}`,
      images: [{ url: image, alt: product.name }],
    },
  };
}

export default async function ProductLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}>) {
  const { slug } = await params;
  const product = await getPublicProduct(slug);
  if (!product) notFound();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://milanofoods.vercel.app";
  const image =
    getProductImageUrl(
      product.imageUrl,
      product.id,
      product.updatedAt,
      product.category.imageUrl,
      product.category.id,
      product.category.slug,
      product.category.updatedAt,
    ) || "/images/milanoshowcase.png";
  const stockAvailable =
    product.price.toNumber() > 0 &&
    product.stock - product.reservedStock >= product.minimumOrderQuantity;
  const discount = product.promotionDiscountPercent?.toNumber() ?? 0;
  const price =
    product.promotionEnabled && discount > 0 && discount < 100
      ? product.price.toNumber() * (1 - discount / 100)
      : product.price.toNumber();
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description:
      product.description ||
      `${product.name} from the Milano Foods ${product.category.name} range.`,
    sku: product.sku,
    category: product.category.name,
    image: [new URL(image, siteUrl).toString()],
    brand: { "@type": "Brand", name: "Milano Foods" },
    offers: {
      "@type": "Offer",
      url: new URL(`/products/${product.slug}`, siteUrl).toString(),
      priceCurrency: "ETB",
      price: price.toFixed(2),
      availability: `https://schema.org/${stockAvailable ? "InStock" : "OutOfStock"}`,
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: "Milano Foods",
        url: siteUrl,
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productSchema).replace(/</g, "\\u003c"),
        }}
      />
      {children}
    </>
  );
}
