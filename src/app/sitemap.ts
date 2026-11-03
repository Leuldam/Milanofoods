import type { MetadataRoute } from "next";
import { recipes } from "@/lib/products";
import { prisma } from "@/lib/prisma";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://milanofoods.vercel.app";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = [
    "",
    "/products",
    "/recipes",
    "/about",
    "/contact",
    "/delivery",
    "/pickup",
    "/privacy",
    "/terms",
  ];
  const products = await prisma.product.findMany({
    where: { isActive: true, isPublished: true, category: { isActive: true } },
    select: { slug: true, updatedAt: true },
  });

  return [
    ...pages.map((path) => ({
      url: `${siteUrl}${path}`,
      changeFrequency: path === "" ? "weekly" as const : "monthly" as const,
      priority: path === "" ? 1 : 0.7,
    })),
    ...products.map((product) => ({
      url: `${siteUrl}/products/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...recipes.map((recipe) => ({
      url: `${siteUrl}/recipes/${recipe.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
