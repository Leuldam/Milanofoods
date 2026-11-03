"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Clock3, Lightbulb } from "lucide-react";
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
  intro: string;
  flavorNote: string;
  preparation: string[];
  uses: string[];
  accent: "mint" | "cream" | "berry";
};

const families: ProductFamily[] = [
  {
    slug: "mojito-syrups",
    name: "Mojito Syrup",
    eyebrow: "Bright, refreshing & made to mix",
    image: "/images/milano-mint-bottle-cutout.png",
    intro: "Build a refreshing drink around your favorite Milano syrup. Mint is a lively starting point; fruit flavors bring their own colorful character to lemonades and creative coolers.",
    flavorNote: "Choose a listed flavor to set the direction of your drink. Mix with citrus, fresh fruit, or herbs to create your own combination.",
    preparation: [
      "Fill a glass or jug with ice and any fresh citrus or fruit you like.",
      "Measure the syrup using the serving guidance on its product label.",
      "Add still or sparkling water, stir gently, then taste and adjust to preference.",
      "Finish with a simple garnish and serve cold.",
    ],
    uses: ["Mojito-style mocktails", "Lemonades & coolers", "Café signature drinks"],
    accent: "mint",
  },
  {
    slug: "ice-cream-powders",
    name: "Ice Cream Powder",
    eyebrow: "A flexible base for frozen treats",
    image: "/images/milanoice.png",
    intro: "Milano Ice Cream Powder is available in product-specific flavors, formats, and pack sizes. Use the instructions for the exact product and equipment you have selected.",
    flavorNote: "The active catalog shows available flavors and styles. Hard-serve and soft-serve formats may have different preparation requirements.",
    preparation: [
      "Choose a flavor and style that matches your menu or equipment.",
      "Measure the powder and other ingredients using the pack directions.",
      "Mix thoroughly, then process or freeze as instructed for that product.",
      "Serve once it reaches the texture recommended on the package.",
    ],
    uses: ["Scoops & cones", "Soft-serve menus", "Sundaes & desserts"],
    accent: "cream",
  },
  {
    slug: "milkshake-powders",
    name: "Milkshake Powder",
    eyebrow: "Smooth, chilled & easy to personalize",
    image: "/images/milanomilk.png",
    intro: "Make a creamy shake with the flavor and format currently available in the catalog. Keep the product directions close so each serving is easy to repeat.",
    flavorNote: "Powder and liquid formats can have different measurements. Follow the directions for the selected format rather than using a one-size-fits-all recipe.",
    preparation: [
      "Chill the milk or other liquid specified on the product label.",
      "Measure the selected Milano product according to its serving directions.",
      "Blend until smooth; add ice only if it suits the product instructions and texture you want.",
      "Pour into a chilled glass and add optional toppings.",
    ],
    uses: ["Classic milkshakes", "Blended café drinks", "Custom dessert drinks"],
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
            <div className="breadcrumb"><Link href="/">Home</Link> / Product guide</div>
            <span className="eyebrow">Find your Milano favorite</span>
            <h1>Flavor, prep <em>&amp; inspiration.</em></h1>
            <p>Explore our syrup, ice cream, and milkshake ranges. See what is currently available, how to prepare each family, and where each one can take your menu.</p>
            <div className="family-guide-hero-actions">
              <Link className="btn" href="/products">Shop all products <ArrowRight size={16} /></Link>
              <a className="family-guide-text-link" href="#family-guide-list">Explore the guide</a>
            </div>
          </div>
          <div className="family-guide-hero-art">
            <span className="family-guide-hero-orbit" aria-hidden="true" />
            <Image src="/images/milano-mint-bottle-cutout.png" alt="Milano Mojito Syrup bottle" fill priority sizes="(max-width: 860px) 80vw, 42vw" />
            <div className="family-guide-hero-stamp"><span>MAKE IT</span><strong>Milano</strong></div>
          </div>
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
          const styles = [...new Set(familyProducts.map((product) => product.variantType?.trim()).filter((value): value is string => Boolean(value)))];
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
                <div className="family-guide-feature">
                  <div className="family-guide-visual">
                    <div className="family-guide-image">
                      <Image src={family.image} alt={family.name} fill sizes="(max-width: 860px) 100vw, 46vw" />
                    </div>
                    <div className="family-guide-use-card">
                      <Lightbulb size={17} aria-hidden="true" />
                      <div><strong>Good for</strong><span>{family.uses.join(" · ")}</span></div>
                    </div>
                    <div className="family-guide-flavor-note">
                      <span>THE FLAVOR NOTE</span>
                      <p>{family.flavorNote}</p>
                    </div>
                  </div>

                  <div className="family-guide-content">
                    <p className="family-guide-lead">{family.intro}</p>
                    <div className="family-guide-prep">
                      <div className="family-guide-subheading">
                        <span className="family-guide-step-icon"><Clock3 size={16} aria-hidden="true" /></span>
                        <div><span>From pack to serve</span><h3>How to prepare</h3></div>
                      </div>
                      <ol>
                        {family.preparation.map((step) => (
                          <li key={step}><span><Check size={14} aria-hidden="true" /></span><p>{step}</p></li>
                        ))}
                      </ol>
                    </div>

                    <div className="family-guide-catalog">
                      <div className="family-guide-subheading">
                        <div><span>Current catalog</span><h3>Available options</h3></div>
                        <span className={`family-guide-live-status${loadError ? " is-error" : ""}`}>
                          {loading ? "Loading" : loadError ? "Unavailable" : `${familyProducts.length} products`}
                        </span>
                      </div>
                      {loadError ? (
                        <p className="family-guide-catalog-message">We couldn&apos;t load the live catalog. Visit the product listing for current options.</p>
                      ) : familyProducts.length === 0 && !loading ? (
                        <p className="family-guide-catalog-message">There are no published products in this family right now. Check back soon or browse the full range.</p>
                      ) : (
                        <>
                          {loading ? (
                            <p className="family-guide-catalog-message">Checking current product options…</p>
                          ) : (
                            <div className="family-guide-product-list">
                              {familyProducts.map((product) => (
                                <Link className="family-guide-product" href={`/products/${product.id}`} key={product.id}>
                                  <span><strong>{product.name}</strong><small>{[product.size, product.variantType].filter(Boolean).join(" · ")}</small></span>
                                  <ArrowRight size={16} aria-hidden="true" />
                                </Link>
                              ))}
                            </div>
                          )}
                          <div className="family-guide-options">
                            {flavors.length > 0 && <div><span>Flavors</span><p>{flavors.join(" · ")}</p></div>}
                            {styles.length > 0 && <div><span>Formats &amp; styles</span><p>{styles.join(" · ")}</p></div>}
                            {sizes.length > 0 && <div><span>Pack sizes</span><p>{sizes.join(" · ")}</p></div>}
                            {packagings.length > 0 && <div><span>Packaging</span><p>{packagings.join(" · ")}</p></div>}
                          </div>
                        </>
                      )}
                    </div>
                    <Link className="family-guide-shop-link" href={`/products?category=${family.slug}`}>
                      Shop {family.name}<ArrowRight size={16} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
        <section className="family-guide-bottom-cta">
          <div className="wrap">
            <div><span className="eyebrow">Ready to make something?</span><h2>Bring your next idea to life.</h2><p>Browse Milano products and choose the flavors, formats, and pack sizes that work for you.</p></div>
            <Link className="btn" href="/products">Browse all products <ArrowRight size={16} /></Link>
          </div>
        </section>
      </div>
    </>
  );
}
