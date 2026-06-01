import { displayMatchup } from "@/lib/display";
import { formatOsloDate } from "@/lib/format";
import { computeStandings, getPrediction, hasFinalResult, scorePrediction } from "@/lib/scoring";
import type { AppState } from "@/lib/types";

export type Award = {
  title: string;
  text: string;
};

export type MatchdayWinner = {
  title: string;
  dateLabel: string;
  matchCount: number;
  matches: string[];
  winners: Array<{
    playerName: string;
    points: number;
    exactResults: number;
  }>;
  isFallback: boolean;
};

export type MatchdayVerdict = MatchdayWinner & {
  losers: Array<{
    playerName: string;
    points: number;
    exactResults: number;
  }>;
};

export const emptyAwardText = "Dommerbordet avventer første fasit før det begynner å late som dette var vitenskap.";

const osloKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "Europe/Oslo",
  year: "numeric",
});

function osloDateKey(value: string | Date) {
  const parts = osloKeyFormatter.formatToParts(typeof value === "string" ? new Date(value) : value);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

export function getMatchdayVerdict(state: AppState, now = new Date()): MatchdayVerdict | null {
  const completedMatches = state.matches.filter(hasFinalResult);
  if (!completedMatches.length) return null;

  const yesterdayKey = osloDateKey(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  const todayKey = osloDateKey(now);
  const completedByDate = new Map<string, typeof completedMatches>();

  for (const match of completedMatches) {
    const key = osloDateKey(match.kickoffAt);
    const bucket = completedByDate.get(key);
    if (bucket) bucket.push(match);
    else completedByDate.set(key, [match]);
  }

  let targetKey = yesterdayKey;
  let targetMatches = completedByDate.get(yesterdayKey) ?? [];
  let isFallback = false;

  if (!targetMatches.length) {
    const fallbackKey = [...completedByDate.keys()]
      .filter((key) => key < todayKey)
      .sort((a, b) => b.localeCompare(a))[0] ?? [...completedByDate.keys()].sort((a, b) => b.localeCompare(a))[0];
    if (!fallbackKey) return null;
    targetKey = fallbackKey;
    targetMatches = completedByDate.get(fallbackKey) ?? [];
    isFallback = targetKey !== yesterdayKey;
  }

  if (!targetMatches.length) return null;

  const playerScores = state.players
    .map((player) => {
      let points = 0;
      let exactResults = 0;
      for (const match of targetMatches) {
        const score = scorePrediction(match, getPrediction(state, player.id, match.id), state);
        points += score.total;
        if (score.exactResult) exactResults += 1;
      }
      return { playerName: player.shortName, points, exactResults };
    })
    .sort((a, b) => b.points - a.points || b.exactResults - a.exactResults || a.playerName.localeCompare(b.playerName, "nb"));

  const best = playerScores[0];
  const winners = best ? playerScores.filter((score) => score.points === best.points && score.exactResults === best.exactResults) : [];
  const worst = playerScores.at(-1);
  const losers = worst ? playerScores.filter((score) => score.points === worst.points && score.exactResults === worst.exactResults) : [];

  return {
    title: isFallback ? "Siste kampdags dom" : "Gårsdagens dom",
    dateLabel: formatOsloDate(targetMatches[0].kickoffAt),
    matchCount: targetMatches.length,
    matches: targetMatches.sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt)).map(displayMatchup),
    winners,
    losers,
    isFallback,
  };
}

export function getMatchdayWinner(state: AppState, now = new Date()): MatchdayWinner | null {
  const verdict = getMatchdayVerdict(state, now);
  if (!verdict) return null;
  return {
    dateLabel: verdict.dateLabel,
    matchCount: verdict.matchCount,
    matches: verdict.matches,
    winners: verdict.winners,
    isFallback: verdict.isFallback,
    title: verdict.isFallback ? "Siste kampdags rundevinner" : "Gårsdagens rundevinner",
  };
}

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
          title: "Rundens TV-ekspert",
          text: `${best.player.shortName} tok ${best.points} poeng og kommer til å omtale dette som kampplan, ikke flaks.`,
        }
      : null,
    exactHero
      ? {
          title: "VAR-varselet",
          text: `${exactHero.player.shortName} har ${exactHero.exactResults} eksakte resultater og bør kontrolleres for hemmelig tilgang til kampmanus.`,
        }
      : null,
    worst
      ? {
          title: "Rundens tribuneskudd",
          text: `${worst.player.shortName} leverte et tips tabellen teknisk sett var nødt til å registrere.`,
        }
      : null,
  ].filter(Boolean) as Award[];
}
