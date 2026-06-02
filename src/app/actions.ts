"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSession, destroySession, isCorrectPasscode, requireSession } from "@/lib/auth";
import { getAvatarOptions } from "@/lib/avatars";
import {
  autofillBonusTipsInState,
  BONUS_AUTOFILL_ALL_OPEN,
  BONUS_AUTOFILL_PREDICTED_OPEN,
  getPredictedOpenMatchIdsForBonusAutofill,
} from "@/lib/bonus-autofill";
import { getRealSquadPlayerIds } from "@/lib/bonus-player-options";
import { footballCopy } from "@/lib/football-jargon";
import { toggleFollowedMatchInState } from "@/lib/followed-matches";
import { clampScore } from "@/lib/format";
import { LIVE_POT_MAX_RED_CARDS, LIVE_POT_MAX_YELLOW_CARDS, saveLivePotTipInState } from "@/lib/live-pot";
import { getPlayer } from "@/lib/players";
import {
  getPrediction,
  getPredictionUnavailableMessage,
  inferPredictionOutcome,
  isKnockoutMatch,
  savePredictionInState,
} from "@/lib/scoring";
import { getAppState, saveAppState } from "@/lib/state";
import type { AvatarSelection, KnockoutPredictionResolution, LivePotTip, Prediction } from "@/lib/types";

function field(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function side(value: string) {
  return value === "home" || value === "away" ? value : null;
}

function safeNext(value: string) {
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/login")) return "/";
  return value;
}

function revalidateApp(matchId?: string) {
  revalidatePath("/");
  revalidatePath("/kamper");
  revalidatePath("/tabell");
  revalidatePath("/profil");
  revalidatePath("/vm");
  revalidatePath("/live");
  if (matchId) revalidatePath(`/kamp/${matchId}`);
}

export async function loginAction(formData: FormData) {
  const playerId = field(formData, "playerId");
  const passcode = field(formData, "passcode");
  const next = safeNext(field(formData, "next"));

  if (!getPlayer(playerId) || !isCorrectPasscode(passcode)) {
    redirect(`/login?error=avvist&next=${encodeURIComponent(next)}`);
  }

  await createSession(playerId);
  redirect(next);
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

function parseKnockoutResolution(formData: FormData): KnockoutPredictionResolution | null {
  const method = field(formData, "knockoutMethod");
  const winner = side(field(formData, "knockoutWinner"));
  if (!method && !winner) return null;
  if (!winner) throw new Error("Velg hvem som går videre.");

  if (method === "extra_time") {
    const homeGoals = clampScore(formData.get("extraTimeHomeGoals"));
    const awayGoals = clampScore(formData.get("extraTimeAwayGoals"));
    if (homeGoals === null || awayGoals === null) throw new Error("Skriv stillingen etter ekstraomganger.");
    return { method, homeGoals, awayGoals, winner };
  }

  if (method === "penalties") return { method, winner };
  throw new Error("Velg ekstraomganger eller straffer.");
}

export type SavePredictionState = {
  status?: string;
  error?: string;
};

export type SaveLivePotTipState = {
  status?: string;
  error?: string;
  updatedAt?: string;
};

export type SaveResultPredictionInput = {
  matchId: string;
  homeGoals: number;
  awayGoals: number;
  knockoutMethod?: string;
  knockoutWinner?: "home" | "away" | "";
  extraTimeHomeGoals?: number | "";
  extraTimeAwayGoals?: number | "";
};

export type SaveResultPredictionState = {
  status?: string;
  error?: string;
  updatedAt?: string;
};

export type SaveMatchBonusPredictionInput = {
  matchId: string;
  homeScorers?: string[];
  awayScorers?: string[];
  homeAssists?: string[];
  awayAssists?: string[];
};

export type SaveMatchBonusPredictionState = {
  status?: string;
  error?: string;
  updatedAt?: string;
};

export type SaveLivePotTipInput = {
  matchId: string;
  homeYellowCardsTotal: number;
  awayYellowCardsTotal: number;
  homeRedCardsTotal: number;
  awayRedCardsTotal: number;
};

function clampNumberScore(value: number | ""): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 30) return null;
  return value;
}

function parseKnockoutResolutionInput(input: SaveResultPredictionInput): KnockoutPredictionResolution | null {
  const method = String(input.knockoutMethod ?? "").trim();
  const winner = side(String(input.knockoutWinner ?? ""));
  if (!method && !winner) return null;
  if (!winner) throw new Error("Velg hvem som går videre.");

  if (method === "extra_time") {
    const homeGoals = clampNumberScore(input.extraTimeHomeGoals ?? "");
    const awayGoals = clampNumberScore(input.extraTimeAwayGoals ?? "");
    if (homeGoals === null || awayGoals === null) throw new Error("Skriv stillingen etter ekstraomganger.");
    return { method, homeGoals, awayGoals, winner };
  }

  if (method === "penalties") return { method, winner };
  throw new Error("Velg ekstraomganger eller straffer.");
}

function validBonusIds(ids: string[] | undefined, validIds: Set<string>, max: number) {
  return (ids ?? [])
    .map((id) => String(id ?? "").trim())
    .filter((id) => id && validIds.has(id))
    .slice(0, max);
}

function sanitizeMatchBonusIds({
  state,
  match,
  homeGoals,
  awayGoals,
  homeScorers,
  awayScorers,
  homeAssists,
  awayAssists,
}: {
  state: Awaited<ReturnType<typeof getAppState>>;
  match: PredictionMatch;
  homeGoals: number;
  awayGoals: number;
  homeScorers?: string[];
  awayScorers?: string[];
  homeAssists?: string[];
  awayAssists?: string[];
}) {
  const homeIds = getRealSquadPlayerIds(state, match.homeTeam);
  const awayIds = getRealSquadPlayerIds(state, match.awayTeam);

  return {
    homeScorers: validBonusIds(homeScorers, homeIds, homeGoals),
    awayScorers: validBonusIds(awayScorers, awayIds, awayGoals),
    homeAssists: validBonusIds(homeAssists, homeIds, homeGoals),
    awayAssists: validBonusIds(awayAssists, awayIds, awayGoals),
  };
}

type PredictionMatch = Awaited<ReturnType<typeof getAppState>>["matches"][number];

export async function savePredictionAction(
  _prevState: SavePredictionState,
  formData: FormData,
): Promise<SavePredictionState> {
  const player = await requireSession();
  const matchId = field(formData, "matchId");
  const homeGoals = clampScore(formData.get("homeGoals"));
  const awayGoals = clampScore(formData.get("awayGoals"));
  const homeScorers = formData.getAll("homeScorers").map((value) => String(value)).filter(Boolean);
  const awayScorers = formData.getAll("awayScorers").map((value) => String(value)).filter(Boolean);
  const homeAssists = formData.getAll("homeAssists").map((value) => String(value)).filter(Boolean);
  const awayAssists = formData.getAll("awayAssists").map((value) => String(value)).filter(Boolean);

  if (homeGoals === null || awayGoals === null) {
    return { error: "Skriv inn gyldig resultat først." };
  }

  const state = await getAppState();
  const match = state.matches.find((item) => item.id === matchId);
  if (!match) return { error: "Kampen finnes ikke." };
  const unavailableMessage = getPredictionUnavailableMessage(match);
  if (unavailableMessage) return { error: unavailableMessage };
  const bonusIds = sanitizeMatchBonusIds({
    state,
    match,
    homeGoals,
    awayGoals,
    homeScorers,
    awayScorers,
    homeAssists,
    awayAssists,
  });

  let knockoutResolution: KnockoutPredictionResolution | null = null;
  try {
    knockoutResolution = isKnockoutMatch(match) && homeGoals === awayGoals ? parseKnockoutResolution(formData) : null;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Sluttspilltipset mangler." };
  }

  const prediction: Prediction = {
    playerId: player.id,
    matchId,
    homeGoals,
    awayGoals,
    outcome: inferPredictionOutcome(homeGoals, awayGoals),
    knockoutResolution,
    homeScorers: bonusIds.homeScorers,
    awayScorers: bonusIds.awayScorers,
    homeAssists: bonusIds.homeAssists,
    awayAssists: bonusIds.awayAssists,
    updatedAt: new Date().toISOString(),
  };

  try {
    await saveAppState(savePredictionInState(state, prediction));
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Tipset gikk ikke gjennom." };
  }

  revalidateApp(matchId);
  return { status: footballCopy.predictionSaved };
}

export async function saveResultPredictionAction(input: SaveResultPredictionInput): Promise<SaveResultPredictionState> {
  const player = await requireSession();
  const matchId = String(input.matchId ?? "").trim();
  const homeGoals = clampNumberScore(input.homeGoals);
  const awayGoals = clampNumberScore(input.awayGoals);

  if (homeGoals === null || awayGoals === null) {
    return { error: "Skriv inn gyldig resultat først." };
  }

  const state = await getAppState();
  const match = state.matches.find((item) => item.id === matchId);
  if (!match) return { error: "Kampen finnes ikke." };
  const unavailableMessage = getPredictionUnavailableMessage(match);
  if (unavailableMessage) return { error: unavailableMessage };

  let knockoutResolution: KnockoutPredictionResolution | null = null;
  try {
    knockoutResolution = isKnockoutMatch(match) && homeGoals === awayGoals ? parseKnockoutResolutionInput(input) : null;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Sluttspilltipset mangler." };
  }

  const existing = getPrediction(state, player.id, matchId);
  const updatedAt = new Date().toISOString();
  const prediction: Prediction = {
    playerId: player.id,
    matchId,
    homeGoals,
    awayGoals,
    outcome: inferPredictionOutcome(homeGoals, awayGoals),
    knockoutResolution,
    homeScorers: (existing?.homeScorers ?? []).slice(0, homeGoals),
    awayScorers: (existing?.awayScorers ?? []).slice(0, awayGoals),
    homeAssists: (existing?.homeAssists ?? []).slice(0, homeGoals),
    awayAssists: (existing?.awayAssists ?? []).slice(0, awayGoals),
    updatedAt,
  };

  try {
    await saveAppState(savePredictionInState(state, prediction));
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Tipset gikk ikke gjennom." };
  }

  revalidateApp(matchId);
  return { status: "Registrert", updatedAt };
}

export async function saveMatchBonusPredictionAction(
  input: SaveMatchBonusPredictionInput,
): Promise<SaveMatchBonusPredictionState> {
  const player = await requireSession();
  const matchId = String(input.matchId ?? "").trim();
  const state = await getAppState();
  const match = state.matches.find((item) => item.id === matchId);
  if (!match) return { error: "Kampen finnes ikke." };
  const unavailableMessage = getPredictionUnavailableMessage(match);
  if (unavailableMessage) return { error: unavailableMessage };

  const existing = getPrediction(state, player.id, matchId);
  if (!existing) return { error: "Sett resultattips først." };

  const bonusIds = sanitizeMatchBonusIds({
    state,
    match,
    homeGoals: existing.homeGoals,
    awayGoals: existing.awayGoals,
    homeScorers: input.homeScorers,
    awayScorers: input.awayScorers,
    homeAssists: input.homeAssists,
    awayAssists: input.awayAssists,
  });
  const updatedAt = new Date().toISOString();
  const prediction: Prediction = {
    ...existing,
    ...bonusIds,
    updatedAt,
  };

  try {
    await saveAppState(savePredictionInState(state, prediction));
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Bonustipset gikk ikke gjennom." };
  }

  revalidateApp(matchId);
  return { status: "Bonustips lagret", updatedAt };
}

export type SaveAvatarState = {
  status?: string;
  error?: string;
};

export type SaveAvatarInput = {
  avatar: string;
  posX?: number;
  posY?: number;
  scale?: number;
};

function clampRange(value: unknown, min: number, max: number, fallback: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

export async function saveAvatarAction(input: SaveAvatarInput): Promise<SaveAvatarState> {
  const player = await requireSession();
  const file = String(input?.avatar ?? "").trim();

  if (!file) return { error: "Velg en avatar." };
  if (!getAvatarOptions().includes(file)) {
    return { error: "Avataren finnes ikke." };
  }

  try {
    const state = await getAppState();
    const others = (state.avatarSelections ?? []).filter((item) => item.playerId !== player.id);
    const selection: AvatarSelection = {
      playerId: player.id,
      avatar: file,
      posX: clampRange(input.posX, 0, 100, 50),
      posY: clampRange(input.posY, 0, 100, 50),
      scale: clampRange(input.scale, 1, 3, 1),
      updatedAt: new Date().toISOString(),
    };
    await saveAppState({ ...state, avatarSelections: [...others, selection] });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Avataren ble ikke lagret." };
  }

  revalidateApp();
  return { status: "Avatar oppdatert." };
}

function clampCardInput(value: number, max: number) {
  if (!Number.isInteger(value) || value < 0 || value > max) return null;
  return value;
}

export async function saveLivePotTipAction(input: SaveLivePotTipInput): Promise<SaveLivePotTipState> {
  const player = await requireSession();
  const matchId = String(input.matchId ?? "").trim();
  const homeYellowCardsTotal = clampCardInput(input.homeYellowCardsTotal, LIVE_POT_MAX_YELLOW_CARDS);
  const awayYellowCardsTotal = clampCardInput(input.awayYellowCardsTotal, LIVE_POT_MAX_YELLOW_CARDS);
  const homeRedCardsTotal = clampCardInput(input.homeRedCardsTotal, LIVE_POT_MAX_RED_CARDS);
  const awayRedCardsTotal = clampCardInput(input.awayRedCardsTotal, LIVE_POT_MAX_RED_CARDS);

  if (homeYellowCardsTotal === null || awayYellowCardsTotal === null) return { error: "Fordel gule kort som hele tall." };
  if (homeRedCardsTotal === null || awayRedCardsTotal === null) return { error: "Fordel røde kort som hele tall." };

  const yellowCardsTotal = homeYellowCardsTotal + awayYellowCardsTotal;
  const redCardsTotal = homeRedCardsTotal + awayRedCardsTotal;
  const updatedAt = new Date().toISOString();

  const tip: LivePotTip = {
    playerId: player.id,
    matchId,
    yellowCardsTotal,
    redCardsTotal,
    homeYellowCardsTotal,
    awayYellowCardsTotal,
    homeRedCardsTotal,
    awayRedCardsTotal,
    updatedAt,
  };

  try {
    const state = await getAppState();
    await saveAppState(saveLivePotTipInState(state, tip));
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Bonustipset gikk ikke gjennom." };
  }

  revalidateApp(matchId);
  return { status: "Kortbonus lagret", updatedAt };
}

export async function autofillBonusTipsAction(formData: FormData) {
  const player = await requireSession();
  const matchId = field(formData, "matchId");
  const next = safeNext(field(formData, "next") || "/live");
  const state = await getAppState();
  const matchIds =
    matchId === BONUS_AUTOFILL_PREDICTED_OPEN
      ? getPredictedOpenMatchIdsForBonusAutofill(state, player.id)
      : matchId === BONUS_AUTOFILL_ALL_OPEN
      ? state.matches.map((match) => match.id)
      : [matchId].filter(Boolean);
  let message = "Ingen tomme bonustips å autofylle.";

  try {
    const result = await autofillBonusTipsInState({
      state,
      playerId: player.id,
      matchIds,
    });
    await saveAppState(result.state);
    for (const id of matchIds) revalidateApp(id);
    const source = result.summary.source === "odds" ? "odds" : "prognose";
    message =
      result.summary.matchesTouched > 0
        ? `Autofylte ${result.summary.matchesTouched} kamp${result.summary.matchesTouched === 1 ? "" : "er"} med ${source}.`
        : "Ingen tomme bonustips å autofylle.";
  } catch (error) {
    redirect(`${next}?error=${encodeURIComponent(error instanceof Error ? error.message : "Autofyll gikk ikke gjennom.")}`);
  }

  redirect(`${next}?status=${encodeURIComponent(message)}`);
}

export async function toggleFollowMatchAction(formData: FormData) {
  const player = await requireSession();
  const matchId = field(formData, "matchId");
  const next = safeNext(field(formData, "next"));
  const state = await getAppState();

  try {
    await saveAppState(toggleFollowedMatchInState(state, player.id, matchId));
  } catch (error) {
    redirect(`${next}?error=${encodeURIComponent(error instanceof Error ? error.message : "Kampen kunne ikke følges.")}#${matchId}`);
  }

  revalidateApp(matchId);
  redirect(`${next}#${matchId}`);
}
