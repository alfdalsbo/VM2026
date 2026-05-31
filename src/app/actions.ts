"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSession, destroySession, isCorrectPasscode, requireSession } from "@/lib/auth";
import { footballCopy } from "@/lib/football-jargon";
import { toggleFollowedMatchInState } from "@/lib/followed-matches";
import { clampScore } from "@/lib/format";
import { getPlayer } from "@/lib/players";
import { inferPredictionOutcome, isKnockoutMatch, savePredictionInState } from "@/lib/scoring";
import { getAppState, saveAppState } from "@/lib/state";
import type { KnockoutPredictionResolution, Prediction } from "@/lib/types";

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
    homeScorers: homeScorers.slice(0, homeGoals),
    awayScorers: awayScorers.slice(0, awayGoals),
    homeAssists: homeAssists.slice(0, homeGoals),
    awayAssists: awayAssists.slice(0, awayGoals),
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
