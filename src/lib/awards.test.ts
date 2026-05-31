import { describe, expect, it } from "vitest";

import { getMatchdayWinner } from "@/lib/awards";
import { initialState } from "@/lib/state";
import type { AppState, Prediction } from "@/lib/types";

function prediction(overrides: Partial<Prediction> = {}): Prediction {
  return {
    playerId: "alf",
    matchId: "m001",
    homeGoals: 2,
    awayGoals: 1,
    knockoutResolution: null,
    updatedAt: "2026-06-11T12:00:00Z",
    ...overrides,
  };
}

function finishedState(): AppState {
  const base = initialState();
  return {
    ...base,
    matches: base.matches.map((match) =>
      match.id === "m001"
        ? {
            ...match,
            status: "finished" as const,
            result: {
              homeGoals: 2,
              awayGoals: 1,
              decidedByPenalties: false,
              advancingTeam: null,
              updatedAt: "2026-06-11T21:00:00Z",
              updatedBy: "test",
              source: "manual" as const,
            },
          }
        : match,
    ),
    predictions: [
      prediction({ playerId: "alf", homeGoals: 2, awayGoals: 1 }),
      prediction({ playerId: "anders", homeGoals: 1, awayGoals: 1 }),
    ],
  };
}

describe("getMatchdayWinner", () => {
  it("finds yesterday's result-tip winner using Oslo date", () => {
    const winner = getMatchdayWinner(finishedState(), new Date("2026-06-12T10:00:00+02:00"));

    expect(winner).toMatchObject({
      title: "Gårsdagens rundevinner",
      matchCount: 1,
      winners: [{ playerName: "Alf Kåre", points: 10, exactResults: 1 }],
    });
  });

  it("falls back to the latest completed matchday when yesterday had no matches", () => {
    const winner = getMatchdayWinner(finishedState(), new Date("2026-06-14T10:00:00+02:00"));

    expect(winner).toMatchObject({
      title: "Siste kampdags rundevinner",
      isFallback: true,
      winners: [{ playerName: "Alf Kåre", points: 10 }],
    });
  });
});
