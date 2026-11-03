"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Star } from "lucide-react";

type ReviewableProduct = { id: string; name: string };
export type SubmittedReview = {
  id: string;
  productName: string;
  displayName: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export function ProductReviewForm({
  orderNumber: initialOrderNumber,
  phone: initialPhone,
  onReviewSubmitted,
}: {
  orderNumber?: string;
  phone?: string;
  onReviewSubmitted?: (review: SubmittedReview) => void;
}) {
  const [products, setProducts] = useState<ReviewableProduct[]>([]);
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber || "");
  const [phone, setPhone] = useState(initialPhone || "");
  const [verifiedOrderNumber, setVerifiedOrderNumber] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [eligibilityMessage, setEligibilityMessage] = useState("");
  const [eligible, setEligible] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [productId, setProductId] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const checkEligibility = useCallback(async (order: string, customerPhone: string) => {
    setEligibilityMessage("Checking your order...");
    setEligible(false);
    setProducts([]);
    setVerifying(true);

    try {
      const response = await fetch("/api/reviews/eligibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: order, phone: customerPhone }),
        cache: "no-store",
      });
      const result: {
        canReview?: boolean;
        products?: ReviewableProduct[];
        message?: string;
        error?: string;
      } = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to verify this order.");
      }
      if (!Array.isArray(result.products) || typeof result.canReview !== "boolean") {
        throw new Error("The order verification response was incomplete.");
      }

      setVerifiedOrderNumber(order.trim().toUpperCase());
      setVerifiedPhone(customerPhone);
      setEligible(result.canReview);
      setProducts(result.products);
      setEligibilityMessage(result.message || "");
    } catch (error) {
      console.error(error);
      setEligibilityMessage(
        error instanceof Error ? error.message : "Unable to verify this order.",
      );
    } finally {
      setVerifying(false);
    }
  }, []);

  useEffect(() => {
    if (initialOrderNumber && initialPhone) {
      void checkEligibility(initialOrderNumber, initialPhone);
    }
  }, [checkEligibility, initialOrderNumber, initialPhone]);

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          orderNumber: verifiedOrderNumber,
          phone: verifiedPhone,
          rating,
          comment,
        }),
      });
      const result: { message?: string; error?: string; review?: SubmittedReview } = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to submit your review.");
      }
      if (!result.message) throw new Error("The review response was incomplete.");
      if (!result.review) throw new Error("The published review response was incomplete.");

      setSuccess(result.message);
      onReviewSubmitted?.(result.review);
      setProducts((current) => current.filter((product) => product.id !== productId));
      setProductId("");
      setRating(5);
      setComment("");
    } catch (error) {
      console.error(error);
      setFormError(
        error instanceof Error ? error.message : "Unable to submit your review.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="review-form" aria-labelledby="leave-review-title">
          <h2 id="leave-review-title">Share your experience</h2>
          {!eligible || products.length === 0 ? (
            <>
              {eligibilityMessage && (
                <p className="review-status" role="status">
                  {success || eligibilityMessage}
                </p>
              )}
              {!initialOrderNumber && (
                <>
                  <p>Enter your order number and phone number to review a product you purchased. Reviews from verified orders publish right away.</p>
                  <label className="field">
                    <span>Order number</span>
                    <input
                      required
                      autoComplete="off"
                      value={orderNumber}
                      onChange={(event) => setOrderNumber(event.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>Phone number used for your order</span>
                    <input
                      required
                      autoComplete="tel"
                      inputMode="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                    />
                  </label>
                  <button
                    className="btn"
                    type="button"
                    disabled={verifying || !orderNumber.trim() || !phone.trim()}
                    onClick={() => void checkEligibility(orderNumber, phone)}
                  >
                    {verifying ? "Checking order..." : "Find my order"}
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <p>Your review will appear in customer reviews immediately after submission.</p>
              <form onSubmit={submitReview}>
                <label className="field">
                  <span>Product from your order</span>
                  <select
                    required
                    value={productId}
                    onChange={(event) => setProductId(event.target.value)}
                  >
                    <option value="">Choose a product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </label>

                <fieldset className="review-rating">
                  <legend>Your rating</legend>
                  <div>
                    {Array.from({ length: 5 }, (_, index) => {
                      const value = index + 1;
                      return (
                        <button
                          key={value}
                          type="button"
                          aria-label={`${value} star${value === 1 ? "" : "s"}`}
                          aria-pressed={rating === value}
                          onClick={() => setRating(value)}
                        >
                          <Star
                            size={23}
                            fill={value <= rating ? "currentColor" : "none"}
                            aria-hidden="true"
                          />
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <label className="field">
                  <span>Your review</span>
                  <textarea
                    required
                    minLength={10}
                    maxLength={1000}
                    rows={5}
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                  />
                </label>

                {formError && (
                  <p className="review-status review-error" role="alert">
                    {formError}
                  </p>
                )}
                {success && (
                  <p className="review-status review-success" role="status">
                    {success}
                  </p>
                )}
                <button className="btn" type="submit" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit review"}
                </button>
              </form>
            </>
          )}
    </div>
  );
}
