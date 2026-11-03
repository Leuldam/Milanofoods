"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment, useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
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
  name: string; // short label on the slide bar (desktop)
  mark: string; // the big outlined word behind the product; keep it to 5 letters or fewer
  lines: [string, string]; // headline: first line upright, second line italic in the accent color
  text: string;
  meta: string; // small line under the buttons
  seal: [string, string]; // round badge by the product: big word, small word
  cta: string;
  href: string;
  image: string;
  alt: string;
  washFrom: string; // the "pour" color that sweeps across the hero when this slide arrives
  washTo: string;
  accent: string; // italic headline line and progress bar; keep it readable on the wash
};

const heroSlides: HeroSlide[] = [
  {
    id: "mojito-syrup",
    name: "Mojito Syrup",
    mark: "Mojito",
    lines: ["Bright flavors,", "ready to pour."],
    text: "Explore Milano Mojito Syrup, a refreshing range for mocktails, lemonades, and creative drinks.",
    meta: "Milano Mojito Syrup",
    seal: ["Fresh", "flavors"],
    cta: "Shop mojito syrup",
    href: "/products?category=Mojito%20Syrups",
    image: "/images/milano-mint-bottle-cutout.png",
    alt: "Milano Mojito Syrup bottle",
    washFrom: "#DDF0DF",
    washTo: "#ADD7B4",
    accent: "#286648",
  },
  {
    id: "ice-cream-powder",
    name: "Ice Cream Powder",
    mark: "Cream",
    lines: ["Make every scoop", "a Milano moment."],
    text: "Discover Milano Ice Cream Powder in delicious flavors, hard or soft styles, and a range of pack sizes.",
    meta: "Ice cream powder, hard and soft",
    seal: ["Hard", "& soft"],
    cta: "Shop ice cream powder",
    href: "/products?category=Ice%20Cream%20Powders",
    image: "/images/milanoice.png",
    alt: "Milano Ice Cream Powder",
    washFrom: "#FFF0D7",
    washTo: "#EBC98E",
    accent: "#795722",
  },
  {
    id: "milkshake-powder",
    name: "Milkshake Powder",
    mark: "Shake",
    lines: ["Make it creamy,", "make it Milano."],
    text: "Find your favorite milkshake flavor in powder or liquid options, ready for cafés and home creations.",
    meta: "Milkshake, powder and liquid",
    seal: ["Mix", "& enjoy"],
    cta: "Shop milkshake",
    href: "/products?category=Milkshake%20Powders",
    image: "/images/milanomilk.png",
    alt: "Milano Milkshake Powder",
    washFrom: "#F8E2DF",
    washTo: "#EABDB3",
    accent: "#8B4F46",
  },
];

// Soft bubbles drifting behind the product. x/y: position in the art area,
// s: size in px, d: how far they travel while sliding (bigger = nearer to you)
const BUBBLES = [
  { x: "6%", y: "20%", s: 28, d: 0.7 },
  { x: "90%", y: "64%", s: 44, d: 0.5 },
  { x: "14%", y: "72%", s: 16, d: 0.9 },
  { x: "70%", y: "10%", s: 14, d: 0.8 },
  { x: "2%", y: "46%", s: 36, d: 0.45 },
] as const;

/* ------------------------------------------------------------------ */
/* 2. HERO STYLES                                                      */
/* The hero is pinned while the page scrolls. Scrolling down moves     */
/* through the slides. Tune with --hc-step (scroll distance per slide) */
/* and --hc-art-h (product height).                                    */
/* ------------------------------------------------------------------ */

const heroCss = `
.hc-scroll {
  --hc-step: 56svh;
  --hc-top: 0px;
  --hc-h: 100svh;
  position: relative;
  height: calc(var(--hc-h) + (var(--hc-count, 3) - 1) * var(--hc-step));
}
.hc {
  --hc-art-h: clamp(180px, 32svh, 340px);
  --ink: #03291f;
  --cream: #faf7f0;
  --cx: 50%; --cy: 26%;
  --pad: 20px;
  position: sticky; top: var(--hc-top); height: var(--hc-h);
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

/* Background. The first slide's color fills the hero. Every later slide is a wide
   curtain with a rounded leading edge that sweeps in from the right as its slide
   arrives, so the new color pours across the old one. Only transforms change while
   scrolling, so the GPU does all the work. */
.hc-bg { position: absolute; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }
.hc-wash {
  position: absolute; top: 0; bottom: 0; left: 0; width: 100%;
  background: linear-gradient(160deg, var(--wa), var(--wb));
}
.hc-wash + .hc-wash {
  width: 210%;
  background: linear-gradient(160deg, var(--wa) 12%, var(--wb) 88%);
  border-radius: 22% 0 0 22% / 50% 0 0 50%;
  box-shadow: -28px 0 56px rgba(255, 255, 255, 0.32);
  transform: translate3d(50%, 0, 0); /* parked off-screen until its slide arrives */
  visibility: hidden;
  will-change: transform;
}
.hc-bg::after {
  content: ""; position: absolute; inset: 0;
  background: radial-gradient(circle at var(--cx) var(--cy), rgba(255, 255, 255, 0.5), transparent 55%);
}

/* The track slides sideways as the page scrolls down (moved from JS) */
.hc-track { position: relative; z-index: 1; display: flex; height: 100%; will-change: transform; }
.hc-slide {
  position: relative; flex: 0 0 100%; min-width: 0; height: 100%;
  display: flex; flex-direction: column; justify-content: center; gap: 14px;
  padding: 12px var(--pad) 88px;
}
.hc-slide:not([data-on]) * { animation-play-state: paused; }

/* Copy */
.hc-copy { position: relative; display: grid; gap: 14px; justify-items: start; }
.hc-title {
  margin: 0;
  font-family: var(--font-sans, "Manrope", "Helvetica Neue", Arial, sans-serif);
  font-size: clamp(2.3rem, 10.4vw, 3.6rem);
  font-weight: 750; line-height: 1.04; letter-spacing: -0.045em;
  text-wrap: balance;
}
.hc-line {
  display: block; overflow: hidden; will-change: transform;
  padding: 0.06em 0.12em 0.16em 0; margin: -0.06em -0.12em -0.16em 0; /* room for descenders and italics */
}
.hc-title em.hc-line { font-weight: 500; font-style: italic; color: var(--accent); }

/* Each word rises out of the line one after another as its slide arrives, and drops
   away in reverse as it leaves. --a (0 = settled, 1 = off screen) and --sg (-1 or 1,
   which side it is on) come from JS; --w is the word's position in the headline. */
.hc-w {
  --rw: clamp(0, calc((var(--a, 0) - 0.46 + var(--w, 0) * 0.05) * 1.9), 1);
  display: inline-block; transform-origin: 0 100%;
  transform: translate3d(0, calc(var(--rw) * var(--rw) * var(--sg, 1) * 115%), 0)
    rotate(calc(var(--rw) * var(--sg, 1) * 5deg));
}

.hc-text {
  margin: 0; max-width: 32rem; font-size: 1.0625rem; line-height: 1.6;
  color: rgba(3, 41, 31, 0.84);
  transform: translate3d(calc(var(--o, 0) * -8%), calc(var(--r3, 0) * 36px), 0);
  opacity: var(--q3, 1);
  will-change: transform, opacity;
}
.hc-actions { display: flex; flex-wrap: wrap; gap: 10px 14px; width: 100%; margin-top: 4px; }
.hc-actions, .hc-meta {
  transform: translate3d(calc(var(--o, 0) * -10%), calc(var(--r4, 0) * 36px), 0);
  opacity: var(--q4, 1);
  will-change: transform, opacity;
}
.hc-btn {
  display: inline-flex; align-items: center; justify-content: center;
  min-height: 52px; padding: 0 28px; border-radius: 999px;
  font-size: 1rem; font-weight: 600; text-decoration: none;
  transition: background-color 0.25s, border-color 0.25s;
}
.hc-btn-solid { background: var(--ink); color: var(--cream); }
.hc-btn-solid:hover { background: #073d2e; }
.hc-btn-quiet { color: var(--ink); border: 1.5px solid rgba(3, 41, 31, 0.3); }
.hc-btn-quiet:hover { background: rgba(255, 255, 255, 0.45); border-color: var(--ink); }
.hc-meta { margin: 0; font-size: 0.9rem; color: rgba(3, 41, 31, 0.74); }

/* Product area. Layers move at different speeds while a slide arrives, which gives depth:
   the big word lags behind, the bottle leads, the bubbles and the seal travel farthest. */
.hc-art {
  order: -1; position: relative; height: var(--hc-art-h);
  perspective: 1000px; container-type: inline-size;
}
.hc-mark {
  position: absolute; inset: 0; display: grid; place-items: center; margin: 0;
  font-family: var(--font-sans, "Manrope", "Helvetica Neue", Arial, sans-serif);
  font-size: clamp(4rem, 18vw, 12rem); font-weight: 700; line-height: 1; letter-spacing: -0.03em;
  white-space: nowrap; user-select: none; pointer-events: none;
  color: rgba(255, 255, 255, 0.42);
  -webkit-text-stroke: 1.5px rgba(3, 41, 31, 0.22);
  transform: translate3d(calc(var(--o, 0) * -24%), 0, 0);
  opacity: var(--q2, 1);
  will-change: transform, opacity;
}
@supports (font-size: 1cqw) {
  .hc-mark { font-size: clamp(4rem, 27cqw, 15rem); }
}
.hc-disc {
  position: absolute; left: 50%; top: 50%;
  width: min(92%, 560px, calc(var(--hc-art-h) * 1.05)); aspect-ratio: 1; border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
  transform: translate(-50%, -50%) translateX(calc(var(--o, 0) * 18%))
    scale(calc(0.55 + var(--q1, 1) * 0.45));
  opacity: var(--q1, 1);
  will-change: transform, opacity;
}
.hc-bubbles { position: absolute; inset: 0; pointer-events: none; }
.hc-bubble {
  position: absolute; left: var(--x); top: var(--y);
  width: calc(var(--s) * 1px); aspect-ratio: 1; border-radius: 50%;
  background: radial-gradient(circle at 32% 30%, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.14) 62%);
  border: 1px solid rgba(255, 255, 255, 0.6);
  transform: translate3d(calc(var(--o, 0) * var(--d) * 50vw), 0, 0);
  transform: translate3d(calc(var(--o, 0) * var(--d) * 60cqw), 0, 0);
  opacity: var(--q1, 1);
  will-change: transform, opacity;
}
.hc-bottle {
  position: absolute; inset: 0; width: min(86%, 520px);
  margin-inline: auto; transform-origin: 50% 100%;
  transform: translateX(calc(var(--o, 0) * 34%)) translateY(calc(var(--a, 0) * 36px))
    rotateY(calc(var(--o, 0) * -32deg)) rotateZ(calc(var(--o, 0) * 11deg))
    scale(calc(1 - var(--a, 0) * 0.14));
  will-change: transform;
  backface-visibility: hidden;
}
.hc-bottle::before {
  content: ""; position: absolute; inset: -10% -14%; border-radius: 50%; pointer-events: none;
  background: radial-gradient(closest-side, rgba(255, 255, 255, 0.55), transparent);
}
.hc-float { position: absolute; inset: 0; animation: hc-float 8s ease-in-out infinite; }
.hc-float img { object-fit: contain; -webkit-user-drag: none; }
.hc-shadow {
  position: absolute; bottom: 1%; left: 50%; width: 50%; max-width: 260px; height: 6%;
  transform: translateX(-50%);
  background: radial-gradient(closest-side, rgba(3, 41, 31, 0.3), transparent);
  animation: hc-shadow 8s ease-in-out infinite;
}
.hc-seal {
  position: absolute; right: 2%; top: 2%; width: 92px; aspect-ratio: 1;
  display: grid; place-content: center; text-align: center; border-radius: 50%;
  font-family: var(--font-sans, "Manrope", "Helvetica Neue", Arial, sans-serif); line-height: 1;
  background: var(--ink); color: var(--cream);
  box-shadow: 0 0 0 5px rgba(255, 255, 255, 0.45);
  transform: translate3d(calc(var(--o, 0) * 46vw), calc(var(--a, 0) * -30px), 0) rotate(calc(var(--o, 0) * -50deg));
  opacity: var(--q2, 1);
  will-change: transform, opacity;
}
@supports (width: 1cqw) {
  .hc-seal {
    width: clamp(68px, 19cqw, 124px);
    transform: translate3d(calc(var(--o, 0) * 46cqw), calc(var(--a, 0) * -30px), 0) rotate(calc(var(--o, 0) * -50deg));
  }
}
.hc-seal b { font-size: 1.5rem; font-weight: 600; letter-spacing: -0.01em; }
.hc-seal span { margin-top: 0.3em; font-size: 0.72rem; opacity: 0.85; }
@supports (font-size: 1cqw) {
  .hc-seal b { font-size: clamp(1.2rem, 6.6cqw, 2.3rem); }
  .hc-seal span { font-size: clamp(0.62rem, 2.6cqw, 0.9rem); }
}

@keyframes hc-float {
  0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
  50% { transform: translate3d(0, -1.8%, 0) rotate(0.8deg); }
}
@keyframes hc-shadow {
  0%, 100% { transform: translateX(-50%) scale(1); opacity: 1; }
  50% { transform: translateX(-50%) scale(0.9); opacity: 0.8; }
}
@keyframes hc-cue {
  0% { transform: scaleY(0); transform-origin: top; }
  50% { transform: scaleY(1); transform-origin: top; }
  51% { transform: scaleY(1); transform-origin: bottom; }
  100% { transform: scaleY(0); transform-origin: bottom; }
}

/* Controls: the bars fill as you scroll, and double as slide buttons */
.hc-controls {
  position: absolute; z-index: 2; inset: auto 0 0;
  display: flex; align-items: center; gap: 14px;
  padding: 0 var(--pad) calc(10px + env(safe-area-inset-bottom, 0px));
}
.hc-tabs { display: flex; flex: 1; gap: 10px; max-width: 820px; }
.hc-tab {
  flex: 1; min-width: 0; padding: 16px 0 12px;
  background: none; border: 0; color: inherit; font: inherit;
  text-align: left; cursor: pointer;
}
.hc-tab-label {
  display: none; align-items: center; gap: 8px; margin-bottom: 8px;
  font-size: 0.875rem; font-weight: 600; white-space: nowrap;
  opacity: 0.6; transition: opacity 0.3s;
}
.hc-tab-label span { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.hc-dot { flex: none; width: 10px; height: 10px; border-radius: 50%; border: 1px solid rgba(3, 41, 31, 0.28); }
.hc-tab[aria-current="true"] .hc-tab-label, .hc-tab:hover .hc-tab-label { opacity: 1; }
.hc-tab-bar { display: block; height: 3px; border-radius: 2px; background: rgba(3, 41, 31, 0.18); overflow: hidden; }
.hc-tab-fill {
  display: block; height: 100%; background: var(--accent);
  transform: scaleX(0); transform-origin: left;
  transition: background-color 0.4s; will-change: transform;
}
.hc-buttons { display: none; gap: 8px; }
.hc-iconbtn {
  display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%;
  border: 1.5px solid rgba(3, 41, 31, 0.25); background: rgba(255, 255, 255, 0.55);
  color: var(--ink); cursor: pointer; transition: background-color 0.25s, opacity 0.25s;
}
.hc-iconbtn:hover:not(:disabled) { background: #fff; }
.hc-iconbtn:disabled { opacity: 0.35; cursor: default; }

/* Scroll hint on the first slide, desktop only; it fades out once you start scrolling */
.hc-cue {
  position: absolute; z-index: 2; left: 50%; bottom: 92px; display: none;
  flex-direction: column; align-items: center; gap: 8px;
  font-size: 0.8rem; font-weight: 600; color: rgba(3, 41, 31, 0.7);
  transform: translateX(-50%); pointer-events: none;
}
.hc-cue-line { position: relative; width: 2px; height: 36px; border-radius: 2px; overflow: hidden; background: rgba(3, 41, 31, 0.18); }
.hc-cue-line::after { content: ""; position: absolute; inset: 0; background: var(--ink); animation: hc-cue 1.9s cubic-bezier(0.6, 0, 0.2, 1) infinite; }

/* ---------- Small phones (under 600px wide) ---------- */
@media (max-width: 599px) {
  .hc-text {
    display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
    overflow: hidden; font-size: 1rem;
  }
  .hc-btn-solid { flex: 1 1 100%; }
  .hc-btn-quiet {
    flex: 1 1 100%; min-height: 44px; border-color: transparent;
    text-decoration: underline; text-underline-offset: 4px;
  }
  .hc-bubble:nth-child(n + 4) { display: none; }
}

/* ---------- Tablets, portrait (600 to 899px wide) ---------- */
@media (min-width: 600px) {
  .hc { --pad: 32px; --hc-art-h: clamp(240px, 38svh, 440px); --cy: 28%; }
  .hc-slide { gap: 18px; }
  .hc-copy { gap: 18px; }
  .hc-title { font-size: clamp(3rem, 8vw, 4.6rem); }
  .hc-text { font-size: 1.125rem; }
}
@media (min-width: 640px) { .hc-buttons { display: flex; } }

/* ---------- Phones and tablets that are not very tall ---------- */
@media (max-width: 899px) and (max-height: 800px) {
  .hc { --hc-art-h: clamp(150px, 27svh, 260px); }
  .hc-btn-quiet { display: none; }
}
@media (max-width: 899px) and (max-height: 700px) {
  .hc-title { font-size: clamp(2rem, 8.6vw, 2.7rem); }
  .hc-meta { display: none; }
}
@media (max-width: 899px) and (max-height: 600px) {
  .hc-text { display: none; }
}

/* ---------- Desktop (900px and up) ---------- */
@media (min-width: 900px) {
  .hc-scroll { --hc-step: 66svh; }
  .hc {
    --hc-art-h: min(70svh, 660px); --cx: 74%; --cy: 50%;
    --pad: max(32px, calc((100vw - 1280px) / 2));
  }
  .hc-slide {
    display: grid; grid-template-columns: minmax(0, 1.02fr) minmax(0, 1fr);
    align-items: center; gap: clamp(24px, 4vw, 64px);
    padding: 40px var(--pad) 112px;
  }
  .hc-copy { gap: 22px; }
  .hc-art { order: 0; }
  .hc-title { font-size: clamp(3.2rem, 5.6vw, 6rem); }
  .hc-text { font-size: 1.1875rem; }
  .hc-controls { gap: 24px; padding: 0 var(--pad) 28px; }
  .hc-tab-label { display: flex; }
  .hc-seal { top: 4%; right: 0; }
}
@media (min-width: 900px) and (min-height: 760px) { .hc-cue { display: flex; } }

/* ---------- Wide screens ---------- */
@media (min-width: 1500px) {
  .hc { --pad: max(48px, calc((100vw - 1400px) / 2)); }
  .hc-title { font-size: clamp(4.5rem, 5vw, 6.8rem); }
  .hc-text { max-width: 34rem; }
}

/* ---------- Short desktop windows ---------- */
@media (min-width: 900px) and (max-height: 700px) {
  .hc-title { font-size: clamp(2.4rem, 5vw, 3.8rem); }
  .hc-text { font-size: 1rem; }
  .hc-slide { padding-bottom: 96px; }
  .hc-copy { gap: 16px; }
}

/* ---------- Phones held sideways ---------- */
@media (max-width: 899px) and (orientation: landscape) and (max-height: 540px) {
  .hc { --hc-art-h: 62svh; --cx: 74%; --cy: 50%; --pad: 28px; }
  .hc-slide {
    display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
    align-items: center; gap: 20px; padding: 8px var(--pad) 60px;
  }
  .hc-art { order: 0; }
  .hc-title { font-size: clamp(1.7rem, 5.2vw, 2.5rem); }
  .hc-text, .hc-meta, .hc-btn-quiet, .hc-seal { display: none; }
  .hc-btn { min-height: 44px; }
  .hc-tab { padding: 8px 0 6px; }
}

@media (prefers-reduced-motion: reduce) {
  .hc *, .hc *::after { animation: none !important; transition: none !important; }
}
`;

/* ------------------------------------------------------------------ */
/* 3. HERO CAROUSEL (scroll-driven)                                    */
/* Page scroll is the single source of truth: the slide position is    */
/* computed from how far you have scrolled through the pinned hero.    */
/* What is drawn follows it with a critically damped spring, so wheel  */
/* notches and flicks glide without overshooting.                      */
/* ------------------------------------------------------------------ */

const REVEAL = [0.34, 0.22, 0.12, 0.04]; // each group settles at a different point of the slide's arrival
const DWELL = 0.18; // share of each step where a slide simply rests while you keep scrolling
const SETTLE_DELAY = 140; // ms of stillness before the page eases to the nearest resting point

// How tightly the drawing follows the scroll, as a spring smoothing time in seconds.
// Higher = floatier, lower = snappier. Touch screens already have native momentum, so
// they get a light touch; our own scripted scrolls are already eased, so they get one too.
const FOLLOW = { wheel: 0.14, touch: 0.06, scripted: 0.05 };

const stageVars = { "--accent": heroSlides[0].accent } as CSSProperties;

function slideVars(slide: HeroSlide) {
  return { "--accent": slide.accent } as CSSProperties;
}

function washVars(slide: HeroSlide) {
  return { "--wa": slide.washFrom, "--wb": slide.washTo } as CSSProperties;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// Raw scroll progress to slide position: each slide rests, then eases into the next
function shape(raw: number, count: number) {
  if (raw >= count - 1) return count - 1;
  const i = Math.floor(raw);
  const t = clamp((raw - i - DWELL) / (1 - 2 * DWELL), 0, 1);
  return i + t * t * t * (t * (t * 6 - 15) + 10);
}

// Splits a headline line into words so each can rise on its own (see .hc-w)
function Words({ text, from }: { text: string; from: number }) {
  return (
    <>
      {text.split(" ").map((word, k) => (
        <Fragment key={k}>
          <span className="hc-w" style={{ "--w": from + k } as CSSProperties}>
            {word}
          </span>{" "}
        </Fragment>
      ))}
    </>
  );
}

function HeroCarousel() {
  const count = heroSlides.length;
  const [index, setIndex] = useState(0);
  const wrapRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);
  const slidesRef = useRef<HTMLElement[]>([]);
  const washRef = useRef<HTMLElement[]>([]);
  const fillsRef = useRef<HTMLElement[]>([]);
  const shown = useRef<boolean[]>([]); // which slides are currently visible, so we only touch the DOM on change
  const washLive = useRef<boolean[]>([]); // same for the background layers
  const indexRef = useRef(0);
  const topRef = useRef(0); // height of a sticky/fixed site header, so the hero pins below it
  const metrics = useRef({ absTop: 0, range: 0 }); // measured once, so scrolling never forces a layout
  const reduced = useRef(false);
  const coarse = useRef(false);
  const touching = useRef(false);
  const target = useRef(0); // where the scroll says we should be
  const current = useRef(0); // what is drawn; it follows the target
  const velocity = useRef(0);
  const lastTime = useRef(0);
  const loop = useRef(0);
  const animToken = useRef(0);
  const animating = useRef(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  // Read the hero's position and length once (on load and resize), not on every scroll event
  const measure = useCallback(() => {
    const wrap = wrapRef.current;
    const stage = stageRef.current;
    if (!wrap || !stage) return;
    metrics.current = {
      absTop: wrap.getBoundingClientRect().top + window.scrollY,
      range: wrap.offsetHeight - stage.offsetHeight,
    };
  }, []);

  // How far through the pinned hero we are, 0 to count - 1 (before the rest/ease shaping)
  const getPos = useCallback(() => {
    const { absTop, range } = metrics.current;
    if (range <= 0) return null;
    const p = clamp((window.scrollY - (absTop - topRef.current)) / range, 0, 1);
    return { pos: p * (count - 1), range, absTop };
  }, [count]);

  // Draws one frame for a (fractional) slide position
  const render = useCallback(
    (pos: number) => {
      const track = trackRef.current;
      const stage = stageRef.current;
      if (!track || !stage) return;
      track.style.transform = `translate3d(${-pos * 100}%, 0, 0)`;

      // Only slides on screen get work done; the rest are hidden (and can't take focus)
      const slides = slidesRef.current;
      for (let i = 0; i < slides.length; i++) {
        const o = i - pos;
        const a = Math.abs(o);
        const el = slides[i];
        const visible = a < 1;
        if (visible !== shown.current[i]) {
          shown.current[i] = visible;
          el.style.visibility = visible ? "visible" : "hidden";
          if (visible) el.setAttribute("data-on", "");
          else el.removeAttribute("data-on"); // pauses its idle animations
        }
        if (!visible) continue;
        const s = el.style;
        s.setProperty("--o", o.toFixed(3));
        s.setProperty("--a", a.toFixed(3));
        s.setProperty("--sg", o < 0 ? "-1" : "1");
        for (let k = 0; k < REVEAL.length; k++) {
          const r = clamp((a - REVEAL[k]) / (1 - REVEAL[k]), 0, 1);
          s.setProperty(`--r${k + 1}`, ((o < 0 ? -1 : 1) * r * r).toFixed(3)); // r squared: eases into place
          s.setProperty(`--q${k + 1}`, (1 - r).toFixed(3));
        }
      }

      // Background: layer 0 is the base. Layer i sweeps in while pos goes from i - 1 to i,
      // then stays put until the next layer has fully covered it.
      const washes = washRef.current;
      for (let i = 0; i < washes.length; i++) {
        const el = washes[i];
        const live = pos > i - 1 && pos < i + 1;
        if (live !== washLive.current[i]) {
          washLive.current[i] = live;
          el.style.visibility = live ? "visible" : "hidden";
        }
        if (i > 0 && live) {
          const t = clamp(pos - (i - 1), 0, 1);
          el.style.transform = `translate3d(${(50 - 73.81 * t).toFixed(2)}%, 0, 0)`;
        }
      }

      fillsRef.current.forEach((el, i) => {
        el.style.transform = `scaleX(${clamp(pos - i + 1, 0, 1).toFixed(3)})`;
      });
      if (cueRef.current) cueRef.current.style.opacity = clamp(1 - pos * 4, 0, 1).toFixed(2);

      const next = clamp(Math.round(pos), 0, count - 1);
      if (next !== indexRef.current) {
        indexRef.current = next;
        stage.style.setProperty("--accent", heroSlides[next].accent); // the bar color fades via CSS
        setIndex(next);
      }
    },
    [count],
  );

  // Frame loop: a critically damped spring pulls what is drawn toward the target.
  // Unlike a plain exponential ease it starts gently, never overshoots, and its speed is
  // continuous when the target changes, so wheel notches and direction changes stay smooth.
  const tick: (now: number) => void = useCallback(
    (now: number) => {
      const dt = clamp((now - lastTime.current) / 1000 || 0.016, 0.001, 0.05);
      lastTime.current = now;
      const smoothTime = animating.current ? FOLLOW.scripted : coarse.current ? FOLLOW.touch : FOLLOW.wheel;
      const omega = 2 / smoothTime;
      const x = omega * dt;
      const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
      const change = current.current - target.current;
      const temp = (velocity.current + omega * change) * dt;
      velocity.current = (velocity.current - omega * temp) * decay;
      let next = target.current + (change + temp) * decay;
      if (target.current - current.current > 0 === next > target.current) {
        next = target.current; // never overshoot
        velocity.current = 0;
      }
      current.current = next;
      const done = Math.abs(target.current - next) < 0.0005 && Math.abs(velocity.current) < 0.002;
      if (done) {
        current.current = target.current;
        velocity.current = 0;
      }
      render(current.current);
      loop.current = done ? 0 : requestAnimationFrame(tick);
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
        velocity.current = 0;
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
      const slide = clamp(i, 0, count - 1);
      const to = m.absTop - topRef.current + (slide / (count - 1)) * m.range;
      animateScroll(to, Math.min(1300, 500 + Math.abs(to - window.scrollY) * 0.4));
    },
    [count, getPos, animateScroll],
  );

  // If scrolling stops between two slides, ease the page the short way to the nearest resting point
  const settle = useCallback(() => {
    if (touching.current || animating.current) return;
    measure(); // the page is idle, so this is a safe moment to catch anything that shifted the layout
    const m = getPos();
    if (!m) return;
    const i = Math.floor(m.pos);
    const f = m.pos - i;
    if (i >= count - 1 || f <= DWELL || f >= 1 - DWELL) return;
    const edge = f < 0.5 ? DWELL : 1 - DWELL;
    const to = m.absTop - topRef.current + ((i + edge) / (count - 1)) * m.range;
    animateScroll(to, Math.min(620, 240 + Math.abs(to - window.scrollY) * 0.6));
  }, [count, measure, getPos, animateScroll]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const track = trackRef.current;
    const bg = bgRef.current;
    const tabs = tabsRef.current;
    if (!wrap || !track || !bg || !tabs) return;

    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    coarse.current = window.matchMedia("(pointer: coarse)").matches;
    slidesRef.current = Array.from(track.children) as HTMLElement[];
    washRef.current = Array.from(bg.children) as HTMLElement[];
    fillsRef.current = Array.from(tabs.querySelectorAll<HTMLElement>(".hc-tab-fill"));
    shown.current = [];
    washLive.current = [];

    const layout = (immediate = false) => {
      // Pin below the site header if it is sticky or fixed. If your header has a
      // known height, you can replace this lookup with a fixed number.
      const header = document.querySelector("header");
      const h = header ? header.getBoundingClientRect().height : 0;
      const stuck = header ? ["sticky", "fixed"].includes(getComputedStyle(header).position) : false;
      topRef.current = stuck ? h : 0;
      wrap.style.setProperty("--hc-top", `${topRef.current}px`);
      wrap.style.setProperty("--hc-h", `calc(100svh - ${h}px)`);
      measure();
      update(immediate);
    };
    const onResize = () => layout();
    const onScroll = () => {
      update();
      clearTimeout(settleTimer.current);
      settleTimer.current = setTimeout(settle, SETTLE_DELAY);
    };
    // Any real input takes over from our own scroll animation
    const onUserInput = () => {
      animToken.current++;
      animating.current = false;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.defaultPrevented) onUserInput(); // the carousel's own arrow keys call preventDefault
    };
    const onTouchStart = () => {
      touching.current = true;
      onUserInput();
    };
    const onTouchEnd = () => {
      touching.current = false;
      clearTimeout(settleTimer.current);
      settleTimer.current = setTimeout(settle, SETTLE_DELAY);
    };

    layout(true);
    const header = document.querySelector("header");
    const resizeObserver = header && typeof ResizeObserver !== "undefined" ? new ResizeObserver(onResize) : null;
    if (resizeObserver && header) resizeObserver.observe(header);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("load", onResize);
    window.addEventListener("wheel", onUserInput, { passive: true });
    window.addEventListener("pointerdown", onUserInput, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("load", onResize);
      window.removeEventListener("wheel", onUserInput);
      window.removeEventListener("pointerdown", onUserInput);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      resizeObserver?.disconnect();
      clearTimeout(settleTimer.current);
      cancelAnimationFrame(loop.current);
      loop.current = 0;
      animToken.current++;
    };
  }, [update, settle, measure]);

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
        <div ref={bgRef} className="hc-bg" aria-hidden="true">
          {heroSlides.map((s) => (
            <div key={s.id} className="hc-wash" style={washVars(s)} />
          ))}
        </div>

        <h1 className="hc-sr">Milano Foods: Mojito Syrup, Ice Cream Powder, and Milkshake Powder</h1>

        <div ref={trackRef} className="hc-track">
          {heroSlides.map((s, i) => (
            <div
              key={s.id}
              className="hc-slide"
              style={slideVars(s)}
              data-on={i === 0 ? "" : undefined}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}: ${s.name}`}
            >
              <div className="hc-copy">
                <h2 className="hc-title">
                  <span className="hc-line">
                    <Words text={s.lines[0]} from={0} />
                  </span>
                  <em className="hc-line">
                    <Words text={s.lines[1]} from={s.lines[0].split(" ").length} />
                  </em>
                </h2>
                <p className="hc-text">{s.text}</p>
                <div className="hc-actions">
                  <Link href={s.href} className="hc-btn hc-btn-solid">
                    {s.cta}
                  </Link>
                  <Link href="/product-guide" className="hc-btn hc-btn-quiet">
                    Flavor &amp; use guide
                  </Link>
                </div>
                <p className="hc-meta">{s.meta}</p>
              </div>

              <div className="hc-art">
                <div className="hc-mark" aria-hidden="true">
                  {s.mark}
                </div>
                <div className="hc-disc" />
                <div className="hc-bubbles" aria-hidden="true">
                  {BUBBLES.map((b, k) => (
                    <span
                      key={k}
                      className="hc-bubble"
                      style={{ "--x": b.x, "--y": b.y, "--s": b.s, "--d": b.d } as CSSProperties}
                    />
                  ))}
                </div>
                <div className="hc-bottle">
                  <div className="hc-shadow" />
                  <div className="hc-float">
                    <Image
                      src={s.image}
                      alt={s.alt}
                      fill
                      sizes="(min-width: 900px) 46vw, 80vw"
                      priority={i === 0}
                      loading={i === 0 ? undefined : "eager"} // neighbours are ready before they slide in
                      draggable={false}
                    />
                  </div>
                </div>
                <div className="hc-seal" aria-hidden="true">
                  <b>{s.seal[0]}</b>
                  <span>{s.seal[1]}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div ref={cueRef} className="hc-cue" aria-hidden="true">
          <span>Keep scrolling</span>
          <span className="hc-cue-line" />
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
                <span className="hc-tab-label">
                  <i className="hc-dot" style={{ background: s.washTo }} />
                  <span>{s.name}</span>
                </span>
                <span className="hc-tab-bar">
                  <span className="hc-tab-fill" style={i === 0 ? { transform: "scaleX(1)" } : undefined} />
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