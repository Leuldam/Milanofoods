"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Package, ShoppingBag } from "lucide-react";

import { useStore } from "@/components/store-provider";
import { money } from "@/lib/products";

type CurrentProduct = {
  id: string;
  slug: string;
  price: number;
  availableStock: number;
  inStock: boolean;
};

export default function CheckoutPage() {
  const {
    cart,
    subtotal,
    clear,
    productsLoaded,
  } = useStore();

  const router = useRouter();

  const [method, setMethod] = useState<"delivery" | "pickup">("delivery");
  const [payment, setPayment] = useState("Cash on Delivery");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!productsLoaded) {
      setError("Please wait while product availability is checked.");
      return;
    }

    if (!cart.length) {
      setError("Your cart is empty.");
      return;
    }

    setBusy(true);

    try {
      // Recheck stock and prices immediately before creating the order.
      const productsResponse = await fetch("/api/products", {
        cache: "no-store",
      });

      if (!productsResponse.ok) {
        throw new Error("Unable to verify current product availability.");
      }

      const currentProducts: CurrentProduct[] =
        await productsResponse.json();

      for (const item of cart) {
        const current = currentProducts.find(
          (product) => product.slug === item.slug
        );

        if (!current) {
          throw new Error(
            `${item.name} is no longer available. Please remove it from your cart.`
          );
        }

        if (!current.inStock || current.availableStock < item.qty) {
          throw new Error(
            `Insufficient stock for ${item.name}. Available quantity: ${current.availableStock}. Please update your cart.`
          );
        }

        if (Number(current.price) !== Number(item.price)) {
          throw new Error(
            `The price of ${item.name} has changed. Please return to your cart and review the updated price.`
          );
        }
      }

      const fd = new FormData(e.currentTarget);

      const customer = {
        name: String(fd.get("name") || ""),
        phone: String(fd.get("phone") || ""),
        email: String(fd.get("email") || ""),
        company: String(fd.get("company") || ""),
      };

      const fulfillment = {
        method,
        city: String(fd.get("city") || ""),
        address: String(fd.get("address") || ""),
        pickupLocation: String(fd.get("pickupLocation") || ""),
        notes: String(fd.get("notes") || ""),
      };

      const data = {
        customer,
        fulfillment,
        payment,
        items: cart.map((item) => ({
          id: item.id,
          qty: item.qty,
        })),
      };

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to submit order.");
      }

      sessionStorage.setItem(
        "milano-last-order",
        JSON.stringify({
          orderNumber: result.orderNumber,
          cart,
          subtotal,
          method,
          payment,
          customer,
          reservationExpiresAt: result.reservationExpiresAt,
        })
      );

      clear();

      router.push(
        `/order-confirmation?order=${encodeURIComponent(result.orderNumber)}`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  if (!cart.length) {
    return (
      <main className="wrap section">
        <div className="empty-state">
          <h1>Your cart is empty</h1>
          <p>Add products before checkout.</p>
          <Link href="/products" className="btn">
            Browse products
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main>
      <section className="page-hero">
        <div className="wrap">
          <div className="breadcrumb">Home / Cart / Checkout</div>
          <span className="eyebrow">Almost there</span>
          <h1>Checkout</h1>
          <p>
            Share your details and choose how you would like to receive
            your order.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="checkout-layout">
            <form onSubmit={submit}>
              <div className="form-card">
                <h2>
                  <span className="eyebrow">01 · Customer details</span>
                  <br />
                  Where can we reach you?
                </h2>

                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="name">Full name *</label>
                    <input
                      id="name"
                      name="name"
                      required
                      autoComplete="name"
                      placeholder="Your full name"
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="phone">Phone number *</label>
                    <input
                      id="phone"
                      name="phone"
                      required
                      type="tel"
                      autoComplete="tel"
                      placeholder="+251..."
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="email">Email (optional)</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="company">Company (optional)</label>
                    <input
                      id="company"
                      name="company"
                      placeholder="Company name"
                    />
                  </div>
                </div>
              </div>

              <div className="form-card" style={{ marginTop: 18 }}>
                <h2>
                  <span className="eyebrow">02 · Fulfillment</span>
                  <br />
                  Delivery or pickup?
                </h2>

                <div className="choice-grid">
                  <button
                    type="button"
                    className={`choice ${
                      method === "delivery" ? "active" : ""
                    }`}
                    onClick={() => setMethod("delivery")}
                  >
                    <MapPin color="#073d2e" />
                    <span>
                      <strong>Delivery</strong>
                      <small>Tell us where to deliver your order.</small>
                    </span>
                  </button>

                  <button
                    type="button"
                    className={`choice ${
                      method === "pickup" ? "active" : ""
                    }`}
                    onClick={() => setMethod("pickup")}
                  >
                    <Package color="#073d2e" />
                    <span>
                      <strong>Store pickup</strong>
                      <small>Collect from an agreed pickup location.</small>
                    </span>
                  </button>
                </div>

                {method === "delivery" ? (
                  <div className="form-grid">
                    <div className="field">
                      <label htmlFor="city">City / service area *</label>
                      <input
                        id="city"
                        name="city"
                        required
                        placeholder="e.g. Addis Ababa"
                      />
                    </div>

                    <div className="field">
                      <label htmlFor="address">Delivery address *</label>
                      <input
                        id="address"
                        name="address"
                        required
                        placeholder="Area, street, landmark"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="field">
                    <label htmlFor="pickupLocation">
                      Preferred pickup location *
                    </label>
                    <input
                      id="pickupLocation"
                      name="pickupLocation"
                      required
                      placeholder="Confirm location with Milano"
                    />
                  </div>
                )}

                <div className="field">
                  <label htmlFor="notes">Order notes (optional)</label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    placeholder="Directions, preferred contact time, or other notes"
                  />
                </div>
              </div>

              <div className="form-card" style={{ marginTop: 18 }}>
                <h2>
                  <span className="eyebrow">03 · Payment preference</span>
                  <br />
                  How would you like to pay?
                </h2>

                <div className="field">
                  <label htmlFor="payment">Payment method</label>
                  <select
                    id="payment"
                    value={payment}
                    onChange={(e) => setPayment(e.target.value)}
                  >
                    <option>Cash on Delivery</option>
                    <option>Cash on Pickup</option>
                    <option>Bank Transfer (confirm with Milano)</option>
                  </select>
                </div>

                <p
                  style={{
                    fontSize: 12,
                    color: "var(--muted)",
                    lineHeight: 1.7,
                  }}
                >
                  Milano Foods will contact you to confirm delivery fees
                  and payment arrangements before final fulfillment.
                </p>
              </div>

              {error && (
                <p
                  role="alert"
                  style={{ color: "#b42318", fontSize: 13 }}
                >
                  {error}
                </p>
              )}

              <button
                className="btn"
                disabled={busy || !productsLoaded}
                style={{ width: "100%", marginTop: 18 }}
              >
                {busy
                  ? "Submitting order..."
                  : !productsLoaded
                    ? "Checking products..."
                    : (
                      <>
                        <ShoppingBag size={16} /> Place Order
                      </>
                    )}
              </button>

              <p
                style={{
                  fontSize: 10,
                  color: "var(--muted)",
                  lineHeight: 1.7,
                }}
              >
                By placing your order, you agree to our{" "}
                <Link
                  href="/terms"
                  style={{ textDecoration: "underline" }}
                >
                  Terms & Conditions
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  style={{ textDecoration: "underline" }}
                >
                  Privacy Policy
                </Link>.
              </p>
            </form>

            <aside className="summary-card">
              <h3>Your order</h3>

              {cart.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    gap: 12,
                    marginBottom: 15,
                    alignItems: "center",
                  }}
                >
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={54}
                    height={60}
                    style={{
                      objectFit: "cover",
                      background: "#eee8dd",
                    }}
                  />

                  <div style={{ flex: 1 }}>
                    <strong
                      style={{
                        fontSize: 12,
                        display: "block",
                      }}
                    >
                      {item.name}
                    </strong>

                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--muted)",
                      }}
                    >
                      {item.size} · Qty {item.qty}
                    </span>
                  </div>

                  <span style={{ fontSize: 12, fontWeight: 700 }}>
                    {money(item.price * item.qty)}
                  </span>
                </div>
              ))}

              <div className="summary-line summary-total">
                <span>Subtotal</span>
                <span>{money(subtotal)}</span>
              </div>

              <div className="summary-line">
                <span>Delivery</span>
                <span>To be confirmed</span>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}