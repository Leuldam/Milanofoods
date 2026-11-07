"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, Check, ChevronRight, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

type FamilyProduct = {
  id: string;
  name: string;
  categorySlug: string;
  flavor: string | null;
  variantType: string | null;
  size: string;
  packagingOptions: { id: string; label: string; unitsPerPackage: number }[];
};

type ProductFamily = {
  slug: string;
  name: string;
  eyebrow: string;
  image: string;
  summary: string;
  chooseWhen: string;
  fits: string[];
  accent: "mint" | "cream" | "berry";
};

const families: ProductFamily[] = [
  {
    slug: "mojito-syrups",
    name: "Mojito Syrup",
    eyebrow: "For drinks & beverage menus",
    image: "/images/milano-mint-bottle-cutout.png",
    summary: "A ready-to-use syrup range for refreshing drinks, café menus, and easy-to-customize beverages.",
    chooseWhen: "Choose this range when you want a convenient flavor base for cold drinks.",
    fits: ["Cafés & restaurants", "Home beverage stations", "Cold drink menus"],
    accent: "mint",
  },
  {
    slug: "ice-cream-powders",
    name: "Ice Cream Powder",
    eyebrow: "For frozen dessert programs",
    image: "/images/milanoice.png",
    summary: "A dessert base available in different flavors, styles, and pack sizes for frozen treat menus.",
    chooseWhen: "Compare the available style and pack size with your equipment and serving needs.",
    fits: ["Ice cream shops", "Dessert menus", "Food-service kitchens"],
    accent: "cream",
  },
  {
    slug: "milkshake-powders",
    name: "Milkshake Powder",
    eyebrow: "For shakes & blended drinks",
    image: "/images/milanomilk.png",
    summary: "A range of milkshake products designed for creamy drinks at home and in professional kitchens.",
    chooseWhen: "Check the selected product’s format and serving directions before choosing a pack.",
    fits: ["Milkshake counters", "Cafés & restaurants", "At-home treats"],
    accent: "berry",
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
        console.error("Unable to load product family details:", error);
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
    <>
      <section className="family-guide-hero">
        <div className="wrap family-guide-hero-inner">
          <div className="family-guide-hero-copy">
            <div className="breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span>Product guide</span></div>
            <span className="eyebrow">A guide to the Milano range</span>
            <h1>Find the right product <em>for your menu.</em></h1>
            <p>
              Compare our product families, see currently available formats and pack sizes,
              then open a product for its details. This guide helps you choose; recipes help
              you decide what to make.
            </p>
            <div className="family-guide-hero-actions">
              <a className="btn" href="#family-guide-list">Explore product families <ArrowDown size={16} /></a>
              <Link className="family-guide-text-link" href="/recipes">Looking for recipes? <ArrowRight size={14} /></Link>
            </div>
          </div>
          <div className="family-guide-hero-art">
            <span className="family-guide-hero-orbit" aria-hidden="true" />
            <Image
              src="/images/milanoshowcase-guide.webp"
              alt="Milano Foods milkshake powder, ice cream powder, and mojito syrup"
              fill
              priority
              loading="eager"
              fetchPriority="high"
              sizes="(max-width: 860px) 100vw, 48vw"
            />
            <div className="family-guide-hero-stamp"><span>THE MILANO</span><strong>Range</strong></div>
          </div>
        </div>
      </section>

      <section className="family-guide-purpose" aria-label="What you can do with the product guide">
        <div className="wrap family-guide-purpose-inner">
          <article>
            <span>01</span>
            <div><strong>Choose a family</strong><p>Start with the type of product you need.</p></div>
          </article>
          <article>
            <span>02</span>
            <div><strong>Compare options</strong><p>Review live flavors, formats, and pack sizes.</p></div>
          </article>
          <article>
            <span>03</span>
            <div><strong>Check product details</strong><p>Open an item for its current information.</p></div>
          </article>
        </div>
      </section>

      <nav className="family-guide-jump-nav" aria-label="Product guide sections">
        <div className="wrap">
          {families.map((family, index) => (
            <a key={family.slug} href={`#${family.slug}`}>
              <span>0{index + 1}</span>{family.name}<ArrowRight size={15} aria-hidden="true" />
            </a>
          ))}
        </div>
      </nav>

      <div className="family-guide-main" id="family-guide-list">
        {families.map((family, index) => {
          const familyProducts = products.filter((product) => product.categorySlug === family.slug);
          const flavors = [...new Set(familyProducts.map((product) => product.flavor?.trim()).filter((value): value is string => Boolean(value)))];
          const formats = [...new Set(familyProducts.map((product) => product.variantType?.trim()).filter((value): value is string => Boolean(value)))];
          const sizes = [...new Set(familyProducts.map((product) => product.size?.trim()).filter((value): value is string => Boolean(value)))];
          const packagings = [...new Set(familyProducts.flatMap((product) => product.packagingOptions.map((option) => option.label)))];

          return (
            <section className={`family-guide-detail-section family-guide-${family.accent}`} id={family.slug} key={family.slug}>
              <div className="wrap">
                <div className="family-guide-section-heading">
                  <span className="eyebrow">Product family 0{index + 1}</span>
                  <span className="family-guide-section-kicker">{family.eyebrow}</span>
                  <h2>{family.name}</h2>
                </div>
                <div className="family-guide-family-card">
                  <div className="family-guide-visual">
                    <div className="family-guide-image">
                      <Image src={family.image} alt={family.name} fill sizes="(max-width: 860px) 100vw, 40vw" />
                    </div>
                    <div className="family-guide-use-card">
                      <Sparkles size={17} aria-hidden="true" />
                      <div><strong>Good fit for</strong><span>{family.fits.join(" · ")}</span></div>
                    </div>
                  </div>

                  <div className="family-guide-content">
                    <p className="family-guide-lead">{family.summary}</p>
                    <div className="family-guide-choice-note">
                      <span>CHOOSING THIS FAMILY</span>
                      <p>{family.chooseWhen}</p>
                    </div>

                    <div className="family-guide-catalog">
                      <div className="family-guide-subheading">
                        <div><span>Live product catalog</span><h3>Available options</h3></div>
                        <span className={`family-guide-live-status${loadError ? " is-error" : ""}`}>
                          {loading ? "Loading" : loadError ? "Unavailable" : `${familyProducts.length} products`}
                        </span>
                      </div>
                      {loadError ? (
                        <p className="family-guide-catalog-message">
                          We couldn&apos;t load the live catalog. Browse products to see current options.
                        </p>
                      ) : familyProducts.length === 0 && !loading ? (
                        <p className="family-guide-catalog-message">
                          No products in this family are currently listed. Browse the full range or check back later.
                        </p>
                      ) : loading ? (
                        <p className="family-guide-catalog-message">Checking current product options…</p>
                      ) : (
                        <div className="family-guide-product-list">
                          {familyProducts.slice(0, 4).map((product) => (
                            <Link className="family-guide-product" href={`/products/${product.id}`} key={product.id}>
                              <span>
                                <strong>{product.name}</strong>
                                <small>{[product.size, product.variantType].filter(Boolean).join(" · ") || "View product details"}</small>
                              </span>
                              <ChevronRight size={17} aria-hidden="true" />
                            </Link>
                          ))}
                        </div>
                      )}

                      {!loading && !loadError && familyProducts.length > 0 && (
                        <div className="family-guide-options">
                          {flavors.length > 0 && <div><span>Flavors</span><p>{flavors.join(" · ")}</p></div>}
                          {formats.length > 0 && <div><span>Formats &amp; styles</span><p>{formats.join(" · ")}</p></div>}
                          {sizes.length > 0 && <div><span>Pack sizes</span><p>{sizes.join(" · ")}</p></div>}
                          {packagings.length > 0 && <div><span>Order units</span><p>{packagings.join(" · ")}</p></div>}
                        </div>
                      )}
                    </div>
                    <p className="family-guide-label-note"><Check size={14} aria-hidden="true" /> For exact ingredients and preparation directions, check the selected product&apos;s packaging.</p>
                    <Link className="family-guide-shop-link" href={`/products?category=${family.slug}`}>
                      <span>{`Browse all ${familyProducts.length} ${familyProducts.length === 1 ? "product" : "products"}`}</span>
                      <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
        <section className="family-guide-bottom-cta">
          <div className="wrap">
            <div><span className="eyebrow">Got your product? Get inspired.</span><h2>Now, what will you make?</h2><p>Explore drink and dessert recipes with ingredients, serving sizes, and simple preparation steps.</p></div>
            <Link className="btn" href="/recipes">Explore recipes <ArrowRight size={16} /></Link>
          </div>
        </section>
      </div>
    </>
  );
}
