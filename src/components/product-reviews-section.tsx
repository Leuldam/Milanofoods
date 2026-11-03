"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { ProductReviewForm, type SubmittedReview } from "@/components/product-review-form";

type Review = SubmittedReview;

export function ProductReviewsSection() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadReviews() {
      try {
        const response = await fetch("/api/reviews", { cache: "no-store" });
        if (!response.ok) throw new Error("Unable to load customer reviews.");
        setReviews(await response.json());
      } catch (loadError) {
        console.error(loadError);
        setError("Customer reviews are temporarily unavailable.");
      }
    }

    loadReviews();
  }, []);

  return (
    <section id="customer-reviews" className="section product-reviews-section" aria-labelledby="product-reviews-title">
      <div className="wrap">
        <div className="section-head">
          <div>
            <span className="eyebrow">From our customers</span>
            <h2 id="product-reviews-title">Customer reviews</h2>
            <p>Honest feedback from verified Milano customers. New reviews appear right away.</p>
          </div>
        </div>

        <div className="product-review-list" aria-live="polite">
          {error ? (
            <p className="review-status review-error">{error}</p>
          ) : reviews.length === 0 ? (
            <p className="review-status">No customer reviews yet. Be the first to share your experience.</p>
          ) : (
            reviews.map((review) => (
              <article className="product-review-card" key={review.id}>
                <div className="review-stars" aria-label={`${review.rating} out of 5 stars`}>
                  {Array.from({ length: 5 }, (_, index) => (
                    <Star
                      key={index}
                      size={16}
                      fill={index < review.rating ? "currentColor" : "none"}
                      aria-hidden="true"
                    />
                  ))}
                </div>
                <h3>{review.productName}</h3>
                <p>{review.comment}</p>
                <span className="review-author">{review.displayName}</span>
              </article>
            ))
          )}
        </div>
        <div className="review-submission">
          <ProductReviewForm onReviewSubmitted={(review) => {
            setReviews((current) => [review, ...current]);
          }} />
        </div>
      </div>
    </section>
  );
}
