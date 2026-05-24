import { describe, expect, it } from "vitest";

import { initialState } from "@/lib/state";
import { savePredictionInState, scorePrediction, upsertMatchResultInState } from "@/lib/scoring";
import type { Prediction } from "@/lib/types";

const nowBeforeVm = new Date("2026-06-01T10:00:00Z");

function prediction(matchId: string, overrides: Partial<Prediction> = {}): Prediction {
  return {
    playerId: "alf",
    matchId,
    homeGoals: 2,
    awayGoals: 1,
    advancingTeam: null,
    joker: false,
    updatedAt: "2026-06-01T10:00:00Z",
    ...overrides,
  };
}

describe("scorePrediction", () => {
  it("gives 10 points for an exact result", () => {
    const state = initialState();
    const match = upsertMatchResultInState(state, "m001", {
      homeGoals: 2,
      awayGoals: 1,
      decidedByPenalties: false,
      advancingTeam: null,
      updatedAt: "2026-06-11T21:00:00Z",
      updatedBy: "alf",
    }).matches[0];

    expect(scorePrediction(match, prediction("m001")).total).toBe(10);
  });

  it("doubles points when joker is selected", () => {
    const state = initialState();
    const match = upsertMatchResultInState(state, "m001", {
      homeGoals: 2,
      awayGoals: 1,
      decidedByPenalties: false,
      advancingTeam: null,
      updatedAt: "2026-06-11T21:00:00Z",
      updatedBy: "alf",
    }).matches[0];

    expect(scorePrediction(match, prediction("m001", { joker: true })).total).toBe(20);
  });

  it("uses advancing team for penalty shootout outcome", () => {
    const state = initialState();
    const knockout = state.matches.find((match) => match.id === "m073");
    expect(knockout).toBeTruthy();
    const match = upsertMatchResultInState(state, "m073", {
      homeGoals: 1,
      awayGoals: 1,
      decidedByPenalties: true,
      advancingTeam: "away",
      updatedAt: "2026-06-28T21:00:00Z",
      updatedBy: "alf",
    }).matches.find((item) => item.id === "m073");

    expect(scorePrediction(match!, prediction("m073", { homeGoals: 1, awayGoals: 1, advancingTeam: "away" })).outcome).toBe(3);
    expect(scorePrediction(match!, prediction("m073", { homeGoals: 1, awayGoals: 1, advancingTeam: "home" })).outcome).toBe(0);
  });
});

describe("savePredictionInState", () => {
  it("keeps only one joker per player per round", () => {
    let state = initialState();
    state = savePredictionInState(state, prediction("m001", { joker: true }), nowBeforeVm);
    state = savePredictionInState(state, prediction("m002", { homeGoals: 1, awayGoals: 1, joker: true }), nowBeforeVm);

    expect(state.predictions.find((item) => item.matchId === "m001")?.joker).toBeUndefined();
    expect(state.predictions.find((item) => item.matchId === "m002")?.joker).toBe(true);
  });

  it("rejects predictions after kickoff", () => {
    const state = initialState();
    expect(() => savePredictionInState(state, prediction("m001"), new Date("2026-06-11T19:00:01Z"))).toThrow(
      "Tipsfristen er passert.",
    );
  });
});
