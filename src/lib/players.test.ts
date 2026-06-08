import { describe, expect, it } from "vitest";

import { players } from "@/lib/players";

describe("players", () => {
  it("contains the first VM 2026 friend group", () => {
    expect(players.map((player) => player.shortName)).toEqual([
      "Alf Kåre",
      "Anders",
      "Danny",
      "Fredrik",
      "Glenn Ruben",
      "Jørgen",
      "Ruben",
      "Steinar",
      "Sverre",
      "Vegard",
    ]);
    expect(players).toHaveLength(10);
    expect(players.find((player) => player.id === "alf")?.role).toBe("admin");
  });
});
