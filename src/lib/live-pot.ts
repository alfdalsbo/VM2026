import type { AppState, LivePotTip, MatchEvent, Player, TeamSide, WorldCupMatch } from "@/lib/types";
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
  actualHomeYellowCards: number;
  actualAwayYellowCards: number;
  actualHomeRedCards: number;
  actualAwayRedCards: number;
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

export function countYellowCards(events: MatchEvent[], matchId: string, side?: TeamSide) {
  return events.filter(
    (event) =>
      event.matchId === matchId &&
      (!side || event.teamSide === side) &&
      (event.type === "yellow_card" || event.type === "second_yellow"),
  ).length;
}

export function countRedCards(events: MatchEvent[], matchId: string, side?: TeamSide) {
  return events.filter(
    (event) =>
      event.matchId === matchId &&
      (!side || event.teamSide === side) &&
      (event.type === "red_card" || event.type === "second_yellow"),
  ).length;
}

export function hasTeamCardDistribution(tip: LivePotTip | null | undefined) {
  return Boolean(
    tip &&
      Number.isInteger(tip.homeYellowCardsTotal) &&
      Number.isInteger(tip.awayYellowCardsTotal) &&
      Number.isInteger(tip.homeRedCardsTotal) &&
      Number.isInteger(tip.awayRedCardsTotal),
  );
}

export function getLivePotCardTotals(tip: LivePotTip) {
  if (hasTeamCardDistribution(tip)) {
    return {
      yellowCardsTotal: tip.homeYellowCardsTotal! + tip.awayYellowCardsTotal!,
      redCardsTotal: tip.homeRedCardsTotal! + tip.awayRedCardsTotal!,
      homeYellowCardsTotal: tip.homeYellowCardsTotal!,
      awayYellowCardsTotal: tip.awayYellowCardsTotal!,
      homeRedCardsTotal: tip.homeRedCardsTotal!,
      awayRedCardsTotal: tip.awayRedCardsTotal!,
    };
  }

  return {
    yellowCardsTotal: tip.yellowCardsTotal,
    redCardsTotal: tip.redCardsTotal,
    homeYellowCardsTotal: null,
    awayYellowCardsTotal: null,
    homeRedCardsTotal: null,
    awayRedCardsTotal: null,
  };
}

export function scoreLivePotTip(match: WorldCupMatch, tip: LivePotTip | null | undefined, state: AppState): LivePotScore {
  const actualYellowCards = countYellowCards(state.matchEvents, match.id);
  const actualRedCards = countRedCards(state.matchEvents, match.id);
  const actualHomeYellowCards = countYellowCards(state.matchEvents, match.id, "home");
  const actualAwayYellowCards = countYellowCards(state.matchEvents, match.id, "away");
  const actualHomeRedCards = countRedCards(state.matchEvents, match.id, "home");
  const actualAwayRedCards = countRedCards(state.matchEvents, match.id, "away");
  const settled = match.status === "finished";
  const scoreVisible = settled || match.status === "live" || match.status === "halftime";

  if (!tip || !scoreVisible) {
    return {
      yellowCards: 0,
      redCards: 0,
      total: 0,
      actualYellowCards,
      actualRedCards,
      actualHomeYellowCards,
      actualAwayYellowCards,
      actualHomeRedCards,
      actualAwayRedCards,
      settled,
    };
  }

  const totals = getLivePotCardTotals(tip);
  const yellowCards = hasTeamCardDistribution(tip)
    ? scoreDistributedCards(
        totals.homeYellowCardsTotal!,
        totals.awayYellowCardsTotal!,
        actualHomeYellowCards,
        actualAwayYellowCards,
        settled,
        SCORE_RULES.bonusTips.yellowExact,
      )
    : scoreYellowCards(totals.yellowCardsTotal, actualYellowCards, settled);
  const redCards = hasTeamCardDistribution(tip)
    ? scoreDistributedCards(
        totals.homeRedCardsTotal!,
        totals.awayRedCardsTotal!,
        actualHomeRedCards,
        actualAwayRedCards,
        settled,
        SCORE_RULES.bonusTips.redExact,
      )
    : scoreRedCards(totals.redCardsTotal, actualRedCards, settled);

  return {
    yellowCards,
    redCards,
    total: yellowCards + redCards,
    actualYellowCards,
    actualRedCards,
    actualHomeYellowCards,
    actualAwayYellowCards,
    actualHomeRedCards,
    actualAwayRedCards,
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

function scoreDistributedCards(
  predictedHome: number,
  predictedAway: number,
  actualHome: number,
  actualAway: number,
  settled: boolean,
  points: number,
) {
  if (settled || actualHome >= predictedHome || actualAway >= predictedAway) {
    return predictedHome === actualHome && predictedAway === actualAway ? points : 0;
  }
  if (predictedHome === actualHome && predictedAway === actualAway) return points;
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
  const hasAnyDistribution =
    tip.homeYellowCardsTotal !== undefined ||
    tip.awayYellowCardsTotal !== undefined ||
    tip.homeRedCardsTotal !== undefined ||
    tip.awayRedCardsTotal !== undefined;
  if (hasAnyDistribution && !hasTeamCardDistribution(tip)) {
    throw new Error("Kortbonusen må fordeles på begge lag.");
  }
  const normalizedTip = hasTeamCardDistribution(tip)
    ? {
        ...tip,
        yellowCardsTotal: tip.homeYellowCardsTotal! + tip.awayYellowCardsTotal!,
        redCardsTotal: tip.homeRedCardsTotal! + tip.awayRedCardsTotal!,
      }
    : tip;

  if (!Number.isInteger(normalizedTip.yellowCardsTotal) || normalizedTip.yellowCardsTotal < 0 || normalizedTip.yellowCardsTotal > LIVE_POT_MAX_YELLOW_CARDS) {
    throw new Error(`Gule kort må være mellom 0 og ${LIVE_POT_MAX_YELLOW_CARDS}.`);
  }
  if (!Number.isInteger(normalizedTip.redCardsTotal) || normalizedTip.redCardsTotal < 0 || normalizedTip.redCardsTotal > LIVE_POT_MAX_RED_CARDS) {
    throw new Error(`Røde kort må være mellom 0 og ${LIVE_POT_MAX_RED_CARDS}.`);
  }
  if (
    hasTeamCardDistribution(normalizedTip) &&
    (!validCardShare(normalizedTip.homeYellowCardsTotal!, LIVE_POT_MAX_YELLOW_CARDS) ||
      !validCardShare(normalizedTip.awayYellowCardsTotal!, LIVE_POT_MAX_YELLOW_CARDS) ||
      !validCardShare(normalizedTip.homeRedCardsTotal!, LIVE_POT_MAX_RED_CARDS) ||
      !validCardShare(normalizedTip.awayRedCardsTotal!, LIVE_POT_MAX_RED_CARDS))
  ) {
    throw new Error("Kortene må være hele tall innenfor bonusgrensene.");
  }

  const livePotTips = state.livePotTips.filter((item) => {
    return !(item.playerId === normalizedTip.playerId && item.matchId === normalizedTip.matchId);
  });

  return {
    ...state,
    livePotTips: [...livePotTips, normalizedTip],
  };
}

function validCardShare(value: number, max: number) {
  return Number.isInteger(value) && value >= 0 && value <= max;
}

export function formatLiveRedCardsPrediction(value: number) {
  return `${value} ${value === 1 ? "rødt" : "røde"}`;
}
