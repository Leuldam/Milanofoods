import type { Metadata } from "next";
import { ProductFamilyGuide } from "@/components/product-family-guide";

export const metadata: Metadata = {
  title: "Milano Product Guide: Compare Our Product Families",
  description: "Compare Milano Mojito Syrup, Ice Cream Powder, and Milkshake Powder. Explore current flavors, formats, and pack sizes to find the right product for your needs.",
  alternates: { canonical: "/product-guide" },
  openGraph: {
    title: "Milano Foods Product Guide",
    description: "Compare Milano product families, current options, formats, and pack sizes.",
    url: "/product-guide",
  },
};

export default function ProductGuidePage() {
  return (
    <main className="product-guide-page">
      <ProductFamilyGuide />
    </main>
  );
}
