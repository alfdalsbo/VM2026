import { isLivePotOpen, saveLivePotTipInState } from "@/lib/live-pot";
import { getRealSquadPlayerIds, getRealSquadPlayers, realSquadPlayers } from "@/lib/bonus-player-options";
import { sanitizeGoalBonusSlots } from "@/lib/match-bonus-slots";
import { getPrediction, savePredictionInState } from "@/lib/scoring";
import type { AppState, LivePotTip, Prediction, TeamSquadPlayer, WorldCupMatch } from "@/lib/types";

export const BONUS_AUTOFILL_ALL_OPEN = "__all_open__";
export const BONUS_AUTOFILL_PREDICTED_OPEN = "__all_predicted_open__";

export type BonusAutofillSource = "odds" | "fallback";

type OddsPick = {
  playerId?: string;
  playerName?: string;
  weight?: number;
  odds?: number;
};

type MatchBonusOdds = {
  source: "odds";
  homeScorers?: OddsPick[];
  awayScorers?: OddsPick[];
  homeAssists?: OddsPick[];
  awayAssists?: OddsPick[];
  yellowCardsTotal?: number;
  redCardsTotal?: number;
  homeYellowCardsTotal?: number;
  awayYellowCardsTotal?: number;
  homeRedCardsTotal?: number;
  awayRedCardsTotal?: number;
};

type CandidatePool = {
  source: BonusAutofillSource;
  candidates: Array<{ id: string; weight: number }>;
};

const ODDS_WEIGHT_MULTIPLIER = 100;
const ODDS_FALLBACK_WEIGHT_MULTIPLIER = 0.01;

export type BonusAutofillResult = {
  source: BonusAutofillSource;
  homeScorers: string[];
  awayScorers: string[];
  homeAssists: string[];
  awayAssists: string[];
  yellowCardsTotal: number;
  redCardsTotal: number;
  homeYellowCardsTotal: number;
  awayYellowCardsTotal: number;
  homeRedCardsTotal: number;
  awayRedCardsTotal: number;
};

export type BonusAutofillSummary = {
  source: BonusAutofillSource;
  matchesTouched: number;
  playerSlotsFilled: number;
  cardTipsFilled: number;
};

export function getPredictedOpenMatchIdsForBonusAutofill(
  state: AppState,
  playerId: string,
  now = new Date(),
) {
  return state.matches
    .filter((match) => isLivePotOpen(match, now) && Boolean(getPrediction(state, playerId, match.id)))
    .map((match) => match.id);
}

function hashNumber(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normalizeName(value: string) {
  return value.toLocaleLowerCase("nb").replace(/\s+/g, " ").trim();
}

function clampInteger(value: number | undefined, fallback: number, min: number, max: number) {
  if (typeof value !== "number" || !Number.isInteger(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

function splitCards(total: number, seed: string) {
  if (total <= 0) return { home: 0, away: 0 };
  const drift = (hashNumber(seed) % 3) - 1;
  const home = Math.max(0, Math.min(total, Math.floor(total / 2) + drift + (total % 2)));
  return { home, away: total - home };
}

function splitCardsWithOdds(total: number, seed: string, homeValue?: number, awayValue?: number) {
  const fallback = splitCards(total, seed);
  const hasHome = Number.isInteger(homeValue);
  const hasAway = Number.isInteger(awayValue);
  if (!hasHome && !hasAway) return fallback;

  if (hasHome && !hasAway) {
    const home = clampInteger(homeValue, fallback.home, 0, total);
    return { home, away: total - home };
  }

  if (!hasHome && hasAway) {
    const away = clampInteger(awayValue, fallback.away, 0, total);
    return { home: total - away, away };
  }

  const home = clampInteger(homeValue, fallback.home, 0, total);
  const away = clampInteger(awayValue, total - home, 0, total - home);
  return { home, away };
}

function fallbackWeight(player: TeamSquadPlayer, kind: "scorer" | "assist") {
  const position = player.position;
  const goals = player.goals ?? 0;
  const assists = player.assists ?? 0;

  if (kind === "scorer") {
    const positionWeight = position === "forward" ? 8 : position === "midfielder" ? 4 : position === "defender" ? 1.8 : 0.4;
    return positionWeight + goals * 1.4 + assists * 0.2;
  }

  const positionWeight = position === "midfielder" ? 7 : position === "forward" ? 4.5 : position === "defender" ? 2.2 : 0.3;
  return positionWeight + assists * 1.5 + goals * 0.25;
}

function oddsWeight(pick: OddsPick) {
  if (typeof pick.weight === "number" && pick.weight > 0) return pick.weight;
  if (typeof pick.odds === "number" && pick.odds > 1) return 1 / pick.odds;
  return 0;
}

function resolveOddsPlayer(pick: OddsPick, squad: TeamSquadPlayer[]) {
  if (pick.playerId && squad.some((player) => player.id === pick.playerId)) return pick.playerId;
  if (!pick.playerName) return null;
  const target = normalizeName(pick.playerName);
  return squad.find((player) => normalizeName(player.name) === target || normalizeName(player.shortName ?? "") === target)?.id ?? null;
}

function dedupeCandidates(candidates: Array<{ id: string; weight: number }>) {
  const byId = new Map<string, number>();
  for (const candidate of candidates) {
    if (candidate.weight <= 0) continue;
    byId.set(candidate.id, Math.max(byId.get(candidate.id) ?? 0, candidate.weight));
  }
  return Array.from(byId, ([id, weight]) => ({ id, weight }));
}

function weightedPick(
  candidates: Array<{ id: string; weight: number }>,
  seed: string,
  excludedIds = new Set<string>(),
) {
  const usable = candidates.filter((candidate) => candidate.weight > 0 && !excludedIds.has(candidate.id));
  if (!usable.length) return null;
  const total = usable.reduce((sum, candidate) => sum + candidate.weight, 0);
  const target = (hashNumber(seed) / 0xffffffff) * total;
  let cursor = 0;
  for (const candidate of usable) {
    cursor += candidate.weight;
    if (target <= cursor) return candidate.id;
  }
  return usable.at(-1)?.id ?? null;
}

function candidatePool({
  squad,
  odds,
  kind,
}: {
  squad: TeamSquadPlayer[];
  odds: OddsPick[] | undefined;
  kind: "scorer" | "assist";
}) {
  const realSquad = realSquadPlayers(squad);
  const fallbackCandidates = dedupeCandidates(
    realSquad.map((player) => ({
      id: player.id,
      weight: fallbackWeight(player, kind),
    })),
  );
  const oddsCandidates = dedupeCandidates(
    (odds ?? [])
    .map((pick) => {
      const id = resolveOddsPlayer(pick, realSquad);
      return id ? { id, weight: oddsWeight(pick) } : null;
    })
      .filter((candidate): candidate is { id: string; weight: number } => Boolean(candidate)),
  );

  if (oddsCandidates.length) {
    return {
      source: "odds",
      candidates: dedupeCandidates([
        ...oddsCandidates.map((candidate) => ({
          ...candidate,
          weight: candidate.weight * ODDS_WEIGHT_MULTIPLIER,
        })),
        ...fallbackCandidates.map((candidate) => ({
          ...candidate,
          weight: candidate.weight * ODDS_FALLBACK_WEIGHT_MULTIPLIER,
        })),
      ]),
    } satisfies CandidatePool;
  }

  return {
    source: "fallback",
    candidates: fallbackCandidates,
  };
}

function chooseGoalBonusPlayers({
  squad,
  scorerOdds,
  assistOdds,
  slots,
  seed,
}: {
  squad: TeamSquadPlayer[];
  scorerOdds: OddsPick[] | undefined;
  assistOdds: OddsPick[] | undefined;
  slots: number;
  seed: string;
}) {
  const scorerCandidates = candidatePool({ squad, odds: scorerOdds, kind: "scorer" });
  const assistCandidates = candidatePool({ squad, odds: assistOdds, kind: "assist" });
  const usedScorers = new Set<string>();
  const usedAssists = new Set<string>();
  const scorers: string[] = [];
  const assists: string[] = [];

  for (let index = 0; index < slots; index += 1) {
    const scorer =
      weightedPick(scorerCandidates.candidates, `${seed}:scorer:${index}`, usedScorers) ??
      weightedPick(scorerCandidates.candidates, `${seed}:scorer:${index}:repeat`);

    if (scorer) {
      scorers.push(scorer);
      usedScorers.add(scorer);
    }

    const freshAssistExclusions = new Set(usedAssists);
    if (scorer) freshAssistExclusions.add(scorer);
    const repeatAssistExclusions = new Set<string>();
    if (scorer) repeatAssistExclusions.add(scorer);

    const assist =
      weightedPick(assistCandidates.candidates, `${seed}:assist:${index}`, freshAssistExclusions) ??
      weightedPick(assistCandidates.candidates, `${seed}:assist:${index}:repeat`, repeatAssistExclusions);

    if (assist) {
      assists.push(assist);
      usedAssists.add(assist);
    }
  }

  return {
    source: slots > 0 && (scorerCandidates.source === "odds" || assistCandidates.source === "odds") ? "odds" : "fallback",
    scorers,
    assists,
  };
}

async function fetchConfiguredOdds(match: WorldCupMatch): Promise<MatchBonusOdds | null> {
  const url = process.env.BONUS_ODDS_URL;
  if (!url) return null;

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    const payload = (await response.json()) as { matches?: Record<string, MatchBonusOdds> };
    const odds = payload.matches?.[match.id] ?? null;
    return odds ? { ...odds, source: "odds" } : null;
  } catch {
    return null;
  }
}

function hasUsableCardOdds(odds: MatchBonusOdds | null) {
  if (!odds) return false;
  return [
    odds.yellowCardsTotal,
    odds.redCardsTotal,
    odds.homeYellowCardsTotal,
    odds.awayYellowCardsTotal,
    odds.homeRedCardsTotal,
    odds.awayRedCardsTotal,
  ].some((value) => Number.isInteger(value));
}

export async function getBonusAutofillForMatch(
  match: WorldCupMatch,
  prediction: Prediction | null,
  state: AppState,
): Promise<BonusAutofillResult> {
  const odds = await fetchConfiguredOdds(match);
  const homeSquad = getRealSquadPlayers(state, match.homeTeam);
  const awaySquad = getRealSquadPlayers(state, match.awayTeam);
  const homeGoals = prediction?.homeGoals ?? 0;
  const awayGoals = prediction?.awayGoals ?? 0;
  const yellowFallback = 3 + (hashNumber(`${match.id}:yellow`) % 4);
  const redFallback = hashNumber(`${match.id}:red`) % 7 === 0 ? 1 : 0;
  const yellowCardsTotal = clampInteger(odds?.yellowCardsTotal, yellowFallback, 0, 12);
  const redCardsTotal = clampInteger(odds?.redCardsTotal, redFallback, 0, 5);
  const yellowSplit = splitCardsWithOdds(yellowCardsTotal, `${match.id}:yellow-split`, odds?.homeYellowCardsTotal, odds?.awayYellowCardsTotal);
  const redSplit = splitCardsWithOdds(redCardsTotal, `${match.id}:red-split`, odds?.homeRedCardsTotal, odds?.awayRedCardsTotal);
  const homeYellowCardsTotal = yellowSplit.home;
  const awayYellowCardsTotal = yellowSplit.away;
  const homeRedCardsTotal = redSplit.home;
  const awayRedCardsTotal = redSplit.away;
  const homePlayers = chooseGoalBonusPlayers({
    squad: homeSquad,
    scorerOdds: odds?.homeScorers,
    assistOdds: odds?.homeAssists,
    slots: homeGoals,
    seed: `${match.id}:home`,
  });
  const awayPlayers = chooseGoalBonusPlayers({
    squad: awaySquad,
    scorerOdds: odds?.awayScorers,
    assistOdds: odds?.awayAssists,
    slots: awayGoals,
    seed: `${match.id}:away`,
  });
  const source: BonusAutofillSource =
    homePlayers.source === "odds" || awayPlayers.source === "odds" || hasUsableCardOdds(odds) ? "odds" : "fallback";

  return {
    source,
    homeScorers: homePlayers.scorers,
    awayScorers: awayPlayers.scorers,
    homeAssists: homePlayers.assists,
    awayAssists: awayPlayers.assists,
    yellowCardsTotal: homeYellowCardsTotal + awayYellowCardsTotal,
    redCardsTotal: homeRedCardsTotal + awayRedCardsTotal,
    homeYellowCardsTotal,
    awayYellowCardsTotal,
    homeRedCardsTotal,
    awayRedCardsTotal,
  };
}

function fillSlots(existing: string[] | undefined, picks: string[], max: number, validIds: Set<string>) {
  const retained = (existing ?? []).filter((id) => validIds.has(id)).slice(0, max);
  if (retained.length >= max) return retained;
  return [...retained, ...picks.filter((id) => validIds.has(id))].slice(0, max);
}

function autofillSlots(existing: string[] | undefined, picks: string[], max: number, validIds: Set<string>, replaceExisting: boolean) {
  if (replaceExisting) return picks.filter((id) => validIds.has(id)).slice(0, max);
  return fillSlots(existing, picks, max, validIds);
}

function listsEqual(left: string[] | undefined, right: string[]) {
  const current = left ?? [];
  return current.length === right.length && current.every((id, index) => id === right[index]);
}

function countChangedSlots(left: string[] | undefined, right: string[]) {
  const current = left ?? [];
  const max = Math.max(current.length, right.length);
  let changed = 0;
  for (let index = 0; index < max; index += 1) {
    if (current[index] !== right[index]) changed += 1;
  }
  return changed;
}

export async function autofillBonusTipsInState({
  state,
  playerId,
  matchIds,
  now = new Date(),
  replaceExisting = false,
}: {
  state: AppState;
  playerId: string;
  matchIds: string[];
  now?: Date;
  replaceExisting?: boolean;
}): Promise<{ state: AppState; summary: BonusAutofillSummary }> {
  let next = state;
  let matchesTouched = 0;
  let playerSlotsFilled = 0;
  let cardTipsFilled = 0;
  let source: BonusAutofillSource = "fallback";

  for (const matchId of matchIds) {
    const match = next.matches.find((item) => item.id === matchId);
    if (!match || !isLivePotOpen(match, now)) continue;

    const prediction = getPrediction(next, playerId, match.id);
    const autofill = await getBonusAutofillForMatch(match, prediction, next);
    if (autofill.source === "odds") source = "odds";

    let touched = false;
    if (prediction) {
      const homeIds = getRealSquadPlayerIds(next, match.homeTeam);
      const awayIds = getRealSquadPlayerIds(next, match.awayTeam);
      const homeBonus = sanitizeGoalBonusSlots({
        scorers: autofillSlots(prediction.homeScorers, autofill.homeScorers, prediction.homeGoals, homeIds, replaceExisting),
        assists: autofillSlots(prediction.homeAssists, autofill.homeAssists, prediction.homeGoals, homeIds, replaceExisting),
        validIds: homeIds,
        goals: prediction.homeGoals,
        assistFallbacks: autofill.homeAssists,
      });
      const awayBonus = sanitizeGoalBonusSlots({
        scorers: autofillSlots(prediction.awayScorers, autofill.awayScorers, prediction.awayGoals, awayIds, replaceExisting),
        assists: autofillSlots(prediction.awayAssists, autofill.awayAssists, prediction.awayGoals, awayIds, replaceExisting),
        validIds: awayIds,
        goals: prediction.awayGoals,
        assistFallbacks: autofill.awayAssists,
      });
      const homeScorers = homeBonus.scorers;
      const awayScorers = awayBonus.scorers;
      const homeAssists = homeBonus.assists;
      const awayAssists = awayBonus.assists;
      const beforeSlots =
        (prediction.homeScorers ?? []).filter((id) => homeIds.has(id)).length +
        (prediction.awayScorers ?? []).filter((id) => awayIds.has(id)).length +
        (prediction.homeAssists ?? []).filter((id) => homeIds.has(id)).length +
        (prediction.awayAssists ?? []).filter((id) => awayIds.has(id)).length;
      const afterSlots = homeScorers.length + awayScorers.length + homeAssists.length + awayAssists.length;

      if (
        !listsEqual(prediction.homeScorers, homeScorers) ||
        !listsEqual(prediction.awayScorers, awayScorers) ||
        !listsEqual(prediction.homeAssists, homeAssists) ||
        !listsEqual(prediction.awayAssists, awayAssists)
      ) {
        next = savePredictionInState(
          next,
          {
            ...prediction,
            homeScorers,
            awayScorers,
            homeAssists,
            awayAssists,
            updatedAt: new Date().toISOString(),
          },
          now,
        );
        playerSlotsFilled += replaceExisting
          ? countChangedSlots(prediction.homeScorers, homeScorers) +
            countChangedSlots(prediction.awayScorers, awayScorers) +
            countChangedSlots(prediction.homeAssists, homeAssists) +
            countChangedSlots(prediction.awayAssists, awayAssists)
          : Math.max(0, afterSlots - beforeSlots);
        touched = true;
      }
    }

    const existingCardTip = next.livePotTips.find((tip) => tip.playerId === playerId && tip.matchId === match.id);
    if (!existingCardTip || replaceExisting) {
      const tip: LivePotTip = {
        playerId,
        matchId: match.id,
        yellowCardsTotal: autofill.yellowCardsTotal,
        redCardsTotal: autofill.redCardsTotal,
        homeYellowCardsTotal: autofill.homeYellowCardsTotal,
        awayYellowCardsTotal: autofill.awayYellowCardsTotal,
        homeRedCardsTotal: autofill.homeRedCardsTotal,
        awayRedCardsTotal: autofill.awayRedCardsTotal,
        updatedAt: new Date().toISOString(),
      };
      next = saveLivePotTipInState(next, tip);
      if (!existingCardTip || replaceExisting) cardTipsFilled += 1;
      touched = true;
    }

    if (touched) matchesTouched += 1;
  }

  return {
    state: next,
    summary: {
      source,
      matchesTouched,
      playerSlotsFilled,
      cardTipsFilled,
    },
  };
}
