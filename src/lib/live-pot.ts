import type { AppState, LivePotTip, LiveRedCardPrediction, MatchEvent, Player, WorldCupMatch } from "@/lib/types";
import { SCORE_RULES } from "@/lib/scoring-rules";

export const LIVE_POT_MAX_YELLOW_CARDS = 12;

export type LivePotScore = {
  yellowCards: number;
  redCard: number;
  total: number;
  actualYellowCards: number;
  actualRedCard: boolean;
  settled: boolean;
};

export type LivePotStanding = {
  rank: number;
  player: Player;
  points: number;
  tips: number;
  exactYellows: number;
  redCardHits: number;
};

export function isLivePotOpen(match: WorldCupMatch) {
  return match.status === "live" || match.status === "halftime";
}

export function isLivePotVisible(match: WorldCupMatch, state: AppState) {
  return isLivePotOpen(match) || state.livePotTips.some((tip) => tip.matchId === match.id);
}

export function getLivePotTip(state: AppState, playerId: string, matchId: string) {
  return state.livePotTips.find((tip) => tip.playerId === playerId && tip.matchId === matchId) ?? null;
}

export function countYellowCards(events: MatchEvent[], matchId: string) {
  return events.filter(
    (event) => event.matchId === matchId && (event.type === "yellow_card" || event.type === "second_yellow"),
  ).length;
}

export function hasRedCard(events: MatchEvent[], matchId: string) {
  return events.some(
    (event) => event.matchId === matchId && (event.type === "red_card" || event.type === "second_yellow"),
  );
}

export function scoreLivePotTip(match: WorldCupMatch, tip: LivePotTip | null | undefined, state: AppState): LivePotScore {
  const actualYellowCards = countYellowCards(state.matchEvents, match.id);
  const actualRedCard = hasRedCard(state.matchEvents, match.id);
  const settled = match.status === "finished";

  if (!tip) {
    return {
      yellowCards: 0,
      redCard: 0,
      total: 0,
      actualYellowCards,
      actualRedCard,
      settled,
    };
  }

  const yellowCards = scoreYellowCards(tip.yellowCardsTotal, actualYellowCards, settled);
  const redCard = scoreRedCard(tip.redCard, actualRedCard, settled);

  return {
    yellowCards,
    redCard,
    total: yellowCards + redCard,
    actualYellowCards,
    actualRedCard,
    settled,
  };
}

function scoreYellowCards(predicted: number, actual: number, settled: boolean) {
  const diff = Math.abs(predicted - actual);
  if (settled) {
    if (diff === 0) return SCORE_RULES.bonusTips.yellowExact;
    if (diff === 1) return SCORE_RULES.bonusTips.yellowClose;
    return SCORE_RULES.bonusTips.yellowMiss;
  }

  if (actual > predicted) return SCORE_RULES.bonusTips.yellowMiss;
  if (actual === predicted) return SCORE_RULES.bonusTips.yellowExact;
  if (predicted - actual === 1) return SCORE_RULES.bonusTips.yellowClose;
  return 0;
}

function scoreRedCard(predicted: LiveRedCardPrediction, actual: boolean, settled: boolean) {
  if (actual) return predicted === "yes" ? SCORE_RULES.bonusTips.redCardYesHit : SCORE_RULES.bonusTips.redCardMiss;
  if (settled) return predicted === "no" ? SCORE_RULES.bonusTips.redCardNoHit : SCORE_RULES.bonusTips.redCardMiss;
  return predicted === "no" ? SCORE_RULES.bonusTips.redCardNoHit : 0;
}

export function computeLivePotStandings(state: AppState): LivePotStanding[] {
  const rows = state.players.map((player) => {
    const tips = state.livePotTips.filter((tip) => tip.playerId === player.id);
    let points = 0;
    let exactYellows = 0;
    let redCardHits = 0;

    for (const tip of tips) {
      const match = state.matches.find((item) => item.id === tip.matchId);
      if (!match) continue;
      const score = scoreLivePotTip(match, tip, state);
      points += score.total;
      if (score.yellowCards === 3) exactYellows += 1;
      if ((tip.redCard === "yes" && score.actualRedCard) || (tip.redCard === "no" && score.settled && !score.actualRedCard)) {
        redCardHits += 1;
      }
    }

    return {
      rank: 0,
      player,
      points,
      tips: tips.length,
      exactYellows,
      redCardHits,
    };
  });

  rows.sort((a, b) => {
    return (
      b.points - a.points ||
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

export function saveLivePotTipInState(state: AppState, tip: LivePotTip): AppState {
  const match = state.matches.find((item) => item.id === tip.matchId);
  if (!match) throw new Error("Kampen finnes ikke.");
  if (!isLivePotOpen(match)) throw new Error("Live-bonustips åpner først når kampen er i gang.");
  if (!Number.isInteger(tip.yellowCardsTotal) || tip.yellowCardsTotal < 0 || tip.yellowCardsTotal > LIVE_POT_MAX_YELLOW_CARDS) {
    throw new Error(`Gule kort må være mellom 0 og ${LIVE_POT_MAX_YELLOW_CARDS}.`);
  }
  if (tip.redCard !== "yes" && tip.redCard !== "no") throw new Error("Velg rødt kort eller ikke rødt kort.");

  const livePotTips = state.livePotTips.filter((item) => {
    return !(item.playerId === tip.playerId && item.matchId === tip.matchId);
  });

  return {
    ...state,
    livePotTips: [...livePotTips, tip],
  };
}

export function formatLiveRedCardPrediction(value: LiveRedCardPrediction) {
  return value === "yes" ? "Ja" : "Nei";
}
