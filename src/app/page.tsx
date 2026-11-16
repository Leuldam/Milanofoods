"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AboutPreview, BusinessBanner, CategorySection, FeaturedProducts, RecipeFeature } from "@/components/sections";

type HeroSlide = {
  id: string;
  name: string;
  lines: [string, string];
  text: string;
  cta: string;
  href: string;
  image: string;
  alt: string;
  washFrom: string;
  washTo: string;
  accent: string;
};

const heroSlides: HeroSlide[] = [
  {
    id: "mojito-syrup",
    name: "Mojito Syrup",
    lines: ["Bright flavors,", "ready to pour."],
    text: "Fruit-forward syrup for mocktails, lemonades, and creative drinks.",
    cta: "Shop mojito syrup",
    href: "/products?category=mojito-syrups",
    image: "/images/mojitol.png",
    alt: "Milano Mojito Syrup bottle",
    washFrom: "#DDF0DF",
    washTo: "#ADD7B4",
    accent: "#286648",
  },
  {
    id: "ice-cream-powder",
    name: "Ice Cream Powder",
    lines: ["Make every scoop", "a Milano moment."],
    text: "Choose your favorite flavor in hard or soft style.",
    cta: "Shop ice cream powder",
    href: "/products?category=ice-cream-powders",
    image: "/images/milanoice.png",
    alt: "Milano Ice Cream Powder",
    washFrom: "#FFF0D7",
    washTo: "#EBC98E",
    accent: "#795722",
  },
  {
    id: "milkshake-powder",
    name: "Milkshake Powder",
    lines: ["Make it creamy,", "make it Milano."],
    text: "Powder and liquid options for cafés and home.",
    cta: "Shop milkshake",
    href: "/products?category=milkshake-powders",
    image: "/images/milanomilk.png",
    alt: "Milano Milkshake Powder",
    washFrom: "#F8E2DF",
    washTo: "#EABDB3",
    accent: "#8B4F46",
  },
];

const heroCss = `
.hc-scroll {
  --hc-height: max(540px, 100svh);
  --hc-step: clamp(280px, 38svh, 400px);
  --hc-top: 0px;
  position: relative;
  height: calc(var(--hc-height) + var(--hc-step) + var(--hc-step));
}
.hc {
  --hc-art-h: clamp(190px, 34svh, 360px);
  --ink: #03291f;
  --cream: #faf7f0;
  --pad: 20px;
  --scroll-copy-x: 0px;
  --scroll-copy-y: 0px;
  --scroll-copy-opacity: 1;
  --scroll-art-y: 0px;
  --scroll-art-opacity: 1;
  --scroll-art-scale: 1;
  --scroll-bg-y: 0px;
  --scroll-bg-scale: 1.02;
  position: sticky;
  top: var(--hc-top);
  height: var(--hc-height);
  overflow: hidden; isolation: isolate;
  background: #ddf0df;
  color: var(--ink);
  touch-action: pan-y;
}
.hc, .hc *, .hc *::before, .hc *::after { box-sizing: border-box; }
.hc :focus-visible { outline: 3px solid var(--ink); outline-offset: 3px; }
.hc-sr {
  position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

.hc-bg {
  position: absolute; inset: 0; z-index: 0; overflow: hidden; pointer-events: none;
  transform: translate3d(0, var(--scroll-bg-y), 0) scale(var(--scroll-bg-scale));
  transform-origin: center;
  will-change: transform;
}
.hc-wash {
  position: absolute; inset: 0;
  background: linear-gradient(160deg, var(--wa), var(--wb));
  opacity: 0;
  transition: opacity 820ms cubic-bezier(0.22, 1, 0.36, 1);
}
.hc-wash[data-active="true"] { opacity: 1; }

.hc-slide {
  position: absolute; inset: 0; z-index: 1;
  display: flex; flex-direction: column; justify-content: center; gap: 14px;
  padding: 16px var(--pad) 92px;
}
.hc-copy {
  position: relative; display: grid; gap: 14px; justify-items: start;
  transform: translate3d(var(--scroll-copy-x), var(--scroll-copy-y), 0);
  opacity: var(--scroll-copy-opacity);
  will-change: transform, opacity;
}
.hc-title {
  margin: 0;
  font-family: var(--font-sans, "Manrope", "Helvetica Neue", Arial, sans-serif);
  font-size: clamp(2.3rem, 10.4vw, 3.6rem);
  font-weight: 750; line-height: 1.04; letter-spacing: -0.045em;
  text-wrap: balance;
  animation: hc-copy-in 700ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
.hc-line {
  display: block;
}
.hc-title em.hc-line { font-weight: 500; font-style: italic; color: var(--accent); }
.hc-text {
  margin: 0; max-width: 32rem; font-size: 1.0625rem; line-height: 1.6;
  color: rgba(3, 41, 31, 0.84);
  animation: hc-copy-in 760ms cubic-bezier(0.22, 1, 0.36, 1) 60ms both;
}
.hc-actions {
  display: flex; flex-wrap: wrap; gap: 10px 14px; width: 100%; margin-top: 4px;
  animation: hc-copy-in 820ms cubic-bezier(0.22, 1, 0.36, 1) 110ms both;
}
.hc-btn {
  display: inline-flex; align-items: center; justify-content: center;
  min-height: 48px; padding: 0 24px; border-radius: 2px;
  font-size: 1rem; font-weight: 600; text-decoration: none;
  transition: background-color 0.25s, border-color 0.25s;
}
.hc-btn-solid { background: var(--ink); color: var(--cream); }
.hc-btn-solid:hover { background: #073d2e; }
.hc-btn-secondary {
  border: 1px solid rgba(3, 41, 31, 0.34);
  background: rgba(255, 255, 255, 0.26);
  color: var(--ink);
}
.hc-btn-secondary:hover { background: rgba(255, 255, 255, 0.55); }

.hc-art {
  order: -1; position: relative; height: var(--hc-art-h); flex: 0 0 auto;
  transform: translate3d(0, var(--scroll-art-y), 0) scale(var(--scroll-art-scale));
  opacity: var(--scroll-art-opacity);
  will-change: transform, opacity;
}
.hc-bottle {
  position: absolute; inset: 0; width: min(86%, 520px); margin-inline: auto;
}
.hc-float {
  position: absolute; inset: 0;
  animation: hc-art-in 800ms cubic-bezier(0.22, 1, 0.36, 1) 50ms both;
}
.hc-float img {
  object-fit: contain; -webkit-user-drag: none;
  filter: drop-shadow(0 18px 22px rgba(3, 41, 31, 0.24));
}
.hc-controls {
  position: absolute; z-index: 2; inset: auto 0 max(12px, env(safe-area-inset-bottom, 0px));
  display: flex; align-items: center; gap: 14px;
  padding: 0 var(--pad);
}
.hc-tabs { display: flex; flex: 1; gap: clamp(8px, 2vw, 24px); max-width: 820px; }
.hc-tab {
  position: relative; flex: 1; min-width: 0; padding: 12px 0;
  background: none; border: 0; color: inherit; font: inherit;
  text-align: center; cursor: pointer; opacity: 0.65; transition: opacity 0.2s;
}
.hc-tab-label {
  display: block; font-size: clamp(0.7rem, 1vw, 0.875rem); font-weight: 600; line-height: 1.3;
}
.hc-tab[aria-current="true"], .hc-tab:hover { opacity: 1; }
.hc-tab[aria-current="true"] .hc-tab-label { color: var(--accent); }
.hc-tab::after {
  content: ""; position: absolute; left: 0; right: 0; bottom: 2px; height: 2px;
  background: var(--accent); transform: scaleX(0); transform-origin: left;
  transition: transform 280ms ease;
}
.hc-tab[aria-current="true"]::after { transform: scaleX(1); }
.hc-buttons { display: flex; gap: 8px; }
.hc-iconbtn {
  display: grid; place-items: center; width: 40px; height: 40px; border-radius: 2px;
  border: 0; background: rgba(255, 255, 255, 0.45);
  color: var(--ink); cursor: pointer; transition: background-color 0.25s, opacity 0.25s;
}
.hc-iconbtn:hover:not(:disabled) { background: #fff; }
.hc-iconbtn:disabled { opacity: 0.35; cursor: default; }

@keyframes hc-copy-in {
  from { opacity: 0; transform: translate3d(0, 18px, 0); }
  to { opacity: 1; transform: translate3d(0, 0, 0); }
}
@keyframes hc-art-in {
  from { opacity: 0; transform: translate3d(22px, 8px, 0) scale(0.96); }
  to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
}

@media (max-width: 599px) {
  .hc-scroll {
    --hc-height: max(500px, 100svh);
    --hc-step: clamp(200px, 28svh, 280px);
  }
  .hc { --hc-art-h: clamp(170px, 29svh, 250px); --pad: 16px; }
  .hc-slide {
    justify-content: center;
    gap: 10px;
    padding: clamp(72px, 10svh, 88px) var(--pad) 74px;
  }
  .hc-copy { gap: 10px; }
  .hc-title { font-size: clamp(2.15rem, 9.5vw, 3.2rem); }
  .hc-text {
    display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
    overflow: hidden; font-size: 1rem;
  }
  .hc-float img { filter: drop-shadow(0 12px 16px rgba(3, 41, 31, 0.2)); }
  .hc-art {
    order: -1;
    height: var(--hc-art-h);
    min-height: 0;
    flex: 0 0 var(--hc-art-h);
  }
  .hc-btn-solid, .hc-btn-secondary {
    flex: 1 1 0; min-width: 0; padding-inline: 8px;
    font-size: 0.8125rem; white-space: nowrap;
  }
  .hc-tabs { gap: 4px; }
  .hc-tab { padding: 10px 0; }
  .hc-buttons { display: none; }
}

@media (min-width: 600px) {
  .hc { --pad: 32px; --hc-art-h: clamp(240px, 38svh, 440px); }
  .hc-slide { gap: 18px; }
  .hc-copy { gap: 18px; }
  .hc-title { font-size: clamp(3rem, 8vw, 4.6rem); }
  .hc-text { font-size: 1.125rem; }
}

@media (max-width: 899px) and (max-height: 800px) {
  .hc-scroll { --hc-height: max(500px, 100svh); }
  .hc { --hc-art-h: clamp(150px, 24svh, 240px); }
}
@media (max-width: 899px) and (max-height: 700px) {
  .hc-scroll { --hc-height: max(480px, 100svh); }
}
@media (max-width: 899px) and (max-height: 700px) {
  .hc-title { font-size: clamp(2rem, 8.6vw, 2.7rem); }
}
@media (max-width: 899px) and (max-height: 600px) {
  .hc-text { display: none; }
}
@media (max-width: 599px) and (max-height: 600px) {
  .hc-scroll { --hc-height: max(420px, 100svh); }
}

@media (min-width: 900px) {
  .hc-scroll {
    --hc-height: max(560px, 100svh);
    --hc-step: clamp(280px, 38svh, 400px);
  }
  .hc {
    --hc-art-h: min(70svh, 660px);
    --pad: max(32px, calc((100vw - 1280px) / 2));
  }
  .hc-slide {
    display: grid; grid-template-columns: minmax(0, 1.02fr) minmax(0, 1fr);
    align-items: center; gap: clamp(24px, 4vw, 64px);
    padding: 40px var(--pad) 96px;
  }
  .hc-copy { gap: 22px; }
  .hc-art { order: 0; }
  .hc-title { font-size: clamp(3.2rem, 5.6vw, 6rem); }
  .hc-text { font-size: 1.1875rem; }
  .hc-controls { gap: 24px; }
  .hc-tab { text-align: left; }
}
@media (min-width: 1500px) {
  .hc { --pad: max(48px, calc((100vw - 1400px) / 2)); }
  .hc-title { font-size: clamp(4.5rem, 5vw, 6.8rem); }
  .hc-text { max-width: 34rem; }
}

@media (min-width: 900px) and (max-height: 700px) {
  .hc-scroll { --hc-height: max(500px, 100svh); }
  .hc { --hc-art-h: 56svh; }
  .hc-title { font-size: clamp(2.4rem, 5vw, 3.8rem); }
  .hc-text { font-size: 1rem; }
  .hc-slide { padding-bottom: 84px; }
  .hc-copy { gap: 16px; }
}

@media (max-width: 899px) and (orientation: landscape) and (max-height: 540px) {
  .hc-scroll {
    --hc-height: max(220px, 100svh);
    --hc-step: clamp(120px, 35svh, 220px);
  }
  .hc { --hc-art-h: min(42svh, 190px); --pad: 28px; }
  .hc-slide {
    display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
    align-items: center; gap: 20px; padding: 8px var(--pad) 56px;
  }
  .hc-actions { flex-wrap: nowrap; gap: 6px; }
  .hc-btn { min-height: 40px; padding: 0 8px; font-size: 0.8125rem; white-space: nowrap; }
  .hc-btn-solid { flex: 1 1 auto; }
  .hc-btn-secondary { flex: 0 0 auto; }
  .hc-art { order: 0; }
  .hc-title { font-size: clamp(1.6rem, 4.2vw, 2.5rem); }
  .hc-text { display: none; }
  .hc-btn { min-height: 44px; }
  .hc-tab { padding: 8px 0 6px; }
}

@media (prefers-reduced-motion: reduce) {
  .hc, .hc *, .hc *::before, .hc *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
`;

function slideVars(slide: HeroSlide) {
  return { "--accent": slide.accent } as CSSProperties;
}

function washVars(slide: HeroSlide) {
  return { "--wa": slide.washFrom, "--wb": slide.washTo } as CSSProperties;
}

function HeroCarousel() {
  const count = heroSlides.length;
  const [index, setIndex] = useState(0);
  const wrapRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(0);
  const metricsRef = useRef({ absTop: 0, range: 0, stickyTop: 0 });
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const activeSlide = heroSlides[index];
  const goTo = (next: number) => {
    const wrap = wrapRef.current;
    const stage = stageRef.current;
    if (!wrap || !stage) return;

    const slide = Math.max(0, Math.min(count - 1, next));
    const absTop = wrap.getBoundingClientRect().top + window.scrollY;
    const range = wrap.offsetHeight - stage.offsetHeight;
    const top = absTop + (slide / (count - 1)) * range;
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "instant" as ScrollBehavior
      : "smooth";
    window.scrollTo({ top, behavior });
  };

  useEffect(() => {
    const wrap = wrapRef.current;
    const stage = stageRef.current;
    if (!wrap || !stage) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const updateScrollState = () => {
      const { absTop, range, stickyTop } = metricsRef.current;
      const scrollProgress = range > 0
        ? Math.min(1, Math.max(0, (window.scrollY - (absTop - stickyTop)) / range))
        : 0;
      const next = scrollProgress >= 1 ? count - 1 : Math.round(scrollProgress * (count - 1));
      if (next !== activeIndexRef.current) {
        activeIndexRef.current = next;
        setIndex(next);
      }

      const progress = reduceMotion.matches
        ? 0
        : Math.min(1, Math.max(0, -stage.getBoundingClientRect().top / stage.offsetHeight));
      stage.style.setProperty("--scroll-copy-x", `${-18 * progress}px`);
      stage.style.setProperty("--scroll-copy-y", `${-24 * progress}px`);
      stage.style.setProperty("--scroll-copy-opacity", `${1 - 0.45 * progress}`);
      stage.style.setProperty("--scroll-art-y", `${-42 * progress}px`);
      stage.style.setProperty("--scroll-art-opacity", `${1 - 0.35 * progress}`);
      stage.style.setProperty("--scroll-art-scale", `${1 - 0.035 * progress}`);
      stage.style.setProperty("--scroll-bg-y", `${-14 * progress}px`);
      stage.style.setProperty("--scroll-bg-scale", `${1.02 + 0.04 * progress}`);
    };
    const measure = () => {
      stage.style.setProperty("--hc-top", "0px");
      metricsRef.current = {
        absTop: wrap.getBoundingClientRect().top + window.scrollY,
        range: wrap.offsetHeight - stage.offsetHeight,
        stickyTop: 0,
      };
      updateScrollState();
    };
    const scheduleUpdate = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        updateScrollState();
      });
    };
    const scheduleMeasure = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };

    measure();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleMeasure);
    window.addEventListener("load", scheduleMeasure);
    reduceMotion.addEventListener("change", scheduleUpdate);
    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleMeasure);
      window.removeEventListener("load", scheduleMeasure);
      reduceMotion.removeEventListener("change", scheduleUpdate);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [count]);

  return (
    <section
      ref={wrapRef}
      className="hc-scroll"
      aria-roledescription="carousel"
      aria-label="Featured Milano products"
    >
      <style dangerouslySetInnerHTML={{ __html: heroCss }} />
      <div
        ref={stageRef}
        className="hc"
        style={slideVars(activeSlide)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" && index < count - 1) {
            e.preventDefault();
            goTo(index + 1);
          } else if (e.key === "ArrowLeft" && index > 0) {
            e.preventDefault();
            goTo(index - 1);
          }
        }}
        onTouchStart={(e) => {
          swipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }}
        onTouchEnd={(e) => {
          const start = swipe.current;
          swipe.current = null;
          if (!start) return;
          const dx = e.changedTouches[0].clientX - start.x;
          const dy = e.changedTouches[0].clientY - start.y;
          if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.2) {
            goTo(index + (dx < 0 ? 1 : -1));
          }
        }}
      >
        <div className="hc-bg" aria-hidden="true">
          {heroSlides.map((s, i) => (
            <div key={s.id} className="hc-wash" data-active={i === index} style={washVars(s)} />
          ))}
        </div>

        <h1 className="hc-sr">Milano Foods: Mojito Syrup, Ice Cream Powder, and Milkshake Powder</h1>

        <div key={activeSlide.id} className="hc-slide" aria-live="polite">
          <div className="hc-copy">
            <h2 className="hc-title">
              <span className="hc-line">{activeSlide.lines[0]}</span>
              <em className="hc-line">{activeSlide.lines[1]}</em>
            </h2>
            <p className="hc-text">{activeSlide.text}</p>
            <div className="hc-actions">
              <Link href={activeSlide.href} className="hc-btn hc-btn-solid">
                {activeSlide.cta}
              </Link>
              <Link href="/recipes" className="hc-btn hc-btn-secondary">
                Explore recipes
              </Link>
            </div>
          </div>

          <div className="hc-art">
            <div className="hc-bottle">
              <div className="hc-float">
                <Image
                  src={activeSlide.image}
                  alt={activeSlide.alt}
                  fill
                  sizes="(min-width: 900px) 46vw, 80vw"
                  priority
                  draggable={false}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="hc-controls">
          <div className="hc-tabs" role="group" aria-label="Choose a featured product">
            {heroSlides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className="hc-tab"
                style={slideVars(s)}
                aria-label={`Show ${s.name}`}
                aria-current={i === index}
                onClick={() => goTo(i)}
              >
                <span className="hc-tab-label">{s.name}</span>
              </button>
            ))}
          </div>

          <div className="hc-buttons">
            <button
              type="button"
              className="hc-iconbtn"
              onClick={() => goTo(index - 1)}
              disabled={index === 0}
              aria-label="Previous slide"
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="hc-iconbtn"
              onClick={() => goTo(index + 1)}
              disabled={index === count - 1}
              aria-label="Next slide"
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <main>
      <HeroCarousel />

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