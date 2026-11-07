"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Search, Menu, X, Phone, Mail, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { LanguageSelector } from "./language-selector";
import { useStore } from "./store-provider";

export function SiteAnnouncement() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/miniapp")) return null;
  return (
    <div className="announcement">
      Premium food solutions for every moment · Discover the Milano range
    </div>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/miniapp")) return null;

  const { count } = useStore();
  const [open, setOpen] = useState(false);
  const links = [
    ["Home", "/"],
    ["Products", "/products"],
    ["Product Guide", "/product-guide"],
    ["Recipes", "/recipes"],
    ["For Businesses", "/for-businesses"],
    ["About Us", "/about"],
    ["Contact", "/contact"],
  ];

  return (
    <header className="site-header">
      <div className="wrap header-inner">
        <Link href="/" className="brand" aria-label="Milano Foods home">
          <span className="brand-main">Milano</span>
          <span className="brand-sub">FOODS</span>
        </Link>
        <nav className="nav">
          {links.map(([label, href]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <Link className="icon-button" href="/products" aria-label="Search products">
            <Search size={18} />
          </Link>
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
        <nav className="mobile-nav" id="mobile-site-navigation">
          {links.map(([label, href]) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}>
              {label}
            </Link>
          ))}
          <Link href="/cart" onClick={() => setOpen(false)}>
            Shopping Cart ({count})
          </Link>
        </nav>
      )}
    </header>
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
        {/* Top Feature Banner */}
        <div className="footer-banner">
          <div className="footer-banner-text">
            <span className="footer-banner-eyebrow">Milano Food Processing</span>
            <h3>Crafted for Cafés, Restaurants & Dessert Creators</h3>
            <p>
              Supplying premium mojito syrups, ice cream powders, and milkshake mixes across Addis Ababa and throughout Ethiopia.
            </p>
          </div>
          <div className="footer-banner-action">
            <Link href="/products" className="btn btn-gold">
              Explore Collection
            </Link>
          </div>
        </div>

        {/* Main Footer Grid */}
        <div className="footer-grid">
          {/* Brand Info */}
          <div className="footer-col-brand">
            <Link href="/" className="brand" aria-label="Milano Foods home">
              <span className="brand-main">Milano</span>
              <span className="brand-sub">FOODS</span>
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
            <a href="https://hadatradingplc.ethiodeploy.com/" target="_blank" rel="noopener noreferrer">
              Powered by HADA
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
