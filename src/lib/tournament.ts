import { formatScore } from "@/lib/format";
import { isKnockoutPlaceholder } from "@/lib/knockout-placeholders";
import { hasFinalResult } from "@/lib/scoring";
import type { AppState, BroadcastInfo, TeamSide, TournamentStage, WorldCupMatch } from "@/lib/types";
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

export type KnockoutFlowReferenceKind = "winner" | "runner_up";

export type KnockoutFlowSourceReference = {
  kind: KnockoutFlowReferenceKind;
  matchNumber: number;
  side: TeamSide;
  label: string;
};

export type KnockoutFlowNextReference = {
  kind: KnockoutFlowReferenceKind;
  matchNumber: number;
  stage: TournamentStage;
  stageLabel: string;
  targetSide: TeamSide;
  label: string;
};

export type KnockoutFlowMatch = KnockoutMatch & {
  bracketOrder: number;
  nextLabels: string[];
  nextReferences: KnockoutFlowNextReference[];
  sourceReferences: KnockoutFlowSourceReference[];
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
      const winner = matchWinner(match);
      return { stage: match.stage, stageLabel: match.stageLabel, match, winner };
    });
}

export function buildKnockoutFlow(state: AppState): KnockoutFlowRound[] {
  const bracketOrderByMatchNumber = buildBracketOrder();
  const seedByMatchNumber = new Map(worldCupMatches.map((match) => [match.matchNumber, match]));
  const knockout = computeKnockoutBracket(state).map((item) => ({
    ...item,
    bracketOrder: bracketOrderByMatchNumber.get(item.match.matchNumber) ?? Number.MAX_SAFE_INTEGER,
    nextReferences: nextMatchReferences(item.match.matchNumber),
    sourceReferences: sourceReferencesForMatch(seedByMatchNumber.get(item.match.matchNumber) ?? item.match),
    nextLabels: nextMatchLabels(item.match.matchNumber),
  }));

  return knockoutStageOrder
    .map((stage) => {
      const matches = knockout
        .filter((item) => item.stage === stage)
        .sort(
          (a, b) =>
            a.bracketOrder - b.bracketOrder ||
            a.match.matchNumber - b.match.matchNumber ||
            a.match.kickoffAt.localeCompare(b.match.kickoffAt),
        );
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
  return nextMatchReferences(matchNumber).map((reference) => reference.label);
}

function referenceKindLabel(kind: KnockoutFlowReferenceKind) {
  return kind === "winner" ? "Vinner" : "Taper";
}

function parseMatchReference(value: string) {
  const match = value.match(/^(W|RU)(\d+)$/);
  if (!match) return null;
  const kind: KnockoutFlowReferenceKind = match[1] === "W" ? "winner" : "runner_up";
  const matchNumber = Number(match[2]);
  return {
    kind,
    matchNumber,
    label: `${referenceKindLabel(kind)} kamp ${matchNumber}`,
  };
}

function sourceReferencesForMatch(match: Pick<WorldCupMatch, "homeTeam" | "awayTeam">): KnockoutFlowSourceReference[] {
  return ([
    ["home", match.homeTeam],
    ["away", match.awayTeam],
  ] as const).flatMap(([side, team]) => {
    const reference = parseMatchReference(team);
    return reference ? [{ ...reference, side }] : [];
  });
}

function nextMatchReferences(matchNumber: number): KnockoutFlowNextReference[] {
  return worldCupMatches
    .flatMap((match) =>
      ([
        ["home", match.homeTeam],
        ["away", match.awayTeam],
      ] as const).flatMap(([targetSide, team]) => {
        const reference = parseMatchReference(team);
        if (!reference || reference.matchNumber !== matchNumber || match.stage === "group") return [];
        return [
          {
            ...reference,
            label: `${referenceKindLabel(reference.kind)} til kamp ${match.matchNumber}`,
            matchNumber: match.matchNumber,
            stage: match.stage,
            stageLabel: match.stageLabel,
            targetSide,
          },
        ];
      }),
    )
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "winner" ? -1 : 1;
      return a.matchNumber - b.matchNumber;
    });
}

function buildBracketOrder() {
  const seedByMatchNumber = new Map(worldCupMatches.map((match) => [match.matchNumber, match]));
  const stageOrders = new Map<TournamentStage, number[]>();
  const finalMatches = worldCupMatches
    .filter((match) => match.stage === "final")
    .sort((a, b) => a.matchNumber - b.matchNumber);

  function addToStageOrder(match: WorldCupMatch) {
    const existing = stageOrders.get(match.stage) ?? [];
    if (!existing.includes(match.matchNumber)) {
      stageOrders.set(match.stage, [...existing, match.matchNumber]);
    }
  }

  function walkWinnerTree(matchNumber: number) {
    const match = seedByMatchNumber.get(matchNumber);
    if (!match || match.stage === "group") return;
    addToStageOrder(match);
    for (const reference of sourceReferencesForMatch(match).filter((item) => item.kind === "winner")) {
      walkWinnerTree(reference.matchNumber);
    }
  }

  for (const match of finalMatches) {
    walkWinnerTree(match.matchNumber);
  }

  for (const match of worldCupMatches.filter((item) => item.stage !== "group")) {
    addToStageOrder(match);
  }

  const orderByMatchNumber = new Map<number, number>();
  for (const [stage, matchNumbers] of stageOrders) {
    const stageOffset = knockoutStageOrder.indexOf(stage) * 1000;
    matchNumbers.forEach((matchNumber, index) => {
      orderByMatchNumber.set(matchNumber, stageOffset + index);
    });
  }

  return orderByMatchNumber;
}

function matchWinner(match: WorldCupMatch) {
  if (!hasFinalResult(match)) return null;
  const result = match.result;
  if (!result) return null;
  if (result.homeGoals > result.awayGoals) return match.homeTeam;
  if (result.awayGoals > result.homeGoals) return match.awayTeam;
  if (result.advancingTeam === "home") return match.homeTeam;
  if (result.advancingTeam === "away") return match.awayTeam;
  return null;
}

function matchRunnerUp(match: WorldCupMatch) {
  const winner = matchWinner(match);
  if (!winner) return null;
  return winner === match.homeTeam ? match.awayTeam : match.homeTeam;
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

function shouldApplyResolvedTeam(current: string, seedPlaceholder: string, resolved: string, force?: boolean) {
  if (force) return true;
  return current === seedPlaceholder || isKnockoutPlaceholder(current) || (isKnockoutPlaceholder(seedPlaceholder) && current !== resolved);
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
      resolvedHome && shouldApplyResolvedTeam(match.homeTeam, seed.homeTeam, resolvedHome, options.force)
        ? resolvedHome
        : match.homeTeam;
    const awayTeam =
      resolvedAway && shouldApplyResolvedTeam(match.awayTeam, seed.awayTeam, resolvedAway, options.force)
        ? resolvedAway
        : match.awayTeam;

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
