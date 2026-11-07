import { randomBytes } from "node:crypto";

// 32 unambiguous uppercase alphanumeric characters (excluding 0, 1, O, I to avoid confusion)
const ORDER_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function createOrderNumber(): string {
  const bytes = randomBytes(6);
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += ORDER_CHARS[bytes[i] % ORDER_CHARS.length];
  }
  return result;
}

export function isSecureOrderNumber(value: string): boolean {
  return /^[A-Z0-9]{6,32}$/i.test(value);
}
