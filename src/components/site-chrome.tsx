"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Menu, X, Phone, Mail, MapPin, MessageCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LanguageSelector } from "./language-selector";
import { useStore } from "./store-provider";

export function SiteHeader() {
  const pathname = usePathname();
  const { count } = useStore();
  const [open, setOpen] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const updateScrollState = () => setScrolled(window.scrollY > 40);
    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    return () => window.removeEventListener("scroll", updateScrollState);
  }, []);

  useEffect(() => {
    if (!open && !phoneOpen) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!target || !headerRef.current || headerRef.current.contains(target)) return;
      setOpen(false);
      setPhoneOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open, phoneOpen]);

  if (pathname?.startsWith("/admin") || pathname?.startsWith("/miniapp")) return null;

  const links = [
    ["Home", "/"],
    ["Products", "/products"],
    ["Product Guide", "/product-guide"],
    ["Recipes", "/recipes"],
    ["For Businesses", "/for-businesses"],
    ["About Us", "/about"],
    ["Contact", "/contact"],
  ];
  const isHome = pathname === "/";

  return (
    <header
      className={`site-header${isHome ? " site-header-home" : ""}${scrolled ? " is-scrolled" : ""}`}
      ref={headerRef}
    >
      <div className="wrap header-inner">
        <Link href="/" className="brand" aria-label="Milano Foods home">
          <Image src="/images/milanologo.png" alt="Milano Foods" width={136} height={42} priority className="brand-logo" />
        </Link>
        <nav className="nav">
          {links.map(([label, href]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <div className="header-phone">
            <button
              type="button"
              className="icon-button header-phone-trigger"
              aria-label="Call Milano Foods"
              aria-expanded={phoneOpen}
              aria-controls="header-phone-menu"
              onClick={() => setPhoneOpen(!phoneOpen)}
            >
              <Phone size={18} />
            </button>
            <div id="header-phone-menu" className="header-phone-menu" hidden={!phoneOpen}>
              <a href="tel:+251980637293">+251 980 637 293</a>
              <a href="tel:+251933330065">+251 933 330 065</a>
            </div>
          </div>
          <LanguageSelector />
          <Link className="icon-button" href="/cart" aria-label={`Cart, ${count} items`}>
            <ShoppingBag size={19} />
            {count > 0 && <span className="cart-count">{count}</span>}
          </Link>
          <Link className="btn btn-small desktop-shop" href="/products">
            Shop Now
          </Link>
          <button
            className="icon-button mobile-menu"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-site-navigation"
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="mobile-nav" id="mobile-site-navigation" aria-label="Mobile navigation">
          {links.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              aria-current={pathname === href ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
          <Link
            href="/cart"
            onClick={() => setOpen(false)}
            aria-current={pathname === "/cart" ? "page" : undefined}
          >
            Shopping Cart ({count})
          </Link>
        </nav>
      )}
    </header>
  );
}

export function SiteWhatsApp() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/miniapp")) return null;

  return (
    <a
      className="whatsapp-float"
      href="https://wa.me/251980637293"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Milano Foods on WhatsApp"
    >
      <MessageCircle size={23} aria-hidden="true" />
      <span className="whatsapp-float-label">WhatsApp</span>
    </a>
  );
}

export function SiteFooter() {
  const pathname = usePathname();
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([]);

  useEffect(() => {
    if (pathname?.startsWith("/admin") || pathname?.startsWith("/miniapp")) return;
    let active = true;
    async function loadCategories() {
      try {
        const response = await fetch("/api/categories", { cache: "no-store" });
        if (!response.ok) throw new Error("Unable to load footer categories.");
        const data = (await response.json()) as { id: string; name: string; slug: string }[];
        if (active) setCategories(data);
      } catch (error) {
        console.error("Footer product categories could not be loaded:", error);
      }
    }
    void loadCategories();
    return () => {
      active = false;
    };
  }, [pathname]);

  if (pathname?.startsWith("/admin") || pathname?.startsWith("/miniapp")) return null;

  return (
    <footer className="footer">
      <div className="wrap">
        {/* Main Footer Grid */}
        <div className="footer-grid">
          {/* Brand Info */}
          <div className="footer-col-brand">
            <Link href="/" className="brand" aria-label="Milano Foods home">
              <Image src="/images/milanologo.png" alt="Milano Foods" width={136} height={42} className="brand-logo" />
            </Link>
            <p className="footer-tagline">
              Premium flavors designed to inspire delicious drinks and desserts for home kitchens, cafés, and food-service professionals across Ethiopia.
            </p>
            <div className="footer-badge">
              <span>Made with pride in Ethiopia</span>
            </div>
          </div>

          {/* Explore Links */}
          <div>
            <h4>Explore</h4>
            <div className="footer-links">
              <Link href="/products">All Products</Link>
              {categories.map((category) => (
                <Link key={category.id} href={`/products?category=${encodeURIComponent(category.name)}`}>
                  {category.name}
                </Link>
              ))}
              <Link href="/recipes">Recipes & Ideas</Link>
              <Link href="/product-guide">Product Guide</Link>
              <Link href="/customer-stories">Milano in Everyday Kitchens</Link>
            </div>
          </div>

          {/* Company Links */}
          <div>
            <h4>Company</h4>
            <div className="footer-links">
              <Link href="/about">About Milano</Link>
              <Link href="/for-businesses">For Businesses</Link>
              <Link href="/quality">Product Information</Link>
              <Link href="/faq">Frequently Asked Questions</Link>
              <Link href="/delivery">Delivery Information</Link>
              <Link href="/pickup">Pickup Locations</Link>
              <Link href="/contact">Business Inquiries</Link>
              <Link href="/cart">Shopping Cart</Link>
            </div>
          </div>

          {/* Contact Details */}
          <div className="footer-col-contact">
            <h4>Contact Us</h4>
            <div className="footer-contact-items">
              <div className="footer-contact-row">
                <MapPin size={17} className="footer-contact-icon" />
                <div>
                  <strong>Address</strong>
                  <span>Addis Ababa, Ethiopia</span>
                </div>
              </div>

              <div className="footer-contact-row">
                <Phone size={17} className="footer-contact-icon" />
                <div>
                  <strong>Call Us</strong>
                  <div className="footer-phones">
                    <a href="tel:+251980637293">+251 980 637 293</a>
                    <a href="tel:+251933330065">+251 933 330 065</a>
                  </div>
                </div>
              </div>

              <div className="footer-contact-row">
                <Mail size={17} className="footer-contact-icon" />
                <div>
                  <strong>Email</strong>
                  <a href="mailto:milanofoodprocessing@gmail.com" className="footer-email-link">
                    milanofoodprocessing@gmail.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Milano Foods. All rights reserved.</span>
          <div className="footer-bottom-links">
            <Link href="/privacy">Privacy Policy</Link>
            <span>·</span>
            <Link href="/terms">Terms & Conditions</Link>
          </div>
          <div className="footer-credits">
            <a href="https://ethioedge.com/" target="_blank" rel="noopener noreferrer">
              Powered by EthioEdge
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
