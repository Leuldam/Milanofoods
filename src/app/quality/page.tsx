import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeInfo, ClipboardCheck, PackageCheck, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Product Information & Quality",
  description: "Learn where to find Milano product information and how to confirm product details before ordering.",
  alternates: { canonical: "/quality" },
  openGraph: {
    title: "Milano Foods Product Information",
    description: "Learn where to find product ingredients, preparation, storage, and current availability details.",
    url: "/quality",
  },
};

const qualityNotes = [
  {
    icon: ClipboardCheck,
    title: "Check the product label",
    description: "Refer to the selected product packaging for verified ingredients, storage guidance, and preparation directions.",
  },
  {
    icon: PackageCheck,
    title: "Review current availability",
    description: "Product pages and checkout check current price, packaging, minimum order quantity, and stock.",
  },
  {
    icon: BadgeInfo,
    title: "Ask when you need clarity",
    description: "If you need to confirm a product detail before ordering, contact the Milano team.",
  },
];

export default function QualityPage() {
  return (
    <main className="info-page">
      <section className="info-page-hero info-page-hero-compact">
        <div className="wrap">
          <div className="breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span>Product Information</span></div>
          <span className="eyebrow">Clear information, confident choices</span>
          <h1>Know what you&apos;re ordering.</h1>
          <p>Find product details in the catalog and on the packaging. If you have a question, our team can help before you place an order.</p>
          <div className="info-page-actions">
            <Link href="/products" className="btn">Browse products <ArrowRight size={16} /></Link>
            <Link href="/contact" className="info-text-link">Ask us a question <ArrowRight size={15} /></Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap info-page-wrap">
          <div className="section-head">
            <div><span className="eyebrow">Product information</span><h2>Where to find the details that matter.</h2></div>
          </div>
          <div className="info-card-grid">
            {qualityNotes.map(({ icon: Icon, title, description }) => (
              <article className="info-card" key={title}>
                <span className="info-card-icon"><Icon size={21} aria-hidden="true" /></span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>

          <div className="quality-note">
            <ShieldCheck size={20} aria-hidden="true" />
            <p>Product details vary by item. For accurate ingredients, storage guidance, preparation directions, or other product-specific information, check the packaging or contact our team.</p>
          </div>

          <div className="quality-links">
            <Link href="/product-guide">Compare product families <ArrowRight size={15} /></Link>
            <Link href="/faq">Read ordering FAQs <ArrowRight size={15} /></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
