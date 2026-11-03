"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Product } from "@/lib/products";
import { groupProductVariants } from "@/lib/product-variants";
import { ProductCard } from "./product-card";

type StoreProduct = Product & {
  availableStock: number;
  inStock: boolean;
};

export function FeaturedProductsCarousel() {
  const listRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      try {
        const response = await fetch("/api/products", { cache: "no-store" });
        if (!response.ok) throw new Error("Unable to load featured products.");
        const data = await response.json() as StoreProduct[];
        if (active) setProducts(data);
      } catch (loadError) {
        console.error("Featured products could not be loaded:", loadError);
        if (active) setError("Featured products are temporarily unavailable.");
      }
    }

    void loadProducts();
    return () => { active = false; };
  }, []);

  const featuredProducts = useMemo(() => {
    const publishedProducts = products.filter((product) => product.isPublished !== false);
    const families = ["Mojito Syrups", "Ice Cream Powders", "Milkshake Powders"];
    const groups = groupProductVariants(publishedProducts);
    const featured = families.flatMap((family) => {
      const group = groups.find((item) =>
        item.product.category === family &&
        item.variants.some((product) => product.inStock),
      );
      return group ? [group] : [];
    });
    const selectedKeys = new Set(featured.map((group) => group.key));
    return [...featured, ...groups.filter((group) => !selectedKeys.has(group.key))].slice(0, 4);
  }, [products]);

  const updateActiveIndex = useCallback(() => {
    const list = listRef.current;
    if (!list) return;

    const cards = Array.from(list.children);
    const listLeft = list.getBoundingClientRect().left;
    const nearestIndex = cards.reduce(
      (nearest, card, index) =>
        Math.abs(card.getBoundingClientRect().left - listLeft) <
        Math.abs(
          cards[nearest].getBoundingClientRect().left - listLeft,
        )
          ? index
          : nearest,
      0,
    );

    setActiveIndex(nearestIndex);
  }, []);

  function showProduct(index: number) {
    const list = listRef.current;
    const card = list?.children[index] as HTMLElement | undefined;
    if (!list || !card) return;

    const targetLeft =
      list.scrollLeft +
      card.getBoundingClientRect().left -
      list.getBoundingClientRect().left;
    list.scrollTo({ left: targetLeft });
    setActiveIndex(index);
  }

  return (
    <>
      {featuredProducts.length > 0 ? <><div
        ref={listRef}
        className="product-grid popular-product-grid"
        onScroll={updateActiveIndex}
        role="region"
        aria-roledescription="carousel"
        aria-label="Popular products"
      >
        {featuredProducts.map((group) => (
          <ProductCard key={group.key} product={group.product} variants={group.variants} />
        ))}
      </div>
      <div className="popular-product-dots" role="group" aria-label="Choose a popular product">
        {featuredProducts.map((group, index) => (
          <button
            key={group.key}
            type="button"
            className="popular-product-dot"
            aria-label={`Show ${group.product.name}`}
            aria-current={index === activeIndex ? "true" : undefined}
            onClick={() => showProduct(index)}
          />
        ))}
      </div>
      </> : <p className="popular-products-empty">{error || "No in-stock products to feature right now."}</p>}
    </>
  );
}
