"use client";

import { useCallback, useRef, useState } from "react";
import { products } from "@/lib/products";
import { ProductCard } from "./product-card";

const featuredProducts = products.slice(0, 4);

export function FeaturedProductsCarousel() {
  const listRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

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
      <div
        ref={listRef}
        className="product-grid popular-product-grid"
        onScroll={updateActiveIndex}
        role="region"
        aria-roledescription="carousel"
        aria-label="Popular products"
      >
        {featuredProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      <div className="popular-product-dots" role="group" aria-label="Choose a popular product">
        {featuredProducts.map((product, index) => (
          <button
            key={product.id}
            type="button"
            className="popular-product-dot"
            aria-label={`Show ${product.name}`}
            aria-current={index === activeIndex ? "true" : undefined}
            onClick={() => showProduct(index)}
          />
        ))}
      </div>
    </>
  );
}
