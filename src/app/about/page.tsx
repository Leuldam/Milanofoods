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

const serviceCities = ["Addis Ababa", "Dire Dawa", "Assosa", "Bahir Dar", "Hawassa"];
const chefPhotoAvailable = existsSync(join(process.cwd(), "public", "images", "chief.png"));

export default function AboutPage() {
  return (
    <main className="about-page">
      <section className="about-hero">
        <div className="wrap about-hero-inner">
          <div className="about-hero-copy">
            <div className="breadcrumb">Home / About Milano</div>
            <span className="eyebrow">The Milano story</span>
            <h1>Good flavor brings people together.</h1>
            <p>
              From a café’s signature drink to a dessert shared with family,
              Milano Foods brings inspiring flavors to kitchens and businesses
              across Ethiopia.
            </p>
            <Link href="/products" className="btn">
              Explore our range <ArrowRight size={16} />
            </Link>
          </div>
          <div className="about-hero-image">
            <Image
              src="/images/milanoshowcase.png"
              alt="Milano Foods product range"
              fill
              priority
              sizes="(max-width: 860px) 100vw, 52vw"
            />
            <span className="about-image-caption">
              <Sparkles size={15} /> Made for moments worth sharing
            </span>
          </div>
        </div>
      </section>

      <section className="section about-story-section">
        <div className="wrap about-story-layout">
          <div className="about-story-mark" aria-hidden="true">
            <Coffee size={34} />
            <span>For every kind of kitchen</span>
          </div>
          <div>
            <span className="eyebrow">Our approach</span>
            <h2 className="about-story-title">
              A little more flavor in every day.
            </h2>
            <p className="about-story-copy">
              Milano Foods offers a versatile collection of mojito syrups, ice
              cream powders, and milkshake products. We work with people who
              love making, serving, and sharing something delicious—from
              independent cafés to restaurants and homes.
            </p>
            <p className="about-story-copy">
              We’re proud of the loyal customers who bring Milano into their
              menus and everyday moments. Their trust inspires us to keep
              making it easier to find flavors for the way Ethiopia eats,
              drinks, and gathers.
            </p>
          </div>
        </div>
      </section>

      <section className="about-reach-section">
        <div className="wrap about-reach-layout">
          <div className="about-reach-copy">
            <span className="eyebrow">Across Ethiopia</span>
            <h2>Milano is on the move.</h2>
            <p>
              Based in Addis Ababa, we send Milano products to customers across
              Ethiopia. Wherever you are, get in touch and we’ll help you
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

      <section className="section about-customers-section">
        <div className="wrap">
          <div className="section-head">
            <div>
              <span className="eyebrow">Good company</span>
              <h2>For the people who make every visit special.</h2>
              <p>
                We’re grateful to serve loyal customers who turn quality
                ingredients into memorable experiences.
              </p>
            </div>
          </div>
          <div className="about-customer-grid">
            <article className="about-customer-card">
              <Coffee size={24} aria-hidden="true" />
              <h3>Cafés</h3>
              <p>
                Find new flavors for refreshing drinks, milkshakes, and
                customer-favorite specials.
              </p>
            </article>
            <article className="about-customer-card">
              <HeartHandshake size={24} aria-hidden="true" />
              <h3>Restaurants</h3>
              <p>
                Discover versatile products for dessert menus, beverage
                service, and creative recipes.
              </p>
            </article>
            <article className="about-customer-card">
              <Sparkles size={24} aria-hidden="true" />
              <h3>Everyday creators</h3>
              <p>
                Bring a little Milano inspiration to family gatherings and
                delicious moments at home.
              </p>
            </article>
          </div>
        </div>
      </section>

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
              <span className="eyebrow">Product & flavor</span>
              <h3>Product Development Chef</h3>
              <p>
                Our chef leads the work of bringing Milano’s syrups and dessert
                range together—developing flavors, shaping recipes, and creating
                ideas for kitchens across Ethiopia.
              </p>
              <span className="about-chef-signoff">The Milano kitchen</span>
            </div>
          </article>
          <div className="about-team-roster">
            <article className="about-team-person">
              <div className="about-team-person-photo">
                <div className="about-team-photo-placeholder">
                  <UsersRound size={30} aria-hidden="true" />
                  <span>Sales team photo</span>
                  <small>Photo coming soon</small>
                </div>
              </div>
              <div className="about-team-person-copy">
                <span className="eyebrow">Customer partnerships</span>
                <h3>Sales Manager</h3>
                <p>Helping cafés, restaurants, and customers find the right Milano products.</p>
              </div>
            </article>
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
            <article className="about-team-person">
              <div className="about-team-person-photo">
                <div className="about-team-photo-placeholder about-dagim-placeholder">
                  <span className="about-team-initials">DM</span>
                  <span>Team photo coming soon</span>
                </div>
              </div>
              <div className="about-team-person-copy">
                <span className="eyebrow">Our people</span>
                <h3>Dagim Mitiku</h3>
                <p>A valued member of the Milano Foods team.</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="section-sm about-cta-section">
        <div className="wrap about-cta">
          <div>
            <span className="eyebrow">Let’s make something delicious</span>
            <h2>Looking for Milano for your business?</h2>
            <p>
              Explore our products or talk with our team about your café,
              restaurant, or delivery needs.
            </p>
          </div>
          <div className="about-cta-actions">
            <Link href="/products" className="btn">
              Browse products <ArrowRight size={16} />
            </Link>
            <Link href="/contact" className="btn btn-outline">
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
