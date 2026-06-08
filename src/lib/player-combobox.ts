export type PlayerComboboxOption = {
  value: string;
  label: string;
  searchText?: string;
  groupLabel?: string;
  meta?: string;
  disabled?: boolean;
};

const NORDIC_CHARACTERS: Record<string, string> = {
  æ: "ae",
  ø: "o",
  å: "a",
  ä: "a",
  ö: "o",
  ü: "u",
};

export function normalizePlayerComboboxText(value: string) {
  return value
    .toLocaleLowerCase("nb")
    .replace(/[æøåäöü]/g, (character) => NORDIC_CHARACTERS[character] ?? character)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function playerComboboxSearchText(option: PlayerComboboxOption) {
  return [option.label, option.meta, option.groupLabel, option.searchText].filter(Boolean).join(" ");
}

export function filterPlayerComboboxOptions(options: PlayerComboboxOption[], query: string) {
  const normalizedQuery = normalizePlayerComboboxText(query);
  if (!normalizedQuery) return options;

  const terms = normalizedQuery.split(" ").filter(Boolean);
  return options
    .map((option, index) => ({
      option,
      index,
      score: scorePlayerComboboxOption(option, normalizedQuery, terms),
    }))
    .filter((row): row is { option: PlayerComboboxOption; index: number; score: number } => row.score !== null)
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map((row) => row.option);
}

function scorePlayerComboboxOption(option: PlayerComboboxOption, query: string, terms: string[]) {
  const label = normalizePlayerComboboxText(option.label);
  const meta = normalizePlayerComboboxText(option.meta ?? "");
  const haystack = normalizePlayerComboboxText(playerComboboxSearchText(option));

  if (!terms.every((term) => haystack.includes(term))) return null;
  if (label === query) return 0;
  if (label.startsWith(query)) return 1;
  if (label.includes(query)) return 2;
  if (meta.includes(query)) return 3;
  return 4;
}
