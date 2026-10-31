import { createHmac, timingSafeEqual } from "node:crypto";

export type TelegramMiniAppUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
};

export function verifyTelegramMiniApp(initData: string): TelegramMiniAppUser | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !initData) return null;

  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash");
  const authDate = Number(params.get("auth_date"));

  if (!receivedHash || !Number.isFinite(authDate)) return null;
  if (Math.abs(Date.now() / 1000 - authDate) > 60 * 60 * 24) return null;

  params.delete("hash");
  params.delete("signature");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(token).digest();
  const calculatedHash = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest();

  let suppliedHash: Buffer;
  try {
    suppliedHash = Buffer.from(receivedHash, "hex");
  } catch {
    return null;
  }

  if (
    suppliedHash.length !== calculatedHash.length ||
    !timingSafeEqual(suppliedHash, calculatedHash)
  ) return null;

  try {
    const user = JSON.parse(params.get("user") || "null") as TelegramMiniAppUser | null;
    if (!user || !Number.isSafeInteger(user.id)) return null;

    const operators = (process.env.TELEGRAM_OPERATOR_IDS || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    return operators.includes(String(user.id)) ? user : null;
  } catch {
    return null;
  }
}

export function getTelegramMiniAppUser(request: Request): TelegramMiniAppUser | null {
  const initData = request.headers.get("x-telegram-init-data") || "";
  return verifyTelegramMiniApp(initData);
}
