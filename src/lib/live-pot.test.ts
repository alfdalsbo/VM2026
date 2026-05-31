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
    redCard: "no",
    updatedAt: "2026-06-11T19:20:00Z",
    ...overrides,
  };
}

function event(id: string, type: MatchEvent["type"], minute: number): MatchEvent {
  return {
    id,
    matchId: "m001",
    minute,
    period: "first_half",
    type,
    teamSide: "home",
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
  it("only accepts tips while the match is live or at halftime", () => {
    const scheduled = initialState();
    expect(() => saveLivePotTipInState(scheduled, tip())).toThrow("Live-bonustips åpner først når kampen er i gang.");

    const live = withMatchStatus("live");
    const updated = saveLivePotTipInState(live, tip({ yellowCardsTotal: 3 }));
    expect(updated.livePotTips).toHaveLength(1);
    expect(updated.livePotTips[0]).toMatchObject({ yellowCardsTotal: 3 });
  });

  it("scores yellow and red card predictions as separate bonustips", () => {
    const state = withMatchStatus("finished", [
      event("y1", "yellow_card", 10),
      event("y2", "yellow_card", 22),
      event("r1", "red_card", 44),
    ]);

    expect(scoreLivePotTip(state.matches.find((match) => match.id === "m001")!, tip({ yellowCardsTotal: 2, redCard: "yes" }), state).total).toBe(5);
    expect(scoreLivePotTip(state.matches.find((match) => match.id === "m001")!, tip({ yellowCardsTotal: 5, redCard: "no" }), state).total).toBe(-2);
  });

  it("computes a live pot leaderboard independent of the official table", () => {
    const live = withMatchStatus("live", [event("y1", "yellow_card", 10)]);
    const state: AppState = {
      ...live,
      livePotTips: [
        tip({ playerId: "alf", yellowCardsTotal: 1, redCard: "no" }),
        tip({ playerId: "anders", yellowCardsTotal: 0, redCard: "yes" }),
      ],
    };

    const standings = computeLivePotStandings(state);
    expect(standings[0]).toMatchObject({ player: expect.objectContaining({ id: "alf" }), points: 4 });
    expect(standings.find((row) => row.player.id === "anders")?.points).toBe(-1);
  });
});
