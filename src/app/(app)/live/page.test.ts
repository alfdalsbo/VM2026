import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import LivePage from "@/app/(app)/live/page";
import { players } from "@/lib/players";
import { initialState } from "@/lib/state";
import type { AppState, LivePotTip } from "@/lib/types";

const stateFixture = vi.hoisted(() => ({
  current: null as unknown as AppState,
}));

vi.mock("@/lib/auth", () => ({
  requireSession: vi.fn(async () => players[0]),
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

describe("LivePage", () => {
  it("shows the bonus table without result-award columns or copy", async () => {
    stateFixture.current = {
      ...initialState(),
      livePotTips: [liveTip()],
    };

    const html = renderToStaticMarkup(await LivePage());

    expect(html).toContain("Bonustips-tabell");
    expect(html).toContain("Bonustips har egen tabell og påvirker ikke resultattips-tabellen.");
    expect(html).not.toContain("<th>Premie</th>");
    expect(html).not.toContain("topp 3 gir");
  });
});
