import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Review Milano Foods order, pricing, availability, delivery, and pickup terms.",
  alternates: { canonical: "/terms" },
  robots: { index: false, follow: true },
  openGraph: { title: "Milano Foods Terms & Conditions", description: "Review terms for Milano Foods order requests and fulfillment.", url: "/terms" },
};

export default function TermsPage(){return <main><section className="page-hero"><div className="wrap"><div className="breadcrumb">Home / Terms</div><span className="eyebrow">Store policies</span><h1>Terms & conditions</h1><p>Starter terms layout — replace with business-approved terms before launch.</p></div></section><section className="section"><article className="wrap content-prose"><h2>Order requests</h2><p>Submitting an order sends a request to Milano Foods. The team will confirm product availability, pricing, fulfillment arrangements, and payment details before the order is finalized.</p><h2>Pricing and availability</h2><p>Prices are confirmed by Milano Foods after an order request is received. Product availability, variants, and delivery fees are also confirmed directly with the customer.</p><h2>Delivery and pickup</h2><p>Delivery areas, charges, and estimated timings are confirmed directly with the customer. Pickup customers should wait for confirmation of location and readiness.</p><h2>Cancellations and issues</h2><p>Add Milano&apos;s approved cancellation, damaged-item, returns, and refund policies here. These terms should be reviewed for applicable Ethiopian requirements and actual operating practices before launch.</p></article></section></main>}