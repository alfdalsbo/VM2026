import { describe, expect, it } from "vitest";

import {
  computeLivePotStandings,
  saveLivePotTipInState,
  scoreLivePotTip,
} from "@/lib/live-pot";
import { initialState } from "@/lib/state";
import type { AppState, LivePotTip, MatchEvent } from "@/lib/types";

function tip(overrides: Partial<LivePotTip> = {}): LivePotTip {
  return {
    playerId: "alf",
    matchId: "m001",
    yellowCardsTotal: 2,
    redCardsTotal: 0,
    updatedAt: "2026-06-11T19:20:00Z",
    ...overrides,
  };
}

function event(id: string, type: MatchEvent["type"], minute: number, teamSide: MatchEvent["teamSide"] = "home"): MatchEvent {
  return {
    id,
    matchId: "m001",
    minute,
    period: "first_half",
    type,
    teamSide,
    playerId: null,
    playerProfileId: null,
    playerName: null,
    assistPlayerName: null,
    relatedPlayerName: null,
    scoreAfter: null,
    source: "manual",
    updatedAt: `2026-06-11T19:${minute.toString().padStart(2, "0")}:00Z`,
  };
}

function withMatchStatus(status: AppState["matches"][number]["status"], events: MatchEvent[] = []): AppState {
  const base = initialState();
  return {
    ...base,
    matches: base.matches.map((match) => (match.id === "m001" ? { ...match, status } : match)),
    matchEvents: events,
  };
}

describe("live pot", () => {
  it("accepts tips before kickoff and locks them after kickoff", () => {
    const now = new Date("2026-06-01T10:00:00Z");
    const scheduled = initialState();
    const updated = saveLivePotTipInState(scheduled, tip({ yellowCardsTotal: 3 }), now);
    expect(updated.livePotTips).toHaveLength(1);
    expect(updated.livePotTips[0]).toMatchObject({ yellowCardsTotal: 3 });

    const locked = {
      ...scheduled,
      matches: scheduled.matches.map((match) =>
        match.id === "m001" ? { ...match, kickoffAt: "2026-05-31T19:00:00Z" } : match,
      ),
    };
    expect(() => saveLivePotTipInState(locked, tip(), now)).toThrow("Bonustips låses ved kampstart.");
  });

  it("stores team card distribution and keeps legacy totals in sync", () => {
    const now = new Date("2026-06-01T10:00:00Z");
    const scheduled = initialState();
    const updated = saveLivePotTipInState(
      scheduled,
      tip({
        yellowCardsTotal: 0,
        redCardsTotal: 0,
        homeYellowCardsTotal: 2,
        awayYellowCardsTotal: 1,
        homeRedCardsTotal: 0,
        awayRedCardsTotal: 1,
      }),
      now,
    );

    expect(updated.livePotTips[0]).toMatchObject({
      yellowCardsTotal: 3,
      redCardsTotal: 1,
      homeYellowCardsTotal: 2,
      awayYellowCardsTotal: 1,
      homeRedCardsTotal: 0,
      awayRedCardsTotal: 1,
    });
  });

  it("keeps card bonus tips closed for unresolved knockout matches", () => {
    const state = initialState();
    expect(() => saveLivePotTipInState(state, tip({ matchId: "m073" }))).toThrow(
      "Sluttspillkupongen åpner når begge lag er klare.",
    );
  });

  it("scores yellow and red card predictions as separate bonustips", () => {
    const state = withMatchStatus("finished", [
      event("y1", "yellow_card", 10),
      event("y2", "yellow_card", 22),
      event("r1", "red_card", 44, "away"),
    ]);

    expect(scoreLivePotTip(state.matches.find((match) => match.id === "m001")!, tip({ yellowCardsTotal: 2, redCardsTotal: 1 }), state).total).toBe(2);
    expect(scoreLivePotTip(state.matches.find((match) => match.id === "m001")!, tip({ yellowCardsTotal: 5, redCardsTotal: 0 }), state).total).toBe(0);
  });

  it("scores distributed card predictions by team", () => {
    const state = withMatchStatus("finished", [
      event("y1", "yellow_card", 10, "home"),
      event("y2", "yellow_card", 22, "home"),
      event("r1", "red_card", 44, "away"),
    ]);
    const match = state.matches.find((item) => item.id === "m001")!;

    expect(
      scoreLivePotTip(
        match,
        tip({
          yellowCardsTotal: 2,
          redCardsTotal: 1,
          homeYellowCardsTotal: 2,
          awayYellowCardsTotal: 0,
          homeRedCardsTotal: 0,
          awayRedCardsTotal: 1,
        }),
        state,
      ).total,
    ).toBe(2);
    expect(
      scoreLivePotTip(
        match,
        tip({
          yellowCardsTotal: 2,
          redCardsTotal: 1,
          homeYellowCardsTotal: 1,
          awayYellowCardsTotal: 1,
          homeRedCardsTotal: 1,
          awayRedCardsTotal: 0,
        }),
        state,
      ).total,
    ).toBe(0);
  });

  it("computes a live pot leaderboard independent of the official table", () => {
    const live = withMatchStatus("live", [event("y1", "yellow_card", 10)]);
    const state: AppState = {
      ...live,
      livePotTips: [
        tip({ playerId: "alf", yellowCardsTotal: 1, redCardsTotal: 0 }),
        tip({ playerId: "anders", yellowCardsTotal: 0, redCardsTotal: 1 }),
      ],
    };

    const standings = computeLivePotStandings(state);
    expect(standings[0]).toMatchObject({ player: expect.objectContaining({ id: "alf" }), points: 2 });
    expect(standings.find((row) => row.player.id === "anders")?.points).toBe(0);
  });
});
