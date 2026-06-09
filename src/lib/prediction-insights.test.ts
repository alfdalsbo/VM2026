import { describe, expect, it } from "vitest";

import {
  getLockedMatchPredictionDigest,
  getOpenMissingPredictions,
  getPredictionDeadlineSummary,
} from "@/lib/prediction-insights";
import { savePredictionInState } from "@/lib/scoring";
import { initialState } from "@/lib/state";
import type { AppState, Prediction } from "@/lib/types";

const beforeVm = new Date("2026-06-01T10:00:00Z");

function prediction(matchId: string, overrides: Partial<Prediction> = {}): Prediction {
  return {
    playerId: "alf",
    matchId,
    homeGoals: 2,
    awayGoals: 1,
    matchupKey: null,
    knockoutResolution: null,
    homeScorers: [],
    awayScorers: [],
    homeAssists: [],
    awayAssists: [],
    updatedAt: "2026-06-01T10:00:00Z",
    ...overrides,
  };
}

function withMatchStatus(state: AppState, matchId: string, status: AppState["matches"][number]["status"]) {
  return {
    ...state,
    matches: state.matches.map((match) => (match.id === matchId ? { ...match, status } : match)),
  };
}

describe("prediction insights", () => {
  it("counts missing open predictions by stored delivery, not by default 0-0 scoring", () => {
    let state = initialState();
    state = savePredictionInState(state, prediction("m001"), beforeVm);

    const missing = getOpenMissingPredictions(state, "alf", beforeVm);

    expect(missing.some((match) => match.id === "m001")).toBe(false);
    expect(missing.some((match) => match.id === "m002")).toBe(true);
  });

  it("excludes locked, cancelled, postponed and unresolved knockout matches from missing tips", () => {
    let state = initialState();
    state = withMatchStatus(state, "m002", "cancelled");
    state = withMatchStatus(state, "m003", "postponed");

    const missing = getOpenMissingPredictions(state, "alf", new Date("2026-06-12T03:00:00Z"));
    const ids = new Set(missing.map((match) => match.id));

    expect(ids.has("m001")).toBe(false);
    expect(ids.has("m002")).toBe(false);
    expect(ids.has("m003")).toBe(false);
    expect(ids.has("m073")).toBe(false);
  });

  it("summarizes the next deadline and delivery count for the whole cellar", () => {
    let state = initialState();
    state = savePredictionInState(state, prediction("m001", { playerId: "alf" }), beforeVm);
    state = savePredictionInState(state, prediction("m001", { playerId: "anders" }), beforeVm);

    const summary = getPredictionDeadlineSummary(state, "alf", beforeVm);

    expect(summary.nextMatch?.id).toBe("m001");
    expect(summary.deliveredCount).toBe(2);
    expect(summary.playerCount).toBe(state.players.length);
    expect(summary.firstMissingMatch?.id).toBe("m002");
  });

  it("does not show locked match digests before kickoff", () => {
    const state = initialState();
    const match = state.matches.find((item) => item.id === "m001")!;

    expect(getLockedMatchPredictionDigest(state, match, "alf", beforeVm)).toBeNull();
  });

  it("includes delivered predictions and 0-0 standard rows after lock", () => {
    let state = initialState();
    state = savePredictionInState(state, prediction("m001", { playerId: "alf", homeGoals: 2, awayGoals: 1 }), beforeVm);
    state = savePredictionInState(state, prediction("m001", { playerId: "anders", homeGoals: 0, awayGoals: 0 }), beforeVm);
    const match = state.matches.find((item) => item.id === "m001")!;

    const digest = getLockedMatchPredictionDigest(state, match, "alf", new Date("2026-06-11T19:00:00Z"));

    expect(digest).not.toBeNull();
    expect(digest?.rows.find((row) => row.player.id === "alf")).toMatchObject({
      scoreLabel: "2-1",
      delivered: true,
      isViewer: true,
    });
    expect(digest?.rows.find((row) => row.player.id === "danny")).toMatchObject({
      scoreLabel: "0-0",
      delivered: false,
    });
    expect(digest?.outcomeCounts).toMatchObject({ home: 1, draw: state.players.length - 1, away: 0 });
    expect(digest?.lonelyScore).toEqual({ playerName: "Alf Kåre", scoreLabel: "2-1" });
  });
});
