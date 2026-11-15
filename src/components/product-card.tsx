"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Check, X } from "lucide-react";
import { Product } from "@/lib/products";
import { getPreferredProductVariant } from "@/lib/product-variants";
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
  const [isChoiceOpen, setIsChoiceOpen] = useState(false);
  const choiceDialogRef = useRef<HTMLDialogElement>(null);
  const productVariants = useMemo(
    () => variants?.length ? variants : [product],
    [product, variants],
  );
  const types = useMemo(
    () => Array.from(new Set(productVariants.map((item) => item.variantType).filter((value): value is string => Boolean(value)))),
    [productVariants],
  );
  const defaultProduct =
    getPreferredProductVariant(productVariants, product.variantType) ||
    productVariants[0] ||
    product;
  const getProductForType = (type: string) =>
    getPreferredProductVariant(productVariants, type) || productVariants[0];

  useEffect(() => {
    const dialog = choiceDialogRef.current;
    if (!dialog) return;
    if (isChoiceOpen && !dialog.open) dialog.showModal();
    else if (!isChoiceOpen && dialog.open) dialog.close();
  }, [isChoiceOpen]);

  const isDessertFamily =
    defaultProduct.category === "Ice Cream Powders" ||
    defaultProduct.category === "Milkshake Powders";
  const requiresTypeChoice = isDessertFamily && types.length > 0;
  const displayName = isDessertFamily && product.flavor
    ? `${product.flavor} ${defaultProduct.category === "Ice Cream Powders" ? "Ice Cream Powder" : "Milkshake"}`
    : defaultProduct.name;
  const isUnavailable = (candidate: StoreProduct) =>
    candidate.isPublished === false ||
    candidate.inStock === false ||
    (candidate.availableStock ?? 0) < (candidate.minimumOrderQuantity || 1);
  const typeProducts = types.map((type) => getProductForType(type));
  const unavailable = requiresTypeChoice
    ? typeProducts.every((candidate) => !candidate || isUnavailable(candidate))
    : isUnavailable(defaultProduct);
  const comingSoon = requiresTypeChoice
    ? typeProducts.every((candidate) => candidate?.isPublished === false)
    : defaultProduct.isPublished === false;
  const availableAmount = requiresTypeChoice
    ? typeProducts
        .map((candidate, index) =>
          candidate?.availableStock === undefined
            ? null
            : `${types[index]}: ${candidate.availableStock} units`,
        )
        .filter((amount): amount is string => amount !== null)
        .join(" · ")
    : defaultProduct.availableStock === undefined
      ? ""
      : `${defaultProduct.availableStock} individual ${
          defaultProduct.availableStock === 1 ? "unit" : "units"
        }`;

  function addProductToCart(candidate: StoreProduct) {
    if (isUnavailable(candidate)) return;
    const minimumOrderQuantity = candidate.minimumOrderQuantity || 1;
    add({
      id: candidate.id,
      sku: candidate.sku,
      name: candidate.name,
      slug: candidate.slug,
      price: candidate.price || 0,
      image: candidate.image,
      size: candidate.size,
      flavor: candidate.flavor,
      variantType: candidate.variantType,
      minimumOrderQuantity,
      packagingOptions: candidate.packagingOptions,
      promotionEnabled: candidate.promotionEnabled,
      promotionDiscountPercent: candidate.promotionDiscountPercent,
      availableStock: candidate.availableStock,
      inStock: candidate.inStock,
    }, minimumOrderQuantity);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1200);
  }

  return (
    <article className="product-card">
      <Link
        href={`/products/${defaultProduct.slug}`}
        className={`product-photo${
          defaultProduct.category === "Mojito Syrups"
            ? " product-photo-bottle"
            : isDessertFamily ? " product-photo-package" : ""
        }`}
      >
        <Image
          src={defaultProduct.image}
          alt={displayName}
          fill
          unoptimized={defaultProduct.image.startsWith("http")}
          sizes="(max-width:480px) 44vw, (max-width:720px) 44vw, (max-width:1000px) 30vw, 22vw"
          style={{ objectFit: isDessertFamily ? "contain" : undefined }}
        />

        {defaultProduct.badge && (
          <span className="product-tag">{defaultProduct.badge}</span>
        )}

        {unavailable && (
          <span className="product-tag product-tag-unavailable">
            {comingSoon ? "Coming soon" : "Out of stock"}
          </span>
        )}

        {defaultProduct.promotionEnabled && defaultProduct.promotionDiscountPercent && (
          <span className="product-tag product-tag-discount">
            -{defaultProduct.promotionDiscountPercent}%
          </span>
        )}
      </Link>

      <div className="product-info">
        <Link href={`/products/${defaultProduct.slug}`} className="product-title-link">
          <h3>{displayName}</h3>
        </Link>
        {availableAmount && (
          <p className="product-card-units">
            <span>Available:</span> {availableAmount}
          </p>
        )}

        <div className="product-bottom">
          <button
            type="button"
            className={`product-add-btn add-mini${isAdded ? " is-added" : ""}`}
            disabled={unavailable}
            aria-label={unavailable ? (comingSoon ? "Coming soon" : "Out of stock") : requiresTypeChoice ? `Choose an option for ${displayName}` : `Add ${displayName} to cart`}
            onClick={() => {
              if (requiresTypeChoice) setIsChoiceOpen(true);
              else addProductToCart(defaultProduct);
            }}
          >
            {isAdded ? (
              <>
                <Check size={14} className="product-add-icon" strokeWidth={2.8} />
                <span className="product-add-label">Added</span>
              </>
            ) : comingSoon ? (
              <span className="product-add-label">Coming soon</span>
            ) : unavailable ? (
              <span className="product-add-label">Out of stock</span>
            ) : (
              <>
                <Plus size={14} className="product-add-icon" strokeWidth={2.5} />
                <span className="product-add-label">Add</span>
              </>
            )}
          </button>
        </div>
      </div>
      {requiresTypeChoice && (
        <dialog
          ref={choiceDialogRef}
          className="product-choice-dialog"
          aria-labelledby={`product-choice-title-${defaultProduct.slug}`}
          onClose={() => setIsChoiceOpen(false)}
          onCancel={() => setIsChoiceOpen(false)}
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsChoiceOpen(false);
          }}
        >
          <header className="product-choice-dialog-header">
            <div>
              <span className="eyebrow">
                {defaultProduct.category === "Ice Cream Powders" ? "Choose style" : "Choose format"}
              </span>
              <h2 id={`product-choice-title-${defaultProduct.slug}`}>{displayName}</h2>
            </div>
            <button type="button" aria-label="Close" onClick={() => setIsChoiceOpen(false)}>
              <X size={18} />
            </button>
          </header>
          <div className="product-choice-options">
            {types.map((type) => {
              const candidate = getProductForType(type);
              const optionUnavailable = !candidate || isUnavailable(candidate);
              return (
                <button
                  key={type}
                  type="button"
                  className="product-choice-option"
                  disabled={optionUnavailable}
                  onClick={() => {
                    if (!candidate) return;
                    setIsChoiceOpen(false);
                    addProductToCart(candidate);
                  }}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </dialog>
      )}
    </article>
  );
}
