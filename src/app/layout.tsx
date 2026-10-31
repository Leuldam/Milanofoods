import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "@/components/store-provider";
import { LocalizationProvider } from "@/components/localization-provider";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export const metadata: Metadata = {
  title: { default: "Milano Foods | More Than Just a Taste", template: "%s | Milano Foods" },
  description: "Discover Milano Foods mojito syrups, ice cream powders, milkshake powders and recipe inspiration.",
  metadataBase: new URL("https://milanofoods.example"),
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><LocalizationProvider><StoreProvider><div className="announcement">Premium food solutions for every moment · Discover the Milano range</div><SiteHeader />{children}<SiteFooter /></StoreProvider></LocalizationProvider></body></html>;
}