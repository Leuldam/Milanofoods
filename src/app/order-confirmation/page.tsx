import { Suspense } from "react";
import { OrderConfirmationContent } from "./order-confirmation-content";

export default function OrderConfirmationPage() {
  return (
    <Suspense
      fallback={
        <main className="wrap">
          <section className="confirmation" aria-busy="true">
            <p>Loading your order confirmation…</p>
          </section>
        </main>
      }
    >
      <OrderConfirmationContent />
    </Suspense>
  );
}
