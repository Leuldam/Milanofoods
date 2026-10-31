"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  MessageCircle,
  ShoppingBag,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { CartLine } from "@/components/store-provider";
import { money } from "@/lib/products";

type SavedOrder = {
  orderNumber: string;
  cart: CartLine[];
  subtotal: number;
  method: "delivery" | "pickup";
  payment: string;
  reservationExpiresAt?: string;
};

function isSavedOrder(value: unknown): value is SavedOrder {
  if (typeof value !== "object" || value === null) return false;

  const order = value as Record<string, unknown>;
  return (
    typeof order.orderNumber === "string" &&
    Array.isArray(order.cart) &&
    typeof order.subtotal === "number" &&
    (order.method === "delivery" || order.method === "pickup") &&
    typeof order.payment === "string"
  );
}

export function OrderConfirmationContent() {
  const params = useSearchParams();
  const [order, setOrder] = useState<SavedOrder | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

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
    if (!order?.reservationExpiresAt) return;

    const expiry = new Date(order.reservationExpiresAt).getTime();
    if (!Number.isFinite(expiry)) return;

    const updateCountdown = () => {
      setRemaining(Math.max(0, Math.floor((expiry - Date.now()) / 1000)));
    };

    updateCountdown();
    const interval = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(interval);
  }, [order?.reservationExpiresAt]);

  const orderNumber =
    params.get("order") || order?.orderNumber || "MILANO";
  const minutes = remaining !== null ? Math.floor(remaining / 60) : null;
  const seconds = remaining !== null ? remaining % 60 : null;

  return (
    <main className="wrap">
      <section className="confirmation">
        <div className="success-mark">
          <CheckCircle2 size={32} />
        </div>
        <span className="eyebrow">Order received</span>
        <h1>Thank you for your order.</h1>
        <p>
          Your order request has been submitted to Milano Foods. Our team will
          review it and contact you to confirm availability, delivery fees, and
          payment arrangements.
        </p>
        <div className="order-number">ORDER {orderNumber}</div>
        <div
          className="summary-card"
          style={{ textAlign: "left", marginTop: 24, marginBottom: 24 }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <Clock size={20} color="#a36c27" />
            <strong>Pending confirmation</strong>
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.7, margin: 0 }}>
            Your order is awaiting approval from Milano Foods. Stock is
            temporarily reserved while the order is pending.
          </p>
          {remaining !== null && (
            <div style={{ marginTop: 18 }}>
              {remaining > 0 ? (
                <>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>
                    Reservation time remaining
                  </span>
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 700,
                      marginTop: 5,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {String(minutes).padStart(2, "0")}:
                    {String(seconds).padStart(2, "0")}
                  </div>
                </>
              ) : (
                <p
                  style={{
                    color: "#b42318",
                    fontSize: 12,
                    marginBottom: 0,
                  }}
                >
                  The reservation period has ended. Please contact Milano Foods
                  to check your order status.
                </p>
              )}
            </div>
          )}
        </div>
        {order && (
          <div className="summary-card confirmation-summary">
            <h3>Order summary</h3>
            {order.cart.map((item, index) => (
              <div className="summary-line" key={`${item.id}-${index}`}>
                <span>
                  {item.name} × {item.qty}
                </span>
                <span>{money(item.price * item.qty)}</span>
              </div>
            ))}
            <div className="summary-line summary-total">
              <span>Subtotal</span>
              <span>{money(order.subtotal)}</span>
            </div>
            <div className="summary-line">
              <span>Fulfillment</span>
              <span>{order.method === "pickup" ? "Pickup" : "Delivery"}</span>
            </div>
            <div className="summary-line">
              <span>Payment preference</span>
              <span>{order.payment}</span>
            </div>
          </div>
        )}
        <p className="confirmation-reference">
          Please keep your order number for reference when speaking with our
          team.
        </p>
        <div className="confirmation-actions">
          <Link href="/products" className="btn">
            <ShoppingBag size={15} /> Continue shopping
          </Link>
          <Link href="/contact" className="btn btn-outline">
            <MessageCircle size={15} /> Contact Milano
          </Link>
        </div>
      </section>
    </main>
  );
}
