import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://milanofoods.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/miniapp/", "/cart", "/checkout", "/order-confirmation"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
