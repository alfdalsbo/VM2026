import type { Round, TournamentStage, WorldCupMatch } from "@/lib/types";

// Source: FIFA public calendar API, fetched 2026-05-24.
// https://api.fifa.com/api/v3/calendar/matches?language=en&count=200&idCompetition=17&idSeason=285023
export const fifaScheduleSource =
  "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/match-schedule-fixtures-results-teams-stadiums";

const rawMatches = `
1|2026-06-11T19:00:00Z|2026-06-11T13:00:00Z|First Stage|Group A|Mexico|South Africa|Mexico City Stadium|Mexico City
2|2026-06-12T02:00:00Z|2026-06-11T20:00:00Z|First Stage|Group A|Korea Republic|Czechia|Guadalajara Stadium|Guadalajara
3|2026-06-12T19:00:00Z|2026-06-12T15:00:00Z|First Stage|Group B|Canada|Bosnia and Herzegovina|Toronto Stadium|Toronto
4|2026-06-13T01:00:00Z|2026-06-12T18:00:00Z|First Stage|Group D|USA|Paraguay|Los Angeles Stadium|Los Angeles
5|2026-06-14T01:00:00Z|2026-06-13T21:00:00Z|First Stage|Group C|Haiti|Scotland|Boston Stadium|Boston
6|2026-06-14T04:00:00Z|2026-06-13T21:00:00Z|First Stage|Group D|Australia|Türkiye|BC Place Vancouver|Vancouver
7|2026-06-13T22:00:00Z|2026-06-13T18:00:00Z|First Stage|Group C|Brazil|Morocco|New York/New Jersey Stadium|New York
8|2026-06-13T19:00:00Z|2026-06-13T12:00:00Z|First Stage|Group B|Qatar|Switzerland|San Francisco Bay Area Stadium|San Francisco Bay Area
9|2026-06-14T23:00:00Z|2026-06-14T19:00:00Z|First Stage|Group E|Côte d'Ivoire|Ecuador|Philadelphia Stadium|Philadelphia
10|2026-06-14T17:00:00Z|2026-06-14T12:00:00Z|First Stage|Group E|Germany|Curaçao|Houston Stadium|Houston
11|2026-06-14T20:00:00Z|2026-06-14T15:00:00Z|First Stage|Group F|Netherlands|Japan|Dallas Stadium|Dallas
12|2026-06-15T02:00:00Z|2026-06-14T20:00:00Z|First Stage|Group F|Sweden|Tunisia|Monterrey Stadium|Monterrey
13|2026-06-15T22:00:00Z|2026-06-15T18:00:00Z|First Stage|Group H|Saudi Arabia|Uruguay|Miami Stadium|Miami
14|2026-06-15T16:00:00Z|2026-06-15T12:00:00Z|First Stage|Group H|Spain|Cabo Verde|Atlanta Stadium|Atlanta
15|2026-06-16T01:00:00Z|2026-06-15T18:00:00Z|First Stage|Group G|IR Iran|New Zealand|Los Angeles Stadium|Los Angeles
16|2026-06-15T19:00:00Z|2026-06-15T12:00:00Z|First Stage|Group G|Belgium|Egypt|Seattle Stadium|Seattle
17|2026-06-16T19:00:00Z|2026-06-16T15:00:00Z|First Stage|Group I|France|Senegal|New York/New Jersey Stadium|New York
18|2026-06-16T22:00:00Z|2026-06-16T18:00:00Z|First Stage|Group I|Iraq|Norway|Boston Stadium|Boston
19|2026-06-17T01:00:00Z|2026-06-16T20:00:00Z|First Stage|Group J|Argentina|Algeria|Kansas City Stadium|Kansas City
20|2026-06-17T04:00:00Z|2026-06-16T21:00:00Z|First Stage|Group J|Austria|Jordan|San Francisco Bay Area Stadium|San Francisco Bay Area
21|2026-06-17T23:00:00Z|2026-06-17T19:00:00Z|First Stage|Group L|Ghana|Panama|Toronto Stadium|Toronto
22|2026-06-17T20:00:00Z|2026-06-17T15:00:00Z|First Stage|Group L|England|Croatia|Dallas Stadium|Dallas
23|2026-06-17T17:00:00Z|2026-06-17T12:00:00Z|First Stage|Group K|Portugal|Congo DR|Houston Stadium|Houston
24|2026-06-18T02:00:00Z|2026-06-17T20:00:00Z|First Stage|Group K|Uzbekistan|Colombia|Mexico City Stadium|Mexico City
25|2026-06-18T16:00:00Z|2026-06-18T12:00:00Z|First Stage|Group A|Czechia|South Africa|Atlanta Stadium|Atlanta
26|2026-06-18T19:00:00Z|2026-06-18T12:00:00Z|First Stage|Group B|Switzerland|Bosnia and Herzegovina|Los Angeles Stadium|Los Angeles
27|2026-06-18T22:00:00Z|2026-06-18T15:00:00Z|First Stage|Group B|Canada|Qatar|BC Place Vancouver|Vancouver
28|2026-06-19T01:00:00Z|2026-06-18T19:00:00Z|First Stage|Group A|Mexico|Korea Republic|Guadalajara Stadium|Guadalajara
29|2026-06-20T00:30:00Z|2026-06-19T20:30:00Z|First Stage|Group C|Brazil|Haiti|Philadelphia Stadium|Philadelphia
30|2026-06-19T22:00:00Z|2026-06-19T18:00:00Z|First Stage|Group C|Scotland|Morocco|Boston Stadium|Boston
31|2026-06-20T03:00:00Z|2026-06-19T20:00:00Z|First Stage|Group D|Türkiye|Paraguay|San Francisco Bay Area Stadium|San Francisco Bay Area
32|2026-06-19T19:00:00Z|2026-06-19T12:00:00Z|First Stage|Group D|USA|Australia|Seattle Stadium|Seattle
33|2026-06-20T20:00:00Z|2026-06-20T16:00:00Z|First Stage|Group E|Germany|Côte d'Ivoire|Toronto Stadium|Toronto
34|2026-06-21T00:00:00Z|2026-06-20T19:00:00Z|First Stage|Group E|Ecuador|Curaçao|Kansas City Stadium|Kansas City
35|2026-06-20T17:00:00Z|2026-06-20T12:00:00Z|First Stage|Group F|Netherlands|Sweden|Houston Stadium|Houston
36|2026-06-21T04:00:00Z|2026-06-20T22:00:00Z|First Stage|Group F|Tunisia|Japan|Monterrey Stadium|Monterrey
37|2026-06-21T22:00:00Z|2026-06-21T18:00:00Z|First Stage|Group H|Uruguay|Cabo Verde|Miami Stadium|Miami
38|2026-06-21T16:00:00Z|2026-06-21T12:00:00Z|First Stage|Group H|Spain|Saudi Arabia|Atlanta Stadium|Atlanta
39|2026-06-21T19:00:00Z|2026-06-21T12:00:00Z|First Stage|Group G|Belgium|IR Iran|Los Angeles Stadium|Los Angeles
40|2026-06-22T01:00:00Z|2026-06-21T18:00:00Z|First Stage|Group G|New Zealand|Egypt|BC Place Vancouver|Vancouver
41|2026-06-23T00:00:00Z|2026-06-22T20:00:00Z|First Stage|Group I|Norway|Senegal|New York/New Jersey Stadium|New York
42|2026-06-22T21:00:00Z|2026-06-22T17:00:00Z|First Stage|Group I|France|Iraq|Philadelphia Stadium|Philadelphia
43|2026-06-22T17:00:00Z|2026-06-22T12:00:00Z|First Stage|Group J|Argentina|Austria|Dallas Stadium|Dallas
44|2026-06-23T03:00:00Z|2026-06-22T20:00:00Z|First Stage|Group J|Jordan|Algeria|San Francisco Bay Area Stadium|San Francisco Bay Area
45|2026-06-23T20:00:00Z|2026-06-23T16:00:00Z|First Stage|Group L|England|Ghana|Boston Stadium|Boston
46|2026-06-23T23:00:00Z|2026-06-23T19:00:00Z|First Stage|Group L|Panama|Croatia|Toronto Stadium|Toronto
47|2026-06-23T17:00:00Z|2026-06-23T12:00:00Z|First Stage|Group K|Portugal|Uzbekistan|Houston Stadium|Houston
48|2026-06-24T02:00:00Z|2026-06-23T20:00:00Z|First Stage|Group K|Colombia|Congo DR|Guadalajara Stadium|Guadalajara
49|2026-06-24T22:00:00Z|2026-06-24T18:00:00Z|First Stage|Group C|Scotland|Brazil|Miami Stadium|Miami
50|2026-06-24T22:00:00Z|2026-06-24T18:00:00Z|First Stage|Group C|Morocco|Haiti|Atlanta Stadium|Atlanta
51|2026-06-24T19:00:00Z|2026-06-24T12:00:00Z|First Stage|Group B|Switzerland|Canada|BC Place Vancouver|Vancouver
52|2026-06-24T19:00:00Z|2026-06-24T12:00:00Z|First Stage|Group B|Bosnia and Herzegovina|Qatar|Seattle Stadium|Seattle
53|2026-06-25T01:00:00Z|2026-06-24T19:00:00Z|First Stage|Group A|Czechia|Mexico|Mexico City Stadium|Mexico City
54|2026-06-25T01:00:00Z|2026-06-24T19:00:00Z|First Stage|Group A|South Africa|Korea Republic|Monterrey Stadium|Monterrey
55|2026-06-25T20:00:00Z|2026-06-25T16:00:00Z|First Stage|Group E|Curaçao|Côte d'Ivoire|Philadelphia Stadium|Philadelphia
56|2026-06-25T20:00:00Z|2026-06-25T16:00:00Z|First Stage|Group E|Ecuador|Germany|New York/New Jersey Stadium|New York
57|2026-06-25T23:00:00Z|2026-06-25T18:00:00Z|First Stage|Group F|Japan|Sweden|Dallas Stadium|Dallas
58|2026-06-25T23:00:00Z|2026-06-25T18:00:00Z|First Stage|Group F|Tunisia|Netherlands|Kansas City Stadium|Kansas City
59|2026-06-26T02:00:00Z|2026-06-25T19:00:00Z|First Stage|Group D|Türkiye|USA|Los Angeles Stadium|Los Angeles
60|2026-06-26T02:00:00Z|2026-06-25T19:00:00Z|First Stage|Group D|Paraguay|Australia|San Francisco Bay Area Stadium|San Francisco Bay Area
61|2026-06-26T19:00:00Z|2026-06-26T15:00:00Z|First Stage|Group I|Norway|France|Boston Stadium|Boston
62|2026-06-26T19:00:00Z|2026-06-26T15:00:00Z|First Stage|Group I|Senegal|Iraq|Toronto Stadium|Toronto
63|2026-06-27T03:00:00Z|2026-06-26T20:00:00Z|First Stage|Group G|Egypt|IR Iran|Seattle Stadium|Seattle
64|2026-06-27T03:00:00Z|2026-06-26T20:00:00Z|First Stage|Group G|New Zealand|Belgium|BC Place Vancouver|Vancouver
65|2026-06-27T00:00:00Z|2026-06-26T19:00:00Z|First Stage|Group H|Cabo Verde|Saudi Arabia|Houston Stadium|Houston
66|2026-06-27T00:00:00Z|2026-06-26T18:00:00Z|First Stage|Group H|Uruguay|Spain|Guadalajara Stadium|Guadalajara
67|2026-06-27T21:00:00Z|2026-06-27T17:00:00Z|First Stage|Group L|Panama|England|New York/New Jersey Stadium|New York
68|2026-06-27T21:00:00Z|2026-06-27T17:00:00Z|First Stage|Group L|Croatia|Ghana|Philadelphia Stadium|Philadelphia
69|2026-06-28T02:00:00Z|2026-06-27T21:00:00Z|First Stage|Group J|Algeria|Austria|Kansas City Stadium|Kansas City
70|2026-06-28T02:00:00Z|2026-06-27T21:00:00Z|First Stage|Group J|Jordan|Argentina|Dallas Stadium|Dallas
71|2026-06-27T23:30:00Z|2026-06-27T19:30:00Z|First Stage|Group K|Colombia|Portugal|Miami Stadium|Miami
72|2026-06-27T23:30:00Z|2026-06-27T19:30:00Z|First Stage|Group K|Congo DR|Uzbekistan|Atlanta Stadium|Atlanta
73|2026-06-28T19:00:00Z|2026-06-28T12:00:00Z|Round of 32||2A|2B|Los Angeles Stadium|Los Angeles
74|2026-06-29T20:30:00Z|2026-06-29T16:30:00Z|Round of 32||1E|3ABCDF|Boston Stadium|Boston
75|2026-06-30T01:00:00Z|2026-06-29T19:00:00Z|Round of 32||1F|2C|Monterrey Stadium|Monterrey
76|2026-06-29T17:00:00Z|2026-06-29T12:00:00Z|Round of 32||1C|2F|Houston Stadium|Houston
77|2026-06-30T21:00:00Z|2026-06-30T17:00:00Z|Round of 32||1I|3CDFGH|New York/New Jersey Stadium|New York
78|2026-06-30T17:00:00Z|2026-06-30T12:00:00Z|Round of 32||2E|2I|Dallas Stadium|Dallas
79|2026-07-01T01:00:00Z|2026-06-30T19:00:00Z|Round of 32||1A|3CEFHI|Mexico City Stadium|Mexico City
80|2026-07-01T16:00:00Z|2026-07-01T12:00:00Z|Round of 32||1L|3EHIJK|Atlanta Stadium|Atlanta
81|2026-07-02T00:00:00Z|2026-07-01T17:00:00Z|Round of 32||1D|3BEFIJ|San Francisco Bay Area Stadium|San Francisco Bay Area
82|2026-07-01T20:00:00Z|2026-07-01T13:00:00Z|Round of 32||1G|3AEHIJ|Seattle Stadium|Seattle
83|2026-07-02T23:00:00Z|2026-07-02T19:00:00Z|Round of 32||2K|2L|Toronto Stadium|Toronto
84|2026-07-02T19:00:00Z|2026-07-02T12:00:00Z|Round of 32||1H|2J|Los Angeles Stadium|Los Angeles
85|2026-07-03T03:00:00Z|2026-07-02T20:00:00Z|Round of 32||1B|3EFGIJ|BC Place Vancouver|Vancouver
86|2026-07-03T22:00:00Z|2026-07-03T18:00:00Z|Round of 32||1J|2H|Miami Stadium|Miami
87|2026-07-04T01:30:00Z|2026-07-03T20:30:00Z|Round of 32||1K|3DEIJL|Kansas City Stadium|Kansas City
88|2026-07-03T18:00:00Z|2026-07-03T13:00:00Z|Round of 32||2D|2G|Dallas Stadium|Dallas
89|2026-07-04T21:00:00Z|2026-07-04T17:00:00Z|Round of 16||W74|W77|Philadelphia Stadium|Philadelphia
90|2026-07-04T17:00:00Z|2026-07-04T12:00:00Z|Round of 16||W73|W75|Houston Stadium|Houston
91|2026-07-05T20:00:00Z|2026-07-05T16:00:00Z|Round of 16||W76|W78|New York/New Jersey Stadium|New York
92|2026-07-06T00:00:00Z|2026-07-05T18:00:00Z|Round of 16||W79|W80|Mexico City Stadium|Mexico City
93|2026-07-06T19:00:00Z|2026-07-06T14:00:00Z|Round of 16||W83|W84|Dallas Stadium|Dallas
94|2026-07-07T00:00:00Z|2026-07-06T17:00:00Z|Round of 16||W81|W82|Seattle Stadium|Seattle
95|2026-07-07T16:00:00Z|2026-07-07T12:00:00Z|Round of 16||W86|W88|Atlanta Stadium|Atlanta
96|2026-07-07T20:00:00Z|2026-07-07T13:00:00Z|Round of 16||W85|W87|BC Place Vancouver|Vancouver
97|2026-07-09T20:00:00Z|2026-07-09T16:00:00Z|Quarter-final||W89|W90|Boston Stadium|Boston
98|2026-07-10T19:00:00Z|2026-07-10T12:00:00Z|Quarter-final||W93|W94|Los Angeles Stadium|Los Angeles
99|2026-07-11T21:00:00Z|2026-07-11T17:00:00Z|Quarter-final||W91|W92|Miami Stadium|Miami
100|2026-07-12T01:00:00Z|2026-07-11T20:00:00Z|Quarter-final||W95|W96|Kansas City Stadium|Kansas City
101|2026-07-14T19:00:00Z|2026-07-14T14:00:00Z|Semi-final||W97|W98|Dallas Stadium|Dallas
102|2026-07-15T19:00:00Z|2026-07-15T15:00:00Z|Semi-final||W99|W100|Atlanta Stadium|Atlanta
103|2026-07-18T21:00:00Z|2026-07-18T17:00:00Z|Play-off for third place||RU101|RU102|Miami Stadium|Miami
104|2026-07-19T19:00:00Z|2026-07-19T15:00:00Z|Final||W101|W102|New York/New Jersey Stadium|New York
`.trim();

const stageMap: Record<string, TournamentStage> = {
  "First Stage": "group",
  "Round of 32": "round_of_32",
  "Round of 16": "round_of_16",
  "Quarter-final": "quarter_final",
  "Semi-final": "semi_final",
  "Play-off for third place": "third_place",
  Final: "final",
};

const stageLabels: Record<TournamentStage, string> = {
  group: "Gruppespill",
  round_of_32: "32-delsfinaler",
  round_of_16: "Åttedelsfinaler",
  quarter_final: "Kvartfinaler",
  semi_final: "Semifinaler",
  third_place: "Bronsefinale",
  final: "Finale",
};

function roundIdFor(localKickoffAt: string) {
  return localKickoffAt.slice(0, 10);
}

function roundNameFor(date: string) {
  return new Intl.DateTimeFormat("nb-NO", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Oslo",
  }).format(new Date(`${date}T12:00:00Z`));
}

export const worldCupMatches: WorldCupMatch[] = rawMatches.split("\n").map((line) => {
  const [number, kickoffAt, localKickoffAt, rawStage, group, homeTeam, awayTeam, venue, city] = line.split("|");
  const stage = stageMap[rawStage] ?? "group";
  return {
    id: `m${number.padStart(3, "0")}`,
    matchNumber: Number(number),
    roundId: roundIdFor(localKickoffAt),
    stage,
    stageLabel: stageLabels[stage],
    group: group || null,
    homeTeam,
    awayTeam,
    kickoffAt,
    localKickoffAt,
    venue,
    city,
    result: null,
  };
});

export const worldCupRounds: Round[] = Object.values(
  worldCupMatches.reduce<Record<string, Round>>((rounds, match) => {
    const current = rounds[match.roundId];
    const startsAt = current && current.startsAt < match.kickoffAt ? current.startsAt : match.kickoffAt;
    const endsAt = current && current.endsAt > match.kickoffAt ? current.endsAt : match.kickoffAt;
    rounds[match.roundId] = {
      id: match.roundId,
      name: roundNameFor(match.roundId),
      stage: current?.stage ?? match.stage,
      startsAt,
      endsAt,
    };
    return rounds;
  }, {}),
).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
