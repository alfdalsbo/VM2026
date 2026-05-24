import { describe, expect, it } from "vitest";

import { upsertMatchResultInState } from "@/lib/scoring";
import { initialState } from "@/lib/state";
import { applyFifaMatchesToState, mapFifaResult } from "@/lib/world-cup-sync";
import type { FifaMatch } from "@/lib/world-cup-sync";

const fifaFinished: FifaMatch = {
  IdMatch: "400021443",
  MatchNumber: 1,
  MatchStatus: 2,
  HomeTeamScore: 2,
  AwayTeamScore: 1,
  Home: { IdTeam: "home", TeamName: [{ Locale: "en-GB", Description: "Mexico" }] },
  Away: { IdTeam: "away", TeamName: [{ Locale: "en-GB", Description: "South Africa" }] },
  Winner: "home",
};

describe("world cup sync", () => {
  it("maps FIFA results into app results", () => {
    expect(mapFifaResult(fifaFinished, "2026-06-11T21:00:00Z")).toMatchObject({
      homeGoals: 2,
      awayGoals: 1,
      source: "fifa",
      updatedBy: "sync:fifa",
    });
  });

  it("does not overwrite manual results unless forced", () => {
    const manualState = upsertMatchResultInState(initialState(), "m001", {
      homeGoals: 5,
      awayGoals: 0,
      decidedByPenalties: false,
      advancingTeam: null,
      updatedAt: "2026-06-11T21:00:00Z",
      updatedBy: "alf",
      source: "manual",
    });

    const protectedSync = applyFifaMatchesToState(manualState, [fifaFinished], { syncedAt: "2026-06-11T22:00:00Z" });
    expect(protectedSync.state.matches.find((match) => match.id === "m001")?.result?.homeGoals).toBe(5);

    const forcedSync = applyFifaMatchesToState(manualState, [fifaFinished], { force: true, syncedAt: "2026-06-11T22:00:00Z" });
    expect(forcedSync.state.matches.find((match) => match.id === "m001")?.result?.homeGoals).toBe(2);
  });
});
