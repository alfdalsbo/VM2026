import { emptyTournamentStats, getAppState, saveAppState } from "@/lib/state";
import { applyKnockoutResolversToState } from "@/lib/tournament";
import type { AppState, MatchResult, MatchStatus, SyncState, TournamentStats, WorldCupMatch } from "@/lib/types";

const fifaCalendarUrl = "https://api.fifa.com/api/v3/calendar/matches?language=en&count=200&idCompetition=17&idSeason=285023";
const syncWindowStart = Date.parse("2026-06-10T00:00:00Z");
const syncWindowEnd = Date.parse("2026-07-21T06:00:00Z");

type FifaTeam = {
  IdTeam?: string | null;
  TeamName?: Array<{ Locale?: string; Description?: string }>;
  ShortClubName?: string | null;
};

export type FifaMatch = {
  IdMatch?: string;
  MatchNumber?: number;
  MatchStatus?: number | string | null;
  MatchTime?: number | string | null;
  HomeTeamScore?: number | null;
  AwayTeamScore?: number | null;
  HomeTeamPenaltyScore?: number | null;
  AwayTeamPenaltyScore?: number | null;
  Winner?: string | number | null;
  LastPeriodUpdate?: string | null;
  Home?: FifaTeam | null;
  Away?: FifaTeam | null;
};

type FifaResponse = {
  Results?: FifaMatch[];
};

type SyncOptions = {
  force?: boolean;
  ignoreWindow?: boolean;
  now?: Date;
  fetcher?: typeof fetch;
};

function inSyncWindow(now: Date) {
  const time = now.getTime();
  return time >= syncWindowStart && time <= syncWindowEnd;
}

function teamName(team: FifaTeam | null | undefined) {
  return team?.TeamName?.find((name) => name.Locale === "en-GB")?.Description ?? team?.ShortClubName ?? null;
}

function mapStatus(match: FifaMatch): MatchStatus {
  const rawStatus = Number(match.MatchStatus);
  const hasScore = typeof match.HomeTeamScore === "number" && typeof match.AwayTeamScore === "number";
  if (rawStatus === 1 && !hasScore) return "scheduled";
  if (rawStatus === 3 || rawStatus === 4 || rawStatus === 7 || rawStatus === 8) return "live";
  if (rawStatus === 5) return "halftime";
  if (rawStatus === 0 || rawStatus === 2 || rawStatus === 12 || match.Winner) return hasScore ? "finished" : "unknown";
  if (rawStatus === 9) return "postponed";
  if (rawStatus === 10) return "cancelled";
  if (match.MatchTime) return "live";
  return hasScore ? "live" : "unknown";
}

function minuteFrom(match: FifaMatch) {
  const minute = Number(match.MatchTime);
  return Number.isFinite(minute) && minute > 0 ? minute : null;
}

function winnerSide(match: FifaMatch) {
  const winner = match.Winner ? String(match.Winner) : null;
  if (!winner) return null;
  if (winner === String(match.Home?.IdTeam)) return "home";
  if (winner === String(match.Away?.IdTeam)) return "away";
  return null;
}

export function mapFifaResult(match: FifaMatch, syncedAt: string): MatchResult | null {
  if (typeof match.HomeTeamScore !== "number" || typeof match.AwayTeamScore !== "number") return null;
  const decidedByPenalties = typeof match.HomeTeamPenaltyScore === "number" && typeof match.AwayTeamPenaltyScore === "number";
  return {
    homeGoals: match.HomeTeamScore,
    awayGoals: match.AwayTeamScore,
    decidedByPenalties,
    advancingTeam: decidedByPenalties ? winnerSide(match) : null,
    updatedAt: syncedAt,
    updatedBy: "sync:fifa",
    source: "fifa",
  };
}

function shouldUpdateTeamName(current: string, next: string | null, stage: WorldCupMatch["stage"]) {
  if (!next || next === current) return false;
  if (stage === "group") return false;
  return /^(W|RU|\d[A-L]|\d[A-L]{2,}|3[A-L]+|2[A-L])/.test(current);
}

export function applyFifaMatchesToState(
  state: AppState,
  fifaMatches: FifaMatch[],
  options: { force?: boolean; syncedAt: string },
) {
  const byId = new Map(fifaMatches.filter((match) => match.IdMatch).map((match) => [String(match.IdMatch), match]));
  const byNumber = new Map(fifaMatches.filter((match) => match.MatchNumber).map((match) => [Number(match.MatchNumber), match]));
  let updatedMatches = 0;

  const matches = state.matches.map((match) => {
    const fifaMatch = (match.fifaMatchId ? byId.get(match.fifaMatchId) : null) ?? byNumber.get(match.matchNumber);
    if (!fifaMatch) return match;

    const status = mapStatus(fifaMatch);
    const fifaResult = mapFifaResult(fifaMatch, options.syncedAt);
    const hasManualResult = match.result?.source === "manual" || (match.result && !match.result.source);
    const result = hasManualResult && !options.force ? match.result : fifaResult;
    const homeTeam = shouldUpdateTeamName(match.homeTeam, teamName(fifaMatch.Home), match.stage) ? teamName(fifaMatch.Home)! : match.homeTeam;
    const awayTeam = shouldUpdateTeamName(match.awayTeam, teamName(fifaMatch.Away), match.stage) ? teamName(fifaMatch.Away)! : match.awayTeam;
    const next = {
      ...match,
      fifaMatchId: match.fifaMatchId ?? fifaMatch.IdMatch ?? null,
      homeTeam,
      awayTeam,
      result,
      status,
      minute: minuteFrom(fifaMatch),
      period: fifaMatch.LastPeriodUpdate ?? null,
      lastSyncedAt: options.syncedAt,
      syncSource: "FIFA public calendar API",
      syncStatus: `MatchStatus ${fifaMatch.MatchStatus ?? "ukjent"}`,
    };

    if (
      next.result !== match.result ||
      next.status !== match.status ||
      next.minute !== match.minute ||
      next.homeTeam !== match.homeTeam ||
      next.awayTeam !== match.awayTeam
    ) {
      updatedMatches += 1;
    }
    return next;
  });

  return {
    state: {
      ...state,
      matches,
      tournamentStats: mergeTournamentStats(state.tournamentStats, options.syncedAt),
    },
    updatedMatches,
  };
}

function mergeTournamentStats(current: TournamentStats, syncedAt: string): TournamentStats {
  const empty = emptyTournamentStats();
  return {
    ...empty,
    ...current,
    updatedAt: current.updatedAt ?? syncedAt,
    source: current.source ?? "FIFA public calendar API",
    unavailableReason:
      current.unavailableReason ??
      "Gratis FIFA-data har foreløpig ikke levert toppscorer, assist og kort i en stabil struktur.",
  };
}

function syncState(update: Partial<SyncState>): SyncState {
  return {
    status: "idle",
    source: "FIFA public calendar API",
    lastStartedAt: null,
    lastCompletedAt: null,
    updatedMatches: 0,
    message: null,
    ...update,
  };
}

export async function syncWorldCupData(options: SyncOptions = {}) {
  const now = options.now ?? new Date();
  const startedAt = now.toISOString();
  if (!options.ignoreWindow && !options.force && !inSyncWindow(now)) {
    return syncState({
      status: "skipped",
      lastStartedAt: startedAt,
      lastCompletedAt: startedAt,
      message: "Automatisk sync er aktiv kun rundt VM-perioden. Admin kan kjøre manuelt når som helst.",
    });
  }

  try {
    const response = await (options.fetcher ?? fetch)(fifaCalendarUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`FIFA svarte ${response.status}`);
    const data = (await response.json()) as FifaResponse;
    const state = await getAppState();
    const syncedAt = new Date().toISOString();
    const applied = applyFifaMatchesToState(state, data.Results ?? [], { force: options.force, syncedAt });
    const resolved = applyKnockoutResolversToState(applied.state, { force: options.force, syncedAt });
    const updatedMatches = applied.updatedMatches + resolved.updatedMatches;
    const next = {
      ...resolved.state,
      sync: syncState({
        status: "success",
        lastStartedAt: startedAt,
        lastCompletedAt: syncedAt,
        updatedMatches,
        message: `Oppdatert ${updatedMatches} kamp${updatedMatches === 1 ? "" : "er"} fra FIFA/bracket.`,
      }),
    };
    await saveAppState(next);
    return next.sync;
  } catch (error) {
    const completedAt = new Date().toISOString();
    const state = await getAppState();
    const next = {
      ...state,
      sync: syncState({
        status: "error",
        lastStartedAt: startedAt,
        lastCompletedAt: completedAt,
        message: error instanceof Error ? error.message : "Ukjent sync-feil.",
      }),
    };
    await saveAppState(next);
    return next.sync;
  }
}
