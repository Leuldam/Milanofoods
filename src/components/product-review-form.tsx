"use client";

import { FormEvent, useEffect, useState } from "react";
import { Star } from "lucide-react";

type ReviewableProduct = { id: string; name: string };

export function ProductReviewForm({
  orderNumber,
  phone,
}: {
  orderNumber: string;
  phone: string;
}) {
  const [products, setProducts] = useState<ReviewableProduct[]>([]);
  const [eligibilityMessage, setEligibilityMessage] = useState(
    "Checking your order...",
  );
  const [eligible, setEligible] = useState(false);
  const [productId, setProductId] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkEligibility() {
      try {
        const response = await fetch("/api/reviews/eligibility", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderNumber, phone }),
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
        if (!active) return;

        setEligible(result.canReview);
        setProducts(result.products);
        setEligibilityMessage(result.message || "");
      } catch (error) {
        console.error(error);
        if (active) {
          setEligibilityMessage(
            error instanceof Error ? error.message : "Unable to verify this order.",
          );
        }
      }
    }

    checkEligibility();
    return () => {
      active = false;
    };
  }, [orderNumber, phone]);

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, orderNumber, phone, rating, comment }),
      });
      const result: { message?: string; error?: string } = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to submit your review.");
      }
      if (!result.message) throw new Error("The review response was incomplete.");

      setSuccess(result.message);
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
    <section className="section product-reviews-section" aria-labelledby="leave-review-title">
      <div className="wrap">
        <div className="review-form">
          <h2 id="leave-review-title">Review your order</h2>
          {!eligible || products.length === 0 ? (
            <p className="review-status" role="status">
              {success || eligibilityMessage}
            </p>
          ) : (
            <>
              <p>Your review will be published on our homepage after admin approval.</p>
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
      </div>
    </section>
  );
}
