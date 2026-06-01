import type { AppState, LivePotTip, MatchEvent, Player, WorldCupMatch } from "@/lib/types";
import { footballCopy } from "@/lib/football-jargon";
import { hasUnresolvedKnockoutTeams } from "@/lib/knockout-placeholders";
import { SCORE_RULES } from "@/lib/scoring-rules";

export const LIVE_POT_MAX_YELLOW_CARDS = 12;
export const LIVE_POT_MAX_RED_CARDS = 5;

export type LivePotScore = {
  yellowCards: number;
  redCards: number;
  total: number;
  actualYellowCards: number;
  actualRedCards: number;
  settled: boolean;
};

export type LivePotStanding = {
  rank: number;
  player: Player;
  points: number;
  tips: number;
  exactYellows: number;
  exactReds: number;
};

export function isLivePotOpen(match: WorldCupMatch, now = new Date()) {
  return (
    !hasUnresolvedKnockoutTeams(match) &&
    new Date(match.kickoffAt).getTime() > now.getTime() &&
    match.status !== "cancelled" &&
    match.status !== "postponed"
  );
}

export function isLivePotVisible(match: WorldCupMatch, state: AppState) {
  if (hasUnresolvedKnockoutTeams(match)) return false;
  return isLivePotOpen(match) || match.status === "live" || match.status === "halftime" || state.livePotTips.some((tip) => tip.matchId === match.id);
}

export function getLivePotTip(state: AppState, playerId: string, matchId: string) {
  return state.livePotTips.find((tip) => tip.playerId === playerId && tip.matchId === matchId) ?? null;
}

export function countYellowCards(events: MatchEvent[], matchId: string) {
  return events.filter(
    (event) => event.matchId === matchId && (event.type === "yellow_card" || event.type === "second_yellow"),
  ).length;
}

export function countRedCards(events: MatchEvent[], matchId: string) {
  return events.filter(
    (event) => event.matchId === matchId && (event.type === "red_card" || event.type === "second_yellow"),
  ).length;
}

export function scoreLivePotTip(match: WorldCupMatch, tip: LivePotTip | null | undefined, state: AppState): LivePotScore {
  const actualYellowCards = countYellowCards(state.matchEvents, match.id);
  const actualRedCards = countRedCards(state.matchEvents, match.id);
  const settled = match.status === "finished";
  const scoreVisible = settled || match.status === "live" || match.status === "halftime";

  if (!tip || !scoreVisible) {
    return {
      yellowCards: 0,
      redCards: 0,
      total: 0,
      actualYellowCards,
      actualRedCards,
      settled,
    };
  }

  const yellowCards = scoreYellowCards(tip.yellowCardsTotal, actualYellowCards, settled);
  const redCards = scoreRedCards(tip.redCardsTotal, actualRedCards, settled);

  return {
    yellowCards,
    redCards,
    total: yellowCards + redCards,
    actualYellowCards,
    actualRedCards,
    settled,
  };
}

function scoreYellowCards(predicted: number, actual: number, settled: boolean) {
  if (settled || actual >= predicted) return predicted === actual ? SCORE_RULES.bonusTips.yellowExact : 0;
  if (actual === predicted) return SCORE_RULES.bonusTips.yellowExact;
  return 0;
}

function scoreRedCards(predicted: number, actual: number, settled: boolean) {
  if (settled || actual >= predicted) return predicted === actual ? SCORE_RULES.bonusTips.redExact : 0;
  if (actual === predicted) return SCORE_RULES.bonusTips.redExact;
  return 0;
}

export function computeLivePotStandings(state: AppState): LivePotStanding[] {
  const rows = state.players.map((player) => {
    const tips = state.livePotTips.filter((tip) => tip.playerId === player.id);
    let points = 0;
    let exactYellows = 0;
    let exactReds = 0;

    for (const tip of tips) {
      const match = state.matches.find((item) => item.id === tip.matchId);
      if (!match) continue;
      const score = scoreLivePotTip(match, tip, state);
      points += score.total;
      if (score.yellowCards === SCORE_RULES.bonusTips.yellowExact) exactYellows += 1;
      if (score.redCards === SCORE_RULES.bonusTips.redExact) exactReds += 1;
    }

    return {
      rank: 0,
      player,
      points,
      tips: tips.length,
      exactYellows,
      exactReds,
    };
  });

  rows.sort((a, b) => {
    return (
      b.points - a.points ||
      b.exactYellows - a.exactYellows ||
      b.exactReds - a.exactReds ||
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
  if (hasUnresolvedKnockoutTeams(match)) throw new Error(footballCopy.knockoutPending);
  if (!isLivePotOpen(match)) throw new Error("Bonustips låses ved kampstart.");
  if (!Number.isInteger(tip.yellowCardsTotal) || tip.yellowCardsTotal < 0 || tip.yellowCardsTotal > LIVE_POT_MAX_YELLOW_CARDS) {
    throw new Error(`Gule kort må være mellom 0 og ${LIVE_POT_MAX_YELLOW_CARDS}.`);
  }
  if (!Number.isInteger(tip.redCardsTotal) || tip.redCardsTotal < 0 || tip.redCardsTotal > LIVE_POT_MAX_RED_CARDS) {
    throw new Error(`Røde kort må være mellom 0 og ${LIVE_POT_MAX_RED_CARDS}.`);
  }

  const livePotTips = state.livePotTips.filter((item) => {
    return !(item.playerId === tip.playerId && item.matchId === tip.matchId);
  });

  return {
    ...state,
    livePotTips: [...livePotTips, tip],
  };
}

export function formatLiveRedCardsPrediction(value: number) {
  return `${value} ${value === 1 ? "rødt" : "røde"}`;
}
