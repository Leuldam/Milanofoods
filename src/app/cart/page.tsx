"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Minus,
  Plus,
  Trash2,
} from "lucide-react";

import { useStore } from "@/components/store-provider";
import { getCartLinePrice, getCartLineTotal, getCartLineUnits } from "@/components/store-provider";
import { formatTotalMeasure, minimumPackageQuantity } from "@/lib/product-pricing";
import { money } from "@/lib/products";

export default function CartPage() {
  const {
    cart,
    setQty,
    setPackaging,
    remove,
    subtotal,
    productsLoaded,
  } = useStore();

  const requestedUnitsByProduct = new Map<string, number>();
  for (const item of cart) {
    requestedUnitsByProduct.set(
      item.slug,
      (requestedUnitsByProduct.get(item.slug) || 0) + getCartLineUnits(item),
    );
  }

  const hasUnavailableItems = cart.some(
    (item) =>
      productsLoaded &&
      (item.inStock !== true ||
        item.availableStock === undefined ||
        item.availableStock < (requestedUnitsByProduct.get(item.slug) || getCartLineUnits(item)) ||
        getCartLineUnits(item) < (item.minimumOrderQuantity || 1))
  );

  const canCheckout =
    productsLoaded && cart.length > 0 && !hasUnavailableItems;

  return (
    <main>
      <section className="page-hero">
        <div className="wrap">
          <div className="breadcrumb">Home / Shopping Cart</div>
          <span className="eyebrow">Your selection</span>
          <h1>Your shopping cart</h1>
          <p>Review your Milano favorites before placing your order.</p>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          {!cart.length ? (
            <div className="empty-state">
              <h2>Your cart is waiting for something delicious.</h2>
              <p>Explore the Milano collection and find your favorites.</p>
              <Link href="/products" className="btn">
                Explore products <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="cart-layout">
              <div className="cart-list">
                <h2 style={{ fontSize: 24, margin: "0 0 20px" }}>
                  Cart items ({cart.length})
                </h2>

                {!productsLoaded && (
                  <p style={{ fontSize: 12, color: "var(--muted)" }}>
                    Checking current product availability...
                  </p>
                )}

                {cart.map((item) => {
                  const unitsPerPackage = item.unitsPerPackage || 1;
                  const minimumQty = minimumPackageQuantity(item.minimumOrderQuantity || 1, unitsPerPackage);
                  const totalUnits = getCartLineUnits(item);
                  const requestedProductUnits = requestedUnitsByProduct.get(item.slug) || totalUnits;
                  const availableForThisLine = (item.availableStock || 0) - (requestedProductUnits - totalUnits);
                  const maximumPackages = Math.floor(Math.max(0, availableForThisLine) / unitsPerPackage);
                  const totalMeasure = formatTotalMeasure(item.size, totalUnits);
                  const unavailable =
                    productsLoaded &&
                    (item.inStock !== true ||
                      item.availableStock === undefined ||
                      item.availableStock < requestedProductUnits ||
                      totalUnits < (item.minimumOrderQuantity || 1));

                  return (
                    <div className="cart-item" key={item.id}>
                      <Image
                        className={
                          item.image === "/images/milano-mint-bottle-cutout.png"
                            ? "cart-item-image-bottle"
                            : ""
                        }
                        src={item.image}
                        alt={item.name}
                        width={100}
                        height={100}
                      />

                      <div>
                        <h3>{item.name}</h3>
                        {item.sku && <p className="cart-item-sku">SKU · {item.sku}</p>}
                        <p>{[item.flavor, item.variantType, item.size].filter(Boolean).join(" · ")}</p>

                        <label className="cart-packaging-field">
                          <span>Packaging</span>
                          <select
                            aria-label={`Packaging for ${item.name}`}
                            value={item.packagingOptionId || ""}
                            onChange={(event) => setPackaging(item.id, event.target.value || null)}
                          >
                            <option value="">Single unit</option>
                            {(item.packagingOptions || []).map((option) => (
                              <option key={option.id} value={option.id}>{option.label} · {option.unitsPerPackage} units</option>
                            ))}
                          </select>
                        </label>
                        <p className="cart-packaging-summary">
                          {item.qty} × {item.packagingLabel || "Single unit"} · {totalUnits} individual units
                          {totalMeasure ? ` · ${totalMeasure} total` : ""}
                        </p>
                        <strong className="price">ETB {getCartLinePrice(item).toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / individual unit</strong>
                        {item.promotionEnabled && item.promotionDiscountPercent && <small className="cart-promotion-note">Configured promotion: {item.promotionDiscountPercent}% off per unit</small>}

                        {productsLoaded && (
                          <p
                            style={{
                              fontSize: 11,
                              color: unavailable ? "#b42318" : "#4e795d",
                              margin: "6px 0",
                            }}
                          >
                            {unavailable
                              ? "Unavailable or insufficient stock"
                              : `${Math.max(0, availableForThisLine)} individual units available for this line`}
                          </p>
                        )}

                        <button
                          className="remove-btn"
                          onClick={() => remove(item.id)}
                        >
                          <Trash2
                            size={12}
                            style={{
                              display: "inline",
                              verticalAlign: "middle",
                              marginRight: 4,
                            }}
                          />
                          Remove
                        </button>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div className="qty-control">
                          <button
                            onClick={() => setQty(item.id, item.qty - 1)}
                            aria-label="Decrease quantity"
                            disabled={item.qty <= minimumQty}
                          >
                            <Minus size={12} />
                          </button>

                          <span>{item.qty}</span>

                          <button
                            onClick={() => setQty(item.id, item.qty + 1)}
                            aria-label="Increase quantity"
                            disabled={
                              !productsLoaded ||
                              unavailable ||
                              item.availableStock === undefined ||
                              item.qty >= maximumPackages
                            }
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 12,
                            marginTop: 13,
                          }}
                        >
                          {money(getCartLineTotal(item))}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <Link
                  href="/products"
                  className="text-link"
                  style={{ marginTop: 22 }}
                >
                  <ArrowLeft size={15} /> Continue shopping
                </Link>
              </div>

              <aside className="summary-card">
                <h3>Order summary</h3>

                <div className="summary-line">
                  <span>Subtotal</span>
                  <span>{money(subtotal)}</span>
                </div>

                <div className="summary-line">
                  <span>Delivery</span>
                  <span>Calculated after address</span>
                </div>

                <div className="summary-line summary-total">
                  <span>Estimated total</span>
                  <span>{money(subtotal)}</span>
                </div>

                <p
                  style={{
                    fontSize: 11,
                    color: "var(--muted)",
                    lineHeight: 1.7,
                  }}
                >
                  Final delivery fees and order details will be confirmed
                  by Milano Foods.
                </p>

                {hasUnavailableItems && (
                  <p
                    role="alert"
                    style={{
                      color: "#b42318",
                      fontSize: 12,
                      lineHeight: 1.6,
                    }}
                  >
                    Please remove unavailable products or reduce quantities
                    before checkout.
                  </p>
                )}

                <Link
                  href={canCheckout ? "/checkout" : "#"}
                  aria-disabled={!canCheckout}
                  onClick={(event) => {
                    if (!canCheckout) event.preventDefault();
                  }}
                  className="btn"
                  style={{
                    opacity: canCheckout ? 1 : 0.5,
                    pointerEvents: canCheckout ? "auto" : "none",
                  }}
                >
                  {productsLoaded
                    ? "Proceed to checkout"
                    : "Checking availability..."}
                  <ArrowRight size={15} />
                </Link>
              </aside>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}