"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSession, destroySession, isCorrectPasscode, requireAdmin, requireSession } from "@/lib/auth";
import { clampScore } from "@/lib/format";
import { getPlayer } from "@/lib/players";
import { inferPredictionOutcome, savePredictionInState, upsertMatchResultInState } from "@/lib/scoring";
import { getAppState, saveAppState } from "@/lib/state";
import { applyKnockoutResolversToState } from "@/lib/tournament";
import type { BroadcastInfo, MatchResult, Prediction } from "@/lib/types";
import { syncWorldCupData } from "@/lib/world-cup-sync";

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
  revalidatePath("/vm");
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
  const outcomeValue = field(formData, "predictedOutcome");

  if (homeGoals === null || awayGoals === null) {
    redirect(`/kamper?error=${encodeURIComponent("Skriv inn gyldig resultat først.")}#${matchId}`);
  }
  const outcome = inferPredictionOutcome(homeGoals, awayGoals);
  if (outcomeValue && outcomeValue !== outcome) {
    redirect(`/kamper?error=${encodeURIComponent("S/U/T må stemme med stillingen du leverer.")}#${matchId}`);
  }

  const state = await getAppState();
  const prediction: Prediction = {
    playerId: player.id,
    matchId,
    homeGoals,
    awayGoals,
    outcome,
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
  const broadcastChannel = field(formData, "broadcastChannel");
  const broadcastService = field(formData, "broadcastService");
  const broadcastNote = field(formData, "broadcastNote");

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
          source: "manual",
        };

  const existingBroadcast = existing.broadcasts[0];
  const broadcasts: BroadcastInfo[] = broadcastChannel
    ? [
        {
          channel: broadcastChannel,
          service: broadcastService || existingBroadcast?.service || broadcastChannel,
          sourceName: "Admin",
          sourceUrl: existingBroadcast?.sourceUrl || "https://www.strim.no/strimetips/fotball-vm-2026-komplett-sendeskjema",
          verifiedAt: new Date().toISOString(),
          note: broadcastNote || undefined,
        },
      ]
    : [];

  await saveAppState(upsertMatchResultInState(state, matchId, result, homeTeam, awayTeam, broadcasts));
  revalidateApp();
  redirect(`/admin?status=${encodeURIComponent("Kampen er oppdatert.")}#${matchId}`);
}

export async function syncWorldCupAction() {
  await requireAdmin();
  const result = await syncWorldCupData({ ignoreWindow: true });
  revalidateApp();
  const message =
    result.status === "success"
      ? result.message || "Kampdata er oppdatert."
      : result.status === "skipped"
        ? result.message || "Sync ble hoppet over."
        : result.message || "Sync feilet.";
  redirect(`/admin?${result.status === "error" ? "error" : "status"}=${encodeURIComponent(message)}`);
}

export async function resolveKnockoutTeamsAction() {
  await requireAdmin();
  const state = await getAppState();
  const syncedAt = new Date().toISOString();
  const resolved = applyKnockoutResolversToState(state, { syncedAt });
  await saveAppState(resolved.state);
  revalidateApp();
  const message =
    resolved.updatedMatches === 0
      ? "Ingen nye utslagslag kunne fylles ennå. FIFA eller admin får ta de vanskelige beste-treer-plassene."
      : `Fylte ${resolved.updatedMatches} utslagskamp${resolved.updatedMatches === 1 ? "" : "er"} fra gruppetabell/fasit.`;
  redirect(`/admin?status=${encodeURIComponent(message)}`);
}
