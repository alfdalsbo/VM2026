import { describe, expect, it } from "vitest";

import { followedMatchIdsForPlayer, isFollowingMatch, toggleFollowedMatchInState } from "@/lib/followed-matches";
import { initialState } from "@/lib/state";

describe("followed matches", () => {
  it("toggles a followed match per player", () => {
    let state = initialState();

    state = toggleFollowedMatchInState(state, "alf", "m001", new Date("2026-06-01T10:00:00Z"));
    expect(isFollowingMatch(state, "alf", "m001")).toBe(true);
    expect(isFollowingMatch(state, "anders", "m001")).toBe(false);
    expect(followedMatchIdsForPlayer(state, "alf").has("m001")).toBe(true);

    state = toggleFollowedMatchInState(state, "alf", "m001", new Date("2026-06-01T10:01:00Z"));
    expect(isFollowingMatch(state, "alf", "m001")).toBe(false);
  });
});
