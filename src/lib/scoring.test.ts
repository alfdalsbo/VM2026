import { describe, expect, it } from "vitest";

import { initialState } from "@/lib/state";
import { inferPredictionOutcome, savePredictionInState, scorePrediction, upsertMatchResultInState } from "@/lib/scoring";
import type { Prediction } from "@/lib/types";

const nowBeforeVm = new Date("2026-06-01T10:00:00Z");

function prediction(matchId: string, overrides: Partial<Prediction> = {}): Prediction {
  return {
    playerId: "alf",
    matchId,
    homeGoals: 2,
    awayGoals: 1,
    knockoutResolution: null,
    updatedAt: "2026-06-01T10:00:00Z",
    ...overrides,
  };
}

describe("scorePrediction", () => {
  it("derives outcomes from score lines", () => {
    expect(inferPredictionOutcome(2, 1)).toBe("home");
    expect(inferPredictionOutcome(1, 1)).toBe("draw");
    expect(inferPredictionOutcome(0, 2)).toBe("away");
  });

  it("gives 10 points for an exact result without joker multipliers", () => {
    const state = initialState();
    const match = upsertMatchResultInState(state, "m001", {
      homeGoals: 2,
      awayGoals: 1,
      decidedByPenalties: false,
      advancingTeam: null,
      updatedAt: "2026-06-11T21:00:00Z",
      updatedBy: "alf",
    }).matches[0];

    const legacyJokerPrediction = { ...prediction("m001"), joker: true } as Prediction;
    expect(scorePrediction(match, legacyJokerPrediction).total).toBe(10);
  });

  it("uses penalty winner for knockout outcome", () => {
    const state = initialState();
    const match = upsertMatchResultInState(state, "m073", {
      homeGoals: 1,
      awayGoals: 1,
      decidedByPenalties: true,
      advancingTeam: "away",
      updatedAt: "2026-06-28T21:00:00Z",
      updatedBy: "alf",
    }).matches.find((item) => item.id === "m073");

    expect(scorePrediction(match!, prediction("m073", { homeGoals: 1, awayGoals: 1, knockoutResolution: { method: "penalties", winner: "away" } })).outcome).toBe(3);
    expect(scorePrediction(match!, prediction("m073", { homeGoals: 1, awayGoals: 1, knockoutResolution: { method: "penalties", winner: "home" } })).outcome).toBe(0);
  });

  it("scores extra-time predictions against the final score", () => {
    const state = initialState();
    const match = upsertMatchResultInState(state, "m073", {
      homeGoals: 2,
      awayGoals: 1,
      decidedByPenalties: false,
      advancingTeam: null,
      updatedAt: "2026-06-28T21:00:00Z",
      updatedBy: "alf",
    }).matches.find((item) => item.id === "m073");

    expect(
      scorePrediction(
        match!,
        prediction("m073", {
          homeGoals: 1,
          awayGoals: 1,
          knockoutResolution: { method: "extra_time", homeGoals: 2, awayGoals: 1, winner: "home" },
        }),
      ).total,
    ).toBe(10);
  });
});

describe("savePredictionInState", () => {
  it("replaces a player's previous prediction for the same match", () => {
    let state = initialState();
    state = savePredictionInState(state, prediction("m001"), nowBeforeVm);
    state = savePredictionInState(state, prediction("m001", { homeGoals: 1, awayGoals: 1 }), nowBeforeVm);

    expect(state.predictions).toHaveLength(1);
    expect(state.predictions[0]).toMatchObject({ homeGoals: 1, awayGoals: 1 });
  });

  it("rejects knockout draws without a resolution", () => {
    const state = initialState();
    expect(() => savePredictionInState(state, prediction("m073", { homeGoals: 1, awayGoals: 1 }), nowBeforeVm)).toThrow(
      "Velg vinner etter ekstraomganger eller straffer.",
    );
  });

  it("rejects extra-time scores without a winner", () => {
    const state = initialState();
    expect(() =>
      savePredictionInState(
        state,
        prediction("m073", {
          homeGoals: 1,
          awayGoals: 1,
          knockoutResolution: { method: "extra_time", homeGoals: 2, awayGoals: 2, winner: "home" },
        }),
        nowBeforeVm,
      ),
    ).toThrow("Stillingen etter ekstraomganger må ha en vinner.");
  });

  it("rejects predictions after kickoff", () => {
    const state = initialState();
    expect(() => savePredictionInState(state, prediction("m001"), new Date("2026-06-11T19:00:01Z"))).toThrow(
      "Tipsfristen er passert.",
    );
  });
});
