import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getPlayer, isAdminPlayer, players } from "@/lib/players";
import type { Session } from "@/lib/types";

const cookieName = "venneligaen_session";

function getSecret() {
  const secret = process.env.AUTH_SECRET || process.env.SESSION_SECRET || "local-vm2026-secret-change-before-vercel";
  if (process.env.VERCEL && secret === "local-vm2026-secret-change-before-vercel") {
    throw new Error("AUTH_SECRET or SESSION_SECRET must be set on Vercel.");
  }
  return secret;
}

function sign(payload: string) {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

function encodeSession(session: Session) {
  const payload = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decodeSession(value: string): Session | null {
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Session;
    if (!getPlayer(session.playerId)) return null;
    return session;
  } catch {
    return null;
  }
}

export function isCorrectPasscode(passcode: string) {
  const configured = process.env.VENNELIGAEN_PASSCODE || "vm2026";
  if (process.env.VERCEL && configured === "vm2026") {
    throw new Error("VENNELIGAEN_PASSCODE must be set on Vercel.");
  }
  return passcode === configured;
}

export async function createSession(playerId: string) {
  const player = getPlayer(playerId);
  if (!player) throw new Error("Ukjent spiller.");
  const cookieStore = await cookies();
  cookieStore.set(cookieName, encodeSession({ playerId, issuedAt: Date.now() }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(cookieName);
}

export async function getSession() {
  const cookieStore = await cookies();
  const value = cookieStore.get(cookieName)?.value;
  return value ? decodeSession(value) : null;
}

export async function getCurrentPlayer() {
  const session = await getSession();
  return session ? getPlayer(session.playerId) : null;
}

export async function requireSession() {
  const player = await getCurrentPlayer();
  if (!player) redirect("/login");
  return player;
}

export async function requireAdmin() {
  const player = await requireSession();
  if (!isAdminPlayer(player.id)) redirect("/");
  return player;
}

export function publicPlayers() {
  return players;
}
