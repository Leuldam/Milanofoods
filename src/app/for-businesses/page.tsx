import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CupSoda, IceCreamBowl, PackageCheck } from "lucide-react";
import BusinessOrderBuilder from "@/components/business-order-builder";

export const metadata: Metadata = {
  title: "Milano for Businesses",
  description: "Explore Milano syrup, ice cream powder, and milkshake products for cafés, restaurants, and food businesses in Ethiopia.",
  alternates: { canonical: "/for-businesses" },
  openGraph: {
    title: "Milano Foods for Cafés, Restaurants & Food Businesses",
    description: "Explore drink and dessert product options for food businesses in Ethiopia.",
    url: "/for-businesses",
  },
};

const productFamilies = [
  {
    icon: CupSoda,
    title: "Mojito Syrups",
    description: "A ready-to-use range for cold drinks and beverage menus.",
  },
  {
    icon: IceCreamBowl,
    title: "Ice Cream Powders",
    description: "Explore available styles and sizes for frozen dessert menus.",
  },
  {
    icon: PackageCheck,
    title: "Milkshake Products",
    description: "Find current flavors and formats for shakes and blended drinks.",
  },
];

export default function ForBusinessesPage() {
  return (
    <main className="info-page">
      <section className="info-page-hero">
        <div className="wrap">
          <div className="breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span>For Businesses</span></div>
          <span className="eyebrow">For cafés, restaurants &amp; food businesses</span>
          <h1>Find Milano products for your menu.</h1>
          <p>Explore drink and dessert products, then build an order by flavor and carton quantity. Each business carton contains 12 units.</p>
          <div className="info-page-actions business-hero-actions">
            <Link href="#business-order" className="btn">Start a carton order <ArrowRight size={16} /></Link>
            <Link href="/products" className="info-text-link">Browse products <ArrowRight size={15} /></Link>
            <Link href="/contact" className="info-text-link">Talk to Milano <ArrowRight size={15} /></Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap info-page-wrap">
          <div className="section-head">
            <div>
              <span className="eyebrow">Product families</span>
              <h2>Options for drinks and desserts.</h2>
              <p>See live product listings for available flavors, formats, and pack sizes.</p>
            </div>
            <Link href="/product-guide" className="text-link">Compare the range <ArrowRight size={15} /></Link>
          </div>
          <div className="info-card-grid">
            {productFamilies.map(({ icon: Icon, title, description }) => (
              <article className="info-card" key={title}>
                <span className="info-card-icon"><Icon size={21} aria-hidden="true" /></span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <BusinessOrderBuilder />
    </main>
  );
}
