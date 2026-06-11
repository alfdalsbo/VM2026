import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { get, put } from "@vercel/blob";
import postgres from "postgres";

import { applyManualWorldCupOverrides } from "@/lib/manual-world-cup-overrides";
import { derivePlayerProfilesFromState } from "@/lib/player-profiles";
import { players } from "@/lib/players";
import { isPredictionForCurrentMatchup } from "@/lib/scoring";
import { createSeedTeamProfiles, mergeTeamProfiles } from "@/lib/teams";
import { emptyTournamentBonusResult } from "@/lib/tournament-bonus";
import type {
  AppState,
  LineupPlayer,
  MatchLineup,
  MatchEvent,
  LivePotTip,
  PlayerProfile,
  Prediction,
  SyncState,
  TournamentBonusPrediction,
  TournamentBonusResult,
  TournamentStats,
} from "@/lib/types";
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
  const state: AppState = {
    version: 7,
    players,
    rounds: worldCupRounds,
    matches: worldCupMatches,
    predictions: [],
    teamProfiles: createSeedTeamProfiles(worldCupMatches),
    lineups: [],
    matchStats: [],
    matchEvents: [],
    livePotTips: [],
    avatarSelections: [],
    followedMatches: [],
    playerProfiles: [],
    tournamentBonusPredictions: [],
    tournamentBonusResult: emptyTournamentBonusResult(),
    sync: emptySyncState(),
    tournamentStats: emptyTournamentStats(),
  };
  const withManualData = applyManualWorldCupOverrides(state);
  return applyManualWorldCupOverrides({
    ...withManualData,
    playerProfiles: derivePlayerProfilesFromState(withManualData),
  });
}

type StoredPrediction = Prediction & {
  advancingTeam?: "home" | "away" | null;
  joker?: boolean;
};

type StoredLivePotTip = Partial<LivePotTip> & {
  playerId: string;
  matchId: string;
  yellowCardsTotal?: number;
  homeYellowCardsTotal?: number;
  awayYellowCardsTotal?: number;
  redCard?: "yes" | "no";
  redCardsTotal?: number;
  homeRedCardsTotal?: number;
  awayRedCardsTotal?: number;
  updatedAt?: string;
};

type StoredTournamentBonusPrediction = Partial<TournamentBonusPrediction> & {
  playerId: string;
};

function normalizeTournamentBonusPredictions(predictions: StoredTournamentBonusPrediction[] = []): TournamentBonusPrediction[] {
  return predictions
    .map((prediction) => ({
      playerId: prediction.playerId,
      winnerTeamSlug: String(prediction.winnerTeamSlug ?? "").trim(),
      topScorerPlayerProfileId: String(prediction.topScorerPlayerProfileId ?? "").trim(),
      assistKingPlayerProfileId: String(prediction.assistKingPlayerProfileId ?? "").trim(),
      updatedAt: prediction.updatedAt ?? new Date(0).toISOString(),
    }))
    .filter(
      (prediction) =>
        prediction.playerId &&
        (prediction.winnerTeamSlug || prediction.topScorerPlayerProfileId || prediction.assistKingPlayerProfileId),
    );
}

function normalizeTournamentBonusResult(result: Partial<TournamentBonusResult> | null | undefined): TournamentBonusResult {
  const empty = emptyTournamentBonusResult();
  if (!result) return empty;
  return {
    ...empty,
    winnerTeamSlug: result.winnerTeamSlug ?? null,
    winnerTeamName: result.winnerTeamName ?? null,
    topScorerPlayerProfileIds: result.topScorerPlayerProfileIds ?? [],
    topScorers: result.topScorers ?? [],
    assistKingPlayerProfileIds: result.assistKingPlayerProfileIds ?? [],
    assistKings: result.assistKings ?? [],
    updatedAt: result.updatedAt ?? null,
    source: result.source ?? null,
    unavailableReason: result.unavailableReason ?? empty.unavailableReason,
  };
}

function normalizePredictions(predictions: StoredPrediction[] = []): Prediction[] {
  return predictions.map((prediction) => ({
    playerId: prediction.playerId,
    matchId: prediction.matchId,
    homeGoals: prediction.homeGoals,
    awayGoals: prediction.awayGoals,
    outcome: prediction.outcome,
    matchupKey: prediction.matchupKey ?? null,
    knockoutResolution:
      prediction.knockoutResolution ??
      (prediction.advancingTeam
        ? {
            method: "penalties",
            winner: prediction.advancingTeam,
          }
        : null),
    homeScorers: prediction.homeScorers ?? [],
    awayScorers: prediction.awayScorers ?? [],
    homeAssists: prediction.homeAssists ?? [],
    awayAssists: prediction.awayAssists ?? [],
    updatedAt: prediction.updatedAt,
  }));
}

function normalizeLivePotTips(tips: StoredLivePotTip[] = []): LivePotTip[] {
  return tips.map((tip) => {
    const homeYellowCardsTotal = Number.isInteger(tip.homeYellowCardsTotal) ? tip.homeYellowCardsTotal! : undefined;
    const awayYellowCardsTotal = Number.isInteger(tip.awayYellowCardsTotal) ? tip.awayYellowCardsTotal! : undefined;
    const homeRedCardsTotal = Number.isInteger(tip.homeRedCardsTotal) ? tip.homeRedCardsTotal! : undefined;
    const awayRedCardsTotal = Number.isInteger(tip.awayRedCardsTotal) ? tip.awayRedCardsTotal! : undefined;
    const hasYellowDistribution = homeYellowCardsTotal !== undefined && awayYellowCardsTotal !== undefined;
    const hasRedDistribution = homeRedCardsTotal !== undefined && awayRedCardsTotal !== undefined;

    return {
      playerId: tip.playerId,
      matchId: tip.matchId,
      yellowCardsTotal: Number.isInteger(tip.yellowCardsTotal)
        ? tip.yellowCardsTotal!
        : hasYellowDistribution
          ? homeYellowCardsTotal + awayYellowCardsTotal
          : 0,
      redCardsTotal:
        Number.isInteger(tip.redCardsTotal)
          ? tip.redCardsTotal!
          : hasRedDistribution
            ? homeRedCardsTotal + awayRedCardsTotal
            : tip.redCard === "yes"
              ? 1
              : 0,
      ...(hasYellowDistribution ? { homeYellowCardsTotal, awayYellowCardsTotal } : {}),
      ...(hasRedDistribution ? { homeRedCardsTotal, awayRedCardsTotal } : {}),
      updatedAt: tip.updatedAt ?? new Date(0).toISOString(),
    };
  });
}

type StoredLineupPlayer = Partial<LineupPlayer> & {
  id: string;
  name: string;
  teamName?: string;
};

type StoredLineup = Partial<MatchLineup> & {
  matchId: string;
  players?: StoredLineupPlayer[];
  homeBench?: StoredLineupPlayer[];
  awayBench?: StoredLineupPlayer[];
};

function normalizeLineupPlayer(player: StoredLineupPlayer, fallback: { teamName: string; teamSide: "home" | "away" }): LineupPlayer {
  return {
    id: player.id,
    name: player.name,
    teamName: player.teamName ?? fallback.teamName,
    teamSide: player.teamSide ?? fallback.teamSide,
    playerProfileId: player.playerProfileId ?? null,
    position: player.position ?? "",
    role: player.role ?? "unknown",
    shirtNumber: player.shirtNumber ?? null,
    isStarter: player.isStarter ?? true,
    isCaptain: player.isCaptain ?? false,
    isConfirmed: player.isConfirmed ?? false,
    x: player.x ?? null,
    y: player.y ?? null,
  };
}

function normalizeLineups(lineups: StoredLineup[] = [], matches: AppState["matches"]): MatchLineup[] {
  return lineups.map((lineup) => {
    const match = matches.find((item) => item.id === lineup.matchId);
    const homeFallback = { teamName: match?.homeTeam ?? "Hjemmelag", teamSide: "home" as const };
    const awayFallback = { teamName: match?.awayTeam ?? "Bortelag", teamSide: "away" as const };
    const players = (lineup.players ?? []).map((player) =>
      normalizeLineupPlayer(player, player.teamSide === "away" ? awayFallback : homeFallback),
    );

    return {
      matchId: lineup.matchId,
      formation: {
        home: lineup.formation?.home ?? null,
        away: lineup.formation?.away ?? null,
      },
      status: lineup.status ?? (players.length ? "expected" : "not_published"),
      confirmedAt: lineup.confirmedAt ?? null,
      players,
      homeBench: (lineup.homeBench ?? []).map((player) => normalizeLineupPlayer({ ...player, isStarter: false }, homeFallback)),
      awayBench: (lineup.awayBench ?? []).map((player) => normalizeLineupPlayer({ ...player, isStarter: false }, awayFallback)),
      source: lineup.source ?? null,
      updatedAt: lineup.updatedAt ?? null,
    };
  });
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
  const predictions = normalizePredictions(state.predictions as StoredPrediction[]).filter((prediction) => {
    const match = matches.find((item) => item.id === prediction.matchId);
    return match ? isPredictionForCurrentMatchup(match, prediction) : false;
  });

  const merged: AppState = {
    ...state,
    version: 7,
    players,
    rounds: worldCupRounds,
    matches,
    predictions,
    teamProfiles: mergeTeamProfiles(createSeedTeamProfiles(matches), state.teamProfiles),
    lineups: normalizeLineups((state.lineups ?? []) as StoredLineup[], matches),
    matchStats: state.matchStats ?? [],
    matchEvents: (state.matchEvents ?? []) as MatchEvent[],
    livePotTips: normalizeLivePotTips((state.livePotTips ?? []) as StoredLivePotTip[]),
    avatarSelections: state.avatarSelections ?? [],
    followedMatches: state.followedMatches ?? [],
    playerProfiles: (state.playerProfiles ?? []) as PlayerProfile[],
    tournamentBonusPredictions: normalizeTournamentBonusPredictions(
      (state.tournamentBonusPredictions ?? []) as StoredTournamentBonusPrediction[],
    ),
    tournamentBonusResult: normalizeTournamentBonusResult(state.tournamentBonusResult),
    sync: state.sync ?? emptySyncState(),
    tournamentStats: state.tournamentStats ?? emptyTournamentStats(),
  };

  const withManualData = applyManualWorldCupOverrides(merged);
  const withProfiles = {
    ...withManualData,
    playerProfiles: derivePlayerProfilesFromState(withManualData),
  };

  return applyManualWorldCupOverrides(withProfiles);
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
