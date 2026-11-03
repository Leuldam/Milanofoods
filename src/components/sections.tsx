"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Play, Leaf, Sparkles, HeartHandshake } from "lucide-react";
import { recipes } from "@/lib/products";
import { FeaturedProductsCarousel } from "./featured-products-carousel";

type StoreCategory = { id: string; name: string; slug: string; description: string; imageUrl: string | null };

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

  return <section className="section family-section"><div className="wrap"><div className="section-head"><div><span className="eyebrow">The Milano collection</span><h2>Product families</h2><p>Choose a product family to explore its flavors, styles, and pack sizes.</p></div><Link href="/products" className="text-link">View all products <ArrowRight size={15}/></Link></div><div className="category-grid">{items.map((category) => {
    const name = category.slug === "mojito-syrups"
      ? "Mojito Syrup"
      : category.slug === "ice-cream-powders"
        ? "Ice Cream Powder"
        : category.slug === "milkshake-powders"
          ? "Milkshake Powder"
          : category.name;
    return <Link className={`category-card family-category-card${category.slug === "mojito-syrups" ? " category-card-bottle" : ""}`} href={`/products?category=${encodeURIComponent(category.name)}`} key={category.id}>
      <span className="family-category-image"><Image src={category.imageUrl || "/images/milano-mint-bottle-cutout.png"} alt="" fill sizes="(max-width:720px) 92px, 33vw"/></span>
      <span className="family-category-name">{name}</span>
      <div className="category-overlay"><h3>{name}</h3><p>{category.description}</p><span className="text-link">Explore collection <ArrowRight size={14}/></span></div>
    </Link>;
  })}</div></div></section>;
}
export function FeaturedProducts(){return <section className="section" style={{background:"#fffdf9"}}><div className="wrap"><div className="section-head"><div><span className="eyebrow">Customer favorites</span><h2>Popular products</h2><p>Explore the flavors customers reach for when creating their signature drinks and desserts.</p></div><Link href="/products" className="text-link">Shop the collection <ArrowRight size={15}/></Link></div><FeaturedProductsCarousel /></div></section>}
export function RecipeFeature(){const r=recipes[0];return <section className="section"><div className="wrap"><div className="recipe-feature"><div className="recipe-feature-image" style={{backgroundImage:`url(${r.image})`}}><span className="play-button"><Play fill="currentColor" size={20}/></span></div><div className="recipe-feature-copy"><span className="eyebrow">From the Milano kitchen</span><h2>Create something delicious.</h2><p>Find fresh inspiration for drinks and desserts, with simple preparation ideas and recipe videos featuring the Milano range.</p><Link href="/recipes" className="btn">Explore recipes <ArrowRight size={16}/></Link></div></div></div></section>}
export function AboutPreview(){return <section className="section-sm"><div className="wrap"><div className="section-head"><div><span className="eyebrow">A little about Milano</span><h2>Flavor brings us together.</h2><p>Milano Foods brings together a versatile range of syrups and dessert powders designed to inspire delicious moments at home and in professional kitchens.</p></div><Link href="/about" className="btn btn-outline">Our story <ArrowRight size={15}/></Link></div><div className="value-row"><div className="value"><Leaf color="#c99a4a"/><h3>Made for creativity</h3><p>Explore a range of flavors and discover new ways to create memorable drinks and desserts.</p></div><div className="value"><Sparkles color="#c99a4a"/><h3>A range of possibilities</h3><p>From fruit-forward drinks to creamy frozen treats, find inspiration for different occasions.</p></div><div className="value"><HeartHandshake color="#c99a4a"/><h3>For every kind of kitchen</h3><p>Discover products for home use, cafés, restaurants, and food-service businesses.</p></div></div></div></section>}
export function BusinessBanner(){return <section className="section-sm"><div className="wrap"><div className="business-banner"><div className="business-copy"><span className="eyebrow">For cafés, restaurants & more</span><h2>Better flavors for your business.</h2><p>Join the loyal cafés and restaurants choosing Milano for their menus. We serve customers in Addis Ababa and send products across Ethiopia.</p><Link href="/contact" className="btn btn-gold">Business inquiries <ArrowRight size={15}/></Link></div><div className="business-image"><Image src="/images/milanoshowcase.png" alt="Milano Foods syrups and dessert products" fill sizes="(max-width: 860px) 100vw, 50vw"/></div></div></div></section>}
