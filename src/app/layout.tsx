import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "@/components/store-provider";
import { LocalizationProvider } from "@/components/localization-provider";
import { SiteHeader, SiteFooter, SiteAnnouncement } from "@/components/site-chrome";

export const metadata: Metadata = {
  title: { default: "Milano Foods Ethiopia | Syrups, Ice Cream & Milkshake Products", template: "%s | Milano Foods Ethiopia" },
  description: "Explore Milano Foods mojito syrups, ice cream powders, and milkshake products in Ethiopia. Browse the current range, recipes, and ordering information.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://milanofoods.vercel.app"),
  openGraph: {
    type: "website",
    locale: "en_ET",
    siteName: "Milano Foods Ethiopia",
    title: "Milano Foods Ethiopia | Syrups, Ice Cream & Milkshake Products",
    description: "Explore Milano Foods mojito syrups, ice cream powders, and milkshake products in Ethiopia.",
    images: [{ url: "/images/milanoshowcase.png", width: 1200, height: 630, alt: "Milano Foods drink and dessert product range" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Milano Foods Ethiopia | Drink & Dessert Products",
    description: "Explore Milano Foods mojito syrups, ice cream powders, milkshake products, and recipes.",
    images: ["/images/milanoshowcase.png"],
  },
  robots: { index: true, follow: true },
};

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${process.env.NEXT_PUBLIC_SITE_URL || "https://milanofoods.vercel.app"}/#organization`,
    name: "Milano Foods",
    legalName: "Milano Food Processing",
    url: process.env.NEXT_PUBLIC_SITE_URL || "https://milanofoods.vercel.app",
    image: `${process.env.NEXT_PUBLIC_SITE_URL || "https://milanofoods.vercel.app"}/images/milanoshowcase.png`,
    description: "Ethiopian food and beverage manufacturer offering mojito syrups, ice cream powders, and milkshake products.",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Addis Ababa",
      addressCountry: "ET",
    },
    areaServed: {
      "@type": "Country",
      name: "Ethiopia",
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: "+251980637293",
        email: "milanofoodprocessing@gmail.com",
        contactType: "customer service",
        areaServed: "ET",
        availableLanguage: ["English", "Amharic", "Arabic", "French"],
      },
      {
        "@type": "ContactPoint",
        telephone: "+251933330065",
        contactType: "customer service",
        areaServed: "ET",
        availableLanguage: ["English", "Amharic", "Arabic", "French"],
      },
    ],
    knowsAbout: ["Mojito syrups", "Ice cream powders", "Milkshake products", "Food service products"],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${process.env.NEXT_PUBLIC_SITE_URL || "https://milanofoods.vercel.app"}/#website`,
    name: "Milano Foods",
    url: process.env.NEXT_PUBLIC_SITE_URL || "https://milanofoods.vercel.app",
    inLanguage: ["en", "am", "ar", "fr"],
    publisher: {
      "@id": `${process.env.NEXT_PUBLIC_SITE_URL || "https://milanofoods.vercel.app"}/#organization`,
    },
  },
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning><body><LocalizationProvider><StoreProvider><SiteAnnouncement /><SiteHeader />{children}<SiteFooter /></StoreProvider></LocalizationProvider>{structuredData.map((schema) => <script key={schema["@type"]} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />)}</body></html>;
}