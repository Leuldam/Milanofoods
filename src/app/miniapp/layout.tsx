import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Milano Foods Management",
  description: "Private Milano Foods inventory and order management.",
  manifest: "/miniapp.webmanifest",
  applicationName: "Milano Mini App",
  appleWebApp: {
    capable: true,
    title: "Milano Mini App",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/miniapp-icon.svg",
    apple: "/miniapp-icon.svg",
  },
  robots: { index: false, follow: false },
};

export default function MiniAppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Montserrat:wght@500;600;700;800;900&display=swap"
      />
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      {children}
    </>
  );
}
