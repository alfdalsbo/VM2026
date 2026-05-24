import { mergePlayerProfiles } from "@/lib/player-profiles";
import type { AppState, MatchEvent, MatchLineup, PlayerProfile } from "@/lib/types";

export type ManualLineupOverride = {
  matchId: string;
  formation?: MatchLineup["formation"];
  status?: MatchLineup["status"];
  confirmedAt?: string | null;
  players?: MatchLineup["players"];
  homeBench?: MatchLineup["homeBench"];
  awayBench?: MatchLineup["awayBench"];
  source?: string | null;
  updatedAt?: string | null;
};

export type ManualWorldCupOverrides = {
  matchEvents?: MatchEvent[];
  lineups?: ManualLineupOverride[];
  playerProfiles?: PlayerProfile[];
};

export const manualWorldCupOverrides: ManualWorldCupOverrides = {
  matchEvents: [],
  lineups: [],
  playerProfiles: [],
};

function mergeLineup(existing: MatchLineup | null, override: ManualLineupOverride): MatchLineup {
  return {
    matchId: override.matchId,
    formation: {
      home: existing?.formation.home ?? override.formation?.home ?? null,
      away: existing?.formation.away ?? override.formation?.away ?? null,
    },
    status: existing?.status && existing.status !== "not_published" ? existing.status : override.status ?? existing?.status ?? "expected",
    confirmedAt: existing?.confirmedAt ?? override.confirmedAt ?? null,
    players: existing?.players.length ? existing.players : override.players ?? [],
    homeBench: existing?.homeBench.length ? existing.homeBench : override.homeBench ?? [],
    awayBench: existing?.awayBench.length ? existing.awayBench : override.awayBench ?? [],
    source: existing?.source ?? override.source ?? "manual",
    updatedAt: existing?.updatedAt ?? override.updatedAt ?? null,
  };
}

export function applyManualWorldCupOverrides(state: AppState, overrides: ManualWorldCupOverrides = manualWorldCupOverrides): AppState {
  const eventsById = new Map(state.matchEvents.map((event) => [event.id, event]));
  for (const event of overrides.matchEvents ?? []) {
    if (!eventsById.has(event.id)) eventsById.set(event.id, event);
  }

  const lineupsByMatch = new Map(state.lineups.map((lineup) => [lineup.matchId, lineup]));
  for (const override of overrides.lineups ?? []) {
    lineupsByMatch.set(override.matchId, mergeLineup(lineupsByMatch.get(override.matchId) ?? null, override));
  }

  return {
    ...state,
    matchEvents: [...eventsById.values()].sort((a, b) => (a.minute ?? 999) - (b.minute ?? 999) || a.id.localeCompare(b.id)),
    lineups: [...lineupsByMatch.values()],
    playerProfiles: mergePlayerProfiles(overrides.playerProfiles ?? [], state.playerProfiles),
  };
}
