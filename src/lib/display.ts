import type { MatchStatus, WorldCupMatch } from "@/lib/types";

const teamDisplayNames: Record<string, string> = {
  "Bosnia and Herzegovina": "Bosnia-Hercegovina",
  Algeria: "Algerie",
  Austria: "Østerrike",
  Belgium: "Belgia",
  Brazil: "Brasil",
  "Cabo Verde": "Kapp Verde",
  Colombia: "Colombia",
  "Congo DR": "DR Kongo",
  Croatia: "Kroatia",
  "Côte d'Ivoire": "Elfenbenskysten",
  Czechia: "Tsjekkia",
  Egypt: "Egypt",
  France: "Frankrike",
  Germany: "Tyskland",
  Iraq: "Irak",
  "IR Iran": "Iran",
  "Korea Republic": "Sør-Korea",
  Mexico: "Mexico",
  Morocco: "Marokko",
  Netherlands: "Nederland",
  "New Zealand": "New Zealand",
  Norway: "Norge",
  Portugal: "Portugal",
  "Saudi Arabia": "Saudi-Arabia",
  Scotland: "Skottland",
  "South Africa": "Sør-Afrika",
  Spain: "Spania",
  Sweden: "Sverige",
  Switzerland: "Sveits",
  Tunisia: "Tunisia",
  Türkiye: "Tyrkia",
  Uzbekistan: "Usbekistan",
  USA: "USA",
};

const teamCountryCodes: Record<string, string> = {
  Algeria: "DZ",
  Argentina: "AR",
  Australia: "AU",
  Austria: "AT",
  Belgium: "BE",
  "Bosnia and Herzegovina": "BA",
  Brazil: "BR",
  "Cabo Verde": "CV",
  Canada: "CA",
  Colombia: "CO",
  "Congo DR": "CD",
  Croatia: "HR",
  "Curaçao": "CW",
  Czechia: "CZ",
  "Côte d'Ivoire": "CI",
  Ecuador: "EC",
  Egypt: "EG",
  England: "GB-ENG",
  France: "FR",
  Germany: "DE",
  Ghana: "GH",
  Haiti: "HT",
  "IR Iran": "IR",
  Iraq: "IQ",
  Japan: "JP",
  Jordan: "JO",
  "Korea Republic": "KR",
  Mexico: "MX",
  Morocco: "MA",
  Netherlands: "NL",
  "New Zealand": "NZ",
  Norway: "NO",
  Panama: "PA",
  Paraguay: "PY",
  Portugal: "PT",
  Qatar: "QA",
  "Saudi Arabia": "SA",
  Scotland: "GB-SCT",
  Senegal: "SN",
  "South Africa": "ZA",
  Spain: "ES",
  Sweden: "SE",
  Switzerland: "CH",
  Tunisia: "TN",
  Türkiye: "TR",
  Uruguay: "UY",
  USA: "US",
  Uzbekistan: "UZ",
};

const groupPattern = /^Group ([A-L])$/;
const groupRankPattern = /^([12])([A-L])$/;
const thirdPlacePattern = /^3([A-L]+)$/;
const winnerPattern = /^W(\d+)$/;
const runnerUpPattern = /^RU(\d+)$/;

export type CompactMatchStatus = {
  label: string;
  tone: MatchStatus;
};

export function displayTeamName(teamName: string) {
  return displayKnockoutPlaceholder(teamName) ?? teamDisplayNames[teamName] ?? teamName;
}

const subdivisionFlags: Record<string, string> = {
  "GB-ENG": "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}",
  "GB-SCT": "\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}",
  "GB-WLS": "\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}",
};

export function flagEmojiFromCode(code: string | null | undefined): string {
  if (!code) return "";
  if (subdivisionFlags[code]) return subdivisionFlags[code];
  if (code.length !== 2) return "";
  const base = 0x1f1e6;
  const upper = code.toUpperCase();
  return String.fromCodePoint(
    base + upper.charCodeAt(0) - 65,
    base + upper.charCodeAt(1) - 65,
  );
}

export function teamFlagEmoji(teamName: string): string {
  return flagEmojiFromCode(teamCountryCodes[teamName]);
}

const HOST_BY_CITY: Record<string, { country: string; code: string }> = {
  Atlanta: { country: "USA", code: "US" },
  Boston: { country: "USA", code: "US" },
  Dallas: { country: "USA", code: "US" },
  Houston: { country: "USA", code: "US" },
  "Kansas City": { country: "USA", code: "US" },
  "Los Angeles": { country: "USA", code: "US" },
  Miami: { country: "USA", code: "US" },
  "New York": { country: "USA", code: "US" },
  Philadelphia: { country: "USA", code: "US" },
  "San Francisco Bay Area": { country: "USA", code: "US" },
  Seattle: { country: "USA", code: "US" },
  Toronto: { country: "Canada", code: "CA" },
  Vancouver: { country: "Canada", code: "CA" },
  "Mexico City": { country: "Mexico", code: "MX" },
  Guadalajara: { country: "Mexico", code: "MX" },
  Monterrey: { country: "Mexico", code: "MX" },
};

export function hostForCity(city: string | null | undefined): { country: string; code: string } | null {
  if (!city) return null;
  return HOST_BY_CITY[city] ?? null;
}

export function displayMatchup(match: Pick<WorldCupMatch, "homeTeam" | "awayTeam">) {
  return `${displayTeamName(match.homeTeam)} - ${displayTeamName(match.awayTeam)}`;
}

export function displayGroupLabel(group: string | null) {
  if (!group) return null;
  const match = group.match(groupPattern);
  return match ? `Gruppe ${match[1]}` : group;
}

export function displayStageOrGroup(match: Pick<WorldCupMatch, "group" | "stageLabel">) {
  return displayGroupLabel(match.group) ?? match.stageLabel;
}

export function displayKnockoutPlaceholder(value: string) {
  const groupRank = value.match(groupRankPattern);
  if (groupRank) return `${groupRank[1] === "1" ? "Vinner" : "Toer"} gruppe ${groupRank[2]}`;

  const thirdPlace = value.match(thirdPlacePattern);
  if (thirdPlace) return `Treer fra ${thirdPlace[1].split("").join("/")}`;

  const winner = value.match(winnerPattern);
  if (winner) return `Vinner kamp ${winner[1]}`;

  const runnerUp = value.match(runnerUpPattern);
  if (runnerUp) return `Taper kamp ${runnerUp[1]}`;

  return null;
}

export function formatCompactMatchStatus(match: Pick<WorldCupMatch, "status" | "minute">): CompactMatchStatus {
  if (match.status === "live") return { label: match.minute ? `Live ${match.minute}'` : "Live", tone: "live" };
  if (match.status === "halftime") return { label: "Pause", tone: "halftime" };
  if (match.status === "finished") return { label: "Ferdig", tone: "finished" };
  if (match.status === "postponed") return { label: "Utsatt", tone: "postponed" };
  if (match.status === "cancelled") return { label: "Avlyst", tone: "cancelled" };
  if (match.status === "unknown") return { label: "Uavklart", tone: "unknown" };
  return { label: "Kommer", tone: "scheduled" };
}
