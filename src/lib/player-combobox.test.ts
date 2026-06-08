import { describe, expect, it } from "vitest";

import { filterPlayerComboboxOptions, normalizePlayerComboboxText, type PlayerComboboxOption } from "@/lib/player-combobox";

const options: PlayerComboboxOption[] = [
  {
    value: "nor-9",
    label: "9 Erling Braut Haaland",
    meta: "m:6, a:1",
    groupLabel: "Angrep",
    searchText: "Norge Manchester City forward",
  },
  {
    value: "nor-11",
    label: "11 Alexander Sørloth",
    meta: "m:3, a:2",
    groupLabel: "Angrep",
    searchText: "Norge Atletico Madrid forward",
  },
  {
    value: "mex-10",
    label: "10 Santiago Giménez",
    meta: "Mexico",
    groupLabel: "Mexico",
    searchText: "forward",
  },
];

describe("player combobox search", () => {
  it("normalizes Norwegian and accented characters", () => {
    expect(normalizePlayerComboboxText("Sørloth, Giménez og Håland")).toBe("sorloth gimenez og haland");
  });

  it("matches by player name, shirt number, team and visible metadata", () => {
    expect(filterPlayerComboboxOptions(options, "sorloth").map((option) => option.value)).toEqual(["nor-11"]);
    expect(filterPlayerComboboxOptions(options, "11").map((option) => option.value)).toEqual(["nor-11"]);
    expect(filterPlayerComboboxOptions(options, "mexico").map((option) => option.value)).toEqual(["mex-10"]);
    expect(filterPlayerComboboxOptions(options, "m:6").map((option) => option.value)).toEqual(["nor-9"]);
  });

  it("requires all search terms and ranks label matches first", () => {
    expect(filterPlayerComboboxOptions(options, "norge forward").map((option) => option.value)).toEqual(["nor-9", "nor-11"]);
    expect(filterPlayerComboboxOptions(options, "10").map((option) => option.value)[0]).toBe("mex-10");
  });

  it("returns every option in original order when query is empty", () => {
    expect(filterPlayerComboboxOptions(options, "").map((option) => option.value)).toEqual(["nor-9", "nor-11", "mex-10"]);
  });
});
