import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import TablePage from "@/app/(app)/tabell/page";
import { initialState } from "@/lib/state";
import type { AppState, LivePotTip } from "@/lib/types";

const stateFixture = vi.hoisted(() => ({
  current: null as unknown as AppState,
}));

vi.mock("@/lib/state", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/state")>();
  return {
    ...actual,
    getAppState: vi.fn(async () => stateFixture.current),
  };
});

function liveTip(overrides: Partial<LivePotTip> = {}): LivePotTip {
  return {
    playerId: "alf",
    matchId: "m001",
    yellowCardsTotal: 0,
    redCardsTotal: 0,
    updatedAt: "2026-06-11T19:20:00Z",
    ...overrides,
  };
}

function stateWithBonusLeader(): AppState {
  const base = initialState();
  return {
    ...base,
    matches: base.matches.map((match) =>
      match.id === "m001"
        ? {
            ...match,
            status: "finished" as const,
            result: {
              homeGoals: 1,
              awayGoals: 0,
              decidedByPenalties: false,
              advancingTeam: null,
              updatedAt: "2026-06-11T21:00:00Z",
              updatedBy: "test",
              source: "manual" as const,
            },
          }
        : match,
    ),
    livePotTips: [liveTip()],
  };
}

describe("TablePage", () => {
  it("keeps bonus awards out of the result table", async () => {
    stateFixture.current = stateWithBonusLeader();

    const html = renderToStaticMarkup(await TablePage());

    expect(html).not.toContain("Bonuspremie");
    expect(html).not.toContain("result-bonus-preview");
    expect(html).not.toContain("10+");
    expect(html).toContain("Bonustips føres i sin egen tabell.");
  });
});
