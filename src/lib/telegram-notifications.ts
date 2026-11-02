type InlineKeyboard = {
  inline_keyboard: Array<Array<{ text: string; callback_data: string }>>;
};

export async function sendTelegramNotification(
  text: string,
  replyMarkup?: InlineKeyboard,
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.error("Telegram notification was not sent: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not configured.");
    return false;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      }),
      signal: AbortSignal.timeout(8000),
    });
    const result = await response.json() as { ok?: boolean; description?: string };
    if (!response.ok || result.ok !== true) {
      console.error("Telegram notification failed:", result.description || response.status);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Telegram notification could not be delivered:", error);
    return false;
  }
}
