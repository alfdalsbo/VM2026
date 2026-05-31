import { describe, expect, it } from "vitest";

import { initialState } from "@/lib/state";
import { getTeamProfile, groupSquadByPosition, teamSlug } from "@/lib/teams";

describe("team helpers", () => {
  it("creates stable team slugs and seeded profiles with placeholder squads", () => {
    const state = initialState();
    expect(teamSlug("Côte d'Ivoire")).toBe("cote-d-ivoire");
    const mexico = getTeamProfile(state, "mexico");
    expect(mexico?.teamName).toBe("Mexico");
    expect(mexico?.squad.length).toBeGreaterThan(0);
    expect(mexico?.squad[0]?.source).toBe("placeholder");
  });

  it("groups missing squad data without failing", () => {
    expect(groupSquadByPosition([])).toHaveLength(5);
  });
});
