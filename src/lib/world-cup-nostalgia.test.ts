import { describe, expect, it } from "vitest";

import { initialState } from "@/lib/state";
import {
  getApprovedMomentImage,
  getMatchNostalgia,
  pickDailyNostalgiaMoment,
  worldCupNostalgiaMoments,
} from "@/lib/world-cup-nostalgia";

function match(id: string) {
  const found = initialState().matches.find((item) => item.id === id);
  if (!found) throw new Error(`Missing match ${id}`);
  return found;
}

describe("world-cup nostalgia", () => {
  it("picks the same daily moment for the same date and match pool", () => {
    const state = initialState();
    const pool = state.matches.filter((item) => item.roundId === "2026-06-16");

    const first = pickDailyNostalgiaMoment("2026-06-16", pool);
    const second = pickDailyNostalgiaMoment("2026-06-16", pool);

    expect(second).toBe(first);
  });

  it("maps key 2026 matches to historical echoes", () => {
    expect(getMatchNostalgia(match("m018")).id).toBe("norway-return-2026");
    expect(getMatchNostalgia(match("m007")).id).toBe("brazil-1970");
    expect(getMatchNostalgia(match("m019")).id).toBe("maradona-1986");
    expect(getMatchNostalgia(match("m017")).id).toBe("senegal-2002");
    expect(getMatchNostalgia(match("m022")).id).toBe("england-croatia-2018");
    expect(getMatchNostalgia(match("m104")).id).toBe("messi-2022");
  });

  it("does not add nostalgia state or require an AppState migration", () => {
    const state = initialState();

    expect("nostalgia" in state).toBe(false);
    expect(pickDailyNostalgiaMoment("2026-06-11", state.matches.slice(0, 1))).toBeTruthy();
  });

  it("falls back from unapproved local archive images", () => {
    const unapproved = worldCupNostalgiaMoments.find((moment) => moment.id === "baggio-1994");

    expect(unapproved?.image?.approved).toBe(false);
    expect(unapproved ? getApprovedMomentImage(unapproved) : null).toBeNull();
  });
});
