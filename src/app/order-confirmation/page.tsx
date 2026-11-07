import { Suspense } from "react";
import { OrderConfirmationContent } from "./order-confirmation-content";

export default function OrderConfirmationPage() {
  return (
    <Suspense
      fallback={
        <main className="wrap order-confirmation-page">
          <section className="confirmation confirmation-loading" aria-busy="true" role="status" aria-label="Loading your order confirmation">
            <span className="site-skeleton confirmation-loading-mark" aria-hidden="true" />
            <span className="site-skeleton confirmation-loading-title" aria-hidden="true" />
            <span className="site-skeleton confirmation-loading-line" aria-hidden="true" />
            <span className="site-skeleton confirmation-loading-reference" aria-hidden="true" />
            <span className="site-skeleton-label">Loading your order confirmation…</span>
          </section>
        </main>
      }
    >
      <OrderConfirmationContent />
    </Suspense>
  );
}
