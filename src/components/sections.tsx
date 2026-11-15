"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { FeaturedProductsCarousel } from "./featured-products-carousel";

type StoreCategory = { id: string; name: string; slug: string; description: string; imageUrl: string | null };

const familyDescriptions: Record<string, string> = {
  "ice-cream-powders": "Choose strawberry, chocolate, mango, or vanilla in hard or soft powder and 1 kg, 2 kg, 3 kg, or 5 kg packs.",
  "milkshake-powders": "Choose strawberry, chocolate, vanilla, or mango milkshake powder (5 kg) or liquid (5 L).",
  "mojito-syrups": "Bright, fruit-inspired flavors for refreshing drinks.",
};

const recipeProducts = [
  { name: "Mojito Syrup", image: "/images/mojitol.png", href: "/products?category=mojito-syrups" },
  { name: "Ice Cream Powder", image: "/images/milanoice.png", href: "/products?category=ice-cream-powders" },
  { name: "Milkshake Powder", image: "/images/milanomilk.png", href: "/products?category=milkshake-powders" },
];

export function CategorySection() {
  const [items, setItems] = useState<StoreCategory[]>([]);

  useEffect(() => {
    let active = true;
    async function loadCategories() {
      try {
        const response = await fetch("/api/categories", { cache: "no-store" });
        if (!response.ok) throw new Error("Unable to load product categories.");
        const data = await response.json() as StoreCategory[];
        if (active) setItems(data);
      } catch (error) {
        console.error("Product categories could not be loaded:", error);
      }
    }
    void loadCategories();
    return () => { active = false; };
  }, []);

  return (
    <section className="section family-section">
      <div className="wrap">
        <div className="section-head home-catalog-head">
          <div><h2>Product families</h2></div>
          <Link href="/products" className="text-link" aria-label="View all products" title="View all products"><ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
        <div className="family-range-grid">
          {items.map((category) => {
            const name = category.slug === "mojito-syrups"
              ? "Mojito Syrup"
              : category.slug === "ice-cream-powders"
                ? "Ice Cream Powder"
                : category.slug === "milkshake-powders"
                  ? "Milkshake Powder"
                  : category.name;
            const description = familyDescriptions[category.slug] || category.description;

            return (
              <Link
                className="family-range-card"
                href={`/products?category=${encodeURIComponent(category.name)}`}
                key={category.id}
              >
                <span className="family-range-image">
                  <Image
                    src={category.imageUrl || "/images/milano-mint-bottle-cutout.png"}
                    alt=""
                    fill
                    sizes="(max-width: 720px) 82vw, (max-width: 1000px) 45vw, 33vw"
                  />
                </span>
                <span className="family-range-copy">
                  <span className="family-range-name">{name}</span>
                  <span className="family-range-description">{description}</span>
                  <span className="family-range-action">Explore collection <ArrowRight size={15} aria-hidden="true" /></span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
export function FeaturedProducts(){return <section className="section" style={{background:"#fffdf9"}}><div className="wrap"><div className="section-head home-catalog-head"><div><h2>Popular products</h2></div><Link href="/products" className="text-link" aria-label="Shop the collection" title="Shop the collection"><ArrowRight size={16} aria-hidden="true"/></Link></div><FeaturedProductsCarousel /></div></section>}
export function RecipeFeature() {
  return (
    <section className="section">
      <div className="wrap">
        <article className="recipe-feature">
          <div className="recipe-feature-image" role="group" aria-label="Milano products featured in recipes">
            {recipeProducts.map((product) => (
              <Link className="recipe-feature-product" href={product.href} key={product.name}>
                <span className="recipe-feature-product-image">
                  <Image src={product.image} alt="" fill sizes="(max-width: 720px) 28vw, 20vw" loading="eager" />
                </span>
                <span className="recipe-feature-product-name">{product.name}</span>
              </Link>
            ))}
          </div>
          <div className="recipe-feature-copy">
            <span className="eyebrow">Make something memorable</span>
            <h2>Create something delicious.</h2>
            <p>Simple drink and dessert recipes featuring Milano products.</p>
            <Link href="/recipes" className="btn">
              Explore recipes <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}

export function AboutPreview() {
  return (
    <section className="section-sm about-preview-section">
      <div className="wrap">
        <div className="about-preview-head">
          <div>
            <h2>Made for your menu.</h2>
            <p>Milano syrups and dessert mixes for home kitchens, cafés, and restaurants.</p>
          </div>
          <Link href="/products" className="btn btn-outline">
            Explore flavors <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
        <div className="about-preview-grid">
          <article className="about-preview-card">
            <span className="about-preview-label">Drinks</span>
            <div>
              <h3>Mix a better drink</h3>
              <p>Mojito syrups for mocktails, lemonades, and café menus.</p>
            </div>
          </article>
          <article className="about-preview-card">
            <span className="about-preview-label">Desserts</span>
            <div>
              <h3>Build your dessert menu</h3>
              <p>Hard and soft ice-cream powders, plus milkshake mixes.</p>
            </div>
          </article>
          <article className="about-preview-card">
            <span className="about-preview-label">Business</span>
            <div>
              <h3>Order by the carton</h3>
              <p>Business orders are packed in 12 units per flavour.</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
export function BusinessBanner(){return <section className="section-sm"><div className="wrap"><div className="business-banner"><div className="business-copy"><h2>Better flavors for your business.</h2><p>Milano supplies cafés and restaurants in Addis Ababa and across Ethiopia.</p><Link href="/contact" className="btn btn-gold">Business inquiries <ArrowRight size={15}/></Link></div><div className="business-image"><Image src="/images/milanoshowcase.png" alt="Milano Foods syrups and dessert products" fill sizes="(max-width: 860px) 100vw, 50vw"/></div></div></div></section>}
