import { describe, expect, it } from "vitest";

import { initialState } from "@/lib/state";
import { getTeamProfile, groupSquadByPosition, teamSlug } from "@/lib/teams";

describe("team helpers", () => {
  it("creates stable team slugs and empty profiles for seeded teams", () => {
    const state = initialState();
    expect(teamSlug("Côte d'Ivoire")).toBe("cote-d-ivoire");
    expect(getTeamProfile(state, "mexico")).toMatchObject({
      teamName: "Mexico",
      squad: [],
    });
  });

  it("groups missing squad data without failing", () => {
    expect(groupSquadByPosition([])).toHaveLength(5);
  });
});
