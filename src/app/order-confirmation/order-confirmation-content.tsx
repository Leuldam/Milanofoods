"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, MessageCircle, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import type { CartLine } from "@/components/store-provider";
import { money } from "@/lib/products";

type SavedOrder = {
  orderNumber: string;
  cart: CartLine[];
  subtotal: number;
  method: "delivery" | "pickup";
  payment: string;
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

  const orderNumber = params.get("order") || order?.orderNumber || "MILANO";

  return (
    <main className="wrap">
      <section className="confirmation">
        <div className="success-mark">
          <Check size={32} />
        </div>
        <span className="eyebrow">Order received</span>
        <h1>Thank you for your order.</h1>
        <p>
          Your order details have been submitted to Milano Foods. Our team will
          contact you to confirm availability, the final delivery fee, and
          payment arrangements.
        </p>
        <div className="order-number">ORDER {orderNumber}</div>
        {order && (
          <div className="summary-card confirmation-summary">
            <h3>Order summary</h3>
            {order.cart.map((item) => (
              <div className="summary-line" key={item.id}>
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
