import { isLivePotOpen, saveLivePotTipInState } from "@/lib/live-pot";
import { getPrediction, savePredictionInState } from "@/lib/scoring";
import type { AppState, LivePotTip, Prediction, TeamSquadPlayer, WorldCupMatch } from "@/lib/types";

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
};

export type BonusAutofillResult = {
  source: BonusAutofillSource;
  homeScorers: string[];
  awayScorers: string[];
  homeAssists: string[];
  awayAssists: string[];
  yellowCardsTotal: number;
  redCardsTotal: number;
};

export type BonusAutofillSummary = {
  source: BonusAutofillSource;
  matchesTouched: number;
  playerSlotsFilled: number;
  cardTipsFilled: number;
};

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

function weightedPick(
  candidates: Array<{ id: string; weight: number }>,
  seed: string,
) {
  const usable = candidates.filter((candidate) => candidate.weight > 0);
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

function choosePlayers({
  squad,
  odds,
  slots,
  seed,
  kind,
}: {
  squad: TeamSquadPlayer[];
  odds: OddsPick[] | undefined;
  slots: number;
  seed: string;
  kind: "scorer" | "assist";
}) {
  const oddsCandidates = (odds ?? [])
    .map((pick) => {
      const id = resolveOddsPlayer(pick, squad);
      return id ? { id, weight: oddsWeight(pick) } : null;
    })
    .filter((candidate): candidate is { id: string; weight: number } => Boolean(candidate));

  const fallbackCandidates = squad.map((player) => ({
    id: player.id,
    weight: fallbackWeight(player, kind),
  }));
  const candidates = oddsCandidates.length ? oddsCandidates : fallbackCandidates;
  const picks: string[] = [];

  for (let index = 0; index < slots; index += 1) {
    const picked = weightedPick(candidates, `${seed}:${kind}:${index}`);
    if (picked) picks.push(picked);
  }

  return picks;
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

export async function getBonusAutofillForMatch(
  match: WorldCupMatch,
  prediction: Prediction | null,
  state: AppState,
): Promise<BonusAutofillResult> {
  const odds = await fetchConfiguredOdds(match);
  const source: BonusAutofillSource = odds ? "odds" : "fallback";
  const homeSquad = state.teamProfiles.find((profile) => profile.teamName === match.homeTeam)?.squad ?? [];
  const awaySquad = state.teamProfiles.find((profile) => profile.teamName === match.awayTeam)?.squad ?? [];
  const homeGoals = prediction?.homeGoals ?? 0;
  const awayGoals = prediction?.awayGoals ?? 0;
  const yellowFallback = 3 + (hashNumber(`${match.id}:yellow`) % 4);
  const redFallback = hashNumber(`${match.id}:red`) % 7 === 0 ? 1 : 0;

  return {
    source,
    homeScorers: choosePlayers({
      squad: homeSquad,
      odds: odds?.homeScorers,
      slots: homeGoals,
      seed: `${match.id}:home`,
      kind: "scorer",
    }),
    awayScorers: choosePlayers({
      squad: awaySquad,
      odds: odds?.awayScorers,
      slots: awayGoals,
      seed: `${match.id}:away`,
      kind: "scorer",
    }),
    homeAssists: choosePlayers({
      squad: homeSquad,
      odds: odds?.homeAssists,
      slots: homeGoals,
      seed: `${match.id}:home`,
      kind: "assist",
    }),
    awayAssists: choosePlayers({
      squad: awaySquad,
      odds: odds?.awayAssists,
      slots: awayGoals,
      seed: `${match.id}:away`,
      kind: "assist",
    }),
    yellowCardsTotal: clampInteger(odds?.yellowCardsTotal, yellowFallback, 0, 12),
    redCardsTotal: clampInteger(odds?.redCardsTotal, redFallback, 0, 5),
  };
}

function fillSlots(existing: string[] | undefined, picks: string[], max: number) {
  const retained = (existing ?? []).slice(0, max);
  if (retained.length >= max) return retained;
  return [...retained, ...picks].slice(0, max);
}

export async function autofillBonusTipsInState({
  state,
  playerId,
  matchIds,
  now = new Date(),
}: {
  state: AppState;
  playerId: string;
  matchIds: string[];
  now?: Date;
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
      const homeScorers = fillSlots(prediction.homeScorers, autofill.homeScorers, prediction.homeGoals);
      const awayScorers = fillSlots(prediction.awayScorers, autofill.awayScorers, prediction.awayGoals);
      const homeAssists = fillSlots(prediction.homeAssists, autofill.homeAssists, prediction.homeGoals);
      const awayAssists = fillSlots(prediction.awayAssists, autofill.awayAssists, prediction.awayGoals);
      const beforeSlots =
        (prediction.homeScorers?.length ?? 0) +
        (prediction.awayScorers?.length ?? 0) +
        (prediction.homeAssists?.length ?? 0) +
        (prediction.awayAssists?.length ?? 0);
      const afterSlots = homeScorers.length + awayScorers.length + homeAssists.length + awayAssists.length;

      if (afterSlots > beforeSlots) {
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
        playerSlotsFilled += afterSlots - beforeSlots;
        touched = true;
      }
    }

    const existingCardTip = next.livePotTips.find((tip) => tip.playerId === playerId && tip.matchId === match.id);
    if (!existingCardTip) {
      const tip: LivePotTip = {
        playerId,
        matchId: match.id,
        yellowCardsTotal: autofill.yellowCardsTotal,
        redCardsTotal: autofill.redCardsTotal,
        updatedAt: new Date().toISOString(),
      };
      next = saveLivePotTipInState(next, tip);
      cardTipsFilled += 1;
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
