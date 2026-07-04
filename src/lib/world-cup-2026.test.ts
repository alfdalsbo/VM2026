import { describe, expect, it } from "vitest";

import type { TournamentStage } from "@/lib/types";
import { worldCupMatches } from "@/lib/world-cup-2026";

const expectedStageCounts: Record<TournamentStage, number> = {
  group: 72,
  round_of_32: 16,
  round_of_16: 8,
  quarter_final: 4,
  semi_final: 2,
  third_place: 1,
  final: 1,
};

const expectedKnockoutSlots: Record<number, [string, string]> = {
  73: ["2A", "2B"],
  74: ["1E", "3ABCDF"],
  75: ["1F", "2C"],
  76: ["1C", "2F"],
  77: ["1I", "3CDFGH"],
  78: ["2E", "2I"],
  79: ["1A", "3CEFHI"],
  80: ["1L", "3EHIJK"],
  81: ["1D", "3BEFIJ"],
  82: ["1G", "3AEHIJ"],
  83: ["2K", "2L"],
  84: ["1H", "2J"],
  85: ["1B", "3EFGIJ"],
  86: ["1J", "2H"],
  87: ["1K", "3DEIJL"],
  88: ["2D", "2G"],
  89: ["W74", "W77"],
  90: ["W73", "W75"],
  91: ["W76", "W78"],
  92: ["W79", "W80"],
  93: ["W83", "W84"],
  94: ["W81", "W82"],
  95: ["W86", "W88"],
  96: ["W85", "W87"],
  97: ["W89", "W90"],
  98: ["W93", "W94"],
  99: ["W91", "W92"],
  100: ["W95", "W96"],
  101: ["W97", "W98"],
  102: ["W99", "W100"],
  103: ["RU101", "RU102"],
  104: ["W101", "W102"],
};

function knockoutReference(team: string) {
  const match = team.match(/^(W|RU)(\d+)$/);
  return match ? Number(match[2]) : null;
}

describe("World Cup 2026 seed schedule", () => {
  it("contains one complete 104-match tournament schedule", () => {
    const matchNumbers = worldCupMatches.map((match) => match.matchNumber);
    expect(worldCupMatches).toHaveLength(104);
    expect(new Set(matchNumbers).size).toBe(104);
    expect([...matchNumbers].sort((a, b) => a - b)).toEqual(Array.from({ length: 104 }, (_, index) => index + 1));

    for (const [stage, count] of Object.entries(expectedStageCounts)) {
      expect(worldCupMatches.filter((match) => match.stage === stage).length).toBe(count);
    }
  });

  it("keeps the group-stage setup at 12 groups, four teams and six matches per group", () => {
    const groups = new Map<string, { matches: number; teamCounts: Map<string, number> }>();
    for (const match of worldCupMatches.filter((item) => item.stage === "group")) {
      expect(match.group).not.toBeNull();
      const group = groups.get(match.group!) ?? { matches: 0, teamCounts: new Map<string, number>() };
      group.matches += 1;
      group.teamCounts.set(match.homeTeam, (group.teamCounts.get(match.homeTeam) ?? 0) + 1);
      group.teamCounts.set(match.awayTeam, (group.teamCounts.get(match.awayTeam) ?? 0) + 1);
      groups.set(match.group!, group);
    }

    expect([...groups.keys()].sort()).toEqual(Array.from({ length: 12 }, (_, index) => `Group ${String.fromCharCode(65 + index)}`));
    for (const group of groups.values()) {
      expect(group.matches).toBe(6);
      expect(group.teamCounts.size).toBe(4);
      expect([...group.teamCounts.values()].sort()).toEqual([3, 3, 3, 3]);
    }
  });

  it("keeps every knockout slot wired to the published bracket path", () => {
    const byNumber = new Map(worldCupMatches.map((match) => [match.matchNumber, match]));

    for (const [rawMatchNumber, [homeTeam, awayTeam]] of Object.entries(expectedKnockoutSlots)) {
      const matchNumber = Number(rawMatchNumber);
      const match = byNumber.get(matchNumber);
      expect(match, `missing match ${matchNumber}`).toBeDefined();
      expect([match?.homeTeam, match?.awayTeam]).toEqual([homeTeam, awayTeam]);

      for (const reference of [knockoutReference(homeTeam), knockoutReference(awayTeam)].filter(
        (item): item is number => item !== null,
      )) {
        expect(byNumber.has(reference)).toBe(true);
        expect(reference).toBeLessThan(matchNumber);
      }
    }
  });
});
