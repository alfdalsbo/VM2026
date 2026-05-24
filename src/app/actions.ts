"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSession, destroySession, isCorrectPasscode, requireAdmin, requireSession } from "@/lib/auth";
import { clampScore } from "@/lib/format";
import { getPlayer } from "@/lib/players";
import { savePredictionInState, upsertMatchResultInState } from "@/lib/scoring";
import { getAppState, saveAppState } from "@/lib/state";
import type { MatchResult, Prediction } from "@/lib/types";

function field(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function safeNext(value: string) {
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/login")) return "/";
  return value;
}

function revalidateApp() {
  revalidatePath("/");
  revalidatePath("/kamper");
  revalidatePath("/tabell");
  revalidatePath("/profil");
  revalidatePath("/admin");
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

export async function savePredictionAction(formData: FormData) {
  const player = await requireSession();
  const matchId = field(formData, "matchId");
  const homeGoals = clampScore(formData.get("homeGoals"));
  const awayGoals = clampScore(formData.get("awayGoals"));
  const advancingTeamValue = field(formData, "advancingTeam");
  const advancingTeam = advancingTeamValue === "home" || advancingTeamValue === "away" ? advancingTeamValue : null;
  const joker = field(formData, "joker") === "on";

  if (homeGoals === null || awayGoals === null) {
    redirect(`/kamper?error=${encodeURIComponent("Skriv inn gyldig resultat først.")}#${matchId}`);
  }

  const state = await getAppState();
  const prediction: Prediction = {
    playerId: player.id,
    matchId,
    homeGoals,
    awayGoals,
    advancingTeam,
    joker,
    updatedAt: new Date().toISOString(),
  };

  try {
    await saveAppState(savePredictionInState(state, prediction));
  } catch (error) {
    redirect(`/kamper?error=${encodeURIComponent(error instanceof Error ? error.message : "Tipset kunne ikke lagres.")}#${matchId}`);
  }

  revalidateApp();
  redirect(`/kamper?status=${encodeURIComponent("Tipset er ført i protokollen.")}#${matchId}`);
}

export async function saveResultAction(formData: FormData) {
  const admin = await requireAdmin();
  const matchId = field(formData, "matchId");
  const homeGoals = clampScore(formData.get("homeGoals"));
  const awayGoals = clampScore(formData.get("awayGoals"));
  const homeTeam = field(formData, "homeTeam");
  const awayTeam = field(formData, "awayTeam");
  const decidedByPenalties = field(formData, "decidedByPenalties") === "on";
  const advancingTeamValue = field(formData, "advancingTeam");
  const advancingTeam = advancingTeamValue === "home" || advancingTeamValue === "away" ? advancingTeamValue : null;

  const state = await getAppState();
  const existing = state.matches.find((match) => match.id === matchId);
  if (!existing) redirect("/admin?error=Kampen finnes ikke.");

  const result: MatchResult | null =
    homeGoals === null || awayGoals === null
      ? null
      : {
          homeGoals,
          awayGoals,
          decidedByPenalties,
          advancingTeam: decidedByPenalties ? advancingTeam : null,
          updatedAt: new Date().toISOString(),
          updatedBy: admin.id,
        };

  await saveAppState(upsertMatchResultInState(state, matchId, result, homeTeam, awayTeam));
  revalidateApp();
  redirect(`/admin?status=${encodeURIComponent("Kampen er oppdatert.")}#${matchId}`);
}
