import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { BlobPreconditionFailedError, get, put } from "@vercel/blob";
import postgres from "postgres";

import { getPlayer } from "@/lib/players";

const passcodesFile = process.env.VERCEL
  ? path.join("/tmp", "tippekjelleren-passcodes.json")
  : path.join(process.cwd(), ".data", "tippekjelleren-passcodes.json");
const blobPath = "auth/tippekjelleren-passcodes.json";
const blobMutationAttempts = 6;
const blobRetryBaseDelayMs = 25;
const defaultPasscode = "Norge";
const seededPlayerPasscodes: Record<string, string> = {
  alf: "Norgevinner",
};

type StoredPlayerPasscode = {
  playerId: string;
  passcode: string;
  updatedAt: string;
};

type DatabasePlayerPasscode = {
  playerId: string;
  passcode: string;
  updatedAt: string | Date;
};

let sqlClient: ReturnType<typeof postgres> | null = null;
let tableReady = false;

function normalizeStoredPasscodes(parsed: unknown) {
  const source = parsed && typeof parsed === "object" ? (parsed as Record<string, Partial<StoredPlayerPasscode>>) : {};
  const passcodes: Record<string, StoredPlayerPasscode> = {};
  for (const [playerId, value] of Object.entries(source)) {
    const passcode = String(value.passcode ?? "");
    if (!passcode) continue;
    passcodes[playerId] = {
      playerId,
      passcode,
      updatedAt: String(value.updatedAt ?? new Date(0).toISOString()),
    };
  }
  return passcodes;
}

function getSql() {
  if (!process.env.DATABASE_URL) return null;
  if (!sqlClient) {
    sqlClient = postgres(process.env.DATABASE_URL, {
      max: 1,
      ssl: "require",
    });
  }
  return sqlClient;
}

async function ensureTable(sql: ReturnType<typeof postgres>) {
  if (tableReady) return;
  await sql`
    create table if not exists tippekjelleren_passcodes (
      player_id text primary key,
      passcode text not null,
      updated_at timestamptz not null default now()
    )
  `;
  tableReady = true;
}

function hasBlobStorage() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || (process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID));
}

function normalizeBlobEtag(etag?: string | null) {
  if (!etag) return undefined;
  return etag.startsWith('"') || etag.startsWith("W/") ? etag : `"${etag}"`;
}

type BlobPasscodesRead = {
  etag?: string;
  passcodes: Record<string, StoredPlayerPasscode>;
};

async function readBlobPasscodesWithEtag(): Promise<BlobPasscodesRead | null> {
  if (!hasBlobStorage()) return null;
  try {
    const result = await get(blobPath, { access: "private", useCache: false });
    if (!result || !result.stream) return { passcodes: {} };
    const raw = await new Response(result.stream).text();
    return {
      etag: normalizeBlobEtag(result.blob.etag),
      passcodes: normalizeStoredPasscodes(JSON.parse(raw)),
    };
  } catch (error) {
    if (error instanceof Error && /404|not found/i.test(error.message)) return { passcodes: {} };
    throw error;
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function mutateBlobPasscodes(mutator: (passcodes: Record<string, StoredPlayerPasscode>) => Record<string, StoredPlayerPasscode>) {
  for (let attempt = 1; attempt <= blobMutationAttempts; attempt += 1) {
    const current = (await readBlobPasscodesWithEtag()) ?? { passcodes: {} };
    const next = mutator(current.passcodes);
    try {
      await put(blobPath, `${JSON.stringify(next, null, 2)}\n`, {
        access: "private",
        contentType: "application/json",
        ...(current.etag ? { ifMatch: current.etag } : {}),
      });
      return next;
    } catch (error) {
      if (!(error instanceof BlobPreconditionFailedError) || attempt === blobMutationAttempts) throw error;
      await delay(blobRetryBaseDelayMs * attempt);
    }
  }
  throw new Error("Passordlageret var opptatt. Prøv igjen.");
}

async function readLocalPasscodes() {
  try {
    const raw = await readFile(passcodesFile, "utf8");
    return normalizeStoredPasscodes(JSON.parse(raw));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return {};
    throw error;
  }
}

async function writeLocalPasscodes(passcodes: Record<string, StoredPlayerPasscode>) {
  await mkdir(path.dirname(passcodesFile), { recursive: true });
  await writeFile(passcodesFile, `${JSON.stringify(passcodes, null, 2)}\n`, "utf8");
}

export function fallbackPasscodeForPlayer(playerId: string) {
  const seeded = seededPlayerPasscodes[playerId];
  if (seeded) return seeded;
  if (process.env.VERCEL && !process.env.TIPPEKJELLEREN_PASSCODE) {
    throw new Error("TIPPEKJELLEREN_PASSCODE must be set on Vercel.");
  }
  return process.env.TIPPEKJELLEREN_PASSCODE ?? defaultPasscode;
}

export async function getStoredPlayerPasscode(playerId: string): Promise<StoredPlayerPasscode | null> {
  if (!getPlayer(playerId)) return null;
  const sql = getSql();
  if (sql) {
    await ensureTable(sql);
    const rows = await sql<DatabasePlayerPasscode[]>`
      select player_id as "playerId", passcode, updated_at as "updatedAt"
      from tippekjelleren_passcodes
      where player_id = ${playerId}
      limit 1
    `;
    const row = rows[0];
    return row ? { ...row, updatedAt: new Date(row.updatedAt).toISOString() } : null;
  }
  const blobPasscodes = await readBlobPasscodesWithEtag();
  if (blobPasscodes) return blobPasscodes.passcodes[playerId] ?? null;
  if (process.env.VERCEL) return null;
  const passcodes = await readLocalPasscodes();
  return passcodes[playerId] ?? null;
}

export async function getEffectivePlayerPasscode(playerId: string) {
  return (await getStoredPlayerPasscode(playerId))?.passcode ?? fallbackPasscodeForPlayer(playerId);
}

export async function getPlayerPasscodeUpdatedAt(playerId: string) {
  return (await getStoredPlayerPasscode(playerId))?.updatedAt ?? null;
}

export async function isCorrectPlayerPasscode(playerId: string, passcode: string) {
  return passcode === (await getEffectivePlayerPasscode(playerId));
}

export async function setPlayerPasscode(playerId: string, passcode: string, updatedAt = new Date().toISOString()) {
  if (!getPlayer(playerId)) throw new Error("Ukjent spiller.");
  const stored: StoredPlayerPasscode = {
    playerId,
    passcode,
    updatedAt,
  };
  const sql = getSql();
  if (sql) {
    await ensureTable(sql);
    await sql`
      insert into tippekjelleren_passcodes (player_id, passcode, updated_at)
      values (${stored.playerId}, ${stored.passcode}, ${stored.updatedAt})
      on conflict (player_id)
      do update set passcode = excluded.passcode, updated_at = excluded.updated_at
    `;
    return stored;
  }
  if (hasBlobStorage()) {
    await mutateBlobPasscodes((passcodes) => ({
      ...passcodes,
      [playerId]: stored,
    }));
    return stored;
  }
  if (process.env.VERCEL) {
    throw new Error("Passordbytte krever DATABASE_URL på Vercel.");
  }
  const passcodes = await readLocalPasscodes();
  passcodes[playerId] = stored;
  await writeLocalPasscodes(passcodes);
  return stored;
}
