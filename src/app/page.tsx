"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AboutPreview, BusinessBanner, CategorySection, FeaturedProducts, RecipeFeature } from "@/components/sections";

/* ------------------------------------------------------------------ */
/* 1. HERO SLIDES                                                      */
/* Edit a slide here: copy, link, colors, image.                       */
/* Images go in /public/hero/. Use a transparent WebP or PNG, product  */
/* centered, about 1000 x 1250 px (4:5), similar framing on each one.  */
/* The hrefs are placeholders: point them at your real routes.         */
/* ------------------------------------------------------------------ */

type HeroSlide = {
  id: string;
  name: string; // short label under the slide bar on desktop
  lines: [string, string]; // headline: first line upright, second line italic in the accent color
  text: string;
  meta: string; // small line under the buttons (hidden on phones)
  cta: string;
  href: string;
  image: string;
  alt: string;
  washFrom: string; // the "pour" color that floods the hero behind the product
  washTo: string;
  accent: string; // italic headline line and progress bar; keep it readable on the wash
};

const heroSlides: HeroSlide[] = [
  {
    id: "mint",
    name: "Mint",
    lines: ["Make room for", "a fresh moment."],
    text: "Milano Mint is a bright, cooling syrup for mojitos, mocktails and whatever you mix next.",
    meta: "Mojito syrup, 750 ml",
    cta: "Shop mint syrup",
    href: "/products/mint-mojito-syrup",
    image: "/images/milano-mint-bottle-cutout.png",
    alt: "Milano Mint mojito syrup, 750 ml bottle",
    washFrom: "#C4EBD6",
    washTo: "#8FD3B0",
    accent: "#0B6B49",
  },
  {
    id: "strawberry",
    name: "Strawberry",
    lines: ["Sweet, ripe,", "ready to pour."],
    text: "Strawberry syrup for lemonades, milkshakes and party mocktails. A little goes a long way.",
    meta: "Mojito syrup, 750 ml",
    cta: "Shop strawberry syrup",
    href: "/products/strawberry-mojito-syrup",
    image: "/images/milano-mint-bottle-cutout.png",
    alt: "Milano Strawberry mojito syrup, 750 ml bottle",
    washFrom: "#FAC9D4",
    washTo: "#F29AB0",
    accent: "#A3234B",
  },
  {
    id: "mango",
    name: "Mango",
    lines: ["Summer, bottled", "for every glass."],
    text: "Smooth tropical mango for iced tea, smoothies and desserts, all year round.",
    meta: "Mojito syrup, 750 ml",
    cta: "Shop mango syrup",
    href: "/products/mango-mojito-syrup",
    image: "/images/milano-mint-bottle-cutout.png",
    alt: "Milano Mango mojito syrup, 750 ml bottle",
    washFrom: "#FFE3A8",
    washTo: "#FFC45C",
    accent: "#8F4A00",
  },
  {
    id: "tropical-blue",
    name: "Tropical Blue",
    lines: ["Turn any drink", "into a showpiece."],
    text: "Tropical Blue gives cafés and event bars a color people notice and a flavor they come back for.",
    meta: "Mojito syrup, 750 ml",
    cta: "Shop Tropical Blue",
    href: "/products/tropical-blue-mojito-syrup",
    image: "/images/milano-mint-bottle-cutout.png",
    alt: "Milano Tropical Blue mojito syrup, 750 ml bottle",
    washFrom: "#C2E5F8",
    washTo: "#7CC3EC",
    accent: "#14598F",
  },
  {
    id: "powders",
    name: "Dessert powders",
    lines: ["Creamy desserts,", "made in minutes."],
    text: "Ice cream and milkshake powders for cafés, restaurants and hotels. Mix, chill, serve.",
    meta: "Ice cream and milkshake powders",
    cta: "Shop dessert powders",
    href: "/products",
    image: "/images/milano-mint-bottle-cutout.png",
    alt: "Milano ice cream and milkshake powder packs",
    washFrom: "#F5EAD0",
    washTo: "#E2CB98",
    accent: "#6B4E14",
  },
];

/* ------------------------------------------------------------------ */
/* 2. HERO STYLES                                                      */
/* The hero is pinned while the page scrolls. Scrolling down moves     */
/* through the slides. Tune with --hc-step (scroll distance per slide) */
/* and --hc-art-h (product height on phones).                          */
/* ------------------------------------------------------------------ */

const heroCss = `
.hc-scroll {
  --hc-step: 56svh;
  --hc-top: 0px;
  --hc-h: 100svh;
  position: relative;
  height: calc(var(--hc-h) + (var(--hc-count, 5) - 1) * var(--hc-step));
}
.hc {
  --hc-art-h: clamp(170px, 29svh, 330px);
  --ink: #03291f;
  --cx: 50%; --cy: 30%;
  position: sticky; top: var(--hc-top); height: var(--hc-h);
  overflow: hidden; isolation: isolate;
  background: linear-gradient(160deg, var(--bg-a, #c4ebd6), var(--bg-b, #8fd3b0));
  color: var(--ink);
  touch-action: pan-y;
}
.hc::before {
  content: ""; position: absolute; inset: 0; z-index: 0; pointer-events: none;
  background: radial-gradient(circle at var(--cx) var(--cy), rgba(255, 255, 255, 0.5), transparent 55%);
}
.hc :focus-visible { outline: 3px solid var(--ink); outline-offset: 3px; }
.hc-sr {
  position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

/* The track slides sideways as the page scrolls down (moved from JS) */
.hc-track { position: relative; z-index: 1; display: flex; height: 100%; will-change: transform; }
.hc-slide {
  position: relative; flex: 0 0 100%; min-width: 0; height: 100%;
  display: flex; flex-direction: column; justify-content: center; gap: 16px;
  padding: 16px 22px 84px;
}

/* Copy */
.hc-copy { position: relative; display: grid; gap: 14px; justify-items: start; }
.hc-title {
  margin: 0;
  font-family: var(--font-playfair, "Playfair Display", Georgia, serif);
  font-size: clamp(2.35rem, 10.5vw, 5rem);
  font-weight: 600; line-height: 1.04; letter-spacing: -0.015em;
  text-wrap: balance;
}
.hc-title span, .hc-title em { display: block; }
.hc-title em { font-weight: 500; font-style: italic; color: var(--accent); }
.hc-text {
  margin: 0; max-width: 30rem; font-size: 1.0625rem; line-height: 1.6;
  color: rgba(3, 41, 31, 0.84);
}
.hc-actions { display: flex; flex-wrap: wrap; gap: 10px 14px; width: 100%; margin-top: 4px; }
.hc-btn {
  display: inline-flex; align-items: center; justify-content: center;
  min-height: 52px; padding: 0 28px; border-radius: 999px;
  font-size: 1rem; font-weight: 600; text-decoration: none;
  transition: background-color 0.25s, border-color 0.25s;
}
.hc-btn-solid { background: var(--ink); color: #faf7f0; }
.hc-btn-solid:hover { background: #073d2e; }
.hc-btn-quiet { color: var(--ink); border: 1.5px solid rgba(3, 41, 31, 0.3); }
.hc-btn-quiet:hover { background: rgba(255, 255, 255, 0.45); border-color: var(--ink); }
.hc-meta { margin: 0; font-size: 0.9rem; color: rgba(3, 41, 31, 0.74); }

/* Product: on phones it comes first, copy below */
.hc-art { order: -1; position: relative; height: var(--hc-art-h); perspective: 1000px; }
.hc-bottle {
  position: absolute; inset: 0; width: min(80%, 340px);
  margin-inline: auto; transform-origin: 50% 100%;
}
.hc-bottle img { object-fit: contain; -webkit-user-drag: none; }
.hc-shadow {
  position: absolute; bottom: 1%; left: 50%; width: 48%; max-width: 240px; height: 6%;
  transform: translateX(-50%);
  background: radial-gradient(closest-side, rgba(3, 41, 31, 0.3), transparent);
  filter: blur(3px);
}

/* Scroll-driven entrance and exit. JS sets these on every slide each frame:
   --o  distance from center (-1 to 1)       --a  its absolute value
   --r1..--r4  signed reveal per group (0 = settled, +1 = below/entering, -1 = above/leaving)
   --q1..--q4  how visible each group is (1 = fully)
   The headline lines rise out of a mask one after another, then the paragraph and buttons
   follow; the product turns in on a disc that grows behind it, and everything leaves in reverse. */
.hc-line {
  display: block; overflow: hidden;
  padding: 0.06em 0.1em 0.14em 0; margin: -0.06em -0.1em -0.14em 0; /* room for descenders and italics */
}
.hc-line-in { display: block; }
.hc-l1 { transform: translate3d(calc(var(--o, 0) * -6%), calc(var(--r1, 0) * 105%), 0); }
.hc-l2 { transform: translate3d(calc(var(--o, 0) * -10%), calc(var(--r2, 0) * 105%), 0); }
.hc-text {
  transform: translate3d(calc(var(--o, 0) * -8%), calc(var(--r3, 0) * 36px), 0);
  opacity: var(--q3, 1);
}
.hc-actions, .hc-meta {
  transform: translate3d(calc(var(--o, 0) * -10%), calc(var(--r4, 0) * 36px), 0);
  opacity: var(--q4, 1);
}
.hc-disc {
  position: absolute; left: 50%; top: 50%;
  width: min(88%, 460px, calc(var(--hc-art-h) * 1.15)); aspect-ratio: 1; border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
  transform: translate(-50%, -50%) translateX(calc(var(--o, 0) * 18%))
    scale(calc(0.55 + var(--q1, 1) * 0.45));
  opacity: var(--q1, 1);
}
.hc-bottle {
  transform: translateX(calc(var(--o, 0) * 28%)) translateY(calc(var(--a, 0) * 36px))
    rotateY(calc(var(--o, 0) * -26deg)) rotateZ(calc(var(--o, 0) * 9deg))
    scale(calc(1 - var(--a, 0) * 0.12));
}

/* Controls: the bars fill as you scroll, and double as slide buttons */
.hc-controls {
  position: absolute; z-index: 2; inset: auto 0 0;
  display: flex; align-items: center; gap: 14px;
  padding: 0 22px calc(10px + env(safe-area-inset-bottom, 0px));
}
.hc-tabs { display: flex; flex: 1; gap: 10px; max-width: 620px; }
.hc-tab {
  flex: 1; min-width: 0; padding: 16px 0 12px;
  background: none; border: 0; color: inherit; font: inherit;
  text-align: left; cursor: pointer;
}
.hc-tab-label {
  display: none; margin-bottom: 8px; font-size: 0.875rem; font-weight: 600;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  opacity: 0.6; transition: opacity 0.3s;
}
.hc-tab[aria-current="true"] .hc-tab-label, .hc-tab:hover .hc-tab-label { opacity: 1; }
.hc-tab-bar { display: block; height: 3px; border-radius: 2px; background: rgba(3, 41, 31, 0.18); overflow: hidden; }
.hc-tab-fill {
  display: block; height: 100%; background: var(--accent);
  transform: scaleX(var(--f, 0)); transform-origin: left;
}
.hc-buttons { display: none; gap: 8px; }
.hc-iconbtn {
  display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%;
  border: 1.5px solid rgba(3, 41, 31, 0.25); background: rgba(255, 255, 255, 0.55);
  color: var(--ink); cursor: pointer; transition: background-color 0.25s, opacity 0.25s;
}
.hc-iconbtn:hover:not(:disabled) { background: #fff; }
.hc-iconbtn:disabled { opacity: 0.35; cursor: default; }

/* Phones */
@media (max-width: 899px) {
  .hc { --hc-art-h: clamp(170px, 34svh, 330px); }
  .hc-text {
    display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
    overflow: hidden; font-size: 1rem;
  }
}
@media (max-width: 899px) and (max-height: 720px) {
  .hc { --hc-art-h: clamp(150px, 27svh, 210px); }
  .hc-btn-quiet { display: none; }
  .hc-title { font-size: clamp(2rem, 8.5vw, 2.6rem); }
}
@media (max-width: 559px) {
  .hc-btn-solid { flex: 1 1 100%; }
  .hc-btn-quiet {
    flex: 1 1 100%; min-height: 44px; border-color: transparent;
    text-decoration: underline; text-underline-offset: 4px;
  }
  .hc-meta { display: none; }
}
@media (min-width: 640px) { .hc-buttons { display: flex; } }

/* Desktop */
@media (min-width: 900px) {
  .hc-scroll { --hc-step: 66svh; }
  .hc { --hc-art-h: min(72svh, 640px); --cx: 73%; --cy: 50%; }
  .hc-slide {
    display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: center; gap: 56px;
    padding: 40px max(32px, calc((100vw - 1240px) / 2)) 104px;
  }
  .hc-copy { gap: 22px; }
  .hc-art { order: 0; }
  .hc-controls { gap: 20px; padding: 0 max(32px, calc((100vw - 1240px) / 2)) 28px; }
  .hc-tab-label { display: block; }
}
@media (min-width: 900px) and (max-height: 700px) {
  .hc-title { font-size: clamp(2.4rem, 6vw, 3.6rem); }
}

@media (prefers-reduced-motion: reduce) {
  .hc * { transition: none !important; }
}
`;

/* ------------------------------------------------------------------ */
/* 3. HERO CAROUSEL (scroll-driven)                                    */
/* Page scroll is the single source of truth: the slide position is    */
/* computed from how far you have scrolled through the pinned hero.    */
/* The view eases toward it, so wheel notches and flicks glide.        */
/* ------------------------------------------------------------------ */

const REVEAL = [0.34, 0.22, 0.12, 0.04]; // each group settles at a different point of the slide's arrival
const DWELL = 0.18; // share of each step where a slide simply rests while you keep scrolling

const stageVars = {
  "--bg-a": heroSlides[0].washFrom,
  "--bg-b": heroSlides[0].washTo,
  "--accent": heroSlides[0].accent,
} as CSSProperties;

function slideVars(slide: HeroSlide) {
  return { "--accent": slide.accent } as CSSProperties;
}

const hexToRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mixHex = (a: string, b: string, t: number) => {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return `rgb(${A.map((v, k) => Math.round(v + (B[k] - v) * t)).join(",")})`;
};

// Raw scroll progress to slide position: each slide rests, then eases into the next
function shape(raw: number, count: number) {
  if (raw >= count - 1) return count - 1;
  const i = Math.floor(raw);
  const t = Math.min(1, Math.max(0, (raw - i - DWELL) / (1 - 2 * DWELL)));
  return i + t * t * t * (t * (t * 6 - 15) + 10);
}

function HeroCarousel() {
  const count = heroSlides.length;
  const [index, setIndex] = useState(0);
  const wrapRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const topRef = useRef(0); // height of a sticky/fixed site header, so the hero pins below it
  const reduced = useRef(false);
  const touching = useRef(false);
  const target = useRef(0); // where the scroll says we should be
  const current = useRef(0); // what is drawn; it eases toward the target
  const lastTime = useRef(0);
  const loop = useRef(0);
  const animToken = useRef(0);
  const animating = useRef(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  // How far through the pinned hero we are, 0 to count - 1 (before the rest/ease shaping)
  const getPos = useCallback(() => {
    const wrap = wrapRef.current;
    const stage = stageRef.current;
    if (!wrap || !stage) return null;
    const range = wrap.offsetHeight - stage.offsetHeight;
    if (range <= 0) return null;
    const top = wrap.getBoundingClientRect().top;
    const p = Math.min(1, Math.max(0, (topRef.current - top) / range));
    return { pos: p * (count - 1), range, absTop: top + window.scrollY };
  }, [count]);

  // Draws one frame for a (fractional) slide position
  const render = useCallback(
    (pos: number) => {
      const track = trackRef.current;
      const stage = stageRef.current;
      if (!track || !stage) return;
      track.style.transform = `translate3d(${-pos * 100}%, 0, 0)`;
      Array.from(track.children).forEach((node, i) => {
        const o = i - pos;
        const s = (node as HTMLElement).style;
        s.visibility = Math.abs(o) < 1 ? "visible" : "hidden"; // off-screen links can't take focus
        if (Math.abs(o) > 2) return;
        const a = Math.min(1, Math.abs(o));
        s.setProperty("--o", o.toFixed(3));
        s.setProperty("--a", a.toFixed(3));
        REVEAL.forEach((settleAt, k) => {
          const r = Math.min(1, Math.max(0, (a - settleAt) / (1 - settleAt)));
          s.setProperty(`--r${k + 1}`, ((o < 0 ? -1 : 1) * r * r).toFixed(3)); // r squared: eases into place
          s.setProperty(`--q${k + 1}`, (1 - r).toFixed(3));
        });
      });
      tabsRef.current?.querySelectorAll<HTMLElement>(".hc-tab-fill").forEach((el, i) => {
        el.style.setProperty("--f", Math.min(1, Math.max(0, pos - i + 1)).toFixed(3));
      });
      // The background is one liquid gradient that blends from slide to slide
      const i0 = Math.min(count - 1, Math.floor(pos));
      const i1 = Math.min(count - 1, i0 + 1);
      const t = pos - i0;
      const a = heroSlides[i0];
      const b = heroSlides[i1];
      stage.style.setProperty("--bg-a", mixHex(a.washFrom, b.washFrom, t));
      stage.style.setProperty("--bg-b", mixHex(a.washTo, b.washTo, t));
      stage.style.setProperty("--accent", mixHex(a.accent, b.accent, t));
      const next = Math.round(pos);
      if (next !== indexRef.current) {
        indexRef.current = next;
        setIndex(next);
      }
    },
    [count],
  );

  // Frame loop: ease what is drawn toward the target, independent of how the browser sends scroll events
  const tick: (now: number) => void = useCallback(
    (now: number) => {
      const dt = Math.min(64, now - lastTime.current || 16);
      lastTime.current = now;
      const diff = target.current - current.current;
      if (Math.abs(diff) < 0.0006) current.current = target.current;
      else current.current += diff * (1 - Math.exp(-dt / 120));
      render(current.current);
      loop.current = current.current === target.current ? 0 : requestAnimationFrame(tick);
    },
    [render],
  );

  const update = useCallback(
    (immediate = false) => {
      const m = getPos();
      if (!m) return;
      const next = reduced.current ? Math.round(m.pos) : shape(m.pos, count);
      target.current = next;
      if (immediate || reduced.current) {
        cancelAnimationFrame(loop.current);
        loop.current = 0;
        current.current = next;
        render(next);
      } else if (!loop.current) {
        lastTime.current = performance.now();
        loop.current = requestAnimationFrame(tick);
      }
    },
    [count, getPos, render, tick],
  );

  // Our own eased page scroll, so slide jumps and settling feel the same everywhere
  const animateScroll = useCallback((to: number, ms: number) => {
    const from = window.scrollY;
    const delta = to - from;
    const token = ++animToken.current;
    if (reduced.current || Math.abs(delta) < 1) {
      animating.current = false;
      window.scrollTo({ top: to, behavior: "instant" as ScrollBehavior });
      return;
    }
    animating.current = true;
    const t0 = performance.now();
    const frameFn = (now: number) => {
      if (token !== animToken.current) return;
      const t = Math.min(1, (now - t0) / ms);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      window.scrollTo({ top: from + delta * e, behavior: "instant" as ScrollBehavior });
      if (t < 1) requestAnimationFrame(frameFn);
      else animating.current = false;
    };
    requestAnimationFrame(frameFn);
  }, []);

  const goTo = useCallback(
    (i: number) => {
      const m = getPos();
      if (!m) return;
      const slide = Math.min(count - 1, Math.max(0, i));
      const to = m.absTop - topRef.current + (slide / (count - 1)) * m.range;
      animateScroll(to, Math.min(1300, 500 + Math.abs(to - window.scrollY) * 0.4));
    },
    [count, getPos, animateScroll],
  );

  // If scrolling stops between two slides, ease the page the short way to the nearest resting point
  const settle = useCallback(() => {
    if (touching.current || animating.current) return;
    const m = getPos();
    if (!m) return;
    const i = Math.floor(m.pos);
    const f = m.pos - i;
    if (i >= count - 1 || f <= DWELL || f >= 1 - DWELL) return;
    const edge = f < 0.5 ? DWELL : 1 - DWELL;
    const to = m.absTop - topRef.current + ((i + edge) / (count - 1)) * m.range;
    animateScroll(to, 520);
  }, [count, getPos, animateScroll]);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const layout = () => {
      // Pin below the site header if it is sticky or fixed. If your header has a
      // known height, you can replace this lookup with a fixed number.
      const header = document.querySelector("header");
      const h = header ? header.getBoundingClientRect().height : 0;
      const stuck = header ? ["sticky", "fixed"].includes(getComputedStyle(header).position) : false;
      topRef.current = stuck ? h : 0;
      wrapRef.current?.style.setProperty("--hc-top", `${topRef.current}px`);
      wrapRef.current?.style.setProperty("--hc-h", `calc(100svh - ${h}px)`);
      update(true);
    };
    const onScroll = () => {
      update();
      clearTimeout(settleTimer.current);
      settleTimer.current = setTimeout(settle, 180);
    };
    // Any real input takes over from our own scroll animation
    const onUserInput = () => {
      animToken.current++;
      animating.current = false;
    };
    const onTouchStart = () => {
      touching.current = true;
      onUserInput();
    };
    const onTouchEnd = () => {
      touching.current = false;
      clearTimeout(settleTimer.current);
      settleTimer.current = setTimeout(settle, 180);
    };

    layout();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", layout);
    window.addEventListener("wheel", onUserInput, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", layout);
      window.removeEventListener("wheel", onUserInput);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      clearTimeout(settleTimer.current);
      cancelAnimationFrame(loop.current);
      animToken.current++;
    };
  }, [update, settle]);

  return (
    <section
      ref={wrapRef}
      className="hc-scroll"
      aria-roledescription="carousel"
      aria-label="Featured Milano products"
      style={{ "--hc-count": count } as CSSProperties}
    >
      <style dangerouslySetInnerHTML={{ __html: heroCss }} />
      <div
        ref={stageRef}
        className="hc"
        style={stageVars}
        onKeyDown={(e) => {
          const by = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
          if (by && indexRef.current + by >= 0 && indexRef.current + by < count) {
            e.preventDefault();
            goTo(indexRef.current + by);
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
            goTo(indexRef.current + (dx < 0 ? 1 : -1));
          }
        }}
      >
        <h1 className="hc-sr">Milano Foods: mojito syrups and dessert powders</h1>

        <div ref={trackRef} className="hc-track">
          {heroSlides.map((s, i) => (
            <div
              key={s.id}
              className="hc-slide"
              style={slideVars(s)}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}: ${s.name}`}
            >
              <div className="hc-copy">
                <h2 className="hc-title">
                  <span className="hc-line">
                    <span className="hc-line-in hc-l1">{s.lines[0]}</span>
                  </span>
                  <em className="hc-line">
                    <span className="hc-line-in hc-l2">{s.lines[1]}</span>
                  </em>
                </h2>
                <p className="hc-text">{s.text}</p>
                <div className="hc-actions">
                  <Link href={s.href} className="hc-btn hc-btn-solid">
                    {s.cta}
                  </Link>
                  <Link href="/products" className="hc-btn hc-btn-quiet">
                    Explore all flavors
                  </Link>
                </div>
                <p className="hc-meta">{s.meta}</p>
              </div>

              <div className="hc-art">
                <div className="hc-disc" />
                <div className="hc-bottle">
                  <div className="hc-shadow" />
                  <Image
                    src={s.image}
                    alt={s.alt}
                    fill
                    sizes="(min-width: 900px) 40vw, 70vw"
                    priority={i === 0}
                    draggable={false}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="hc-controls">
          <div ref={tabsRef} className="hc-tabs" role="group" aria-label="Choose a slide">
            {heroSlides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className="hc-tab"
                aria-label={`Show ${s.name}`}
                aria-current={i === index}
                onClick={() => goTo(i)}
              >
                <span className="hc-tab-label">{s.name}</span>
                <span className="hc-tab-bar">
                  <span className="hc-tab-fill" />
                </span>
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

/* ------------------------------------------------------------------ */
/* 4. PAGE                                                             */
/* ------------------------------------------------------------------ */

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