"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Check,
  Minus,
  Plus,
  ShoppingBag,
  Truck,
} from "lucide-react";

import { Product, money } from "@/lib/products";
import { ProductCard } from "@/components/product-card";
import { useStore } from "@/components/store-provider";

type StoreProduct = Product & {
  availableStock: number;
  inStock: boolean;
};

export default function ProductPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);

  const { add } = useStore();

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      try {
        const response = await fetch("/api/products", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to load products.");
        }

        const data: StoreProduct[] = await response.json();

        if (active) setProducts(data);
      } catch (error) {
        console.error("Product loading failed:", error);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProducts();

    return () => {
      active = false;
    };
  }, []);

  const p = products.find((product) => product.slug === slug);

  useEffect(() => {
    setQty(1);
  }, [slug]);

  if (loading) {
    return (
      <main className="wrap section">
        <p>Loading product...</p>
      </main>
    );
  }

  if (!p) {
    return (
      <main className="wrap section">
        <h1>Product not found</h1>
        <p>This product may be unavailable or unpublished.</p>
        <Link className="btn" href="/products">
          Browse products
        </Link>
      </main>
    );
  }

  const unavailable = !p.inStock || p.availableStock < 1;

  return (
    <main>
      <section className="section">
        <div className="wrap">
          <div className="breadcrumb">
            <Link href="/">Home</Link> /{" "}
            <Link href="/products">Products</Link> / {p.name}
          </div>

          <div className="product-detail">
            <div
              className={`detail-image${
                p.category === "Mojito Syrups"
                  ? " detail-image-bottle"
                  : ""
              }`}
            >
              <Image
                src={p.image}
                alt={p.name}
                width={1000}
                height={1100}
                priority
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit:
                    p.category === "Mojito Syrups" ? "contain" : "cover",
                }}
              />
            </div>

            <div className="detail-copy">
              <span className="eyebrow">{p.category}</span>

              <h1>{p.name}</h1>

              <p className="lead">{p.description}</p>

              <div className="detail-price">{money(p.price)}</div>

              <p
                style={{
                  fontSize: 12,
                  color: unavailable ? "#a33" : "#4e795d",
                }}
              >
                {unavailable ? (
                  <>Currently out of stock</>
                ) : (
                  <>
                    <Check
                      size={14}
                      style={{
                        display: "inline",
                        verticalAlign: "middle",
                        marginRight: 6,
                      }}
                    />
                    {p.availableStock} available
                  </>
                )}
              </p>

              <div className="field" style={{ maxWidth: 220 }}>
                <label>Package size</label>
                <div
                  style={{
                    border: "1px solid var(--line)",
                    padding: 13,
                    background: "#fff",
                  }}
                >
                  {p.size}
                </div>
              </div>

              <div className="field">
                <label>Quantity</label>

                <div className="qty-control">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    aria-label="Decrease quantity"
                    disabled={unavailable}
                  >
                    <Minus size={14} />
                  </button>

                  <span>{qty}</span>

                  <button
                    onClick={() =>
                      setQty(Math.min(p.availableStock, qty + 1))
                    }
                    aria-label="Increase quantity"
                    disabled={unavailable || qty >= p.availableStock}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              <div className="detail-actions">
                <button
                  className="btn"
                  disabled={unavailable}
                  onClick={() =>
                    add(
                      {
                        id: p.id,
                        name: p.name,
                        slug: p.slug,
                        price: p.price,
                        image: p.image,
                        size: p.size,
                        availableStock: p.availableStock,
                        inStock: p.inStock,
                      },
                      qty
                    )
                  }
                >
                  <ShoppingBag size={16} />
                  {unavailable ? "Out of Stock" : "Add to Cart"}
                </button>

                <Link href="/cart" className="btn btn-outline">
                  View Cart
                </Link>
              </div>

              <div className="detail-points">
                <span>
                  <Truck
                    size={14}
                    style={{
                      display: "inline",
                      verticalAlign: "middle",
                      marginRight: 5,
                    }}
                  />
                  Delivery options at checkout
                </span>

                <span>Pickup available in selected locations</span>
              </div>

              <div
                style={{
                  borderTop: "1px solid var(--line)",
                  marginTop: 28,
                  paddingTop: 22,
                }}
              >
                <h3 style={{ fontSize: 23 }}>Product information</h3>

                <p className="lead">
                  For ingredients, storage guidance, and preparation
                  details, refer to the verified product packaging.
                  Our team can help confirm product details before
                  you order.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: "#fffdf9" }}>
        <div className="wrap">
          <div className="section-head">
            <div>
              <span className="eyebrow">Keep exploring</span>
              <h2>You may also like</h2>
            </div>
          </div>

          <div className="product-grid">
            {products
              .filter((item) => item.id !== p.id)
              .slice(0, 4)
              .map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
          </div>
        </div>
      </section>
    </main>
  );
}