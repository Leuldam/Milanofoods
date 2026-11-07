import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop Milano Foods Products in Ethiopia",
  description: "Browse the current Milano Foods range of mojito syrups, ice cream powders, and milkshake products. Check available flavors, packaging, prices, and stock.",
  alternates: { canonical: "/products" },
  openGraph: {
    title: "Shop Milano Foods Products in Ethiopia",
    description: "Browse Milano Foods drink and dessert products and check current availability.",
    url: "/products",
  },
};

export default function ProductsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
