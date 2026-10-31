import Link from "next/link";
import { ArrowDown, ArrowRight, Leaf, Sparkles } from "lucide-react";
import { AboutPreview, BusinessBanner, CategorySection, FeaturedProducts, RecipeFeature } from "@/components/sections";
import { MintBottleStage } from "@/components/mint-bottle-stage";

export default function HomePage() {
  return (
    <main>
      <section className="hero-mint" aria-labelledby="mint-hero-title">
        <div className="mint-hero-copy">
          <span className="mint-eyebrow">
            <Sparkles size={14} aria-hidden="true" />
            A fresh pour of inspiration
          </span>
          <h1 id="mint-hero-title">
            Make room for
            <br />
            a <em>fresh</em> moment.
          </h1>
          <p>
            Meet Milano Mint: a bright, cooling syrup made for refreshing
            mojitos, lively mocktails, and whatever you dream up next.
          </p>
          <div className="mint-hero-actions">
            <Link href="/products/mint-mojito-syrup" className="btn mint-hero-primary">
              Meet the mint syrup <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link href="/products" className="mint-hero-secondary">
              Explore all flavors
            </Link>
          </div>
          <div className="mint-hero-detail">
            <span className="mint-detail-icon">
              <Leaf size={17} aria-hidden="true" />
            </span>
            <span>
              <strong>Made for mixing</strong>
              <small>Drinks, desserts &amp; more</small>
            </span>
            <span className="mint-detail-divider" aria-hidden="true" />
            <span>
              <strong>750 ml</strong>
              <small>Full of fresh ideas</small>
            </span>
          </div>
        </div>
        <MintBottleStage />
        <Link href="#discover" className="mint-scroll-cue">
          <span>Discover the Milano range</span>
          <ArrowDown size={15} aria-hidden="true" />
        </Link>
      </section>
      <div className="mint-flavor-ribbon" aria-label="Milano product range">
        <span>Bring a little brightness</span>
        <span className="mint-ribbon-dot" aria-hidden="true" />
        <span>Mojito syrups</span>
        <span className="mint-ribbon-dot" aria-hidden="true" />
        <span>Dessert powders</span>
        <span className="mint-ribbon-dot" aria-hidden="true" />
        <span>Moments worth sharing</span>
      </div>
      <div id="discover">
        <CategorySection />
        <FeaturedProducts />
        <RecipeFeature />
        <AboutPreview />
        <BusinessBanner />
      </div>
    </main>
  );
}
