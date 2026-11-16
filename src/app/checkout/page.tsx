"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Package, ShoppingBag } from "lucide-react";

import { useStore } from "@/components/store-provider";
import { getCartLineUnits } from "@/components/store-provider";
import { formatTotalMeasure } from "@/lib/product-pricing";

type CurrentProduct = {
  id: string;
  slug: string;
  minimumOrderQuantity: number;
  packagingOptions: { id: string; label: string; unitsPerPackage: number }[];
  availableStock: number;
  inStock: boolean;
};
export default function CheckoutPage() {
  const {
    cart,
    clear,
    productsLoaded,
  } = useStore();

  const router = useRouter();

  const [method, setMethod] = useState<"delivery" | "pickup">("delivery");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
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
      // Recheck stock and packaging immediately before creating the order.
      const productsResponse = await fetch("/api/products", {
        cache: "no-store",
      });

      if (!productsResponse.ok) {
        throw new Error("Unable to verify current product availability.");
      }

      const currentProducts: CurrentProduct[] =
        await productsResponse.json();
      const requestedUnitsByProduct = new Map<string, number>();
      for (const item of cart) {
        const totalUnits = item.qty * (item.unitsPerPackage || 1);
        requestedUnitsByProduct.set(
          item.slug,
          (requestedUnitsByProduct.get(item.slug) || 0) + totalUnits,
        );
      }

      for (const item of cart) {
        const current = currentProducts.find(
          (product) => product.slug === item.slug
        );
        const selectedPackaging = item.packagingOptionId
          ? current?.packagingOptions.find((option) => option.id === item.packagingOptionId)
          : null;
        const unitsPerPackage = selectedPackaging?.unitsPerPackage ?? (item.packagingOptionId ? item.unitsPerPackage || 1 : 1);
        const totalUnits = item.qty * unitsPerPackage;

        if (!current) {
          throw new Error(
            `${item.name} is no longer available. Please remove it from your cart.`
          );
        }

        if (
          !current.inStock ||
          !Number.isSafeInteger(totalUnits) ||
          current.availableStock < (requestedUnitsByProduct.get(item.slug) || totalUnits) ||
          totalUnits < current.minimumOrderQuantity ||
          (item.packagingOptionId && !selectedPackaging)
        ) {
          throw new Error(
            `The selected quantity or packaging for ${item.name} is no longer available. Available stock: ${current.availableStock} individual units. Please update your cart.`
          );
        }

      }

      const fd = new FormData(form);

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
        items: cart.map((item) => ({
          id: item.slug,
          qty: item.qty,
          packagingOptionId: item.packagingOptionId || null,
        })),
      };

      const orderForm = new FormData();
      orderForm.set("order", JSON.stringify(data));

      const response = await fetch("/api/orders", {
        method: "POST",
        body: orderForm,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to submit order.");
      }

      sessionStorage.setItem(
        "milano-last-order",
        JSON.stringify({
          orderNumber: result.orderNumber,
          createdAt: result.createdAt,
          cart: cart.map((item) => ({ ...item, price: 0 })),
          method,
          customer,
          fulfillment,
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
          <span className="eyebrow">Send an order request</span>
          <h1>Place your order</h1>
          <p>
            Share your details and Milano Foods will contact you to confirm
            availability, pricing, and delivery or pickup arrangements.
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
                    <label htmlFor="company">Café / restaurant / business name (optional)</label>
                    <input
                      id="company"
                      name="company"
                      autoComplete="organization"
                      placeholder="Your café, restaurant, or business name"
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
                        <ShoppingBag size={16} /> Send Order Request
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
                    {item.sku && <span style={{ display: "block", fontSize: 9, color: "var(--muted)" }}>SKU · {item.sku}</span>}

                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--muted)",
                      }}
                    >
                      {[item.flavor, item.variantType, item.size].filter(Boolean).join(" · ")}
                      <br />
                        {item.qty} × {item.packagingLabel || "Single unit"} · {getCartLineUnits(item)} individual units
                      {formatTotalMeasure(item.size, getCartLineUnits(item)) ? ` · ${formatTotalMeasure(item.size, getCartLineUnits(item))} total` : ""}
                    </span>
                  </div>
                </div>
              ))}

              <div className="summary-line">
                <span>Delivery</span>
                <span>To be discussed</span>
              </div>
              <p className="checkout-contact-note">Milano Foods will contact you to confirm product availability, pricing, and fulfillment details.</p>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
