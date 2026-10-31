import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const setupSecret = process.env.TELEGRAM_SETUP_SECRET;
  const suppliedSecret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!setupSecret || !suppliedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expected = Buffer.from(setupSecret);
  const supplied = Buffer.from(suppliedSecret);

  if (
    expected.length !== supplied.length ||
    !timingSafeEqual(expected, supplied)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!token || !webhookSecret) {
    return NextResponse.json(
      { error: "Telegram environment variables are missing" },
      { status: 500 }
    );
  }

  const webhookUrl = new URL("/api/telegram/webhook", request.url).toString();

  const telegramResponse = await fetch(
    `https://api.telegram.org/bot${token}/setWebhook`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: webhookSecret,
        allowed_updates: ["message", "callback_query"],
      }),
      cache: "no-store",
    }
  );

  const result = await telegramResponse.json();

  if (!telegramResponse.ok || !result.ok) {
    return NextResponse.json(
      { error: "Telegram webhook registration failed", details: result.description },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Telegram webhook registered successfully",
  });
}