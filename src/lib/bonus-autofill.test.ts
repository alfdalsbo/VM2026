import { describe, expect, it } from "vitest";

import { autofillBonusTipsInState, getPredictedOpenMatchIdsForBonusAutofill } from "@/lib/bonus-autofill";
import { savePredictionInState } from "@/lib/scoring";
import { initialState } from "@/lib/state";
import type { Prediction } from "@/lib/types";

function prediction(overrides: Partial<Prediction> = {}): Prediction {
  return {
    playerId: "alf",
    matchId: "m001",
    homeGoals: 1,
    awayGoals: 0,
    knockoutResolution: null,
    homeScorers: [],
    awayScorers: [],
    homeAssists: [],
    awayAssists: [],
    updatedAt: "2026-06-01T10:00:00Z",
    ...overrides,
  };
}

describe("bonus autofill", () => {
  it("fills empty bonus slots and card tips without changing result tips", async () => {
    const base = savePredictionInState(initialState(), prediction(), new Date("2026-06-01T10:00:00Z"));
    const result = await autofillBonusTipsInState({
      state: base,
      playerId: "alf",
      matchIds: ["m001"],
      now: new Date("2026-06-01T10:00:00Z"),
    });
    const tip = result.state.predictions.find((item) => item.playerId === "alf" && item.matchId === "m001")!;

    expect(tip).toMatchObject({ homeGoals: 1, awayGoals: 0 });
    expect(tip.homeScorers).toHaveLength(1);
    expect(tip.homeAssists).toHaveLength(1);
    expect(result.state.livePotTips[0]).toMatchObject({ playerId: "alf", matchId: "m001" });
    expect(result.summary).toMatchObject({ source: "fallback", matchesTouched: 1, playerSlotsFilled: 2, cardTipsFilled: 1 });
  });

  it("does not create scorer or assist slots for default 0-0 result tips", async () => {
    const result = await autofillBonusTipsInState({
      state: initialState(),
      playerId: "alf",
      matchIds: ["m001"],
      now: new Date("2026-06-01T10:00:00Z"),
    });

    expect(result.state.predictions).toHaveLength(0);
    expect(result.state.livePotTips).toHaveLength(1);
    expect(result.summary).toMatchObject({ playerSlotsFilled: 0, cardTipsFilled: 1 });
  });

  it("selects only the current player's stored result tips for bulk autofill", () => {
    const now = new Date("2026-06-01T10:00:00Z");
    const withAlf = savePredictionInState(initialState(), prediction({ playerId: "alf", matchId: "m001" }), now);
    const withOtherPlayer = savePredictionInState(withAlf, prediction({ playerId: "anders", matchId: "m002" }), now);

    expect(getPredictedOpenMatchIdsForBonusAutofill(withOtherPlayer, "alf", now)).toEqual(["m001"]);
    expect(getPredictedOpenMatchIdsForBonusAutofill(withOtherPlayer, "anders", now)).toEqual(["m002"]);
  });

  it("skips locked matches when selecting bulk autofill matches", async () => {
    const now = new Date("2026-06-01T10:00:00Z");
    const withPredictions = savePredictionInState(
      savePredictionInState(initialState(), prediction({ matchId: "m001" }), now),
      prediction({ matchId: "m002" }),
      now,
    );
    const state = {
      ...withPredictions,
      matches: withPredictions.matches.map((match) =>
        match.id === "m001" ? { ...match, kickoffAt: "2026-05-01T18:00:00.000Z" } : match,
      ),
    };
    const matchIds = getPredictedOpenMatchIdsForBonusAutofill(state, "alf", now);

    expect(matchIds).toEqual(["m002"]);

    const result = await autofillBonusTipsInState({
      state,
      playerId: "alf",
      matchIds,
      now,
    });

    expect(result.state.livePotTips.some((tip) => tip.matchId === "m001")).toBe(false);
    expect(result.state.livePotTips.some((tip) => tip.matchId === "m002")).toBe(true);
  });
});
