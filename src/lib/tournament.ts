import { formatScore } from "@/lib/format";
import { hasFinalResult } from "@/lib/scoring";
import type { AppState, BroadcastInfo, TournamentStage, WorldCupMatch } from "@/lib/types";
import { worldCupMatches } from "@/lib/world-cup-2026";

export type GroupStanding = {
  group: string;
  team: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

export type KnockoutMatch = {
  stage: TournamentStage;
  stageLabel: string;
  match: WorldCupMatch;
  winner: string | null;
};

export type KnockoutFlowMatch = KnockoutMatch & {
  nextLabels: string[];
};

export type KnockoutFlowRound = {
  stage: TournamentStage;
  stageLabel: string;
  matches: KnockoutFlowMatch[];
};

const knockoutStageOrder: TournamentStage[] = [
  "round_of_32",
  "round_of_16",
  "quarter_final",
  "semi_final",
  "third_place",
  "final",
];

export function getBroadcastForMatch(match: WorldCupMatch): BroadcastInfo | null {
  return match.broadcasts[0] ?? null;
}

export function formatBroadcast(match: WorldCupMatch) {
  const broadcast = getBroadcastForMatch(match);
  if (!broadcast) return "Kanal ikke bekreftet";
  return `${broadcast.channel} / ${broadcast.service}`;
}

export function formatMatchStatus(match: WorldCupMatch) {
  if (match.status === "live") return match.minute ? `Kampen lever · ${match.minute}'` : "Kampen lever";
  if (match.status === "halftime") return "Pauseprat";
  if (match.status === "finished") return "Full tid";
  if (match.status === "postponed") return "Utsatt";
  if (match.status === "cancelled") return "Avlyst";
  return "Kommer";
}

function createStanding(group: string, team: string): GroupStanding {
  return {
    group,
    team,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
  };
}

export function computeGroupTables(state: AppState) {
  const byGroup = new Map<string, Map<string, GroupStanding>>();

  for (const match of state.matches.filter((item) => item.stage === "group" && item.group)) {
    const group = match.group!;
    if (!byGroup.has(group)) byGroup.set(group, new Map());
    const table = byGroup.get(group)!;
    for (const team of [match.homeTeam, match.awayTeam]) {
      if (!table.has(team)) table.set(team, createStanding(group, team));
    }

    const result = match.result;
    if (!result || !hasFinalResult(match)) continue;

    const home = table.get(match.homeTeam)!;
    const away = table.get(match.awayTeam)!;
    const homeGoals = result.homeGoals;
    const awayGoals = result.awayGoals;
    home.played += 1;
    away.played += 1;
    home.goalsFor += homeGoals;
    home.goalsAgainst += awayGoals;
    away.goalsFor += awayGoals;
    away.goalsAgainst += homeGoals;

    if (homeGoals > awayGoals) {
      home.wins += 1;
      away.losses += 1;
      home.points += 3;
    } else if (awayGoals > homeGoals) {
      away.wins += 1;
      home.losses += 1;
      away.points += 3;
    } else {
      home.draws += 1;
      away.draws += 1;
      home.points += 1;
      away.points += 1;
    }

    home.goalDifference = home.goalsFor - home.goalsAgainst;
    away.goalDifference = away.goalsFor - away.goalsAgainst;
  }

  return [...byGroup.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "nb"))
    .map(([group, table]) => ({
      group,
      rows: [...table.values()].sort((a, b) => {
        return (
          b.points - a.points ||
          b.goalDifference - a.goalDifference ||
          b.goalsFor - a.goalsFor ||
          a.team.localeCompare(b.team, "nb")
        );
      }),
    }));
}

export function computeKnockoutBracket(state: AppState): KnockoutMatch[] {
  return state.matches
    .filter((match) => match.stage !== "group")
    .map((match) => {
      const winner =
        match.result && match.result.homeGoals !== match.result.awayGoals
          ? match.result.homeGoals > match.result.awayGoals
            ? match.homeTeam
            : match.awayTeam
          : match.result?.advancingTeam === "home"
            ? match.homeTeam
            : match.result?.advancingTeam === "away"
              ? match.awayTeam
              : null;
      return { stage: match.stage, stageLabel: match.stageLabel, match, winner };
    });
}

export function buildKnockoutFlow(state: AppState): KnockoutFlowRound[] {
  const knockout = computeKnockoutBracket(state).map((item) => ({
    ...item,
    nextLabels: nextMatchLabels(item.match.matchNumber),
  }));

  return knockoutStageOrder
    .map((stage) => {
      const matches = knockout
        .filter((item) => item.stage === stage)
        .sort((a, b) => a.match.kickoffAt.localeCompare(b.match.kickoffAt));
      return {
        stage,
        stageLabel: matches[0]?.stageLabel ?? stage,
        matches,
      };
    })
    .filter((round) => round.matches.length);
}

export function resultSummary(match: WorldCupMatch) {
  return match.result ? formatScore(match.result.homeGoals, match.result.awayGoals) : "Ikke spilt";
}

function nextMatchLabels(matchNumber: number) {
  const tokens = [
    { token: `W${matchNumber}`, label: "Vinner" },
    { token: `RU${matchNumber}`, label: "Taper" },
  ];

  return tokens.flatMap(({ token, label }) =>
    worldCupMatches
      .filter((match) => match.stage !== "group" && (match.homeTeam === token || match.awayTeam === token))
      .map((match) => `${label} til kamp ${match.matchNumber}`),
  );
}

function matchWinner(match: WorldCupMatch) {
  if (!match.result) return null;
  if (match.result.homeGoals > match.result.awayGoals) return match.homeTeam;
  if (match.result.awayGoals > match.result.homeGoals) return match.awayTeam;
  if (match.result.advancingTeam === "home") return match.homeTeam;
  if (match.result.advancingTeam === "away") return match.awayTeam;
  return null;
}

function matchRunnerUp(match: WorldCupMatch) {
  if (!match.result) return null;
  const winner = matchWinner(match);
  if (!winner) return null;
  return winner === match.homeTeam ? match.awayTeam : match.homeTeam;
}

export function isKnockoutPlaceholder(team: string) {
  return /^([12][A-L]|3[A-L]+|W\d+|RU\d+)$/.test(team);
}

function resolveGroupRank(state: AppState, rank: number, groupLetter: string) {
  const group = computeGroupTables(state).find((item) => item.group === `Group ${groupLetter}`);
  if (!group || group.rows.length < 4 || group.rows.some((row) => row.played < 3)) return null;
  return group.rows[rank - 1]?.team ?? null;
}

export function resolveKnockoutPlaceholder(placeholder: string, state: AppState) {
  const groupRank = placeholder.match(/^([12])([A-L])$/);
  if (groupRank) return resolveGroupRank(state, Number(groupRank[1]), groupRank[2]);

  const matchReference = placeholder.match(/^(W|RU)(\d+)$/);
  if (matchReference) {
    const referencedMatch = state.matches.find((match) => match.matchNumber === Number(matchReference[2]));
    if (!referencedMatch) return null;
    return matchReference[1] === "W" ? matchWinner(referencedMatch) : matchRunnerUp(referencedMatch);
  }

  return null;
}

function shouldApplyResolvedTeam(current: string, seedPlaceholder: string, force?: boolean) {
  if (force) return true;
  return current === seedPlaceholder || isKnockoutPlaceholder(current);
}

export function applyKnockoutResolversToState(
  state: AppState,
  options: { force?: boolean; syncedAt?: string } = {},
) {
  const seedById = new Map(worldCupMatches.map((match) => [match.id, match]));
  let updatedMatches = 0;

  const matches = state.matches.map((match) => {
    if (match.stage === "group") return match;
    const seed = seedById.get(match.id);
    if (!seed) return match;

    const resolvedHome = resolveKnockoutPlaceholder(seed.homeTeam, state);
    const resolvedAway = resolveKnockoutPlaceholder(seed.awayTeam, state);
    const homeTeam =
      resolvedHome && shouldApplyResolvedTeam(match.homeTeam, seed.homeTeam, options.force) ? resolvedHome : match.homeTeam;
    const awayTeam =
      resolvedAway && shouldApplyResolvedTeam(match.awayTeam, seed.awayTeam, options.force) ? resolvedAway : match.awayTeam;

    if (homeTeam === match.homeTeam && awayTeam === match.awayTeam) return match;
    updatedMatches += 1;
    return {
      ...match,
      homeTeam,
      awayTeam,
      lastSyncedAt: options.syncedAt ?? match.lastSyncedAt,
      syncSource: options.syncedAt ? "Tippekjelleren bracket resolver" : match.syncSource,
      syncStatus: "Utslagslag løst fra gruppetabell/resultat",
    };
  });

  return {
    state: {
      ...state,
      matches,
    },
    updatedMatches,
  };
}
