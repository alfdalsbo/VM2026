import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import LivePage from "@/app/(app)/live/page";
import { initialState } from "@/lib/state";
import type { AppState, Player } from "@/lib/types";

const stateFixture = vi.hoisted(() => ({
  current: null as unknown as AppState,
  player: null as unknown as Player,
}));

vi.mock("@/lib/state", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/state")>();
  return {
    ...actual,
    getAppState: vi.fn(async () => stateFixture.current),
  };
});

vi.mock("@/lib/auth", () => ({
  requireSession: vi.fn(async () => stateFixture.player),
}));

describe("LivePage", () => {
  it("keeps the bonus table free of the noisy tips counter", async () => {
    const state = initialState();
    stateFixture.current = state;
    stateFixture.player = state.players[0];

    const html = renderToStaticMarkup(await LivePage());

    expect(html).not.toContain("<th>Tips</th>");
    expect(html).toContain("Bonustips-tabell");
  });
});
