import Image from "next/image";
import Link from "next/link";
import { ArrowRight, HeartHandshake, Leaf, Sparkles } from "lucide-react";

export default function AboutPage() {
  return (
    <main>
      <section className="page-hero">
        <div className="wrap">
          <div className="breadcrumb">Home / About Milano</div>
          <span className="eyebrow">The Milano story</span>
          <h1>Bringing flavor to every moment.</h1>
          <p>
            Milano Foods offers a versatile collection of beverage syrups and
            dessert powders for people who love to create, serve, and share.
          </p>
        </div>
      </section>
      <section className="section">
        <div className="wrap about-story-layout">
          <Image
            className="about-story-image"
            src="https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=1200&q=85"
            alt="Colorful refreshing drinks"
            width={1000}
            height={1000}
          />
          <div>
            <span className="eyebrow">Our approach</span>
            <h2 className="about-story-title">
              Made for moments worth savoring.
            </h2>
            <p className="about-story-copy">
              From refreshing mojito-style drinks to creamy frozen desserts
              and milkshakes, the Milano range is designed to inspire creativity
              across a variety of occasions. We aim to make it easy for
              customers and food-service businesses to explore flavors and find
              products for their needs.
            </p>
            <Link href="/products" className="btn">
              Explore our products <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>
      <section className="section" style={{ background: "#fffdf9" }}>
        <div className="wrap">
          <div className="section-head">
            <div>
              <span className="eyebrow">What guides us</span>
              <h2>Flavor, variety, connection.</h2>
            </div>
          </div>
          <div className="value-row">
            <div className="value">
              <Leaf color="#c99a4a" />
              <h3>Creative flavor</h3>
              <p>
                A versatile selection for drinks, desserts, and fresh menu
                ideas.
              </p>
            </div>
            <div className="value">
              <Sparkles color="#c99a4a" />
              <h3>Product variety</h3>
              <p>
                Explore syrups, ice cream powders, and milkshake powders in one
                place.
              </p>
            </div>
            <div className="value">
              <HeartHandshake color="#c99a4a" />
              <h3>Customer connection</h3>
              <p>
                We welcome product questions and inquiries from home customers
                and businesses.
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className="section-sm">
        <div className="wrap business-banner">
          <div className="business-copy">
            <span className="eyebrow">Let&apos;s connect</span>
            <h2>Let&apos;s create something good.</h2>
            <p>
              Have a product question or business inquiry? Our team can help
              you explore the Milano range.
            </p>
            <Link href="/contact" className="btn btn-gold">
              Contact Milano <ArrowRight size={15} />
            </Link>
          </div>
          <div
            className="business-image"
            style={{
              backgroundImage:
                "url(https://images.unsplash.com/photo-1511688878353-3a2f5be94cd7?auto=format&fit=crop&w=1200&q=85)",
            }}
          />
        </div>
      </section>
    </main>
  );
}
