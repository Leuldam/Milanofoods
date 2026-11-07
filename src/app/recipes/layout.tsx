import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Drink & Dessert Recipes",
  description: "Explore easy Milano drink and dessert recipes, including fruit mojitos and creamy milkshakes, with ingredients and step-by-step directions.",
  alternates: { canonical: "/recipes" },
  openGraph: {
    title: "Milano Foods Recipes",
    description: "Find easy drink and dessert recipes with ingredients and preparation steps.",
    url: "/recipes",
  },
};

export default function RecipesLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
