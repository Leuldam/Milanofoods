import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CupSoda, HeartHandshake, House, Store } from "lucide-react";

export const metadata: Metadata = {
  title: "Milano in Everyday Kitchens",
  description: "Explore ways Milano product families can fit cafés, restaurants, dessert counters, and home kitchens.",
  alternates: { canonical: "/customer-stories" },
  openGraph: {
    title: "Milano Foods in Everyday Kitchens",
    description: "Explore drink and dessert product ideas for cafés, restaurants, and home kitchens.",
    url: "/customer-stories",
  },
};

const kitchenTypes = [
  {
    icon: Store,
    title: "Cafés",
    product: "Drinks & menu ideas",
    description: "Explore syrups and milkshake products for a café beverage menu. Check the live catalog for current flavors and formats.",
  },
  {
    icon: CupSoda,
    title: "Restaurants",
    product: "A little something after a meal",
    description: "Compare beverage and dessert product families when planning options for your menu.",
  },
  {
    icon: HeartHandshake,
    title: "Dessert counters",
    product: "Frozen favorites",
    description: "Review available ice cream powder styles and pack sizes, then check product directions for your equipment.",
  },
  {
    icon: House,
    title: "Home kitchens",
    product: "Make it your own",
    description: "Browse the current Milano range and find products for drinks and treats to share at home.",
  },
];

export default function CustomerStoriesPage() {
  return (
    <main className="info-page">
      <section className="info-page-hero">
        <div className="wrap">
          <div className="breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span>Milano in Everyday Kitchens</span></div>
          <span className="eyebrow">Made for different kinds of kitchens</span>
          <h1>One range. Lots of ways to enjoy it.</h1>
          <p>From café menus to home kitchens, discover where Milano drink and dessert products could fit. These are product-use ideas—not customer testimonials.</p>
          <div className="info-page-actions">
            <Link href="/product-guide" className="btn">Explore the product guide <ArrowRight size={16} /></Link>
            <Link href="/recipes" className="info-text-link">Get recipe ideas <ArrowRight size={15} /></Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap info-page-wrap">
          <div className="section-head">
            <div><span className="eyebrow">Find your inspiration</span><h2>What kind of kitchen is yours?</h2></div>
          </div>
          <div className="info-card-grid story-card-grid">
            {kitchenTypes.map(({ icon: Icon, title, product, description }) => (
              <article className="info-card story-card" key={title}>
                <span className="info-card-icon"><Icon size={21} aria-hidden="true" /></span>
                <span className="story-card-kicker">{product}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
          <div className="story-invite">
            <div><span className="eyebrow">Have a Milano moment to share?</span><h2>We&apos;d love to hear from you.</h2><p>Tell us how you use Milano products. Get in touch if you&apos;d like to share your experience with our community.</p></div>
            <Link href="/contact" className="btn btn-outline">Share your story <ArrowRight size={15} /></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
