"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { Product } from "@/lib/products";
import { Search, SlidersHorizontal } from "lucide-react";

type StoreProduct = Product & {
  availableStock: number;
  inStock: boolean;
};

const categoryOptions = [
  "All Products",
  "Mojito Syrups",
  "Ice Cream Powders",
  "Milkshake Powders",
];

export default function ProductsPage() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All Products");
  const [sort, setSort] = useState("featured");
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const selectedCategory = new URLSearchParams(
      window.location.search
    ).get("category");

    if (
      selectedCategory &&
      categoryOptions.includes(selectedCategory)
    ) {
      setCategory(selectedCategory);
    }

    async function loadProducts() {
      try {
        const response = await fetch("/api/products", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to load products.");
        }

        const data: StoreProduct[] = await response.json();
        setProducts(data);
      } catch (err) {
        console.error(err);
        setError("Unable to load products. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  const list = useMemo(() => {
    const arr = products.filter(
      (p) =>
        (category === "All Products" || p.category === category) &&
        `${p.name} ${p.category}`.toLowerCase().includes(q.toLowerCase())
    );

    if (sort === "low") arr.sort((a, b) => a.price - b.price);
    if (sort === "high") arr.sort((a, b) => b.price - a.price);
    if (sort === "name") arr.sort((a, b) => a.name.localeCompare(b.name));

    return arr;
  }, [products, q, category, sort]);

  return (
    <main>
      <section className="page-hero">
        <div className="wrap">
          <div className="breadcrumb">Home / Products</div>
          <span className="eyebrow">Explore the collection</span>
          <h1>All products</h1>
          <p>
            Discover Milano syrups and dessert powders for your next
            favorite creation.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="catalog-tools">
            <div style={{ position: "relative", flex: 1 }}>
              <Search
                size={17}
                style={{
                  position: "absolute",
                  left: 13,
                  top: 14,
                  color: "#777",
                }}
              />
              <input
                className="search-input"
                style={{ paddingLeft: 40 }}
                placeholder="Search products..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <select
              aria-label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categoryOptions.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>

            <select
              aria-label="Sort products"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="featured">Featured</option>
              <option value="low">Price: low to high</option>
              <option value="high">Price: high to low</option>
              <option value="name">Name</option>
            </select>
          </div>

          <div className="catalog-layout">
            <aside className="filters">
              <h3>
                <SlidersHorizontal
                  size={14}
                  style={{ display: "inline", marginRight: 8 }}
                />
                Categories
              </h3>

              {categoryOptions.map((item) => (
                <label key={item}>
                  <input
                    type="radio"
                    name="category"
                    checked={category === item}
                    onChange={() => setCategory(item)}
                  />
                  {item}
                </label>
              ))}
            </aside>

            <div>
              {loading ? (
                <p>Loading products...</p>
              ) : error ? (
                <div className="empty-state">
                  <h2>Products unavailable</h2>
                  <p>{error}</p>
                  <button
                    className="btn"
                    onClick={() => window.location.reload()}
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <>
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--muted)",
                      margin: "0 0 18px",
                    }}
                  >
                    {list.length} products
                  </p>

                  {list.length ? (
                    <div className="product-grid">
                      {list.map((p) => (
                        <ProductCard key={p.id} product={p} />
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <h2>No products found</h2>
                      <p>Try another search or category.</p>
                      <button
                        className="btn"
                        onClick={() => {
                          setQ("");
                          setCategory("All Products");
                        }}
                      >
                        Clear filters
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}