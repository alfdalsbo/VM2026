import { displayTeamName } from "@/lib/display";
import {
  defaultPrediction,
  describePrediction,
  getPrediction,
  inferPredictionOutcome,
  isMatchLocked,
  isMatchPredictable,
} from "@/lib/scoring";
import type { AppState, Player, PredictionOutcome, WorldCupMatch } from "@/lib/types";

export type PredictionDeadlineSummary = {
  nextMatch: WorldCupMatch | null;
  missingMatches: WorldCupMatch[];
  firstMissingMatch: WorldCupMatch | null;
  deliveredCount: number;
  playerCount: number;
};

export type LockedPredictionDigest = {
  rows: Array<{
    player: Player;
    scoreLabel: string;
    outcome: PredictionOutcome;
    delivered: boolean;
    isViewer: boolean;
  }>;
  outcomeCounts: Record<PredictionOutcome, number>;
  outcomeLabels: Record<PredictionOutcome, string>;
  lonelyScore: {
    playerName: string;
    scoreLabel: string;
  } | null;
};

function activeMatches(state: AppState) {
  return state.matches.filter((match) => match.status !== "cancelled" && match.status !== "postponed");
}

function openPredictionMatches(state: AppState, now = new Date()) {
  return activeMatches(state)
    .filter((match) => isMatchPredictable(match, now))
    .sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt));
}

export function getOpenMissingPredictions(state: AppState, playerId: string, now = new Date()) {
  return openPredictionMatches(state, now).filter((match) => !getPrediction(state, playerId, match.id));
}

export function getPredictionDeadlineSummary(
  state: AppState,
  playerId: string,
  now = new Date(),
): PredictionDeadlineSummary {
  const openMatches = openPredictionMatches(state, now);
  const nextMatch = openMatches[0] ?? null;
  const missingMatches = openMatches.filter((match) => !getPrediction(state, playerId, match.id));

  return {
    nextMatch,
    missingMatches,
    firstMissingMatch: missingMatches[0] ?? null,
    deliveredCount: nextMatch ? state.players.filter((player) => getPrediction(state, player.id, nextMatch.id)).length : 0,
    playerCount: state.players.length,
  };
}

export function getLockedMatchPredictionDigest(
  state: AppState,
  match: WorldCupMatch,
  viewerPlayerId: string,
  now = new Date(),
): LockedPredictionDigest | null {
  if (match.status === "cancelled" || match.status === "postponed") return null;
  if (!isMatchLocked(match, now)) return null;

  const rows = state.players.map((player) => {
    const deliveredPrediction = getPrediction(state, player.id, match.id);
    const prediction = deliveredPrediction ?? defaultPrediction(player.id, match.id);
    const outcome = inferPredictionOutcome(prediction.homeGoals, prediction.awayGoals);

    return {
      player,
      scoreLabel: describePrediction(prediction),
      outcome,
      delivered: Boolean(deliveredPrediction),
      isViewer: player.id === viewerPlayerId,
    };
  });

  const outcomeCounts: Record<PredictionOutcome, number> = {
    home: rows.filter((row) => row.outcome === "home").length,
    draw: rows.filter((row) => row.outcome === "draw").length,
    away: rows.filter((row) => row.outcome === "away").length,
  };

  const scoreCounts = new Map<string, number>();
  for (const row of rows) {
    scoreCounts.set(row.scoreLabel, (scoreCounts.get(row.scoreLabel) ?? 0) + 1);
  }
  const lonelyRows = rows.filter((row) => scoreCounts.get(row.scoreLabel) === 1);
  const lonelyRow = lonelyRows.length === 1 ? lonelyRows[0] : null;

  return {
    rows,
    outcomeCounts,
    outcomeLabels: {
      home: displayTeamName(match.homeTeam),
      draw: "Uavgjort",
      away: displayTeamName(match.awayTeam),
    },
    lonelyScore: lonelyRow
      ? {
          playerName: lonelyRow.player.shortName,
          scoreLabel: lonelyRow.scoreLabel,
        }
      : null,
  };
}
