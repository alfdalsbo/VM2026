import type { WorldCupMatch } from "@/lib/types";

export type WorldCupHeadToHeadSource = {
  name: string;
  url: string;
};

export type WorldCupHeadToHeadMoment = {
  id: string;
  pairKey: string;
  teams: [string, string];
  year: string;
  tournament: string;
  stage: string;
  venue: string;
  result: string;
  teaser: string;
  body: string;
  source: WorldCupHeadToHeadSource;
};

type HeadToHeadMomentInput = Omit<WorldCupHeadToHeadMoment, "pairKey">;

export function canonicalHeadToHeadPairKey(leftTeam: string, rightTeam: string) {
  return [normalizeTeamName(leftTeam), normalizeTeamName(rightTeam)].sort().join("__");
}

const moments: HeadToHeadMomentInput[] = [
  {
    id: "mexico-south-africa-2010",
    teams: ["Mexico", "South Africa"],
    year: "2010",
    tournament: "Sør-Afrika 2010",
    stage: "Gruppe A",
    venue: "Soccer City, Johannesburg",
    result: "Sør-Afrika 1-1 Mexico",
    teaser: "Tshabalala tente hele åpningskampen før Márquez sørget for 1-1.",
    body:
      "VM 2010 åpnet med vertsnasjonens store øyeblikk: Siphiwe Tshabalala hamret inn mesterskapets første mål på Soccer City. Mexico svarte ved Rafael Márquez, og kampen endte 1-1, men lyden av den åpningskvelden henger fortsatt i arkivet.",
    source: {
      name: "FIFA: Tshabalala opens South Africa 2010 with a bang",
      url: "https://inside.fifa.com/en/tournaments/mens/worldcup/2010south-africa/news/en/news/video-vault-tshabalala-opens-south-africa-2010-with-a-bang-2921847",
    },
  },
  {
    id: "brazil-morocco-1998",
    teams: ["Brazil", "Morocco"],
    year: "1998",
    tournament: "Frankrike 1998",
    stage: "Gruppe A",
    venue: "La Beaujoire, Nantes",
    result: "Brasil 3-0 Marokko",
    teaser: "Brasil tok kontroll i 1998-gruppa med en ryddig 3-0 mot Marokko.",
    body:
      "Brasil og Marokko delte gruppe med Norge og Skottland i 1998. Den gangen vant Brasil 3-0 mot Marokko og så ut til å ha satt mappa på plass, før gruppa senere fikk sin norske signatur mot samme Brasil.",
    source: {
      name: "FIFA: History repeats itself for auld rivals",
      url: "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/history-repeats-itself-for-auld-rivals",
    },
  },
  {
    id: "france-senegal-2002",
    teams: ["France", "Senegal"],
    year: "2002",
    tournament: "Korea/Japan 2002",
    stage: "Gruppe A",
    venue: "Seoul World Cup Stadium, Seoul",
    result: "Frankrike 0-1 Senegal",
    teaser: "Senegal åpnet 2002 med å slå regjerende mester Frankrike 1-0.",
    body:
      "Før Senegal møtte Frankrike i Seoul, var dette deres første VM-kamp noensinne. Papa Bouba Diop scoret kampens eneste mål, og den regjerende verdensmesteren startet turneringen med et sjokk som fortsatt gjør åpningskamper litt farligere på papiret.",
    source: {
      name: "FIFA: Diop and Diouf star as Senegal slay France",
      url: "https://www.fifa.com/en/articles/world-cup-upsets-france-senegal",
    },
  },
  {
    id: "england-croatia-2018",
    teams: ["England", "Croatia"],
    year: "2018",
    tournament: "Russland 2018",
    stage: "Semifinale",
    venue: "Luzhniki Stadium, Moskva",
    result: "Kroatia 2-1 England eeo.",
    teaser: "Kroatia stoppet Englands finaledrøm med Mandzukic i ekstraomgangene.",
    body:
      "England startet semifinalen med Trippiers tidlige frispark, men Kroatia svarte med Perisic og dro kampen inn i den typen ekstraomganger de nesten virket bygget for. Mario Mandzukic avgjorde til 2-1, og Kroatia gikk til sin første VM-finale.",
    source: {
      name: "FIFA: History-maker Mandzukic sends Croatia into first Final",
      url: "https://inside.fifa.com/news/history-maker-mandzukic-sends-croatia-into-first-final",
    },
  },
];

export const worldCupHeadToHeadMoments: WorldCupHeadToHeadMoment[] = moments.map((moment) => ({
  ...moment,
  pairKey: canonicalHeadToHeadPairKey(moment.teams[0], moment.teams[1]),
}));

const momentsByPairKey = new Map(worldCupHeadToHeadMoments.map((moment) => [moment.pairKey, moment]));

export function getMatchHeadToHeadMoment(
  match: Pick<WorldCupMatch, "homeTeam" | "awayTeam">,
): WorldCupHeadToHeadMoment | null {
  return momentsByPairKey.get(canonicalHeadToHeadPairKey(match.homeTeam, match.awayTeam)) ?? null;
}

function normalizeTeamName(teamName: string) {
  return teamName.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}
