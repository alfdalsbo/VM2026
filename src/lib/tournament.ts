import { formatScore } from "@/lib/format";
import type { AppState, BroadcastInfo, TournamentStage, WorldCupMatch } from "@/lib/types";

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

export function getBroadcastForMatch(match: WorldCupMatch): BroadcastInfo | null {
  return match.broadcasts[0] ?? null;
}

export function formatBroadcast(match: WorldCupMatch) {
  const broadcast = getBroadcastForMatch(match);
  if (!broadcast) return "Kanal ikke bekreftet";
  return `${broadcast.channel} / ${broadcast.service}`;
}

export function formatMatchStatus(match: WorldCupMatch) {
  if (match.status === "live") return match.minute ? `Live · ${match.minute}'` : "Live";
  if (match.status === "halftime") return "Pause";
  if (match.status === "finished") return "Ferdig";
  if (match.status === "postponed") return "Utsatt";
  if (match.status === "cancelled") return "Avlyst";
  return "Ikke startet";
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

    if (!match.result) continue;

    const home = table.get(match.homeTeam)!;
    const away = table.get(match.awayTeam)!;
    const homeGoals = match.result.homeGoals;
    const awayGoals = match.result.awayGoals;
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

export function resultSummary(match: WorldCupMatch) {
  return match.result ? formatScore(match.result.homeGoals, match.result.awayGoals) : "Ikke spilt";
}
