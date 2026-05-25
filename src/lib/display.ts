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
