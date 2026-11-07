import type { Metadata } from "next";
import { existsSync } from "node:fs";
import { join } from "node:path";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Coffee,
  HeartHandshake,
  MapPin,
  PackageCheck,
  Settings2,
  Sparkles,
  UsersRound,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About Milano Foods",
  description: "Learn about Milano Foods, an Ethiopian food-processing company in Addis Ababa offering drink and dessert product ranges.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Milano Foods",
    description: "Learn about Milano Foods, an Ethiopian food-processing company in Addis Ababa offering drink and dessert product ranges.",
    url: "/about",
  },
};

const serviceCities = ["Addis Ababa", "Dire Dawa", "Assosa", "Bahir Dar", "Hawassa"];
const chefPhotoAvailable = existsSync(join(process.cwd(), "public", "images", "chief.png"));

export default function AboutPage() {
  return (
    <main className="about-page">
      {/* ─── Hero ─── */}
      <section className="about-hero">
        <div className="wrap about-hero-inner">
          <div className="about-hero-copy">
            <div className="breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span>About Milano</span></div>
            <span className="eyebrow">A taste of something special</span>
            <h1>
              Made for the moments
              <em> worth sharing.</em>
            </h1>
            <p>
              From a refreshing drink to a dessert made for the table, discover
              flavors that bring a little more joy to kitchens across Ethiopia.
            </p>
            <div className="about-hero-actions">
              <Link href="/products" className="btn">
                Discover our products <ArrowRight size={16} />
              </Link>
              <Link href="/contact" className="about-hero-text-link">
                Get to know us <ArrowRight size={14} />
              </Link>
            </div>
          </div>
          <div className="about-hero-art">
            <Image
              src="/images/milanoshowcase.png"
              alt="Milano Foods milkshake powder, ice cream powder, and mojito syrup"
              fill
              priority
              sizes="(max-width: 860px) 100vw, 54vw"
            />
            <div className="about-hero-art-note">
              <span className="about-hero-art-dot" aria-hidden="true" />
              <span><strong>One Milano family</strong><small>Drinks, desserts &amp; more</small></span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats Ribbon ─── */}
      <section className="about-stats-ribbon">
        <div className="wrap about-stats-inner">
          <div className="about-stat">
            <strong>01</strong>
            <span>Mojito syrups</span>
          </div>
          <div className="about-stat-divider" aria-hidden="true" />
          <div className="about-stat">
            <strong>02</strong>
            <span>Ice cream powders</span>
          </div>
          <div className="about-stat-divider" aria-hidden="true" />
          <div className="about-stat">
            <strong>03</strong>
            <span>Milkshake favorites</span>
          </div>
          <div className="about-stat-divider" aria-hidden="true" />
          <div className="about-stat">
            <strong>ET</strong>
            <span>Proudly Ethiopian</span>
          </div>
        </div>
      </section>

      {/* ─── Story ─── */}
      <section className="section about-story-section">
        <div className="wrap about-story-layout">
          <div className="about-story-mark">
            <Image src="/images/milanoshowcase.png" alt="" fill sizes="(max-width: 860px) 100vw, 42vw" />
            <span className="about-story-mark-caption">Good things are better when shared.</span>
          </div>
          <div>
            <span className="eyebrow">A little about Milano</span>
            <h2 className="about-story-title">
              Flavor brings us together.
            </h2>
            <p className="about-story-copy">
              Milano Foods makes it easier to create drinks and desserts worth
              sharing. Our collection brings together mojito syrups, ice cream
              powders, and milkshake favorites for all kinds of kitchens.
            </p>
            <p className="about-story-copy">
              Based in Addis Ababa, we serve home creators, cafés, restaurants,
              and food businesses—with delivery options reaching customers
              across Ethiopia.
            </p>
            <Link href="/product-guide" className="text-link">Find your Milano favorites <ArrowRight size={15} /></Link>
          </div>
        </div>
      </section>

      {/* ─── Values ─── */}
      <section className="section about-values-section">
        <div className="wrap">
          <div className="section-head">
            <div>
              <span className="eyebrow">What drives us</span>
              <h2>Built on values that matter.</h2>
              <p>
                Every product we create reflects our commitment to quality,
                creativity, and the communities we serve.
              </p>
            </div>
          </div>
          <div className="about-values-grid">
            <article className="about-value-card">
              <div className="about-value-icon">
                <Sparkles size={22} aria-hidden="true" />
              </div>
              <h3>Quality First</h3>
              <p>
                We never compromise on ingredients. Every syrup, powder, and mix
                is crafted to deliver consistent, premium flavor.
              </p>
            </article>
            <article className="about-value-card">
              <div className="about-value-icon">
                <Coffee size={22} aria-hidden="true" />
              </div>
              <h3>Creative Spirit</h3>
              <p>
                Our kitchen constantly experiments with new recipes and flavor
                profiles to keep your menu exciting.
              </p>
            </article>
            <article className="about-value-card">
              <div className="about-value-icon">
                <HeartHandshake size={22} aria-hidden="true" />
              </div>
              <h3>Customer Partnership</h3>
              <p>
                We grow alongside our customers, providing support, ideas, and
                products tailored to their needs.
              </p>
            </article>
            <article className="about-value-card">
              <div className="about-value-icon">
                <PackageCheck size={22} aria-hidden="true" />
              </div>
              <h3>Reliable Delivery</h3>
              <p>
                From Addis Ababa to cities across Ethiopia, we ensure your
                orders arrive on time, every time.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* ─── Reach ─── */}
      <section className="about-reach-section">
        <div className="wrap about-reach-layout">
          <div className="about-reach-copy">
            <span className="eyebrow">Across Ethiopia</span>
            <h2>Milano is on the move.</h2>
            <p>
              Based in Addis Ababa, we send Milano products to customers across
              Ethiopia. Wherever you are, get in touch and we&apos;ll help you
              explore delivery options.
            </p>
            <Link href="/contact" className="text-link">
              Ask about delivery <ArrowRight size={15} />
            </Link>
          </div>
          <div className="about-city-grid" aria-label="Milano Foods service cities">
            {serviceCities.map((city) => (
              <div className="about-city" key={city}>
                <MapPin size={17} aria-hidden="true" />
                <span>{city}</span>
              </div>
            ))}
            <div className="about-city about-city-wide">
              <PackageCheck size={18} aria-hidden="true" />
              <span>Delivery across Ethiopia</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Customers ─── */}
      <section className="section about-customers-section">
        <div className="wrap">
          <div className="section-head">
            <div>
              <span className="eyebrow">Good company</span>
              <h2>For the people who make every visit special.</h2>
              <p>
                We&apos;re grateful to serve loyal customers who turn quality
                ingredients into memorable experiences.
              </p>
            </div>
          </div>
          <div className="about-customer-grid">
            <article className="about-customer-card">
              <div className="about-customer-icon-wrap">
                <Coffee size={24} aria-hidden="true" />
              </div>
              <h3>Cafés</h3>
              <p>
                Find new flavors for refreshing drinks, milkshakes, and
                customer-favorite specials.
              </p>
            </article>
            <article className="about-customer-card">
              <div className="about-customer-icon-wrap">
                <HeartHandshake size={24} aria-hidden="true" />
              </div>
              <h3>Restaurants</h3>
              <p>
                Discover versatile products for dessert menus, beverage
                service, and creative recipes.
              </p>
            </article>
            <article className="about-customer-card">
              <div className="about-customer-icon-wrap">
                <Sparkles size={24} aria-hidden="true" />
              </div>
              <h3>Everyday creators</h3>
              <p>
                Bring a little Milano inspiration to family gatherings and
                delicious moments at home.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* ─── Team ─── */}
      <section className="section about-team-section">
        <div className="wrap">
          <div className="section-head">
            <div>
              <span className="eyebrow">The people behind Milano</span>
              <h2>Meet the people behind the flavor.</h2>
              <p>
                Our chef leads the creative work, with a dedicated team
                supporting customers and production.
              </p>
            </div>
          </div>
          <article className="about-team-card about-chef-card">
            <div className="about-chef-photo">
              {chefPhotoAvailable ? (
                <Image
                  src="/images/chief.png"
                  alt="Milano Foods Product Development Chef"
                  fill
                  sizes="(max-width: 720px) 100vw, 52vw"
                />
              ) : (
                <div className="about-chef-placeholder">
                  <Coffee size={42} aria-hidden="true" />
                  <span>Chef photo coming soon</span>
                  <small>Add the photo as public/images/chief.png</small>
                </div>
              )}
              <span className="about-chef-photo-label">The heart of our kitchen</span>
            </div>
            <div className="about-team-copy">
              <span className="eyebrow">Product &amp; flavor</span>
              <h3>Product Development Chef</h3>
              <p>
                Our chef leads the work of bringing Milano&apos;s syrups and
                dessert range together—developing flavors, shaping recipes, and
                creating ideas for kitchens across Ethiopia.
              </p>
              <span className="about-chef-signoff">The Milano kitchen</span>
            </div>
          </article>
          <div className="about-team-roster">
            {/* ─── Dagim Mitiku – Sales Manager ─── */}
            <article className="about-team-person">
              <div className="about-team-person-photo">
                <div className="about-team-photo-placeholder about-dagim-placeholder">
                  <span className="about-team-initials">DM</span>
                  <span>Photo coming soon</span>
                </div>
              </div>
              <div className="about-team-person-copy">
                <span className="eyebrow">Customer partnerships</span>
                <h3>Dagim Mitiku</h3>
                <p>Sales Manager — helping cafés, restaurants, and customers find the right Milano products.</p>
              </div>
            </article>
            {/* ─── Production Manager ─── */}
            <article className="about-team-person">
              <div className="about-team-person-photo">
                {chefPhotoAvailable ? (
                  <Image
                    src="/images/chief.png"
                    alt="Milano Foods Production Manager"
                    fill
                    sizes="(max-width: 720px) 100vw, 30vw"
                  />
                ) : (
                  <div className="about-team-photo-placeholder">
                    <Settings2 size={30} aria-hidden="true" />
                    <span>Production team photo</span>
                    <small>Photo coming soon</small>
                  </div>
                )}
              </div>
              <div className="about-team-person-copy">
                <span className="eyebrow">Making Milano</span>
                <h3>Production Manager</h3>
                <p>Coordinating production so Milano products are ready for customers.</p>
              </div>
            </article>
            {/* ─── Operations ─── */}
            <article className="about-team-person">
              <div className="about-team-person-photo">
                <div className="about-team-photo-placeholder">
                  <UsersRound size={30} aria-hidden="true" />
                  <span>Operations team</span>
                  <small>Photo coming soon</small>
                </div>
              </div>
              <div className="about-team-person-copy">
                <span className="eyebrow">Our people</span>
                <h3>Operations Team</h3>
                <p>Ensuring smooth logistics, quality control, and day-to-day excellence.</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="about-cta-section" style={{ padding: "clamp(40px,6vw,80px) 0" }}>
        <div className="wrap about-cta">
          <div>
            <span className="eyebrow">Let&apos;s make something delicious</span>
            <h2>Looking for Milano for your business?</h2>
            <p>
              Explore our products or talk with our team about your café,
              restaurant, or delivery needs.
            </p>
          </div>
          <div className="about-cta-actions">
            <Link href="/products" className="btn btn-gold">
              Browse products <ArrowRight size={16} />
            </Link>
            <Link href="/contact" className="btn btn-outline about-cta-outline">
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
