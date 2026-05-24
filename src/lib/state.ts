import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { get, put } from "@vercel/blob";
import postgres from "postgres";

import { players } from "@/lib/players";
import { createSeedTeamProfiles, mergeTeamProfiles } from "@/lib/teams";
import type { AppState, Prediction, SyncState, TournamentStats } from "@/lib/types";
import { worldCupMatches, worldCupRounds } from "@/lib/world-cup-2026";

const stateFile = process.env.VERCEL
  ? path.join("/tmp", "tippekjelleren-state.json")
  : path.join(process.cwd(), ".data", "tippekjelleren-state.json");
const stateId = "tippekjelleren-vm2026";
const blobPath = "state/tippekjelleren-vm2026.json";

let sqlClient: ReturnType<typeof postgres> | null = null;
let tableReady = false;

export function emptySyncState(): SyncState {
  return {
    status: "idle",
    source: null,
    lastStartedAt: null,
    lastCompletedAt: null,
    updatedMatches: 0,
    message: null,
  };
}

export function emptyTournamentStats(): TournamentStats {
  return {
    topScorers: [],
    assistMakers: [],
    discipline: [],
    updatedAt: null,
    source: null,
    unavailableReason: "Gratis FIFA-data har foreløpig ikke levert toppscorer, assist og kort i en stabil struktur.",
  };
}

export function initialState(): AppState {
  return {
    version: 3,
    players,
    rounds: worldCupRounds,
    matches: worldCupMatches,
    predictions: [],
    teamProfiles: createSeedTeamProfiles(worldCupMatches),
    lineups: [],
    matchStats: [],
    sync: emptySyncState(),
    tournamentStats: emptyTournamentStats(),
  };
}

type StoredPrediction = Prediction & {
  advancingTeam?: "home" | "away" | null;
  joker?: boolean;
};

function normalizePredictions(predictions: StoredPrediction[] = []): Prediction[] {
  return predictions.map((prediction) => ({
    playerId: prediction.playerId,
    matchId: prediction.matchId,
    homeGoals: prediction.homeGoals,
    awayGoals: prediction.awayGoals,
    outcome: prediction.outcome,
    knockoutResolution:
      prediction.knockoutResolution ??
      (prediction.advancingTeam
        ? {
            method: "penalties",
            winner: prediction.advancingTeam,
          }
        : null),
    updatedAt: prediction.updatedAt,
  }));
}

function mergeWithSeed(state: AppState): AppState {
  const storedById = new Map(state.matches.map((match) => [match.id, match]));
  const matches = worldCupMatches.map((seedMatch) => {
    const stored = storedById.get(seedMatch.id);
    return stored
      ? {
          ...seedMatch,
          fifaMatchId: stored.fifaMatchId ?? seedMatch.fifaMatchId,
          homeTeam: stored.homeTeam || seedMatch.homeTeam,
          awayTeam: stored.awayTeam || seedMatch.awayTeam,
          result: stored.result ?? null,
          status: stored.status ?? seedMatch.status,
          minute: stored.minute ?? seedMatch.minute,
          period: stored.period ?? seedMatch.period,
          lastSyncedAt: stored.lastSyncedAt ?? seedMatch.lastSyncedAt,
          syncSource: stored.syncSource ?? seedMatch.syncSource,
          syncStatus: stored.syncStatus ?? seedMatch.syncStatus,
          broadcasts: stored.broadcasts?.length ? stored.broadcasts : seedMatch.broadcasts,
        }
      : seedMatch;
  });

  return {
    ...state,
    version: 3,
    players,
    rounds: worldCupRounds,
    matches,
    predictions: normalizePredictions(state.predictions as StoredPrediction[]),
    teamProfiles: mergeTeamProfiles(createSeedTeamProfiles(matches), state.teamProfiles),
    lineups: state.lineups ?? [],
    matchStats: state.matchStats ?? [],
    sync: state.sync ?? emptySyncState(),
    tournamentStats: state.tournamentStats ?? emptyTournamentStats(),
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
