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
import { money } from "@/lib/products";

export default function CartPage() {
  const {
    cart,
    setQty,
    remove,
    subtotal,
    productsLoaded,
  } = useStore();

  const hasUnavailableItems = cart.some(
    (item) =>
      productsLoaded &&
      (item.inStock !== true ||
        item.availableStock === undefined ||
        item.availableStock < item.qty)
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
                  const unavailable =
                    productsLoaded &&
                    (item.inStock !== true ||
                      item.availableStock === undefined ||
                      item.availableStock < item.qty);

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
                        <p>{item.size}</p>

                        <strong className="price">
                          {money(item.price)}
                        </strong>

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
                              : `${item.availableStock} available`}
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
                            disabled={item.qty <= 1}
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
                              item.qty >= item.availableStock
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
                          {money(item.price * item.qty)}
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