import type { AppState, BroadcastInfo, Prediction, PredictionOutcome, ScoreBreakdown, Standing, WorldCupMatch } from "@/lib/types";

export function inferPredictionOutcome(homeGoals: number, awayGoals: number): PredictionOutcome {
  if (homeGoals > awayGoals) return "home";
  if (awayGoals > homeGoals) return "away";
  return "draw";
}

export function sutLabel(outcome: PredictionOutcome) {
  if (outcome === "home") return "S";
  if (outcome === "draw") return "U";
  return "T";
}

function resolvedOutcome(
  homeGoals: number,
  awayGoals: number,
  advancingTeam: "home" | "away" | null,
) {
  const baseOutcome = inferPredictionOutcome(homeGoals, awayGoals);
  if (baseOutcome === "draw" && advancingTeam) return advancingTeam;
  return baseOutcome;
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
      jokerApplied: false,
    };
  }

  const actualOutcome = resolvedOutcome(
    match.result.homeGoals,
    match.result.awayGoals,
    match.result.advancingTeam,
  );
  const predictedOutcome = resolvedOutcome(
    prediction.homeGoals,
    prediction.awayGoals,
    prediction.advancingTeam,
  );
  const outcomePoints = actualOutcome === predictedOutcome ? 3 : 0;
  const diffPoints =
    match.result.homeGoals - match.result.awayGoals === prediction.homeGoals - prediction.awayGoals ? 2 : 0;
  const exactPoints =
    match.result.homeGoals === prediction.homeGoals && match.result.awayGoals === prediction.awayGoals ? 5 : 0;
  const base = outcomePoints + diffPoints + exactPoints;
  return {
    outcome: outcomePoints,
    goalDifference: diffPoints,
    exactResult: exactPoints,
    base,
    total: prediction.joker ? base * 2 : base,
    jokerApplied: prediction.joker,
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
    let jokerHits = 0;
    let jokerPoints = 0;
    let predictions = 0;
    let lastRoundPoints = 0;

    for (const match of state.matches) {
      const prediction = getPrediction(state, player.id, match.id);
      if (prediction) predictions += 1;
      const score = scorePrediction(match, prediction);
      totalPoints += score.total;
      if (score.exactResult) exactResults += 1;
      if (score.outcome) outcomeHits += 1;
      if (score.jokerApplied && score.base > 0) jokerHits += 1;
      if (score.jokerApplied) jokerPoints += score.base;
      if (match.roundId === lastRoundId) lastRoundPoints += score.total;
    }

    return {
      rank: 0,
      player,
      totalPoints,
      predictions,
      exactResults,
      outcomeHits,
      jokerHits,
      jokerPoints,
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
  if (isMatchLocked(match, now)) throw new Error("Tipsfristen er passert.");

  const predictions = state.predictions.filter((item) => {
    const samePrediction = item.playerId === prediction.playerId && item.matchId === prediction.matchId;
    const sameRoundJoker =
      prediction.joker &&
      item.playerId === prediction.playerId &&
      state.matches.find((matchItem) => matchItem.id === item.matchId)?.roundId === match.roundId;
    return !samePrediction && !sameRoundJoker;
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
