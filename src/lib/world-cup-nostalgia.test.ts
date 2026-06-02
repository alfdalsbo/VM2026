import { describe, expect, it } from "vitest";

import { initialState } from "@/lib/state";
import { isAllowedWorldCupImageLicense } from "@/lib/world-cup-image-assets";
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

  it("does not carry unapproved local archive images on moments", () => {
    const baggio = worldCupNostalgiaMoments.find((moment) => moment.id === "baggio-1994");
    if (!baggio) throw new Error("Missing Baggio moment");

    expect("image" in baggio).toBe(false);
    expect(getApprovedMomentImage(baggio)?.sourceUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
  });

  it("keeps approved moment images explainable and source-backed", () => {
    const approvedImages = worldCupNostalgiaMoments
      .map((moment) => getApprovedMomentImage(moment))
      .filter((image) => image !== null);

    expect(approvedImages.length).toBeGreaterThanOrEqual(4);
    for (const image of approvedImages) {
      expect(image.alt.trim().length).toBeGreaterThan(20);
      expect(image.caption.trim().length).toBeGreaterThan(20);
      expect(image.context.trim().length).toBeGreaterThan(40);
      expect(image.facts.length).toBeGreaterThanOrEqual(1);
      expect(image.credit.trim().length).toBeGreaterThan(3);
      expect(isAllowedWorldCupImageLicense(image.license)).toBe(true);
      expect(image.sourceUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    }
  });
});
