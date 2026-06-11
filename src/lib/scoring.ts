import type { AppState, BroadcastInfo, MatchEvent, Prediction, PredictionOutcome, ScoreBreakdown, Standing, WorldCupMatch } from "@/lib/types";
import { footballCopy } from "@/lib/football-jargon";
import { hasUnresolvedKnockoutTeams, matchupKeyForMatch } from "@/lib/knockout-placeholders";
import { scoreLivePotTip } from "@/lib/live-pot";
import { BONUS_RESULT_AWARD_BRIDGE_ENABLED, BONUS_TIPS_RESULT_AWARDS, BONUS_TIPS_WINNER_AWARD, SCORE_RULES } from "@/lib/scoring-rules";
import { getTournamentBonusPrediction, scoreTournamentBonusPrediction } from "@/lib/tournament-bonus";

export { BONUS_RESULT_AWARD_BRIDGE_ENABLED, BONUS_TIPS_RESULT_AWARDS, BONUS_TIPS_WINNER_AWARD };

export type BonusTipsStanding = {
  rank: number;
  player: Standing["player"];
  points: number;
  matchBonusPoints: number;
  liveBonusPoints: number;
  tournamentBonusPoints: number;
  tips: number;
  tournamentBonusTips: number;
  liveTips: number;
  exactYellows: number;
  redCardHits: number;
  resultAward: number;
};

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
  if (!prediction) return "0-0";
  const base = `${prediction.homeGoals}-${prediction.awayGoals}`;
  if (prediction.homeGoals !== prediction.awayGoals || !prediction.knockoutResolution) return base;
  if (prediction.knockoutResolution.method === "extra_time") {
    return `${base}, ${prediction.knockoutResolution.homeGoals}-${prediction.knockoutResolution.awayGoals} etter ekstraomganger`;
  }
  return `${base}, videre på straffer`;
}

export function defaultPrediction(playerId: string, matchId: string): Prediction {
  return {
    playerId,
    matchId,
    homeGoals: 0,
    awayGoals: 0,
    outcome: "draw",
    matchupKey: null,
    knockoutResolution: null,
    homeScorers: [],
    awayScorers: [],
    homeAssists: [],
    awayAssists: [],
    updatedAt: new Date(0).toISOString(),
  };
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

export function getPredictionUnavailableMessage(match: WorldCupMatch, now = new Date()) {
  if (isMatchLocked(match, now)) return footballCopy.lockError;
  if (hasUnresolvedKnockoutTeams(match)) return footballCopy.knockoutPending;
  return null;
}

export function isMatchPredictable(match: WorldCupMatch, now = new Date()) {
  return getPredictionUnavailableMessage(match, now) === null;
}

export function isPredictionForCurrentMatchup(match: WorldCupMatch, prediction: Prediction | null | undefined) {
  if (!prediction) return false;
  const matchupKey = matchupKeyForMatch(match);
  if (!matchupKey) return match.stage === "group";
  return prediction.matchupKey === matchupKey;
}

export function hasFinalResult(match: WorldCupMatch) {
  return Boolean(match.result && (match.status === "finished" || match.result.source === "manual" || !match.result.source));
}

export function isTournamentComplete(state: AppState) {
  const countedMatches = state.matches.filter((match) => match.status !== "cancelled" && match.status !== "postponed");
  return countedMatches.length > 0 && countedMatches.every(hasFinalResult);
}

export function scorePrediction(
  match: WorldCupMatch,
  prediction?: Prediction | null,
  state?: AppState,
): ScoreBreakdown {
  if (!match.result) {
    return {
      outcome: 0,
      goalDifference: 0,
      exactResult: 0,
      scorer: 0,
      assist: 0,
      base: 0,
      bonus: 0,
      total: 0,
      grandTotal: 0,
    };
  }

  const scoreablePrediction = isPredictionForCurrentMatchup(match, prediction) ? prediction : null;
  const tip = scoreablePrediction ?? defaultPrediction("", match.id);
  const finalPrediction = predictionFinalScore(tip);
  const outcomePoints = actualOutcome(match) === predictionOutcome(tip) ? SCORE_RULES.resultTips.outcome : 0;
  const diffPoints = 0;
  const exactPoints =
    match.result.homeGoals === finalPrediction.homeGoals && match.result.awayGoals === finalPrediction.awayGoals
      ? SCORE_RULES.resultTips.exactResult
      : 0;
  const scorerPoints = state && scoreablePrediction ? scoreScorer(match, scoreablePrediction, state) : 0;
  const assistPoints = state && scoreablePrediction ? scoreAssist(match, scoreablePrediction, state) : 0;
  const base = outcomePoints + diffPoints + exactPoints;
  const bonus = scorerPoints + assistPoints;
  return {
    outcome: outcomePoints,
    goalDifference: diffPoints,
    exactResult: exactPoints,
    scorer: scorerPoints,
    assist: assistPoints,
    base,
    bonus,
    total: base,
    grandTotal: base + bonus,
  };
}

function findSquadPlayerName(state: AppState, playerId: string | null | undefined): string | null {
  if (!playerId) return null;
  for (const profile of state.teamProfiles) {
    const found = profile.squad.find((player) => player.id === playerId && player.source !== "placeholder");
    if (found) return found.name;
  }
  return null;
}

function matchGoalEvents(state: AppState, matchId: string, side: "home" | "away"): MatchEvent[] {
  return state.matchEvents.filter(
    (event) =>
      event.matchId === matchId &&
      event.teamSide === side &&
      (event.type === "goal" || event.type === "penalty_goal"),
  );
}

function countPredictedByName(state: AppState, predictedIds: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const id of predictedIds) {
    const name = findSquadPlayerName(state, id);
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return counts;
}

function sumHits(predicted: Map<string, number>, actual: Map<string, number>): number {
  let hits = 0;
  for (const [name, predictedCount] of predicted) {
    const actualCount = actual.get(name) ?? 0;
    hits += Math.min(predictedCount, actualCount);
  }
  return hits;
}

function scoreScorer(match: WorldCupMatch, prediction: Prediction, state: AppState): number {
  let hits = 0;
  for (const side of ["home", "away"] as const) {
    const predictedIds = side === "home" ? prediction.homeScorers ?? [] : prediction.awayScorers ?? [];
    if (!predictedIds.length) continue;
    const predicted = countPredictedByName(state, predictedIds);
    const actual = new Map<string, number>();
    for (const event of matchGoalEvents(state, match.id, side)) {
      if (!event.playerName) continue;
      actual.set(event.playerName, (actual.get(event.playerName) ?? 0) + 1);
    }
    hits += sumHits(predicted, actual);
  }
  return hits * SCORE_RULES.bonusTips.scorer;
}

function scoreAssist(match: WorldCupMatch, prediction: Prediction, state: AppState): number {
  let hits = 0;
  for (const side of ["home", "away"] as const) {
    const predictedIds = side === "home" ? prediction.homeAssists ?? [] : prediction.awayAssists ?? [];
    if (!predictedIds.length) continue;
    const predicted = countPredictedByName(state, predictedIds);
    const actual = new Map<string, number>();
    for (const event of matchGoalEvents(state, match.id, side)) {
      if (!event.assistPlayerName) continue;
      actual.set(event.assistPlayerName, (actual.get(event.assistPlayerName) ?? 0) + 1);
    }
    hits += sumHits(predicted, actual);
  }
  return hits * SCORE_RULES.bonusTips.assist;
}

export function getPrediction(state: AppState, playerId: string, matchId: string) {
  const match = state.matches.find((item) => item.id === matchId);
  const prediction = state.predictions.find((item) => item.playerId === playerId && item.matchId === matchId) ?? null;
  if (!match || !prediction) return null;
  return isPredictionForCurrentMatchup(match, prediction) ? prediction : null;
}

export function getPredictionOrDefault(state: AppState, playerId: string, matchId: string) {
  return getPrediction(state, playerId, matchId) ?? defaultPrediction(playerId, matchId);
}

export function computeStandings(state: AppState): Standing[] {
  const lastRoundId = [...state.matches]
    .filter(hasFinalResult)
    .sort((a, b) => b.kickoffAt.localeCompare(a.kickoffAt))[0]?.roundId;

  const rows = state.players.map((player) => {
    let resultTipPoints = 0;
    let matchBonusPoints = 0;
    let liveBonusPoints = 0;
    let tournamentBonusPoints = 0;
    let exactResults = 0;
    let outcomeHits = 0;
    let predictions = 0;
    let bonusTips = 0;
    let tournamentBonusTips = 0;
    let liveTips = 0;
    let liveExactYellows = 0;
    let liveRedCardHits = 0;
    let lastRoundPoints = 0;

    for (const match of state.matches) {
      const prediction = getPrediction(state, player.id, match.id);
      const scoreablePrediction = prediction ?? defaultPrediction(player.id, match.id);
      if (match.status !== "cancelled" && match.status !== "postponed") predictions += 1;
      if (
        prediction?.homeScorers?.length ||
        prediction?.awayScorers?.length ||
        prediction?.homeAssists?.length ||
        prediction?.awayAssists?.length
      ) {
        bonusTips += 1;
      }
      if (!hasFinalResult(match)) continue;
      const score = scorePrediction(match, scoreablePrediction, state);
      resultTipPoints += score.total;
      matchBonusPoints += score.bonus;
      if (score.exactResult) exactResults += 1;
      if (score.outcome) outcomeHits += 1;
      if (match.roundId === lastRoundId) lastRoundPoints += score.total;
    }

    for (const tip of state.livePotTips.filter((item) => item.playerId === player.id)) {
      const match = state.matches.find((item) => item.id === tip.matchId);
      if (!match) continue;
      const score = scoreLivePotTip(match, tip, state);
      liveBonusPoints += score.total;
      liveTips += 1;
      bonusTips += 1;
      if (score.yellowCards === SCORE_RULES.bonusTips.yellowExact) liveExactYellows += 1;
      if (score.redCards === SCORE_RULES.bonusTips.redExact) {
        liveRedCardHits += 1;
      }
    }

    const tournamentBonusPrediction = getTournamentBonusPrediction(state, player.id);
    if (tournamentBonusPrediction) {
      tournamentBonusPoints = scoreTournamentBonusPrediction(state, tournamentBonusPrediction).total;
      tournamentBonusTips = 1;
      bonusTips += 1;
    }

    const bonusPoints = matchBonusPoints + liveBonusPoints + tournamentBonusPoints;

    return {
      rank: 0,
      player,
      totalPoints: resultTipPoints,
      resultTipPoints,
      bonusPoints,
      matchBonusPoints,
      liveBonusPoints,
      tournamentBonusPoints,
      bonusWinnerAward: 0,
      bonusAwardPreview: 0,
      bonusTips,
      tournamentBonusTips,
      liveTips,
      liveExactYellows,
      liveRedCardHits,
      predictions,
      exactResults,
      outcomeHits,
      roundsWon: 0,
      lastRoundPoints,
    };
  });

  if (BONUS_RESULT_AWARD_BRIDGE_ENABLED) {
    applyBonusResultAwardBridge(rows, isTournamentComplete(state));
  }

  const roundWins = new Map<string, number>();
  for (const round of state.rounds) {
    const roundMatches = state.matches.filter((match) => match.roundId === round.id && hasFinalResult(match));
    if (!roundMatches.length) continue;
    const roundScores = rows.map((row) => {
      const points = roundMatches.reduce((sum, match) => {
        return sum + scorePrediction(match, getPredictionOrDefault(state, row.player.id, match.id), state).total;
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

export function computeBonusTipStandings(state: AppState): BonusTipsStanding[] {
  const rows = computeStandings(state).map((row) => ({
    rank: 0,
    player: row.player,
    points: row.bonusPoints,
    matchBonusPoints: row.matchBonusPoints,
    liveBonusPoints: row.liveBonusPoints,
    tournamentBonusPoints: row.tournamentBonusPoints,
    tips: row.bonusTips,
    tournamentBonusTips: row.tournamentBonusTips,
    liveTips: row.liveTips,
    exactYellows: row.liveExactYellows,
    redCardHits: row.liveRedCardHits,
    resultAward: row.bonusWinnerAward,
  }));

  rows.sort((a, b) => {
    return (
      b.points - a.points ||
      b.matchBonusPoints - a.matchBonusPoints ||
      b.liveBonusPoints - a.liveBonusPoints ||
      b.tournamentBonusPoints - a.tournamentBonusPoints ||
      b.exactYellows - a.exactYellows ||
      b.redCardHits - a.redCardHits ||
      a.player.shortName.localeCompare(b.player.shortName, "nb")
    );
  });

  let previousPoints: number | null = null;
  let previousRank = 0;
  rows.forEach((row, index) => {
    if (row.points !== previousPoints) previousRank = index + 1;
    row.rank = previousRank;
    previousPoints = row.points;
  });

  return rows;
}

function bonusResultAwardForRank(rank: number) {
  return BONUS_TIPS_RESULT_AWARDS[rank - 1] ?? 0;
}

function applyBonusResultAwardBridge(rows: Standing[], tournamentComplete: boolean) {
  const bonusRows = rows
    .filter((row) => row.bonusTips > 0 && row.bonusPoints > 0)
    .sort((a, b) => {
      return (
        b.bonusPoints - a.bonusPoints ||
        b.matchBonusPoints - a.matchBonusPoints ||
        b.liveBonusPoints - a.liveBonusPoints ||
        b.tournamentBonusPoints - a.tournamentBonusPoints ||
        b.liveExactYellows - a.liveExactYellows ||
        b.liveRedCardHits - a.liveRedCardHits ||
        a.player.shortName.localeCompare(b.player.shortName, "nb")
      );
    });
  let previousPoints: number | null = null;
  let previousRank = 0;

  bonusRows.forEach((row, index) => {
    if (row.bonusPoints !== previousPoints) previousRank = index + 1;
    const award = bonusResultAwardForRank(previousRank);
    row.bonusAwardPreview = award;
    if (tournamentComplete) {
      row.bonusWinnerAward = award;
      row.totalPoints = row.resultTipPoints + row.bonusWinnerAward;
    }
    previousPoints = row.bonusPoints;
  });
}

export function savePredictionInState(
  state: AppState,
  prediction: Prediction,
  now = new Date(),
): AppState {
  const match = state.matches.find((item) => item.id === prediction.matchId);
  if (!match) throw new Error("Kampen finnes ikke.");
  const unavailableMessage = getPredictionUnavailableMessage(match, now);
  if (unavailableMessage) throw new Error(unavailableMessage);
  validatePredictionForMatch(match, prediction);

  const predictions = state.predictions.filter((item) => {
    return !(item.playerId === prediction.playerId && item.matchId === prediction.matchId);
  });

  const normalizedPrediction = {
    ...prediction,
    outcome: prediction.outcome ?? inferPredictionOutcome(prediction.homeGoals, prediction.awayGoals),
    matchupKey: matchupKeyForMatch(match),
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

export function computeProjectedStandings(state: AppState, matchIds: string[]): Standing[] {
  const projectedIds = new Set(matchIds);
  const matches = state.matches.map((match) => {
    if (!projectedIds.has(match.id) || !match.result) return match;
    if (match.status !== "live" && match.status !== "halftime") return match;
    return {
      ...match,
      status: "finished" as const,
    };
  });

  return computeStandings({
    ...state,
    matches,
  });
}

export function compareStandings(base: Standing[], projected: Standing[]) {
  const baseByPlayer = new Map(base.map((row) => [row.player.id, row]));
  return projected.map((row) => {
    const before = baseByPlayer.get(row.player.id);
    return {
      ...row,
      baseRank: before?.rank ?? row.rank,
      basePoints: before?.totalPoints ?? 0,
      rankDelta: (before?.rank ?? row.rank) - row.rank,
      pointsDelta: row.totalPoints - (before?.totalPoints ?? 0),
    };
  });
}
