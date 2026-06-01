import type { WorldCupMatch } from "@/lib/types";

export function isKnockoutPlaceholder(team: string) {
  return /^([12][A-L]|3[A-L]+|W\d+|RU\d+)$/.test(team);
}

export function hasUnresolvedKnockoutTeams(match: Pick<WorldCupMatch, "stage" | "homeTeam" | "awayTeam">) {
  return match.stage !== "group" && (isKnockoutPlaceholder(match.homeTeam) || isKnockoutPlaceholder(match.awayTeam));
}

export function matchupKeyForMatch(match: Pick<WorldCupMatch, "stage" | "homeTeam" | "awayTeam">) {
  if (match.stage === "group" || hasUnresolvedKnockoutTeams(match)) return null;
  return `${match.homeTeam}|||${match.awayTeam}`;
}
