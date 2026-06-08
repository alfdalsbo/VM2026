import { playerProfileIdFor } from "@/lib/player-profiles";
import { SCORE_RULES } from "@/lib/scoring-rules";
import { isPlaceholderTeam, teamSlug } from "@/lib/teams";
import { displayTeamName } from "@/lib/display";
import type {
  AppState,
  MatchEvent,
  PlayerTournamentStat,
  TeamProfile,
  TeamSquadPlayer,
  TournamentBonusPrediction,
  TournamentBonusResult,
  WorldCupMatch,
} from "@/lib/types";

export type TournamentBonusScore = {
  winner: number;
  topScorer: number;
  assistKing: number;
  total: number;
};

export type TournamentBonusTeamOption = {
  slug: string;
  name: string;
  searchText: string;
};

export type TournamentBonusPlayerOption = {
  id: string;
  name: string;
  teamName: string;
  teamSlug: string;
  position: TeamSquadPlayer["position"];
};

type LeaderResult = {
  ids: string[];
  rows: PlayerTournamentStat[];
  source: string | null;
};

export function emptyTournamentBonusResult(): TournamentBonusResult {
  return {
    winnerTeamSlug: null,
    winnerTeamName: null,
    topScorerPlayerProfileIds: [],
    topScorers: [],
    assistKingPlayerProfileIds: [],
    assistKings: [],
    updatedAt: null,
    source: null,
    unavailableReason: "Turneringsbonusfasit avventer finalen og offisiell VM-statistikk.",
  };
}

export function getTournamentBonusLockAt(state: AppState) {
  return [...state.matches]
    .filter((match) => match.status !== "cancelled" && match.status !== "postponed")
    .sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt))[0]?.kickoffAt ?? null;
}

export function isTournamentBonusOpen(state: AppState, now = new Date()) {
  const lockAt = getTournamentBonusLockAt(state);
  return lockAt ? new Date(lockAt).getTime() > now.getTime() : false;
}

export function getTournamentBonusTeamOptions(state: AppState): TournamentBonusTeamOption[] {
  return state.teamProfiles
    .filter((profile) => profile.teamName && !isPlaceholderTeam(profile.teamName))
    .map((profile) => ({
      slug: profile.slug,
      name: displayTeamName(profile.teamName),
      searchText: [profile.teamName, profile.slug, profile.abbreviation, profile.countryCode].filter(Boolean).join(" "),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "nb"));
}

export function getTournamentBonusPlayerOptions(state: AppState): TournamentBonusPlayerOption[] {
  const byId = new Map<string, TournamentBonusPlayerOption>();

  for (const profile of state.teamProfiles) {
    for (const player of profile.squad.filter(isRealSquadPlayer)) {
      const id = player.playerProfileId ?? playerProfileIdFor(profile.teamName, player.id, player.name);
      byId.set(id, {
        id,
        name: player.name,
        teamName: profile.teamName,
        teamSlug: profile.slug,
        position: player.position,
      });
    }
  }

  return [...byId.values()].sort((a, b) => a.teamName.localeCompare(b.teamName, "nb") || a.name.localeCompare(b.name, "nb"));
}

export function getTournamentBonusPrediction(state: AppState, playerId: string) {
  return state.tournamentBonusPredictions.find((prediction) => prediction.playerId === playerId) ?? null;
}

export function saveTournamentBonusPredictionInState(
  state: AppState,
  prediction: TournamentBonusPrediction,
  now = new Date(),
): AppState {
  if (!isTournamentBonusOpen(state, now)) {
    throw new Error("Turneringsbonusen er låst. Første avspark har fått protokollen til å klappe igjen.");
  }

  const teams = new Set(getTournamentBonusTeamOptions(state).map((team) => team.slug));
  if (!teams.has(prediction.winnerTeamSlug)) throw new Error("Velg et gyldig VM-lag.");

  const playerIds = new Set(getTournamentBonusPlayerOptions(state).map((player) => player.id));
  if (!playerIds.size) throw new Error("Troppdata er ikke klar for turneringsbonus ennå.");
  if (!playerIds.has(prediction.topScorerPlayerProfileId)) throw new Error("Velg en gyldig toppscorer-kandidat.");
  if (!playerIds.has(prediction.assistKingPlayerProfileId)) throw new Error("Velg en gyldig assistkonge-kandidat.");

  return {
    ...state,
    tournamentBonusPredictions: [
      ...state.tournamentBonusPredictions.filter((item) => item.playerId !== prediction.playerId),
      prediction,
    ],
  };
}

export function scoreTournamentBonusPrediction(
  state: AppState,
  prediction: TournamentBonusPrediction | null | undefined,
): TournamentBonusScore {
  if (!prediction) return emptyTournamentBonusScore();
  const result = state.tournamentBonusResult ?? emptyTournamentBonusResult();
  const winner = result.winnerTeamSlug === prediction.winnerTeamSlug ? SCORE_RULES.bonusTips.tournamentWinner : 0;
  const topScorer = result.topScorerPlayerProfileIds.includes(prediction.topScorerPlayerProfileId)
    ? SCORE_RULES.bonusTips.tournamentTopScorer
    : 0;
  const assistKing = result.assistKingPlayerProfileIds.includes(prediction.assistKingPlayerProfileId)
    ? SCORE_RULES.bonusTips.tournamentAssistKing
    : 0;

  return {
    winner,
    topScorer,
    assistKing,
    total: winner + topScorer + assistKing,
  };
}

export function deriveTournamentBonusResult(state: AppState, syncedAt: string): TournamentBonusResult {
  const previous = state.tournamentBonusResult ?? emptyTournamentBonusResult();
  const winner = deriveTournamentWinner(state);
  const topScorers = leadersFromStats(state, state.tournamentStats.topScorers, "FIFA public squad API")
    ?? leadersFromGoalEvents(state);
  const assistKings = leadersFromStats(state, state.tournamentStats.assistMakers, "FIFA public squad API")
    ?? leadersFromAssistEvents(state);

  const winnerTeamSlug = winner?.slug ?? previous.winnerTeamSlug;
  const winnerTeamName = winner?.name ?? previous.winnerTeamName;
  const topScorerPlayerProfileIds = topScorers?.ids.length ? topScorers.ids : previous.topScorerPlayerProfileIds;
  const topScorerRows = topScorers?.rows.length ? topScorers.rows : previous.topScorers;
  const assistKingPlayerProfileIds = assistKings?.ids.length ? assistKings.ids : previous.assistKingPlayerProfileIds;
  const assistKingRows = assistKings?.rows.length ? assistKings.rows : previous.assistKings;
  const missing = [
    winnerTeamSlug ? null : "VM-vinner avventer finalen.",
    topScorerPlayerProfileIds.length ? null : "Toppscorer avventer FIFA-statistikk eller målprotokoll.",
    assistKingPlayerProfileIds.length ? null : "Assistkonge avventer FIFA-statistikk eller assistprotokoll.",
  ].filter(Boolean) as string[];
  const sources = unique([
    winner ? "Finaleresultat" : previous.winnerTeamSlug ? previous.source : null,
    topScorers?.source ?? (previous.topScorerPlayerProfileIds.length ? previous.source : null),
    assistKings?.source ?? (previous.assistKingPlayerProfileIds.length ? previous.source : null),
  ]);

  return {
    winnerTeamSlug,
    winnerTeamName,
    topScorerPlayerProfileIds,
    topScorers: topScorerRows,
    assistKingPlayerProfileIds,
    assistKings: assistKingRows,
    updatedAt: sources.length ? syncedAt : previous.updatedAt,
    source: sources.length ? sources.join(" + ") : previous.source,
    unavailableReason: missing.length ? missing.join(" ") : null,
  };
}

function emptyTournamentBonusScore(): TournamentBonusScore {
  return {
    winner: 0,
    topScorer: 0,
    assistKing: 0,
    total: 0,
  };
}

function isRealSquadPlayer(player: TeamSquadPlayer) {
  return player.source !== "placeholder";
}

function hasFinalResult(match: WorldCupMatch) {
  return Boolean(match.result && (match.status === "finished" || match.result.source === "manual" || !match.result.source));
}

function deriveTournamentWinner(state: AppState) {
  const final = state.matches.find((match) => match.stage === "final");
  if (!final?.result || !hasFinalResult(final)) return null;
  const winnerName =
    final.result.homeGoals > final.result.awayGoals
      ? final.homeTeam
      : final.result.awayGoals > final.result.homeGoals
        ? final.awayTeam
        : final.result.advancingTeam === "home"
          ? final.homeTeam
          : final.result.advancingTeam === "away"
            ? final.awayTeam
            : null;
  if (!winnerName || isPlaceholderTeam(winnerName)) return null;
  return { slug: teamSlug(winnerName), name: winnerName };
}

function leadersFromStats(state: AppState, rows: PlayerTournamentStat[], source: string): LeaderResult | null {
  const withIds = rows
    .filter((row) => row.value > 0)
    .map((row) => ({
      ...row,
      playerProfileId: row.playerProfileId ?? findPlayerProfileId(state, row.teamName, row.playerName),
    }))
    .filter((row) => row.playerProfileId);
  if (!withIds.length) return null;

  const bestValue = Math.max(...withIds.map((row) => row.value));
  const leaders = withIds
    .filter((row) => row.value === bestValue)
    .sort((a, b) => a.playerName.localeCompare(b.playerName, "nb"));

  return {
    ids: unique(leaders.map((row) => row.playerProfileId)),
    rows: leaders,
    source,
  };
}

function leadersFromGoalEvents(state: AppState): LeaderResult | null {
  const counts = new Map<string, PlayerTournamentStat>();
  for (const event of state.matchEvents) {
    if (event.type !== "goal" && event.type !== "penalty_goal") continue;
    const teamName = teamNameForEvent(state, event);
    if (!event.playerName || !teamName) continue;
    const playerProfileId = event.playerProfileId ?? findPlayerProfileId(state, teamName, event.playerName);
    if (!playerProfileId) continue;
    incrementStat(counts, playerProfileId, event.playerName, teamName);
  }
  return leadersFromCounts(counts, "FIFA public calendar API events");
}

function leadersFromAssistEvents(state: AppState): LeaderResult | null {
  const counts = new Map<string, PlayerTournamentStat>();
  for (const event of state.matchEvents) {
    if (event.type !== "goal" && event.type !== "penalty_goal") continue;
    const teamName = teamNameForEvent(state, event);
    if (!event.assistPlayerName || !teamName) continue;
    const playerProfileId = findPlayerProfileId(state, teamName, event.assistPlayerName);
    if (!playerProfileId) continue;
    incrementStat(counts, playerProfileId, event.assistPlayerName, teamName);
  }
  return leadersFromCounts(counts, "FIFA public calendar API events");
}

function leadersFromCounts(counts: Map<string, PlayerTournamentStat>, source: string): LeaderResult | null {
  const rows = [...counts.values()];
  if (!rows.length) return null;
  const bestValue = Math.max(...rows.map((row) => row.value));
  const leaders = rows
    .filter((row) => row.value === bestValue)
    .sort((a, b) => a.playerName.localeCompare(b.playerName, "nb"));

  return {
    ids: unique(leaders.map((row) => row.playerProfileId)),
    rows: leaders,
    source,
  };
}

function incrementStat(counts: Map<string, PlayerTournamentStat>, playerProfileId: string, playerName: string, teamName: string) {
  const current = counts.get(playerProfileId);
  counts.set(playerProfileId, {
    playerProfileId,
    playerName,
    teamName,
    value: (current?.value ?? 0) + 1,
  });
}

function teamNameForEvent(state: AppState, event: MatchEvent) {
  const match = state.matches.find((item) => item.id === event.matchId);
  if (!match) return null;
  if (event.teamSide === "home") return match.homeTeam;
  if (event.teamSide === "away") return match.awayTeam;
  return null;
}

function findPlayerProfileId(state: AppState, teamName: string, playerName: string) {
  const wantedName = normalizeName(playerName);
  const wantedTeam = teamSlug(teamName);
  const existing = state.playerProfiles.find(
    (profile) => profile.teamSlug === wantedTeam && normalizeName(profile.name) === wantedName,
  );
  if (existing) return existing.id;

  const team = state.teamProfiles.find((profile) => profile.slug === wantedTeam || profile.teamName === teamName);
  const squadPlayer = team?.squad.find(
    (player) => normalizeName(player.name) === wantedName || normalizeName(player.shortName ?? "") === wantedName,
  );
  return team && squadPlayer ? squadPlayer.playerProfileId ?? playerProfileIdFor(team.teamName, squadPlayer.id, squadPlayer.name) : null;
}

function normalizeName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function unique<T>(items: Array<T | null | undefined>) {
  return [...new Set(items.filter((item): item is T => item != null))];
}

export function formatTournamentBonusPlayer(option: Pick<TournamentBonusPlayerOption, "name" | "teamName">) {
  return `${option.name} (${displayTeamName(option.teamName)})`;
}

export function tournamentBonusTeamName(state: AppState, slug: string | null | undefined) {
  if (!slug) return null;
  const teamName = state.teamProfiles.find((team) => team.slug === slug)?.teamName ?? null;
  return teamName ? displayTeamName(teamName) : null;
}

export function tournamentBonusPlayerName(state: AppState, playerProfileId: string | null | undefined) {
  if (!playerProfileId) return null;
  const option = getTournamentBonusPlayerOptions(state).find((player) => player.id === playerProfileId);
  if (option) return formatTournamentBonusPlayer(option);
  const profile = state.playerProfiles.find((player) => player.id === playerProfileId);
  return profile ? `${profile.name} (${displayTeamName(profile.teamName)})` : null;
}

export function hasAnyRealTournamentBonusPlayers(teamProfiles: TeamProfile[]) {
  return teamProfiles.some((profile) => profile.squad.some(isRealSquadPlayer));
}
