import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Milano Foods in Addis Ababa",
  description: "Contact Milano Foods in Addis Ababa by phone, WhatsApp, or email for product, order, delivery, and business inquiries.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact Milano Foods",
    description: "Reach Milano Foods by phone, WhatsApp, or email for product and order inquiries.",
    url: "/contact",
  },
};

export default function ContactLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
