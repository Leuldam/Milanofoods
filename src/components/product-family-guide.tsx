"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

type FamilyProduct = {
  id: string;
  name: string;
  categorySlug: string;
  flavor: string | null;
  variantType: string | null;
  size: string;
};

type ProductFamily = {
  slug: string;
  name: string;
  image: string;
  summary: string;
};

const families: ProductFamily[] = [
  {
    slug: "mojito-syrups",
    name: "Mojito Syrups",
    image: "/images/mojitol.png",
    summary: "Ready-to-use flavors for refreshing drinks and café menus.",
  },
  {
    slug: "ice-cream-powders",
    name: "Ice Cream Powders",
    image: "/images/milanoice.png",
    summary: "Hard and soft styles for ice cream shops and dessert menus.",
  },
  {
    slug: "milkshake-powders",
    name: "Milkshake Products",
    image: "/images/milanomilk.png",
    summary: "Powder and liquid formats for shakes and blended drinks.",
  },
];

export function ProductFamilyGuide() {
  const [products, setProducts] = useState<FamilyProduct[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      try {
        const response = await fetch("/api/products", { cache: "no-store" });
        if (!response.ok) throw new Error(`Products request failed (${response.status})`);
        const result: unknown = await response.json();
        if (!Array.isArray(result)) throw new Error("Products response was not a list");

        const validProducts = result.filter(
          (item): item is FamilyProduct =>
            typeof item === "object" &&
            item !== null &&
            "categorySlug" in item &&
            typeof item.categorySlug === "string" &&
            "name" in item &&
            typeof item.name === "string",
        );
        if (active) setProducts(validProducts);
      } catch (error) {
        console.error("Unable to load product guide options:", error);
        if (active) setLoadError(true);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadProducts();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="product-guide-simple">
      <header className="product-guide-simple-hero">
        <div className="wrap">
          <div className="breadcrumb">
            <Link href="/">Home</Link><span aria-hidden="true">/</span><span>Product guide</span>
          </div>
          <div className="product-guide-simple-intro">
            <span className="eyebrow">Product guide</span>
            <h1>Find the right Milano product.</h1>
            <p>Explore our product families and see the flavors and formats currently available.</p>
            <Link className="btn" href="/products">Browse all products <ArrowRight size={16} /></Link>
          </div>
        </div>
      </header>

      <section className="product-guide-simple-catalog" aria-labelledby="product-guide-families">
        <div className="wrap">
          <div className="product-guide-simple-heading">
            <div>
              <span className="eyebrow">Explore the range</span>
              <h2 id="product-guide-families">Choose a product family</h2>
            </div>
            <p>Open a product to see its details and ordering options.</p>
          </div>

          <div className="product-guide-simple-grid">
            {families.map((family) => {
              const familyProducts = products.filter((product) => product.categorySlug === family.slug);

              return (
                <article className="product-guide-family" key={family.slug}>
                  <div className="product-guide-family-head">
                    <div className="product-guide-family-image">
                      <Image src={family.image} alt="" fill sizes="100px" />
                    </div>
                    <div>
                      <h3>{family.name}</h3>
                      <p>{family.summary}</p>
                    </div>
                  </div>

                  <div className="product-guide-family-products">
                    <div className="product-guide-family-products-heading">
                      <strong>Available products</strong>
                      <span>
                        {loading ? "Loading" : loadError ? "Unavailable" : familyProducts.length}
                      </span>
                    </div>

                    {loading ? (
                      <p className="product-guide-family-message">Checking current availability…</p>
                    ) : loadError ? (
                      <p className="product-guide-family-message">We couldn&apos;t load the catalog. Try browsing all products.</p>
                    ) : familyProducts.length ? (
                      <div className="product-guide-family-list">
                        {familyProducts.slice(0, 4).map((product) => (
                          <Link href={`/products/${product.id}`} key={product.id}>
                            <span>
                              <strong>{product.flavor || product.name}</strong>
                              <small>{[product.variantType, product.size].filter(Boolean).join(" · ") || product.name}</small>
                            </span>
                            <ChevronRight size={17} aria-hidden="true" />
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="product-guide-family-message">No products in this family are currently listed.</p>
                    )}
                  </div>

                  <Link className="product-guide-family-link" href={`/products?category=${family.slug}`}>
                    Browse family <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
