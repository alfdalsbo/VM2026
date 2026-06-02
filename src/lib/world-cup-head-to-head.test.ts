import { describe, expect, it } from "vitest";

import { initialState } from "@/lib/state";
import {
  canonicalHeadToHeadPairKey,
  getMatchHeadToHeadMoment,
  worldCupHeadToHeadMoments,
} from "@/lib/world-cup-head-to-head";

function match(id: string) {
  const found = initialState().matches.find((item) => item.id === id);
  if (!found) throw new Error(`Missing match ${id}`);
  return found;
}

describe("world-cup head-to-head moments", () => {
  it("matches the same history regardless of home and away order", () => {
    const mexicoSouthAfrica = match("m001");
    const reversed = {
      ...mexicoSouthAfrica,
      homeTeam: mexicoSouthAfrica.awayTeam,
      awayTeam: mexicoSouthAfrica.homeTeam,
    };

    expect(getMatchHeadToHeadMoment(mexicoSouthAfrica)?.id).toBe("mexico-south-africa-2010");
    expect(getMatchHeadToHeadMoment(reversed)?.id).toBe("mexico-south-africa-2010");
    expect(canonicalHeadToHeadPairKey("Brazil", "Morocco")).toBe(canonicalHeadToHeadPairKey("Morocco", "Brazil"));
  });

  it("returns null when the teams have no curated World Cup finals meeting", () => {
    expect(getMatchHeadToHeadMoment(match("m018"))).toBeNull();
  });

  it("covers the verified 2026 group pair examples", () => {
    expect(getMatchHeadToHeadMoment(match("m001"))?.id).toBe("mexico-south-africa-2010");
    expect(getMatchHeadToHeadMoment(match("m007"))?.id).toBe("brazil-morocco-1998");
    expect(getMatchHeadToHeadMoment(match("m017"))?.id).toBe("france-senegal-2002");
    expect(getMatchHeadToHeadMoment(match("m022"))?.id).toBe("england-croatia-2018");
  });

  it("keeps every curated entry source-backed", () => {
    for (const moment of worldCupHeadToHeadMoments) {
      expect(moment.source.name.trim().length).toBeGreaterThan(8);
      expect(moment.source.url).toMatch(/^https:\/\//);
    }
  });
});
