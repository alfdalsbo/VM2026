"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSession, destroySession, isCorrectPasscode, requireSession } from "@/lib/auth";
import { footballCopy } from "@/lib/football-jargon";
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

export async function savePredictionAction(formData: FormData) {
  const player = await requireSession();
  const matchId = field(formData, "matchId");
  const next = safeNext(field(formData, "next"));
  const homeGoals = clampScore(formData.get("homeGoals"));
  const awayGoals = clampScore(formData.get("awayGoals"));

  if (homeGoals === null || awayGoals === null) {
    redirect(`${next}?error=${encodeURIComponent("Skriv inn gyldig resultat først.")}#${matchId}`);
  }

  const state = await getAppState();
  const match = state.matches.find((item) => item.id === matchId);
  if (!match) redirect(`${next}?error=${encodeURIComponent("Kampen finnes ikke.")}`);

  let knockoutResolution: KnockoutPredictionResolution | null = null;
  try {
    knockoutResolution = isKnockoutMatch(match) && homeGoals === awayGoals ? parseKnockoutResolution(formData) : null;
  } catch (error) {
    redirect(`${next}?error=${encodeURIComponent(error instanceof Error ? error.message : "Sluttspilltipset mangler.")}#${matchId}`);
  }

  const prediction: Prediction = {
    playerId: player.id,
    matchId,
    homeGoals,
    awayGoals,
    outcome: inferPredictionOutcome(homeGoals, awayGoals),
    knockoutResolution,
    updatedAt: new Date().toISOString(),
  };

  try {
    await saveAppState(savePredictionInState(state, prediction));
  } catch (error) {
    redirect(`${next}?error=${encodeURIComponent(error instanceof Error ? error.message : "Tipset gikk ikke gjennom.")}#${matchId}`);
  }

  revalidateApp(matchId);
  redirect(`${next}?status=${encodeURIComponent(footballCopy.predictionSaved)}#${matchId}`);
}
