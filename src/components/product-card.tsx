"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus, Check } from "lucide-react";
import { Product, money } from "@/lib/products";
import { comparePackageSizes } from "@/lib/product-variants";
import { calculateUnitPriceCents, decimalToCents } from "@/lib/product-pricing";
import { useStore } from "./store-provider";

type StoreProduct = Product & {
  inStock?: boolean;
  availableStock?: number;
};

export function ProductCard({
  product,
  variants,
}: {
  product: StoreProduct;
  variants?: StoreProduct[];
}) {
  const { add } = useStore();
  const [isAdded, setIsAdded] = useState(false);
  const productVariants = useMemo(
    () => variants?.length ? variants : [product],
    [product, variants],
  );
  const [selectedType, setSelectedType] = useState(product.variantType || "");
  const [selectedSize, setSelectedSize] = useState(product.size);
  const types = useMemo(
    () => Array.from(new Set(productVariants.map((item) => item.variantType).filter((value): value is string => Boolean(value)))),
    [productVariants],
  );
  const selectedProduct =
    productVariants.find((item) => item.variantType === selectedType && item.size === selectedSize) ||
    productVariants[0];
  const sizes = productVariants
    .filter((item) => !selectedType || item.variantType === selectedType)
    .map((item) => item.size)
    .filter((value, index, list) => list.indexOf(value) === index)
    .sort(comparePackageSizes);

  useEffect(() => {
    if (!productVariants.some((item) => item.variantType === selectedType && item.size === selectedSize)) {
      setSelectedType(productVariants[0]?.variantType || "");
      setSelectedSize(productVariants[0]?.size || "");
    }
  }, [productVariants, selectedSize, selectedType]);

  const comingSoon = selectedProduct.isPublished === false || selectedProduct.price <= 0;
  const minimumOrderQuantity = selectedProduct.minimumOrderQuantity || 1;
  const unavailable =
    comingSoon || selectedProduct.inStock === false || (selectedProduct.availableStock ?? 0) < minimumOrderQuantity;
  const displayPrice = calculateUnitPriceCents(
    decimalToCents(selectedProduct.price),
    selectedProduct.promotionEnabled === true,
    selectedProduct.promotionDiscountPercent ?? null,
  ) / 100;
  const isDessertFamily =
    selectedProduct.category === "Ice Cream Powders" ||
    selectedProduct.category === "Milkshake Powders";
  const displayName = productVariants.length > 1 && product.flavor
    ? `${product.flavor} ${product.category === "Ice Cream Powders" ? "Ice Cream Powder" : "Milkshake"}`
    : selectedProduct.name;

  return (
    <article className="product-card">
      <Link
        href={`/products/${selectedProduct.slug}`}
        className={`product-photo${
          selectedProduct.category === "Mojito Syrups"
            ? " product-photo-bottle"
            : isDessertFamily ? " product-photo-package" : ""
        }`}
      >
        <Image
          src={selectedProduct.image}
          alt={displayName}
          fill
          unoptimized={selectedProduct.image.startsWith("http")}
          sizes="(max-width:480px) 44vw, (max-width:720px) 44vw, (max-width:1000px) 30vw, 22vw"
          style={{ objectFit: isDessertFamily ? "contain" : undefined }}
        />

        {selectedProduct.badge && (
          <span className="product-tag">{selectedProduct.badge}</span>
        )}

        {unavailable && (
          <span className="product-tag product-tag-unavailable">
            {comingSoon ? "Coming soon" : "Out of stock"}
          </span>
        )}

        {selectedProduct.promotionEnabled && selectedProduct.promotionDiscountPercent && (
          <span className="product-tag product-tag-discount">
            -{selectedProduct.promotionDiscountPercent}%
          </span>
        )}
      </Link>

      <div className="product-info">
        <Link href={`/products/${selectedProduct.slug}`} className="product-title-link">
          <h3>{displayName}</h3>
        </Link>

        <span className="product-subtitle">
          {selectedProduct.category}{selectedProduct.variantType ? ` · ${selectedProduct.variantType}` : ""}
        </span>

        {/* Variant pills — types */}
        {productVariants.length > 1 && types.length > 1 && (
          <div className="product-pills" role="radiogroup" aria-label={`${displayName} ${selectedProduct.category === "Ice Cream Powders" ? "style" : "format"}`}>
            {types.map((type) => (
              <button
                key={type}
                type="button"
                className={`product-pill${selectedType === type ? " is-active" : ""}`}
                aria-pressed={selectedType === type}
                onClick={() => {
                  setSelectedType(type);
                  const nextVariant = productVariants.find((item) => item.variantType === type);
                  if (nextVariant) setSelectedSize(nextVariant.size);
                }}
              >
                {type}
              </button>
            ))}
          </div>
        )}

        {/* Variant pills — sizes */}
        {productVariants.length > 1 && sizes.length > 1 && (
          <div className="product-pills" role="radiogroup" aria-label={`${displayName} pack size`}>
            {sizes.map((s) => (
              <button
                key={s}
                type="button"
                className={`product-pill${selectedProduct.size === s ? " is-active" : ""}`}
                aria-pressed={selectedProduct.size === s}
                onClick={() => setSelectedSize(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Single size (no variants) — show as static badge */}
        {productVariants.length <= 1 && selectedProduct.size && (
          <span className="product-size-static">{selectedProduct.size}</span>
        )}

        <div className="product-bottom">
          <div className="product-price-block">
            <span className="price">
              {selectedProduct.price > 0 ? money(displayPrice) : "TBA"}
            </span>
            {selectedProduct.promotionEnabled && selectedProduct.promotionDiscountPercent && (
              <small className="product-card-promotion">per unit · {selectedProduct.promotionDiscountPercent}% off</small>
            )}
          </div>

          <button
            type="button"
            className={`product-add-btn add-mini${isAdded ? " is-added" : ""}`}
            disabled={unavailable}
            aria-label={unavailable ? (comingSoon ? "Coming soon" : "Out of stock") : `Add ${displayName} to cart`}
            onClick={() => {
              if (unavailable) return;
              add({
                id: selectedProduct.id,
                sku: selectedProduct.sku,
                name: selectedProduct.name,
                slug: selectedProduct.slug,
                price: selectedProduct.price,
                image: selectedProduct.image,
                size: selectedProduct.size,
                flavor: selectedProduct.flavor,
                variantType: selectedProduct.variantType,
                minimumOrderQuantity,
                packagingOptions: selectedProduct.packagingOptions,
                promotionEnabled: selectedProduct.promotionEnabled,
                promotionDiscountPercent: selectedProduct.promotionDiscountPercent,
                availableStock: selectedProduct.availableStock,
                inStock: selectedProduct.inStock,
              }, minimumOrderQuantity);
              setIsAdded(true);
              setTimeout(() => setIsAdded(false), 1200);
            }}
          >
            {isAdded ? (
              <>
                <Check size={14} className="product-add-icon" strokeWidth={2.8} />
                <span className="product-add-label">Added!</span>
              </>
            ) : comingSoon ? (
              <span className="product-add-label">Coming soon</span>
            ) : unavailable ? (
              <span className="product-add-label">Out of stock</span>
            ) : (
              <>
                <Plus size={14} className="product-add-icon" strokeWidth={2.5} />
                <span className="product-add-label product-add-label-desktop">Add</span>
                <span className="product-add-label product-add-label-mobile">Add to cart</span>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
