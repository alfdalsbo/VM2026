import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { get, put } from "@vercel/blob";
import postgres from "postgres";

import { players } from "@/lib/players";
import type { AppState } from "@/lib/types";
import { worldCupMatches, worldCupRounds } from "@/lib/world-cup-2026";

const stateFile = process.env.VERCEL
  ? path.join("/tmp", "tippekjelleren-state.json")
  : path.join(process.cwd(), ".data", "tippekjelleren-state.json");
const stateId = "tippekjelleren-vm2026";
const blobPath = "state/tippekjelleren-vm2026.json";

let sqlClient: ReturnType<typeof postgres> | null = null;
let tableReady = false;

export function initialState(): AppState {
  return {
    version: 1,
    players,
    rounds: worldCupRounds,
    matches: worldCupMatches,
    predictions: [],
  };
}

function mergeWithSeed(state: AppState): AppState {
  const storedById = new Map(state.matches.map((match) => [match.id, match]));
  const matches = worldCupMatches.map((seedMatch) => {
    const stored = storedById.get(seedMatch.id);
    return stored
      ? {
          ...seedMatch,
          homeTeam: stored.homeTeam || seedMatch.homeTeam,
          awayTeam: stored.awayTeam || seedMatch.awayTeam,
          result: stored.result ?? null,
        }
      : seedMatch;
  });

  return {
    ...state,
    version: 1,
    players,
    rounds: worldCupRounds,
    matches,
    predictions: state.predictions ?? [],
  };
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
    create table if not exists tippekjelleren_state (
      id text primary key,
      data jsonb not null,
      updated_at timestamptz not null default now()
    )
  `;
  tableReady = true;
}

async function readDatabaseState() {
  const sql = getSql();
  if (!sql) return null;
  await ensureTable(sql);
  const rows = await sql<{ data: AppState }[]>`
    select data from tippekjelleren_state where id = ${stateId} limit 1
  `;
  return rows[0]?.data ? mergeWithSeed(rows[0].data) : null;
}

async function writeDatabaseState(state: AppState) {
  const sql = getSql();
  if (!sql) return false;
  await ensureTable(sql);
  await sql`
    insert into tippekjelleren_state (id, data, updated_at)
    values (${stateId}, ${sql.json(state)}, now())
    on conflict (id) do update set data = excluded.data, updated_at = now()
  `;
  return true;
}

function hasBlobStorage() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || (process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID));
}

async function readBlobState() {
  if (!hasBlobStorage()) return null;
  const result = await get(blobPath, { access: "private", useCache: false });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  const raw = await new Response(result.stream).text();
  return mergeWithSeed(JSON.parse(raw) as AppState);
}

async function writeBlobState(state: AppState) {
  if (!hasBlobStorage()) return false;
  await put(blobPath, `${JSON.stringify(state, null, 2)}\n`, {
    access: "private",
    allowOverwrite: true,
    cacheControlMaxAge: 60,
    contentType: "application/json",
  });
  return true;
}

async function readFileState() {
  try {
    const raw = await readFile(stateFile, "utf8");
    return mergeWithSeed(JSON.parse(raw) as AppState);
  } catch {
    return null;
  }
}

async function writeFileState(state: AppState) {
  await mkdir(path.dirname(stateFile), { recursive: true });
  await writeFile(stateFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export async function getAppState() {
  return (await readDatabaseState()) ?? (await readBlobState()) ?? (await readFileState()) ?? initialState();
}

export async function saveAppState(state: AppState) {
  const next = mergeWithSeed(state);
  if (await writeDatabaseState(next)) return;
  if (await writeBlobState(next)) return;
  await writeFileState(next);
}

export function getStorageMode() {
  if (process.env.DATABASE_URL) return "Postgres/Supabase";
  if (hasBlobStorage()) return "Vercel Blob";
  return "lokal fil";
}
