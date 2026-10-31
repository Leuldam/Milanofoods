import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Milano Foods Management",
  description: "Private Milano Foods inventory and order management.",
  robots: { index: false, follow: false },
};

export default function MiniAppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
