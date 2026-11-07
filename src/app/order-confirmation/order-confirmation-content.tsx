"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Download,
  MessageCircle,
  PackageCheck,
  Printer,
  ShoppingBag,
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
    month: "short",
    year: "numeric",
    timeZone: "Africa/Addis_Ababa",
  }).format(date);
}

export function OrderConfirmationContent() {
  const params = useSearchParams();
  const [order, setOrder] = useState<SavedOrder | null>(null);
  const [receiptReady, setReceiptReady] = useState(false);
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

  const rawOrderNumber = params.get("order") || order?.orderNumber || "";
  const receiptOrder = (order?.orderNumber === rawOrderNumber || (order?.orderNumber && rawOrderNumber && order.orderNumber.startsWith(rawOrderNumber))) ? order : null;
  const total = receiptOrder?.total ?? receiptOrder?.subtotal ?? 0;
  const deliveryFee = receiptOrder?.deliveryFee ?? 0;
  const paymentAccountNumber = receiptOrder?.paymentAccountNumber || "";

  // Exactly 6 characters only for the order number display
  const displayOrderNumber = rawOrderNumber
    .replace(/^ORDER\s*#?/i, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 6)
    .toUpperCase();

  return (
    <main className="wrap order-confirmation-page">
      <section className="confirmation">
        <div className="confirmation-intro">
          <div className="success-mark">
            <CheckCircle2 size={26} />
          </div>
          <span className="eyebrow">Order received</span>
          <h1>Your order is in good hands.</h1>
          <p>
            Milano Foods has received your order request. Our team will contact
            you to confirm availability and delivery.
          </p>
          {displayOrderNumber && <div className="order-number">{displayOrderNumber}</div>}
        </div>

        {receiptOrder ? (
          <div
            className="receipt-machine"
            ref={receiptRef}
            onContextMenu={(e) => e.preventDefault()}
          >
            <div className="receipt-printer-head" aria-hidden="true">
              <div className="receipt-printer-brand">
                <span className="receipt-printer-light" />
                <span>MILANO FOODS <small>POINT OF SALE</small></span>
                <Printer size={16} />
              </div>
              <div className="receipt-printer-slot"><span /></div>
            </div>
            <article
              className="receipt-paper receipt-protected"
              aria-label="Order receipt"
              onCopy={(e) => e.preventDefault()}
              onCut={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
              onContextMenu={(e) => e.preventDefault()}
            >
              <header className="receipt-header">
                <div>
                  <span className="receipt-kicker">MILANO FOODS · ETHIOPIA</span>
                  <h2>ORDER RECEIPT</h2>
                </div>
                <div className="receipt-brand-block">
                  <strong>MILANO</strong>
                  <span>FOODS</span>
                  <small>MORE THAN JUST A TASTE</small>
                </div>
              </header>

              <div className="receipt-order-meta">
                <div>
                  <span>ORDER NUMBER</span>
                  <strong>{displayOrderNumber || receiptOrder.orderNumber.slice(0, 6).toUpperCase()}</strong>
                </div>
                <div>
                  <span>ORDER DATE</span>
                  <strong>{formatReceiptDate(receiptOrder.createdAt)}</strong>
                </div>
                <div>
                  <span>STATUS</span>
                  <strong className="receipt-status-badge">RECEIVED</strong>
                </div>
              </div>

              <div className="receipt-parties">
                <section>
                  <h3>ORDERED BY</h3>
                  <strong>{receiptOrder.customer?.name || "Milano Customer"}</strong>
                  {receiptOrder.customer?.phone && <span>{receiptOrder.customer.phone}</span>}
                  {receiptOrder.customer?.company && <span>{receiptOrder.customer.company}</span>}
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
                  {receiptOrder.paymentAccountName && <span>A/C: {receiptOrder.paymentAccountName}</span>}
                  {paymentAccountNumber && (
                    <div className="receipt-account-info">
                      <span>A/C No: <strong>{paymentAccountNumber}</strong></span>
                    </div>
                  )}
                </section>
              </div>

              <table className="receipt-items">
                <thead>
                  <tr>
                    <th className="receipt-col-desc">Item</th>
                    <th className="receipt-col-qty">Qty</th>
                    <th className="receipt-col-price">Price</th>
                    <th className="receipt-col-amount">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptOrder.cart.map((item, index) => {
                    const subtitle = [item.flavor, item.variantType, item.size, item.packagingLabel]
                      .filter(Boolean)
                      .join(" · ");

                    return (
                      <tr className="receipt-item-row" key={`${item.id}-${index}`}>
                        <td className="receipt-col-desc">
                          <strong>{item.name}</strong>
                          {subtitle && <small>{subtitle}</small>}
                        </td>
                        <td className="receipt-col-qty">
                          <span>{item.qty} × {item.unitsPerPackage || 1}</span>
                        </td>
                        <td className="receipt-col-price">
                          <span>{money(getCartLinePrice(item))}</span>
                        </td>
                        <td className="receipt-col-amount">
                          <strong>{money(getCartLineTotal(item))}</strong>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3}>Subtotal</td>
                    <td className="receipt-col-amount">{money(receiptOrder.subtotal)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3}>Delivery fee</td>
                    <td className="receipt-col-amount">{deliveryFee ? money(deliveryFee) : "TBD"}</td>
                  </tr>
                  <tr className="receipt-grand-total">
                    <td colSpan={3}>TOTAL</td>
                    <td className="receipt-col-amount">
                      <strong>{money(total)}</strong>
                    </td>
                  </tr>
                </tfoot>
              </table>

              <footer className="receipt-footer">
                <section>
                  <h3>MILANO FOODS</h3>
                  <p>Addis Ababa, Ethiopia · <a href="tel:+251980637293">+251 980 637 293</a> · <a href="mailto:milanofoodprocessing@gmail.com">milanofoodprocessing@gmail.com</a></p>
                </section>
                <div className="receipt-thanks">
                  <PackageCheck size={18}/>
                  <strong>Thank you for choosing Milano!</strong>
                </div>
              </footer>
              <div className="receipt-tear" aria-hidden="true" />
            </article>
            <p className="receipt-printing-label" aria-live="polite">
              {receiptReady ? "Receipt ready" : "Printing receipt"}
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
            {receiptOrder && (
              <button type="button" className="btn receipt-download" onClick={() => window.print()}>
                <Download size={15}/> Download receipt
              </button>
            )}
            <Link href="/products" className="btn btn-outline">
              <ShoppingBag size={14} /> Continue shopping
            </Link>
            <Link href="/contact" className="btn btn-outline">
              <MessageCircle size={14} /> Contact Milano
            </Link>
          </div>
          <p className="confirmation-reference">
            Choose “Save as PDF” in the print dialog to download a copy of your receipt.
          </p>
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
