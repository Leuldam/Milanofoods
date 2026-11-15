import { NextRequest, NextResponse } from "next/server";
import { sendTelegramNotification } from "@/lib/telegram-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INQUIRY_TYPES = [
  "Product information",
  "Order assistance",
  "Business partnership",
  "Distribution inquiry",
  "Other",
];

function text(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get("origin");
    if (origin && new URL(origin).origin !== request.nextUrl.origin) {
      return NextResponse.json({ error: "Invalid form submission." }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Enter your inquiry details and try again." }, { status: 400 });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Enter your inquiry details and try again." }, { status: 400 });
    }

    const input = body as Record<string, unknown>;
    if (text(input.companyWebsite, 200)) {
      return NextResponse.json({ error: "Invalid form submission." }, { status: 400 });
    }

    const name = text(input.name, 120);
    const phone = text(input.phone, 60);
    const phoneDigits = phone.replace(/\D/g, "");
    const email = text(input.email, 180);
    const inquiryType = text(input.inquiryType, 80);
    const message = text(input.message, 2000);

    if (name.length < 2) {
      return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
    }
    if (phoneDigits.length < 7 || phoneDigits.length > 20) {
      return NextResponse.json({ error: "Enter a phone number with 7 to 20 digits." }, { status: 400 });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address or leave it blank." }, { status: 400 });
    }
    if (!INQUIRY_TYPES.includes(inquiryType)) {
      return NextResponse.json({ error: "Choose an inquiry type." }, { status: 400 });
    }
    if (message.length < 5) {
      return NextResponse.json({ error: "Please enter a message of at least 5 characters." }, { status: 400 });
    }

    const telegramMessage = [
      "📨 <b>NEW WEBSITE INQUIRY — MILANO FOODS</b>",
      "",
      `<b>Name:</b> ${escapeHtml(name)}`,
      `<b>Phone:</b> ${escapeHtml(phone)}`,
      email ? `<b>Email:</b> ${escapeHtml(email)}` : "",
      `<b>Inquiry:</b> ${escapeHtml(inquiryType)}`,
      "",
      "<b>Message:</b>",
      escapeHtml(message),
    ].filter(Boolean).join("\n");

    const sent = await sendTelegramNotification(telegramMessage);
    if (!sent) {
      return NextResponse.json(
        { error: "We couldn't deliver your message right now. Please contact us by phone or WhatsApp." },
        { status: 503 },
      );
    }

    return NextResponse.json({ message: "Your inquiry was sent to the Milano team." });
  } catch (error) {
    console.error("Contact inquiry submission failed:", error);
    return NextResponse.json(
      { error: "Unable to send your inquiry. Please try again or contact us by phone or WhatsApp." },
      { status: 500 },
    );
  }
}
