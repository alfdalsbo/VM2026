import { computeStandings, getPrediction, scorePrediction } from "@/lib/scoring";
import type { AppState } from "@/lib/types";

export type Award = {
  title: string;
  text: string;
};

export const emptyAwardText = "Embetsverket avventer første fasit før det begynner å late som dette var vitenskap.";

export function getAwards(state: AppState): Award[] {
  const completedMatches = state.matches.filter((match) => match.result);
  if (!completedMatches.length) return [{ title: "Første dom venter", text: emptyAwardText }];

  const latestRoundId = completedMatches.sort((a, b) => b.kickoffAt.localeCompare(a.kickoffAt))[0].roundId;
  const latestRoundMatches = state.matches.filter((match) => match.roundId === latestRoundId && match.result);
  const standings = computeStandings(state);
  const roundScores = state.players
    .map((player) => {
      const points = latestRoundMatches.reduce((sum, match) => {
        return sum + scorePrediction(match, getPrediction(state, player.id, match.id)).total;
      }, 0);
      return { player, points };
    })
    .sort((a, b) => b.points - a.points);

  const best = roundScores[0];
  const worst = [...roundScores].reverse().find((row) => row.points === 0) ?? roundScores.at(-1);
  const exactHero = standings
    .filter((row) => row.exactResults > 0)
    .sort((a, b) => b.exactResults - a.exactResults)[0];

  return [
    best
      ? {
          title: "Rundens profet",
          text: `${best.player.shortName} tok ${best.points} poeng og kommer til å omtale dette som metode, ikke flaks.`,
        }
      : null,
    exactHero
      ? {
          title: "VAR-varselet",
          text: `${exactHero.player.shortName} har ${exactHero.exactResults} eksakte resultater og bør kontrolleres for hemmelig tilgang til manus.`,
        }
      : null,
    worst
      ? {
          title: "Rundens bomskudd",
          text: `${worst.player.shortName} leverte et bidrag tabellen teknisk sett var nødt til å registrere.`,
        }
      : null,
  ].filter(Boolean) as Award[];
}

export const dashboardLines = [
  "VM kommer til Nord-Amerika. Gjengen kommer til å overdrive selvtilliten.",
  "Tabellen er foreløpig høflig. Det varer sjelden lenge.",
  "Alle tips føres med alvor. Alle bortforklaringer arkiveres med glede.",
  "Første bud: tipp før kampstart. Andre bud: nekt for at du var skråsikker.",
];

export function pickLine(seed: string) {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return dashboardLines[hash % dashboardLines.length];
}
