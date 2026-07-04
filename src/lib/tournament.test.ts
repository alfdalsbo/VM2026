import { describe, expect, it } from "vitest";

import { upsertMatchResultInState } from "@/lib/scoring";
import { initialState } from "@/lib/state";
import { applyKnockoutResolversToState, buildKnockoutFlow, computeGroupTables, getBroadcastForMatch } from "@/lib/tournament";
import type { AppState } from "@/lib/types";

function result(homeGoals: number, awayGoals: number) {
  return {
    homeGoals,
    awayGoals,
    decidedByPenalties: false,
    advancingTeam: null,
    updatedAt: "2026-06-30T21:00:00Z",
    updatedBy: "test",
    source: "manual" as const,
  };
}

function finishMatch(state: AppState, matchId: string, homeGoals: number, awayGoals: number) {
  return upsertMatchResultInState(state, matchId, result(homeGoals, awayGoals));
}

describe("tournament helpers", () => {
  it("computes group standings from finished matches", () => {
    let state = initialState();
    state = finishMatch(state, "m001", 2, 0);

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

  it("builds knockout flow with next match references", () => {
    const flow = buildKnockoutFlow(initialState());
    expect(flow[0].stage).toBe("round_of_32");
    const match73 = flow[0].matches.find((item) => item.match.matchNumber === 73);
    const match90 = flow[1].matches.find((item) => item.match.matchNumber === 90);
    const bronzeFinal = flow.find((round) => round.stage === "third_place")?.matches[0];
    const final = flow.find((round) => round.stage === "final")?.matches[0];

    expect(match73?.nextLabels).toContain("Vinner til kamp 90");
    expect(match90?.sourceReferences.map((reference) => reference.matchNumber)).toEqual([73, 75]);
    expect(final?.sourceReferences.map((reference) => reference.label)).toEqual(["Vinner kamp 101", "Vinner kamp 102"]);
    expect(bronzeFinal?.sourceReferences.map((reference) => reference.label)).toEqual(["Taper kamp 101", "Taper kamp 102"]);
  });

  it("fills direct knockout placeholders from completed group tables", () => {
    let state = initialState();
    state = finishMatch(state, "m001", 2, 0);
    state = finishMatch(state, "m002", 1, 0);
    state = finishMatch(state, "m025", 1, 0);
    state = finishMatch(state, "m028", 1, 0);
    state = finishMatch(state, "m053", 0, 2);
    state = finishMatch(state, "m054", 0, 2);

    const resolved = applyKnockoutResolversToState(state, { syncedAt: "2026-06-28T22:00:00Z" });

    expect(resolved.state.matches.find((match) => match.id === "m079")?.homeTeam).toBe("Mexico");
    expect(resolved.state.matches.find((match) => match.id === "m073")?.homeTeam).toBe("Korea Republic");
    expect(resolved.state.matches.find((match) => match.id === "m079")?.awayTeam).toBe("3CEFHI");
  });

  it("fills later knockout placeholders from previous winners and runners-up", () => {
    let state = initialState();
    state = upsertMatchResultInState(state, "m074", result(2, 1), "Germany", "Norway");
    state = upsertMatchResultInState(state, "m101", result(0, 1), "Brazil", "Spain");

    const resolved = applyKnockoutResolversToState(state, { syncedAt: "2026-07-16T22:00:00Z" });

    expect(resolved.state.matches.find((match) => match.id === "m089")?.homeTeam).toBe("Germany");
    expect(resolved.state.matches.find((match) => match.id === "m103")?.homeTeam).toBe("Brazil");
  });

  it("repairs stale concrete teams in later knockout placeholders", () => {
    let state = initialState();
    state = upsertMatchResultInState(state, "m080", result(2, 1), "England", "Congo DR");
    state = {
      ...state,
      matches: state.matches.map((match) =>
        match.id === "m092" ? { ...match, homeTeam: "Mexico", awayTeam: "Congo DR" } : match,
      ),
    };

    const resolved = applyKnockoutResolversToState(state, { syncedAt: "2026-07-04T12:00:00Z" });

    expect(resolved.state.matches.find((match) => match.id === "m092")?.awayTeam).toBe("England");
  });

  it("does not advance live knockout scores into later rounds", () => {
    const state = {
      ...initialState(),
      matches: initialState().matches.map((match) =>
        match.id === "m080"
          ? {
              ...match,
              homeTeam: "England",
              awayTeam: "Congo DR",
              status: "live" as const,
              result: {
                ...result(0, 1),
                source: "fifa" as const,
                updatedBy: "sync:fifa",
              },
            }
          : match,
      ),
    };

    const resolved = applyKnockoutResolversToState(state, { syncedAt: "2026-07-01T16:45:00Z" });

    expect(resolved.state.matches.find((match) => match.id === "m092")?.awayTeam).toBe("W80");
  });
});
