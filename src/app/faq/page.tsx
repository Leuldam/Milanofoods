import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CircleHelp } from "lucide-react";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description: "Answers about Milano Foods products, ordering, payment, delivery, and pickup.",
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "Milano Foods Frequently Asked Questions",
    description: "Answers about Milano Foods products, ordering, payment, delivery, and pickup.",
    url: "/faq",
  },
};

const questions = [
  {
    question: "How do I find the right product?",
    answer: <>Browse the <Link href="/products">product catalog</Link> or use the <Link href="/product-guide">Product Guide</Link> to compare families and current options. Product pages show available details, price, packaging, and stock.</>,
  },
  {
    question: "How do I place an order?",
    answer: <>Add available products to your cart, review quantities and packaging, then continue to checkout. You&apos;ll be asked for your contact details and how you&apos;d like to receive the order.</>,
  },
  {
    question: "Can I choose delivery or pickup?",
    answer: <>Checkout offers delivery and store pickup. Delivery availability and fees, or the pickup location and collection arrangements, are confirmed by the Milano team. See <Link href="/delivery">Delivery Information</Link> and <Link href="/pickup">Pickup Information</Link>.</>,
  },
  {
    question: "Do I need to pay online before ordering?",
    answer: <>No. Selecting a payment method and uploading a payment screenshot are optional at checkout. You can choose a configured digital payment method or choose to arrange payment later with Milano.</>,
  },
  {
    question: "Why is a product or quantity unavailable?",
    answer: <>Product availability and stock can change. The cart and checkout recheck current stock, price, packaging, and minimum quantities before an order is submitted. If something changed, review the product and update your cart.</>,
  },
  {
    question: "Where can I find ingredients and preparation directions?",
    answer: <>Check the selected product&apos;s packaging for verified ingredients, storage guidance, and preparation directions. You can also <Link href="/contact">contact our team</Link> with a product question.</>,
  },
  {
    question: "Where does Milano deliver?",
    answer: <>Milano is based in Addis Ababa and accepts delivery requests for service areas across Ethiopia. The team confirms availability and the delivery fee for each order.</>,
  },
  {
    question: "How can I ask about business orders?",
    answer: <>Visit <Link href="/for-businesses">Milano for Businesses</Link> or contact our team to discuss current products and order arrangements.</>,
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How do I find the right product?",
      acceptedAnswer: { "@type": "Answer", text: "Browse the product catalog or use the Product Guide to compare product families and current options. Product pages show available details, price, packaging, and stock." },
    },
    {
      "@type": "Question",
      name: "How do I place an order?",
      acceptedAnswer: { "@type": "Answer", text: "Add available products to your cart, review quantities and packaging, then continue to checkout. You will be asked for your contact details and how you would like to receive the order." },
    },
    {
      "@type": "Question",
      name: "Can I choose delivery or pickup?",
      acceptedAnswer: { "@type": "Answer", text: "Checkout offers delivery and store pickup. Delivery availability and fees, or the pickup location and collection arrangements, are confirmed by the Milano team." },
    },
    {
      "@type": "Question",
      name: "Do I need to pay online before ordering?",
      acceptedAnswer: { "@type": "Answer", text: "No. Selecting a payment method and uploading a payment screenshot are optional at checkout. You can choose a configured digital payment method or arrange payment later with Milano." },
    },
    {
      "@type": "Question",
      name: "Why is a product or quantity unavailable?",
      acceptedAnswer: { "@type": "Answer", text: "Product availability and stock can change. The cart and checkout recheck current stock, price, packaging, and minimum quantities before an order is submitted." },
    },
    {
      "@type": "Question",
      name: "Where can I find ingredients and preparation directions?",
      acceptedAnswer: { "@type": "Answer", text: "Check the selected product packaging for verified ingredients, storage guidance, and preparation directions. You can also contact the Milano team with a product question." },
    },
    {
      "@type": "Question",
      name: "Where does Milano deliver?",
      acceptedAnswer: { "@type": "Answer", text: "Milano is based in Addis Ababa and accepts delivery requests for service areas across Ethiopia. The team confirms availability and the delivery fee for each order." },
    },
    {
      "@type": "Question",
      name: "How can I ask about business orders?",
      acceptedAnswer: { "@type": "Answer", text: "Visit Milano for Businesses or contact the team to discuss current products and order arrangements." },
    },
  ],
};

export default function FAQPage() {
  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c") }} />
    <main className="info-page">
      <section className="info-page-hero info-page-hero-compact">
        <div className="wrap">
          <div className="breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span>FAQ</span></div>
          <span className="eyebrow">Helpful answers</span>
          <h1>Frequently asked questions.</h1>
          <p>Quick information about products, orders, payment, delivery, and pickup.</p>
        </div>
      </section>

      <section className="section">
        <div className="wrap faq-layout">
          <aside className="faq-side-note">
            <span className="info-card-icon"><CircleHelp size={21} aria-hidden="true" /></span>
            <h2>Still have a question?</h2>
            <p>Our team can help with product details and order arrangements.</p>
            <Link href="/contact" className="text-link">Contact Milano <ArrowRight size={15} /></Link>
          </aside>
          <div className="faq-list">
            {questions.map(({ question, answer }) => (
              <details className="faq-item" key={question}>
                <summary>{question}<span aria-hidden="true" /></summary>
                <div className="faq-answer"><p>{answer}</p></div>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
    </>
  );
}
