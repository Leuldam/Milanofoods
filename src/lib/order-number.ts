import { randomBytes } from "node:crypto";

export function createOrderNumber(): string {
  return randomBytes(16).toString("hex").toUpperCase();
}

export function isSecureOrderNumber(value: string): boolean {
  return /^[A-F0-9]{32}$/.test(value);
}
