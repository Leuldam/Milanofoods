"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Copy,
  Download,
  MessageCircle,
  PackageCheck,
  Printer,
  ShoppingBag,
  Check,
} from "lucide-react";
import { gsap } from "gsap";
import { useEffect, useRef, useState } from "react";
import { getCartLinePrice, getCartLineTotal, getCartLineUnits, type CartLine } from "@/components/store-provider";
import { ProductReviewForm } from "@/components/product-review-form";
import { money } from "@/lib/products";
import "./order-confirmation.css";

type SavedOrder = {
  orderNumber: string;
  createdAt?: string;
  cart: CartLine[];
  subtotal: number;
  deliveryFee?: number;
  total?: number;
  method: "delivery" | "pickup";
  payment: string;
  paymentAccountName?: string;
  paymentAccountNumber?: string;
  paymentProofUploaded?: boolean;
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
    company?: string;
  };
  fulfillment?: {
    city?: string;
    address?: string;
    pickupLocation?: string;
  };
};

function isSavedOrder(value: unknown): value is SavedOrder {
  if (typeof value !== "object" || value === null) return false;

  const order = value as Record<string, unknown>;
  return (
    typeof order.orderNumber === "string" &&
    Array.isArray(order.cart) &&
    typeof order.subtotal === "number" &&
    (order.method === "delivery" || order.method === "pickup") &&
    typeof order.payment === "string" &&
    (order.customer === undefined ||
      (typeof order.customer === "object" &&
        order.customer !== null &&
        ((order.customer as Record<string, unknown>).phone === undefined ||
          typeof (order.customer as Record<string, unknown>).phone === "string")))
  );
}

function formatReceiptDate(value?: string) {
  const date = value ? new Date(value) : new Date();
  if (!Number.isFinite(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-ET", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Addis_Ababa",
  }).format(date);
}

export function OrderConfirmationContent() {
  const params = useSearchParams();
  const [order, setOrder] = useState<SavedOrder | null>(null);
  const [receiptReady, setReceiptReady] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [copyError, setCopyError] = useState("");
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const savedOrder = sessionStorage.getItem("milano-last-order");
      if (!savedOrder) return;

      const parsedOrder: unknown = JSON.parse(savedOrder);
      if (!isSavedOrder(parsedOrder)) {
        throw new Error("Saved order has an invalid format.");
      }

      setOrder(parsedOrder);
    } catch (error) {
      console.error("Could not load the saved order confirmation.", error);
    }
  }, []);

  useEffect(() => {
    const container = receiptRef.current;
    const paper = container?.querySelector<HTMLElement>(".receipt-paper");
    if (!order || !container || !paper) {
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReceiptReady(true);
      return;
    }

    const rows = Array.from(container.querySelectorAll<HTMLElement>(".receipt-item-row"));
    const paperTween = gsap.fromTo(
      paper,
      { clipPath: "inset(0 0 100% 0)", y: -10 },
      {
        clipPath: "inset(0 0 0% 0)",
        y: 0,
        duration: 0.85,
        ease: "power2.out",
        onComplete: () => setReceiptReady(true),
      },
    );
    const rowTween = gsap.from(rows, {
      opacity: 0,
      y: -3,
      duration: 0.18,
      delay: 0.35,
      stagger: 0.025,
      ease: "power1.out",
    });

    return () => {
      paperTween.kill();
      rowTween.kill();
      gsap.set(paper, { clearProps: "clipPath,transform,opacity" });
    };
  }, [order]);

  const orderNumber = params.get("order") || order?.orderNumber || "";
  const receiptOrder = order?.orderNumber === orderNumber ? order : null;
  const total = receiptOrder?.total ?? receiptOrder?.subtotal ?? 0;
  const deliveryFee = receiptOrder?.deliveryFee ?? 0;
  const paymentAccountNumber = receiptOrder?.paymentAccountNumber || "";

  async function copyReceiptValue(field: string, value: string) {
    setCopyError("");
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        throw new Error("Clipboard API is unavailable.");
      }
      setCopiedField(field);
      window.setTimeout(() => {
        setCopiedField((current) => current === field ? null : current);
      }, 1800);
    } catch (clipboardError) {
      const input = document.createElement("textarea");
      input.value = value;
      input.setAttribute("readonly", "");
      input.setAttribute("aria-hidden", "true");
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      try {
        if (!document.execCommand("copy")) {
          throw clipboardError;
        }
        setCopiedField(field);
        window.setTimeout(() => {
          setCopiedField((current) => current === field ? null : current);
        }, 1800);
      } catch (fallbackError) {
        console.error(`Could not copy ${field} from the order receipt.`, clipboardError, fallbackError);
        setCopyError("Copy was unavailable. Please select and copy the value manually.");
      } finally {
        input.remove();
      }
    }
  }

  return (
    <main className="wrap order-confirmation-page">
      <section className="confirmation">
        <div className="confirmation-intro">
          <div className="success-mark">
            <CheckCircle2 size={30} />
          </div>
          <span className="eyebrow">Order received</span>
          <h1>Your order is in good hands.</h1>
          <p>
            Milano Foods has received your order request. Our team will contact
            you to confirm availability, delivery fees, and payment arrangements.
          </p>
          {orderNumber && <div className="order-number">ORDER {orderNumber}</div>}
        </div>

        {receiptOrder ? (
          <div className="receipt-machine" ref={receiptRef}>
            <div className="receipt-printer-head" aria-hidden="true">
              <div className="receipt-printer-brand">
                <span className="receipt-printer-light" />
                <span>MILANO FOODS <small>POINT OF SALE</small></span>
                <Printer size={19} />
              </div>
              <div className="receipt-printer-slot"><span /></div>
            </div>
            <article className="receipt-paper" aria-label="Order receipt">
              <header className="receipt-header">
                <div>
                  <span className="receipt-kicker">MILANO FOODS · ETHIOPIA</span>
                  <h2>ORDER<br/>RECEIPT</h2>
                </div>
                <div className="receipt-brand-block">
                  <strong>MILANO</strong>
                  <span>FOODS</span>
                  <small>MORE THAN JUST A TASTE</small>
                </div>
              </header>

              <div className="receipt-order-meta">
                <div><span>ORDER NUMBER</span><div className="receipt-copy-value"><strong>{receiptOrder.orderNumber}</strong><button type="button" className="receipt-copy-button" onClick={() => void copyReceiptValue("order number", receiptOrder.orderNumber)} aria-label={copiedField === "order number" ? "Order number copied" : "Copy order number"}>{copiedField === "order number" ? <Check size={14}/> : <Copy size={14}/>}<span>{copiedField === "order number" ? "Copied" : "Copy"}</span></button></div></div>
                <div><span>ORDER DATE</span><strong>{formatReceiptDate(receiptOrder.createdAt)}</strong></div>
                <div><span>STATUS</span><strong>ORDER RECEIVED</strong></div>
              </div>

              <div className="receipt-parties">
                <section>
                  <h3>ORDERED BY</h3>
                  <strong>{receiptOrder.customer?.name || "Milano Foods customer"}</strong>
                  {receiptOrder.customer?.company && <span>{receiptOrder.customer.company}</span>}
                  {receiptOrder.customer?.phone && <span>{receiptOrder.customer.phone}</span>}
                  {receiptOrder.customer?.email && <span>{receiptOrder.customer.email}</span>}
                </section>
                <section>
                  <h3>{receiptOrder.method === "pickup" ? "PICKUP" : "DELIVERY"}</h3>
                  {receiptOrder.method === "pickup" ? (
                    <span>{receiptOrder.fulfillment?.pickupLocation || "Pickup location to be confirmed"}</span>
                  ) : (
                    <>
                      {receiptOrder.fulfillment?.city && <strong>{receiptOrder.fulfillment.city}</strong>}
                      {receiptOrder.fulfillment?.address && <span>{receiptOrder.fulfillment.address}</span>}
                    </>
                  )}
                  <span>Payment: {receiptOrder.payment}</span>
                  {receiptOrder.paymentAccountName && <span>Account name: {receiptOrder.paymentAccountName}</span>}
                  {paymentAccountNumber && <div className="receipt-account-copy"><span>Account number: <strong>{paymentAccountNumber}</strong></span><button type="button" className="receipt-copy-button" onClick={() => void copyReceiptValue("account number", paymentAccountNumber)} aria-label={copiedField === "account number" ? "Account number copied" : "Copy payment account number"}>{copiedField === "account number" ? <Check size={14}/> : <Copy size={14}/>}<span>{copiedField === "account number" ? "Copied" : "Copy"}</span></button></div>}
                </section>
              </div>

              <table className="receipt-items">
                <thead>
                  <tr><th>Description</th><th>Qty</th><th>Price</th><th>Amount</th></tr>
                </thead>
                <tbody>
                  {receiptOrder.cart.map((item, index) => (
                    <tr className="receipt-item-row" key={`${item.id}-${index}`}>
                      <td><strong>{item.name}</strong>{item.sku && <small>SKU · {item.sku}</small>}{[item.flavor, item.variantType, item.size].filter(Boolean).length > 0 && <small>{[item.flavor, item.variantType, item.size].filter(Boolean).join(" · ")}</small>}<small>{item.packagingLabel || "Single unit"}</small></td>
                      <td>{String(item.qty).padStart(2, "0")} × {item.unitsPerPackage || 1}<small>{getCartLineUnits(item)} individual units</small></td>
                      <td>{money(getCartLinePrice(item))}<small>/ unit</small></td>
                      <td>{money(getCartLineTotal(item))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td colSpan={3}>Subtotal</td><td>{money(receiptOrder.subtotal)}</td></tr>
                  <tr><td colSpan={3}>Delivery fee</td><td>{deliveryFee ? money(deliveryFee) : "To be confirmed"}</td></tr>
                  <tr className="receipt-grand-total"><td colSpan={3}>TOTAL</td><td><span className="receipt-total-copy"><strong>{money(total)}</strong><button type="button" className="receipt-copy-button" onClick={() => void copyReceiptValue("amount", money(total))} aria-label={copiedField === "amount" ? "Amount copied" : "Copy total amount"}>{copiedField === "amount" ? <Check size={14}/> : <Copy size={14}/>}<span>{copiedField === "amount" ? "Copied" : "Copy"}</span></button></span></td></tr>
                </tfoot>
              </table>

              <footer className="receipt-footer">
                <section>
                  <h3>MILANO FOODS</h3>
                  <p>Addis Ababa, Goro Cambridge</p>
                  <p><a href="tel:0941427324">0941427324</a></p>
                  <p><a href="mailto:milanofoos@gmail.com">milanofoos@gmail.com</a></p>
                  <p className="receipt-disclaimer">Order receipt · Delivery fees are confirmed separately.</p>
                </section>
                <div className="receipt-thanks">
                  <PackageCheck size={24}/>
                  <strong>Thank you for choosing Milano Foods.</strong>
                  <span>Made for flavor · Ethiopia</span>
                </div>
              </footer>
              <div className="receipt-tear" aria-hidden="true" />
            </article>
            <p className="receipt-printing-label" aria-live="polite">{receiptReady ? "Receipt ready" : "Printing receipt"}
            </p>
          </div>
        ) : (
          <div className="summary-card confirmation-summary">
            <h3>Order receipt unavailable</h3>
            <p>This browser session does not have the saved order details. Keep your order number and contact Milano Foods if you need a copy.</p>
          </div>
        )}

        <div className="confirmation-nonprint">
          <div className="confirmation-actions">
            {receiptOrder && <button type="button" className="btn receipt-download" onClick={() => window.print()}><Download size={16}/> Download receipt</button>}
            <Link href="/products" className="btn btn-outline">
              <ShoppingBag size={15} /> Continue shopping
            </Link>
            <Link href="/contact" className="btn btn-outline">
              <MessageCircle size={15} /> Contact Milano
            </Link>
          </div>
          <p className="confirmation-reference">
            Choose “Save as PDF” in the print dialog to download a copy of your receipt.
          </p>
          {copyError && <p className="receipt-copy-error" role="alert">{copyError}</p>}
        </div>
      </section>
      {receiptOrder?.customer?.phone && (
        <div className="confirmation-nonprint">
          <ProductReviewForm
            orderNumber={receiptOrder.orderNumber}
            phone={receiptOrder.customer.phone}
          />
        </div>
      )}
    </main>
  );
}
