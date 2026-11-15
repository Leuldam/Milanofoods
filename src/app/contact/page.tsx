"use client";

import { FormEvent, useState } from "react";
import { Mail, MapPin, Phone, MessageCircle } from "lucide-react";

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          phone: formData.get("phone"),
          email: formData.get("email"),
          inquiryType: formData.get("inquiryType"),
          message: formData.get("message"),
          companyWebsite: formData.get("companyWebsite"),
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to send your inquiry.");
      }

      setSent(true);
      form.reset();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to send your inquiry. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <section className="page-hero">
        <div className="wrap">
          <div className="breadcrumb">Home / Contact</div>
          <span className="eyebrow">We&apos;re here to help</span>
          <h1>Let&apos;s talk flavor.</h1>
          <p>Questions about a product, an order, or working with Milano? Send us a message and our team can follow up.</p>
        </div>
      </section>

      <section className="section">
        <div className="wrap contact-grid">
          <div>
            <span className="eyebrow">Get in touch</span>
            <h2 style={{ fontSize: 40 }}>We&apos;d love to hear from you.</h2>
            <p style={{ color: "var(--muted)", lineHeight: 1.8, fontSize: 13 }}>
              Reach out to us directly via phone, WhatsApp, email, or by filling out the inquiry form below.
            </p>
            <div className="contact-method">
              <strong><Phone size={15} style={{ display: "inline", marginRight: 8 }} />Telephone</strong>
              <span><a href="tel:+251980637293">+251 980 637 293</a> &nbsp;·&nbsp; <a href="tel:+251933330065">+251 933 330 065</a></span>
            </div>
            <div className="contact-method">
              <strong><Mail size={15} style={{ display: "inline", marginRight: 8 }} />Email</strong>
              <span><a href="mailto:milanofoodprocessing@gmail.com">milanofoodprocessing@gmail.com</a></span>
            </div>
            <div className="contact-method">
              <strong><MessageCircle size={15} style={{ display: "inline", marginRight: 8 }} />WhatsApp</strong>
              <span><a href="https://wa.me/251980637293" target="_blank" rel="noopener noreferrer">+251 980 637 293</a></span>
            </div>
            <div className="contact-method">
              <strong><MapPin size={15} style={{ display: "inline", marginRight: 8 }} />Location</strong>
              <span>Addis Ababa, Ethiopia</span>
            </div>
          </div>

          <div className="form-card">
            <h2>Send an inquiry</h2>
            {sent ? (
              <div className="empty-state">
                <h2>Thank you.</h2>
                <p>Your inquiry has been sent to the Milano team.</p>
                <button className="btn btn-outline" onClick={() => setSent(false)}>Send another message</button>
              </div>
            ) : (
              <form onSubmit={submit}>
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="cname">Full name *</label>
                    <input id="cname" name="name" required maxLength={120} placeholder="Your name" />
                  </div>
                  <div className="field">
                    <label htmlFor="cphone">Phone *</label>
                    <input id="cphone" name="phone" required type="tel" maxLength={60} placeholder="+251..." />
                  </div>
                  <div className="field full">
                    <label htmlFor="cemail">Email (optional)</label>
                    <input id="cemail" name="email" type="email" maxLength={180} placeholder="you@example.com" />
                  </div>
                  <div className="field full">
                    <label htmlFor="topic">Inquiry type</label>
                    <select id="topic" name="inquiryType" defaultValue="Product information">
                      <option>Product information</option>
                      <option>Order assistance</option>
                      <option>Business partnership</option>
                      <option>Distribution inquiry</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="field full">
                    <label htmlFor="message">Message *</label>
                    <textarea id="message" name="message" required maxLength={2000} rows={5} placeholder="How can we help?" />
                  </div>
                  <div className="contact-honeypot" aria-hidden="true">
                    <label htmlFor="companyWebsite">Company website</label>
                    <input id="companyWebsite" name="companyWebsite" tabIndex={-1} autoComplete="off" />
                  </div>
                </div>
                {error && <p role="alert" style={{ color: "#b42318", fontSize: 12 }}>{error}</p>}
                <button className="btn" type="submit" disabled={busy}>
                  {busy ? "Sending..." : "Submit inquiry"}
                </button>
                <p style={{ fontSize: 10, color: "var(--muted)" }}>
                  Your inquiry will be sent securely to the Milano team.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
