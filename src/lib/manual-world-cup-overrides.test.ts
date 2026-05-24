import { describe, expect, it } from "vitest";

import { applyManualWorldCupOverrides } from "@/lib/manual-world-cup-overrides";
import { initialState } from "@/lib/state";

describe("manual world cup overrides", () => {
  it("fills event gaps without overwriting existing FIFA events", () => {
    const state = {
      ...initialState(),
      matchEvents: [
        {
          id: "m001-10-goal",
          matchId: "m001",
          minute: 10,
          period: "1H",
          type: "goal" as const,
          teamSide: "home" as const,
          playerId: "111",
          playerProfileId: "fifa-111",
          playerName: "FIFA PLAYER",
          assistPlayerName: null,
          relatedPlayerName: null,
          scoreAfter: { homeGoals: 1, awayGoals: 0 },
          source: "fifa" as const,
          updatedAt: "2026-06-11T20:00:00Z",
        },
      ],
    };

    const next = applyManualWorldCupOverrides(state, {
      matchEvents: [
        {
          id: "m001-10-goal",
          matchId: "m001",
          minute: 10,
          period: "1H",
          type: "goal",
          teamSide: "home",
          playerId: "manual",
          playerProfileId: "player-mexico-manual",
          playerName: "MANUAL PLAYER",
          assistPlayerName: null,
          relatedPlayerName: null,
          scoreAfter: { homeGoals: 1, awayGoals: 0 },
          source: "manual",
          updatedAt: "2026-06-11T20:02:00Z",
        },
        {
          id: "m001-20-yellow",
          matchId: "m001",
          minute: 20,
          period: "1H",
          type: "yellow_card",
          teamSide: "away",
          playerId: null,
          playerProfileId: "player-south-africa-card",
          playerName: "Card Man",
          assistPlayerName: null,
          relatedPlayerName: null,
          scoreAfter: null,
          source: "manual",
          updatedAt: "2026-06-11T20:03:00Z",
        },
      ],
    });

    expect(next.matchEvents).toHaveLength(2);
    expect(next.matchEvents.find((event) => event.id === "m001-10-goal")?.playerName).toBe("FIFA PLAYER");
    expect(next.matchEvents.find((event) => event.id === "m001-20-yellow")?.playerName).toBe("Card Man");
  });
});
