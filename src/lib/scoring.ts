import type { AppState, BroadcastInfo, Prediction, PredictionOutcome, ScoreBreakdown, Standing, WorldCupMatch } from "@/lib/types";
import { footballCopy } from "@/lib/football-jargon";

export function inferPredictionOutcome(homeGoals: number, awayGoals: number): PredictionOutcome {
  if (homeGoals > awayGoals) return "home";
  if (awayGoals > homeGoals) return "away";
  return "draw";
}

export function isKnockoutMatch(match: WorldCupMatch) {
  return match.stage !== "group";
}

function actualOutcome(match: WorldCupMatch): PredictionOutcome | "home" | "away" {
  if (!match.result) return "draw";
  const baseOutcome = inferPredictionOutcome(match.result.homeGoals, match.result.awayGoals);
  if (baseOutcome === "draw" && match.result.advancingTeam) return match.result.advancingTeam;
  return baseOutcome;
}

function predictionOutcome(prediction: Prediction): PredictionOutcome | "home" | "away" {
  const baseOutcome = inferPredictionOutcome(prediction.homeGoals, prediction.awayGoals);
  if (baseOutcome !== "draw") return baseOutcome;
  return prediction.knockoutResolution?.winner ?? "draw";
}

function predictionFinalScore(prediction: Prediction) {
  if (prediction.homeGoals === prediction.awayGoals && prediction.knockoutResolution?.method === "extra_time") {
    return {
      homeGoals: prediction.knockoutResolution.homeGoals,
      awayGoals: prediction.knockoutResolution.awayGoals,
    };
  }

  return {
    homeGoals: prediction.homeGoals,
    awayGoals: prediction.awayGoals,
  };
}

export function describePrediction(prediction: Prediction | null | undefined) {
  if (!prediction) return "Ikke levert";
  const base = `${prediction.homeGoals}-${prediction.awayGoals}`;
  if (prediction.homeGoals !== prediction.awayGoals || !prediction.knockoutResolution) return base;
  if (prediction.knockoutResolution.method === "extra_time") {
    return `${base}, ${prediction.knockoutResolution.homeGoals}-${prediction.knockoutResolution.awayGoals} etter ekstraomganger`;
  }
  return `${base}, videre på straffer`;
}

export function validatePredictionForMatch(match: WorldCupMatch, prediction: Prediction) {
  if (prediction.homeGoals !== prediction.awayGoals) return;
  if (!isKnockoutMatch(match)) return;

  if (!prediction.knockoutResolution) {
    throw new Error("Velg vinner etter ekstraomganger eller straffer.");
  }

  if (prediction.knockoutResolution.method === "extra_time") {
    const outcome = inferPredictionOutcome(prediction.knockoutResolution.homeGoals, prediction.knockoutResolution.awayGoals);
    if (outcome === "draw") throw new Error("Stillingen etter ekstraomganger må ha en vinner.");
    if (outcome !== prediction.knockoutResolution.winner) {
      throw new Error("Vinner etter ekstraomganger må stemme med stillingen.");
    }
  }
}

export function isMatchLocked(match: WorldCupMatch, now = new Date()) {
  return new Date(match.kickoffAt).getTime() <= now.getTime();
}

export function scorePrediction(match: WorldCupMatch, prediction?: Prediction | null): ScoreBreakdown {
  if (!prediction || !match.result) {
    return {
      outcome: 0,
      goalDifference: 0,
      exactResult: 0,
      base: 0,
      total: 0,
    };
  }

  const finalPrediction = predictionFinalScore(prediction);
  const outcomePoints = actualOutcome(match) === predictionOutcome(prediction) ? 3 : 0;
  const diffPoints =
    match.result.homeGoals - match.result.awayGoals === finalPrediction.homeGoals - finalPrediction.awayGoals ? 2 : 0;
  const exactPoints =
    match.result.homeGoals === finalPrediction.homeGoals && match.result.awayGoals === finalPrediction.awayGoals ? 5 : 0;
  const base = outcomePoints + diffPoints + exactPoints;
  return {
    outcome: outcomePoints,
    goalDifference: diffPoints,
    exactResult: exactPoints,
    base,
    total: base,
  };
}

export function getPrediction(state: AppState, playerId: string, matchId: string) {
  return state.predictions.find((prediction) => prediction.playerId === playerId && prediction.matchId === matchId) ?? null;
}

export function computeStandings(state: AppState): Standing[] {
  const lastRoundId = [...state.matches]
    .filter((match) => match.result)
    .sort((a, b) => b.kickoffAt.localeCompare(a.kickoffAt))[0]?.roundId;

  const rows = state.players.map((player) => {
    let totalPoints = 0;
    let exactResults = 0;
    let outcomeHits = 0;
    let predictions = 0;
    let lastRoundPoints = 0;

    for (const match of state.matches) {
      const prediction = getPrediction(state, player.id, match.id);
      if (prediction) predictions += 1;
      const score = scorePrediction(match, prediction);
      totalPoints += score.total;
      if (score.exactResult) exactResults += 1;
      if (score.outcome) outcomeHits += 1;
      if (match.roundId === lastRoundId) lastRoundPoints += score.total;
    }

    return {
      rank: 0,
      player,
      totalPoints,
      predictions,
      exactResults,
      outcomeHits,
      roundsWon: 0,
      lastRoundPoints,
    };
  });

  const roundWins = new Map<string, number>();
  for (const round of state.rounds) {
    const roundMatches = state.matches.filter((match) => match.roundId === round.id && match.result);
    if (!roundMatches.length) continue;
    const roundScores = rows.map((row) => {
      const points = roundMatches.reduce((sum, match) => {
        return sum + scorePrediction(match, getPrediction(state, row.player.id, match.id)).total;
      }, 0);
      return { playerId: row.player.id, points };
    });
    const best = Math.max(...roundScores.map((row) => row.points));
    if (best > 0) {
      for (const row of roundScores.filter((score) => score.points === best)) {
        roundWins.set(row.playerId, (roundWins.get(row.playerId) ?? 0) + 1);
      }
    }
  }

  rows.forEach((row) => {
    row.roundsWon = roundWins.get(row.player.id) ?? 0;
  });

  rows.sort((a, b) => {
    return (
      b.totalPoints - a.totalPoints ||
      b.exactResults - a.exactResults ||
      b.outcomeHits - a.outcomeHits ||
      a.player.shortName.localeCompare(b.player.shortName, "nb")
    );
  });

  let previousPoints: number | null = null;
  let previousRank = 0;
  rows.forEach((row, index) => {
    if (row.totalPoints !== previousPoints) previousRank = index + 1;
    row.rank = previousRank;
    previousPoints = row.totalPoints;
  });

  return rows;
}

export function savePredictionInState(
  state: AppState,
  prediction: Prediction,
  now = new Date(),
): AppState {
  const match = state.matches.find((item) => item.id === prediction.matchId);
  if (!match) throw new Error("Kampen finnes ikke.");
  if (isMatchLocked(match, now)) throw new Error(footballCopy.lockError);
  validatePredictionForMatch(match, prediction);

  const predictions = state.predictions.filter((item) => {
    return !(item.playerId === prediction.playerId && item.matchId === prediction.matchId);
  });

  const normalizedPrediction = {
    ...prediction,
    outcome: prediction.outcome ?? inferPredictionOutcome(prediction.homeGoals, prediction.awayGoals),
  };

  return {
    ...state,
    predictions: [...predictions, normalizedPrediction],
  };
}

export function upsertMatchResultInState(
  state: AppState,
  matchId: string,
  result: WorldCupMatch["result"],
  homeTeam?: string,
  awayTeam?: string,
  broadcasts?: BroadcastInfo[],
): AppState {
  return {
    ...state,
    matches: state.matches.map((match) =>
      match.id === matchId
        ? {
            ...match,
            homeTeam: homeTeam?.trim() || match.homeTeam,
            awayTeam: awayTeam?.trim() || match.awayTeam,
            result,
            broadcasts: broadcasts ?? match.broadcasts,
          }
        : match,
    ),
  };
}
