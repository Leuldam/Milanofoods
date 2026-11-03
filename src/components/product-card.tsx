"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
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
          sizes="(max-width:720px) 48vw, (max-width:1000px) 30vw, 23vw"
          style={{ objectFit: isDessertFamily ? "contain" : undefined }}
        />

        {selectedProduct.badge && (
          <span className="product-tag">{selectedProduct.badge}</span>
        )}

        {unavailable && (
          <span className="product-tag">
            {comingSoon ? "Coming soon" : "Out of stock"}
          </span>
        )}
      </Link>

      <div className="product-info">
        <Link href={`/products/${selectedProduct.slug}`}>
          <h3>{displayName}</h3>
        </Link>

        <div className="product-category">
          {selectedProduct.category}{selectedProduct.variantType ? ` · ${selectedProduct.variantType}` : ""} · {selectedProduct.size}
        </div>

        {productVariants.length > 1 && (
          <div className="product-variant-selectors">
            {types.length > 1 && <label>
              <span>{selectedProduct.category === "Ice Cream Powders" ? "Style" : "Format"}</span>
              <select aria-label={`${displayName} ${selectedProduct.category === "Ice Cream Powders" ? "style" : "format"}`} value={selectedType} onChange={(event) => {
                const nextType = event.target.value;
                setSelectedType(nextType);
                const nextVariant = productVariants.find((item) => item.variantType === nextType);
                if (nextVariant) setSelectedSize(nextVariant.size);
              }}>
                {types.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>}
            <label>
              <span>Pack size</span>
              <select aria-label={`${displayName} pack size`} value={selectedProduct.size} onChange={(event) => setSelectedSize(event.target.value)}>
                {sizes.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
          </div>
        )}

        <div className="product-bottom">
          <span className="price">
            {selectedProduct.price > 0 ? money(displayPrice) : "Price coming soon"}
            {selectedProduct.promotionEnabled && selectedProduct.promotionDiscountPercent && <small className="product-card-promotion"> / unit · {selectedProduct.promotionDiscountPercent}% off</small>}
          </span>

          <button
            className="add-mini"
            disabled={unavailable}
            onClick={() =>
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
              }, minimumOrderQuantity)
            }
          >
            <Plus size={14} />
            {comingSoon ? "Coming soon" : unavailable ? "Unavailable" : "Add"}
          </button>
        </div>
      </div>
    </article>
  );
}