import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "@/components/store-provider";
import { LocalizationProvider } from "@/components/localization-provider";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export const metadata: Metadata = {
  title: { default: "Milano Foods | More Than Just a Taste", template: "%s | Milano Foods" },
  description: "Discover Milano Foods mojito syrups, ice cream powders, milkshake powders and recipe inspiration.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://milanofoods.vercel.app"),
  openGraph: {
    type: "website",
    locale: "en_ET",
    siteName: "Milano Foods",
    title: "Milano Foods | More Than Just a Taste",
    description: "Discover Milano Foods mojito syrups, ice cream powders, milkshake powders and recipe inspiration.",
    images: [{ url: "/images/milanoshowcase.png", width: 1200, height: 630, alt: "Milano Foods product range" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Milano Foods | More Than Just a Taste",
    description: "Discover Milano Foods mojito syrups, ice cream powders, milkshake powders and recipe inspiration.",
    images: ["/images/milanoshowcase.png"],
  },
  robots: { index: true, follow: true },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning><body><LocalizationProvider><StoreProvider><div className="announcement">Premium food solutions for every moment · Discover the Milano range</div><SiteHeader />{children}<SiteFooter /></StoreProvider></LocalizationProvider></body></html>;
}