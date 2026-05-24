import { describe, expect, it } from "vitest";

import { upsertMatchResultInState } from "@/lib/scoring";
import { initialState } from "@/lib/state";
import { computeGroupTables, getBroadcastForMatch } from "@/lib/tournament";

describe("tournament helpers", () => {
  it("computes group standings from finished matches", () => {
    let state = initialState();
    state = upsertMatchResultInState(state, "m001", {
      homeGoals: 2,
      awayGoals: 0,
      decidedByPenalties: false,
      advancingTeam: null,
      updatedAt: "2026-06-11T21:00:00Z",
      updatedBy: "test",
      source: "manual",
    });

    const groupA = computeGroupTables(state).find((group) => group.group === "Group A");
    expect(groupA?.rows[0]).toMatchObject({
      team: "Mexico",
      played: 1,
      wins: 1,
      goalDifference: 2,
      points: 3,
    });
  });

  it("returns seeded broadcast data for group matches", () => {
    const state = initialState();
    const broadcast = getBroadcastForMatch(state.matches.find((match) => match.id === "m001")!);
    expect(broadcast?.channel).toBe("TV 2 Direkte");
    expect(broadcast?.service).toBe("TV 2 Play");
  });
});
