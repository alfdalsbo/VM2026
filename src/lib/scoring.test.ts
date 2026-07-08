import { describe, expect, it } from "vitest";

import { initialState } from "@/lib/state";
import { footballCopy } from "@/lib/football-jargon";
import {
  compareStandings,
  computeProjectedStandings,
  computeStandings,
  getPrediction,
  inferPredictionOutcome,
  savePredictionInState,
  scorePrediction,
  upsertMatchResultInState,
} from "@/lib/scoring";
import type { AppState, Prediction } from "@/lib/types";

const nowBeforeVm = new Date("2026-06-01T10:00:00Z");
const knockoutMatchupKey = "Germany|||Norway";

function prediction(matchId: string, overrides: Partial<Prediction> = {}): Prediction {
  return {
    playerId: "alf",
    matchId,
    homeGoals: 2,
    awayGoals: 1,
    matchupKey: null,
    knockoutResolution: null,
    updatedAt: "2026-06-01T10:00:00Z",
    ...overrides,
  };
}

function resolvedKnockoutState(state: AppState = initialState()) {
  return {
    ...state,
    matches: state.matches.map((match) =>
      match.id === "m073"
        ? {
            ...match,
            homeTeam: "Germany",
            awayTeam: "Norway",
          }
        : match,
    ),
  };
}

describe("scorePrediction", () => {
  it("derives outcomes from score lines", () => {
    expect(inferPredictionOutcome(2, 1)).toBe("home");
    expect(inferPredictionOutcome(1, 1)).toBe("draw");
    expect(inferPredictionOutcome(0, 2)).toBe("away");
  });

  it("gives 3 points for an exact result", () => {
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
    expect(scorePrediction(match, legacyJokerPrediction).total).toBe(3);
  });

  it("does not score goal difference without exact result", () => {
    const state = initialState();
    const match = upsertMatchResultInState(state, "m001", {
      homeGoals: 2,
      awayGoals: 1,
      decidedByPenalties: false,
      advancingTeam: null,
      updatedAt: "2026-06-11T21:00:00Z",
      updatedBy: "alf",
    }).matches[0];

    const score = scorePrediction(match, prediction("m001", { homeGoals: 3, awayGoals: 2 }));
    expect(score.goalDifference).toBe(0);
    expect(score.total).toBe(1);
  });

  it("uses penalty winner for knockout outcome", () => {
    const state = resolvedKnockoutState();
    const match = upsertMatchResultInState(state, "m073", {
      homeGoals: 1,
      awayGoals: 1,
      decidedByPenalties: true,
      advancingTeam: "away",
      updatedAt: "2026-06-28T21:00:00Z",
      updatedBy: "alf",
    }, "Germany", "Norway").matches.find((item) => item.id === "m073");

    const correctWinner = scorePrediction(
      match!,
      prediction("m073", {
        homeGoals: 1,
        awayGoals: 1,
        matchupKey: knockoutMatchupKey,
        knockoutResolution: { method: "penalties", winner: "away" },
      }),
    );
    const wrongWinner = scorePrediction(
      match!,
      prediction("m073", {
        homeGoals: 1,
        awayGoals: 1,
        matchupKey: knockoutMatchupKey,
        knockoutResolution: { method: "penalties", winner: "home" },
      }),
    );

    expect(correctWinner.outcome).toBe(1);
    expect(correctWinner.exactResult).toBe(2);
    expect(wrongWinner.outcome).toBe(0);
    expect(wrongWinner.exactResult).toBe(0);
  });

  it("does not score untouched knockout 0-0 defaults when penalties decide the winner", () => {
    const state = resolvedKnockoutState();
    const match = upsertMatchResultInState(state, "m073", {
      homeGoals: 0,
      awayGoals: 0,
      decidedByPenalties: true,
      advancingTeam: "home",
      updatedAt: "2026-06-28T21:00:00Z",
      updatedBy: "alf",
    }, "Germany", "Norway").matches.find((item) => item.id === "m073");

    const score = scorePrediction(match!, null);

    expect(score.outcome).toBe(0);
    expect(score.exactResult).toBe(0);
    expect(score.total).toBe(0);
  });

  it("does not score unresolved knockout draws before the advancing team is known", () => {
    const state = resolvedKnockoutState();
    const match = upsertMatchResultInState(state, "m073", {
      homeGoals: 0,
      awayGoals: 0,
      decidedByPenalties: false,
      advancingTeam: null,
      updatedAt: "2026-06-28T21:00:00Z",
      updatedBy: "alf",
    }, "Germany", "Norway").matches.find((item) => item.id === "m073");

    const score = scorePrediction(
      match!,
      prediction("m073", {
        homeGoals: 0,
        awayGoals: 0,
        matchupKey: knockoutMatchupKey,
      }),
    );

    expect(score.total).toBe(0);
  });

  it("scores extra-time predictions against the final score", () => {
    const state = resolvedKnockoutState();
    const match = upsertMatchResultInState(state, "m073", {
      homeGoals: 2,
      awayGoals: 1,
      decidedByPenalties: false,
      advancingTeam: null,
      updatedAt: "2026-06-28T21:00:00Z",
      updatedBy: "alf",
    }, "Germany", "Norway").matches.find((item) => item.id === "m073");

    expect(
      scorePrediction(
        match!,
        prediction("m073", {
          homeGoals: 1,
          awayGoals: 1,
          matchupKey: knockoutMatchupKey,
          knockoutResolution: { method: "extra_time", homeGoals: 2, awayGoals: 1, winner: "home" },
        }),
      ).total,
    ).toBe(3);
  });

  it("scores a missing group prediction as a default 0-0", () => {
    const state = initialState();
    const match = upsertMatchResultInState(state, "m001", {
      homeGoals: 0,
      awayGoals: 0,
      decidedByPenalties: false,
      advancingTeam: null,
      updatedAt: "2026-06-11T21:00:00Z",
      updatedBy: "alf",
    }).matches[0];

    expect(scorePrediction(match, null).total).toBe(3);
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

  it("allows edits until the last moment before kickoff and locks at kickoff", () => {
    let state = initialState();
    const lastMomentBeforeKickoff = new Date("2026-06-11T18:59:59.999Z");

    state = savePredictionInState(state, prediction("m001", { homeGoals: 1, awayGoals: 0 }), lastMomentBeforeKickoff);
    state = savePredictionInState(state, prediction("m001", { homeGoals: 3, awayGoals: 1 }), lastMomentBeforeKickoff);

    expect(state.predictions).toHaveLength(1);
    expect(state.predictions[0]).toMatchObject({ homeGoals: 3, awayGoals: 1 });
    expect(() => savePredictionInState(state, prediction("m001", { homeGoals: 4, awayGoals: 1 }), new Date("2026-06-11T19:00:00Z"))).toThrow(
      footballCopy.lockError,
    );
  });

  it("keeps unresolved knockout matches closed before kickoff", () => {
    const state = initialState();
    expect(() => savePredictionInState(state, prediction("m073"), nowBeforeVm)).toThrow(
      footballCopy.knockoutPending,
    );
  });

  it("allows knockout predictions when both teams are known and stamps the matchup", () => {
    let state = resolvedKnockoutState();
    state = savePredictionInState(state, prediction("m073", { homeGoals: 2, awayGoals: 1 }), nowBeforeVm);

    expect(state.predictions).toHaveLength(1);
    expect(state.predictions[0]).toMatchObject({
      matchId: "m073",
      matchupKey: knockoutMatchupKey,
    });
  });

  it("rejects knockout draws without a resolution", () => {
    const state = resolvedKnockoutState();
    expect(() => savePredictionInState(state, prediction("m073", { homeGoals: 1, awayGoals: 1 }), nowBeforeVm)).toThrow(
      "Velg vinner etter ekstraomganger eller straffer.",
    );
  });

  it("rejects extra-time scores without a winner", () => {
    const state = resolvedKnockoutState();
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
      footballCopy.lockError,
    );
  });

  it("ignores legacy knockout predictions from before the matchup was known", () => {
    const stateWithLegacyPrediction = upsertMatchResultInState(resolvedKnockoutState(), "m073", {
      homeGoals: 2,
      awayGoals: 1,
      decidedByPenalties: false,
      advancingTeam: null,
      updatedAt: "2026-06-28T21:00:00Z",
      updatedBy: "alf",
    }, "Germany", "Norway");
    const legacyPrediction = prediction("m073", {
      matchupKey: null,
      homeGoals: 2,
      awayGoals: 1,
    });
    const state = {
      ...stateWithLegacyPrediction,
      predictions: [legacyPrediction],
    };
    const match = state.matches.find((item) => item.id === "m073")!;

    expect(getPrediction(state, "alf", "m073")).toBeNull();
    expect(scorePrediction(match, legacyPrediction, state).total).toBe(0);
    expect(computeStandings(state).find((row) => row.player.id === "alf")?.resultTipPoints).toBe(0);
  });
});

describe("projected standings", () => {
  it("uses live scores for temporary standings without changing the base table", () => {
    const state = {
      ...initialState(),
      matches: initialState().matches.map((match) =>
        match.id === "m001"
          ? {
              ...match,
              status: "live" as const,
              result: {
                homeGoals: 2,
                awayGoals: 1,
                decidedByPenalties: false,
                advancingTeam: null,
                updatedAt: "2026-06-11T20:00:00Z",
                updatedBy: "sync:fifa",
                source: "fifa" as const,
              },
            }
          : match,
      ),
      predictions: [
        prediction("m001", { playerId: "alf", homeGoals: 2, awayGoals: 1 }),
        prediction("m001", { playerId: "anders", homeGoals: 0, awayGoals: 1 }),
      ],
    };

    const base = computeStandings(state);
    const projected = computeProjectedStandings(state, ["m001"]);
    const comparison = compareStandings(base, projected);

    expect(base.find((row) => row.player.id === "alf")?.totalPoints).toBe(0);
    expect(projected.find((row) => row.player.id === "alf")?.totalPoints).toBe(3);
    expect(comparison.find((row) => row.player.id === "alf")).toMatchObject({
      pointsDelta: 3,
    });
  });
});
