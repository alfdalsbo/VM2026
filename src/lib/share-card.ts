import { createHmac, timingSafeEqual } from "node:crypto";

import type { ShareCard } from "@/lib/types";

function secret() {
  return process.env.AUTH_SECRET || process.env.SESSION_SECRET || "local-vm2026-secret-change-before-vercel";
}

function base64url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function unbase64url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createShareToken(card: ShareCard) {
  const payload = base64url(JSON.stringify(card));
  return `${payload}.${sign(payload)}`;
}

export function parseShareToken(token: string): ShareCard | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;

  try {
    const card = JSON.parse(unbase64url(payload)) as ShareCard;
    if (!card.playerId || !card.matchId || typeof card.issuedAt !== "number") return null;
    return card;
  } catch {
    return null;
  }
}
