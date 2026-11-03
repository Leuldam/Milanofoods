"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Banknote, CheckCircle2, ImagePlus, MapPin, Package, ShoppingBag, X } from "lucide-react";

import { useStore } from "@/components/store-provider";
import { getCartLinePrice, getCartLineTotal, getCartLineUnits } from "@/components/store-provider";
import { formatTotalMeasure } from "@/lib/product-pricing";
import { money } from "@/lib/products";

type CurrentProduct = {
  id: string;
  slug: string;
  price: number;
  minimumOrderQuantity: number;
  promotionEnabled: boolean;
  promotionDiscountPercent: string | null;
  packagingOptions: { id: string; label: string; unitsPerPackage: number }[];
  availableStock: number;
  inStock: boolean;
};
type PaymentMethodConfig = {
  code: "cbe" | "telebirr" | "awash" | "boa";
  displayName: string;
  accountName: string;
  accountNumber: string;
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
  const [payment, setPayment] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>([]);
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(true);
  const [paymentMethodsError, setPaymentMethodsError] = useState("");
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [paymentProofError, setPaymentProofError] = useState("");
  const [paymentProofPreview, setPaymentProofPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selectedPaymentMethod = paymentMethods.find((item) => item.code === payment) || null;

  useEffect(() => {
    let cancelled = false;
    async function loadPaymentMethods() {
      try {
        const response = await fetch("/api/payment-methods", { cache: "no-store" });
        const payload = await response.json() as { methods?: PaymentMethodConfig[]; error?: string };
        if (!response.ok) throw new Error(payload.error || "Unable to load payment account details.");
        if (!cancelled) setPaymentMethods(payload.methods || []);
      } catch (loadError) {
        if (!cancelled) setPaymentMethodsError(loadError instanceof Error ? loadError.message : "Unable to load payment account details.");
      } finally {
        if (!cancelled) setPaymentMethodsLoading(false);
      }
    }

    void loadPaymentMethods();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!paymentProof) {
      setPaymentProofPreview("");
      return;
    }
    const preview = URL.createObjectURL(paymentProof);
    setPaymentProofPreview(preview);
    return () => URL.revokeObjectURL(preview);
  }, [paymentProof]);

  function choosePaymentProof(file: File | null) {
    setPaymentProofError("");
    if (!file) {
      setPaymentProof(null);
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setPaymentProofError("Choose a PNG, JPEG, or WebP screenshot.");
      setPaymentProof(null);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPaymentProofError("The screenshot must be 5 MB or smaller.");
      setPaymentProof(null);
      return;
    }
    setPaymentProof(file);
  }

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
      // Recheck stock and prices immediately before creating the order.
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

        if (
          Number(current.price) !== Number(item.price) ||
          current.promotionEnabled !== item.promotionEnabled ||
          current.promotionDiscountPercent !== (item.promotionDiscountPercent?.toString() || null)
        ) {
          throw new Error(
            `The price of ${item.name} has changed. Please return to your cart and review the updated price.`
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
        payment,
        items: cart.map((item) => ({
          id: item.slug,
          qty: item.qty,
          packagingOptionId: item.packagingOptionId || null,
        })),
      };

      const orderForm = new FormData();
      orderForm.set("order", JSON.stringify(data));
      if (paymentProof) orderForm.set("paymentProof", paymentProof);

      const response = await fetch("/api/orders", {
        method: "POST",
        body: orderForm,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to submit order.");
      }

      const receiptCart = cart.map((item) => {
        const savedItem = (result.items as {
          slug: string;
          sku: string;
          packagingLabel: string;
          unitsPerPackage: number;
          packageQuantity: number;
          listUnitPrice: number;
          promotionApplied: boolean;
          promotionDiscountPercent: string | null;
        }[]).find((line) =>
          line.slug === item.slug &&
          line.packagingLabel === (item.packagingLabel || "Single unit") &&
          line.unitsPerPackage === (item.unitsPerPackage || 1),
        );
        return savedItem
          ? {
              ...item,
              sku: savedItem.sku,
              price: savedItem.listUnitPrice,
              promotionEnabled: savedItem.promotionApplied,
              promotionDiscountPercent: savedItem.promotionDiscountPercent,
            }
          : item;
      });

      sessionStorage.setItem(
        "milano-last-order",
        JSON.stringify({
          orderNumber: result.orderNumber,
          createdAt: result.createdAt,
          cart: receiptCart,
          subtotal: result.subtotal,
          deliveryFee: result.deliveryFee,
          total: result.total,
          method,
          payment: payment ? paymentMethods.find((item) => item.code === payment)?.displayName || "Not specified" : "Not specified",
          paymentAccountName: result.paymentAccountName,
          paymentAccountNumber: result.paymentAccountNumber,
          paymentProofUploaded: Boolean(paymentProof),
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
                  <span className="eyebrow">03 · Payment (optional)</span>
                  <br />
                  Pay now or arrange later
                </h2>
                <p className="payment-optional-note">Choosing a payment method and uploading a receipt are both optional. You can place your order and arrange payment with Milano Foods later.</p>
                <div className="payment-method-grid" role="group" aria-label="Optional payment method">
                  <button type="button" className={`payment-method-choice${payment === "" ? " is-selected" : ""}`} onClick={() => { setPayment(""); setPaymentProof(null); }} aria-pressed={payment === ""}>
                    <span className="payment-method-logo payment-logo-later"><Banknote size={18}/></span>
                    <span className="payment-method-info"><strong>Choose later</strong><small>No payment method selected</small></span>
                    {payment === "" && <CheckCircle2 className="payment-method-check" size={18}/>}
                  </button>
                  {paymentMethods.map((paymentMethod) => (
                    <button key={paymentMethod.code} type="button" className={`payment-method-choice${payment === paymentMethod.code ? " is-selected" : ""}`} onClick={() => setPayment(paymentMethod.code)} aria-pressed={payment === paymentMethod.code}>
                      <PaymentMethodLogo code={paymentMethod.code}/>
                      <span className="payment-method-info">
                        <strong>{paymentMethod.displayName}</strong>
                        <small>Account name: <b>{paymentMethod.accountName}</b></small>
                        <small>Account number: <b>{paymentMethod.accountNumber}</b></small>
                      </span>
                      {payment === paymentMethod.code && <CheckCircle2 className="payment-method-check" size={18}/>}
                    </button>
                  ))}
                </div>
                {paymentMethodsLoading && <p className="payment-method-hint">Loading payment accounts…</p>}
                {paymentMethodsError && <p className="payment-method-warning" role="status">{paymentMethodsError} You can still place your order and arrange payment later.</p>}
                {!paymentMethodsLoading && !paymentMethodsError && paymentMethods.length === 0 && <p className="payment-method-hint">Digital payment accounts are not configured yet. You can still place the order without selecting a method.</p>}
                {selectedPaymentMethod && <div className="payment-proof-upload">
                  <label htmlFor="paymentProof"><ImagePlus size={18}/><span><strong>Payment screenshot (optional)</strong><small>PNG, JPEG, or WebP · up to 5 MB</small></span></label>
                  <input id="paymentProof" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => choosePaymentProof(event.target.files?.[0] || null)}/>
                  {paymentProofError && <p role="alert">{paymentProofError}</p>}
                  {paymentProof && <div className="payment-proof-preview">
                    {paymentProofPreview && <img src={paymentProofPreview} alt="Payment screenshot preview"/>}
                    <span><strong>{paymentProof.name}</strong><small>{(paymentProof.size / 1024).toFixed(0)} KB · stored securely with your order</small></span>
                    <button type="button" aria-label="Remove payment screenshot" onClick={() => choosePaymentProof(null)}><X size={17}/></button>
                  </div>}
                </div>}
                <p className="payment-method-hint">Milano Foods will confirm your order and any delivery fees before fulfillment. A payment screenshot is only shared with the admin team.</p>
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
                      <br />
                      ETB {getCartLinePrice(item).toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / individual unit
                    </span>
                  </div>

                  <span style={{ fontSize: 12, fontWeight: 700 }}>
                    {money(getCartLineTotal(item))}
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

function PaymentMethodLogo({ code }: { code: PaymentMethodConfig["code"] }) {
  const logos: Record<PaymentMethodConfig["code"], { src: string; alt: string }> = {
    cbe: { src: "/images/payment-methods/cbe.jpg", alt: "Commercial Bank of Ethiopia" },
    telebirr: { src: "/images/payment-methods/telebirr.png", alt: "Telebirr" },
    awash: { src: "/images/payment-methods/awash.png", alt: "Awash Bank" },
    boa: { src: "/images/payment-methods/boa.png", alt: "Bank of Abyssinia" },
  };
  const logo = logos[code];
  return <span className={`payment-method-logo payment-logo-${code}`}>
    <Image src={logo.src} alt={logo.alt} width={100} height={60}/>
  </span>;
}