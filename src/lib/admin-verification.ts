import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type AdminVerificationPurpose = "OWNER_REGISTRATION" | "PASSWORD_RESET";

const CODE_TTL_MS = 10 * 60 * 1000;
const REQUEST_COOLDOWN_MS = 60 * 1000;
const MAX_PHONE_REQUESTS = 3;
const MAX_IP_REQUESTS = 5;
const MAX_CODE_ATTEMPTS = 5;

function hashCode(code: string, phone: string, purpose: AdminVerificationPurpose) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN is not configured.");
  return createHash("sha256")
    .update(`${botToken}:${purpose}:${phone}:${code}`)
    .digest("hex");
}

function safeHashEqual(first: string, second: string) {
  const firstHash = Buffer.from(first, "hex");
  const secondHash = Buffer.from(second, "hex");
  return firstHash.length === secondHash.length && timingSafeEqual(firstHash, secondHash);
}

export function getRequesterIp(request: Request) {
  return request.headers.get("x-real-ip")?.trim() || null;
}

export async function issueAdminVerificationCode(input: {
  phone: string;
  telegramChatId: string;
  purpose: AdminVerificationPurpose;
  requesterIp: string | null;
}) {
  const recentSince = new Date(Date.now() - 15 * 60 * 1000);
  const code = String(randomInt(100_000, 1_000_000));
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);
  let record: { id: string };
  try {
    record = await prisma.$transaction(async (tx) => {
      await tx.adminVerificationCode.deleteMany({
        where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      });
      const phoneRequests = await tx.adminVerificationCode.count({
        where: { phone: input.phone, purpose: input.purpose, createdAt: { gte: recentSince } },
      });
      const ipRequests = input.requesterIp
        ? await tx.adminVerificationCode.count({
            where: { requesterIp: input.requesterIp, createdAt: { gte: recentSince } },
          })
        : 0;
      const latestRequest = await tx.adminVerificationCode.findFirst({
        where: { phone: input.phone, purpose: input.purpose },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });
      if (
        phoneRequests >= MAX_PHONE_REQUESTS ||
        ipRequests >= MAX_IP_REQUESTS ||
        (latestRequest && Date.now() - latestRequest.createdAt.getTime() < REQUEST_COOLDOWN_MS)
      ) {
        throw new Error("VERIFICATION_REQUEST_THROTTLED");
      }

      await tx.adminVerificationCode.updateMany({
        where: {
          phone: input.phone,
          purpose: input.purpose,
          consumedAt: null,
        },
        data: { consumedAt: new Date() },
      });
      return tx.adminVerificationCode.create({
        data: {
          phone: input.phone,
          telegramChatId: input.telegramChatId,
          purpose: input.purpose,
          codeHash: hashCode(code, input.phone, input.purpose),
          requesterIp: input.requesterIp,
          expiresAt,
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10_000, timeout: 30_000 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      throw new Error("VERIFICATION_REQUEST_THROTTLED");
    }
    throw error;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured.");
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: input.telegramChatId,
        text: `Your Milano Foods verification code is ${code}. It expires in 10 minutes. Do not share it with anyone.`,
      }),
      signal: AbortSignal.timeout(8000),
    });
    const result = (await response.json()) as { ok?: boolean; description?: string };
    if (!response.ok || result.ok !== true) {
      await prisma.adminVerificationCode.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      });
      console.error("Telegram verification code could not be delivered:", result.description || response.status);
      throw new Error("TELEGRAM_CODE_DELIVERY_FAILED");
    }
  } catch (error) {
    if (error instanceof Error && error.message === "TELEGRAM_CODE_DELIVERY_FAILED") throw error;
    await prisma.adminVerificationCode.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
    console.error("Telegram verification code could not be delivered:", error);
    throw new Error("TELEGRAM_CODE_DELIVERY_FAILED");
  }
}

export async function consumeAdminVerificationCode(
  tx: Prisma.TransactionClient,
  input: {
    phone: string;
    telegramChatId: string;
    purpose: AdminVerificationPurpose;
    code: string;
  },
) {
  const record = await tx.adminVerificationCode.findFirst({
    where: {
      phone: input.phone,
      telegramChatId: input.telegramChatId,
      purpose: input.purpose,
      consumedAt: null,
      expiresAt: { gt: new Date() },
      attempts: { lt: MAX_CODE_ATTEMPTS },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!record) return false;

  const codeMatches = safeHashEqual(
    record.codeHash,
    hashCode(input.code, input.phone, input.purpose),
  );
  if (!codeMatches) {
    const attempts = record.attempts + 1;
    await tx.adminVerificationCode.update({
      where: { id: record.id },
      data: {
        attempts,
        ...(attempts >= MAX_CODE_ATTEMPTS ? { consumedAt: new Date() } : {}),
      },
    });
    return false;
  }

  await tx.adminVerificationCode.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });
  return true;
}
