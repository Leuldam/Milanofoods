import type { Metadata } from "next";
import { ProductFamilyGuide } from "@/components/product-family-guide";

export const metadata: Metadata = {
  title: "Product Guide: Flavors, Preparation & Uses",
  description: "Explore Milano Mojito Syrup, Ice Cream Powder, and Milkshake Powder. See current flavors and formats, preparation guidance, and serving ideas.",
  alternates: { canonical: "/product-guide" },
  openGraph: {
    title: "Milano Foods Product Guide",
    description: "A practical guide to Milano product flavors, formats, preparation, and serving ideas.",
    url: "/product-guide",
  },
};

export default function ProductGuidePage() {
  return (
    <main>
      <ProductFamilyGuide />
    </main>
  );
}
