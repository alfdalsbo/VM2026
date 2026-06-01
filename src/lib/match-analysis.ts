import rawMatchAnalyses from "@/data/match-analyses.json";
import { displayTeamName } from "@/lib/display";
import { formatScore } from "@/lib/format";
import type { MatchEvent, MatchLineup, MatchStats, TeamSide, WorldCupMatch } from "@/lib/types";
import { fifaScheduleSource } from "@/lib/world-cup-2026";
import { z } from "zod";

const analysisStatusSchema = z.enum(["preliminary", "tsg_enriched"]);

const pitchPointSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
});

const graphicsNotesSchema = z
  .object({
    notes: z.array(z.string().min(1)).default([]),
    keyZones: z
      .array(
        z.object({
          x: z.number().min(0).max(100),
          y: z.number().min(0).max(100),
          width: z.number().min(1).max(100),
          height: z.number().min(1).max(100),
          label: z.string().min(1),
          tone: z.enum(["home", "away", "neutral"]).default("neutral"),
        }),
      )
      .default([]),
    arrows: z
      .array(
        z.object({
          from: pitchPointSchema,
          to: pitchPointSchema,
          label: z.string().min(1).optional(),
          teamSide: z.enum(["home", "away", "neutral"]).default("neutral"),
        }),
      )
      .default([]),
  })
  .default({ notes: [], keyZones: [], arrows: [] });

const sourceSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  publisher: z.string().min(1).optional(),
  accessedAt: z.string().min(1).optional(),
});

export const matchAnalysisSchema = z.object({
  matchId: z.string().min(1),
  updatedAt: z.string().min(1).refine((value) => !Number.isNaN(Date.parse(value)), "updatedAt must be a date"),
  status: analysisStatusSchema,
  headline: z.string().min(1),
  summary: z.string().min(1),
  tacticalThemes: z.array(z.string().min(1)).default([]),
  homeAnalysis: z.string().min(1),
  awayAnalysis: z.string().min(1),
  turningPoints: z.array(z.string().min(1)).default([]),
  playerNotes: z.array(z.string().min(1)).default([]),
  graphicsNotes: graphicsNotesSchema,
  sources: z.array(sourceSchema).default([]),
});

const matchAnalysesSchema = z.array(matchAnalysisSchema);

export type MatchAnalysis = z.infer<typeof matchAnalysisSchema>;
export type GraphicsNote = MatchAnalysis["graphicsNotes"];

type MatchAnalysisContext = {
  match: WorldCupMatch;
  stats: MatchStats | null;
  lineup: MatchLineup | null;
  events: MatchEvent[];
  storedAnalyses?: MatchAnalysis[];
  now?: Date;
};

export function parseMatchAnalyses(raw: unknown) {
  return matchAnalysesSchema.parse(raw);
}

export const matchAnalyses = parseMatchAnalyses(rawMatchAnalyses);

export function getStoredMatchAnalysis(matchId: string, analyses: MatchAnalysis[] = matchAnalyses) {
  return analyses.find((analysis) => analysis.matchId === matchId) ?? null;
}

export function getMatchAnalysisForMatch({
  match,
  stats,
  lineup,
  events,
  storedAnalyses = matchAnalyses,
  now = new Date(),
}: MatchAnalysisContext): MatchAnalysis | null {
  const stored = getStoredMatchAnalysis(match.id, storedAnalyses);
  if (stored && match.status === "finished" && match.result) return stored;
  if (match.status !== "finished" || !match.result) return null;
  return buildPreliminaryMatchAnalysis({ match, stats, lineup, events, now });
}

function buildPreliminaryMatchAnalysis({
  match,
  stats,
  lineup,
  events,
  now,
}: Required<Pick<MatchAnalysisContext, "match" | "events" | "now">> & {
  stats: MatchStats | null;
  lineup: MatchLineup | null;
}): MatchAnalysis {
  const home = displayTeamName(match.homeTeam);
  const away = displayTeamName(match.awayTeam);
  const result = formatScore(match.result?.homeGoals, match.result?.awayGoals);
  const winner = winnerSide(match);
  const goals = goalEvents(events);
  const homeFormation = lineup?.formation.home ?? stats?.homeFormation ?? null;
  const awayFormation = lineup?.formation.away ?? stats?.awayFormation ?? null;

  return {
    matchId: match.id,
    updatedAt: now.toISOString(),
    status: "preliminary",
    headline: headlineFor(match, winner),
    summary: [
      `Kjellerens foreløpige kampbilde: ${home} - ${away} endte ${result}.`,
      summaryFromStats(stats, home, away),
      goals.length ? `Målene flyttet rytmen: ${goals.slice(0, 3).map(formatEventNote).join("; ")}.` : "Gratisdata har foreløpig ikke levert en rik hendelseslogg.",
    ]
      .filter(Boolean)
      .join(" "),
    tacticalThemes: tacticalThemes(stats, lineup, events, home, away),
    homeAnalysis: teamAnalysis("home", match, stats, homeFormation, events),
    awayAnalysis: teamAnalysis("away", match, stats, awayFormation, events),
    turningPoints: turningPoints(match, events),
    playerNotes: playerNotes(events),
    graphicsNotes: graphicsNotes(match, stats, lineup, events),
    sources: [
      {
        title: "FIFA public calendar API",
        url: fifaScheduleSource,
        publisher: "FIFA",
      },
    ],
  };
}

function winnerSide(match: WorldCupMatch): TeamSide | "draw" | null {
  if (!match.result) return null;
  if (match.result.homeGoals > match.result.awayGoals) return "home";
  if (match.result.awayGoals > match.result.homeGoals) return "away";
  return "draw";
}

function headlineFor(match: WorldCupMatch, winner: TeamSide | "draw" | null) {
  const home = displayTeamName(match.homeTeam);
  const away = displayTeamName(match.awayTeam);
  if (winner === "home") return `${home} fikk kampen inn i sin gate`;
  if (winner === "away") return `${away} tok rommet kampen gav dem`;
  if (winner === "draw") return `${home} og ${away} delte kontrollen`;
  return `${home} - ${away}: taktisk etterrapport`;
}

function summaryFromStats(stats: MatchStats | null, home: string, away: string) {
  if (!stats) return "Statistikken er fortsatt knapp, så vurderingen hviler mest på resultat, hendelser og oppstilling.";
  const possession = compareStat(stats.homePossession, stats.awayPossession, home, away, "ballen mest");
  const shots = compareStat(stats.homeShots, stats.awayShots, home, away, "avsluttet mest");
  return [possession, shots].filter(Boolean).join(" ") || "De enkle tallene peker ikke ut en ensidig kampkontroll.";
}

function compareStat(homeValue: number | null, awayValue: number | null, home: string, away: string, label: string) {
  if (homeValue == null || awayValue == null || homeValue === awayValue) return null;
  return `${homeValue > awayValue ? home : away} ${label}.`;
}

function tacticalThemes(stats: MatchStats | null, lineup: MatchLineup | null, events: MatchEvent[], home: string, away: string) {
  const themes = [
    lineup?.formation.home || lineup?.formation.away
      ? `Formasjonsduellen: ${home} ${lineup?.formation.home ?? "-"} mot ${away} ${lineup?.formation.away ?? "-"}.`
      : null,
    stats?.homeShots != null && stats.awayShots != null ? shotTheme(stats, home, away) : null,
    goalEvents(events).length ? "Kampens målsekvenser satte tydelige vendepunkt i rytmen." : null,
    cardEvents(events).length ? "Disiplin og duellstyrke ble en del av kampbildet." : null,
  ].filter((theme): theme is string => Boolean(theme));
  return themes.length ? themes : ["Gratisdata gir foreløpig et nøkternt, men brukbart, taktisk førsteutkast."];
}

function shotTheme(stats: MatchStats, home: string, away: string) {
  if (stats.homeShots == null || stats.awayShots == null) return "Skuddvolumet er ikke komplett i gratisdata ennå.";
  if (stats.homeShots === stats.awayShots) return "Avslutningsvolumet var balansert, så effektiviteten blir mer interessant enn mengden.";
  return `${stats.homeShots > stats.awayShots ? home : away} skapte mest skuddvolum og tvang kampen oftere inn i siste tredjedel.`;
}

function teamAnalysis(side: TeamSide, match: WorldCupMatch, stats: MatchStats | null, formation: string | null, events: MatchEvent[]) {
  const team = displayTeamName(side === "home" ? match.homeTeam : match.awayTeam);
  const opponent = displayTeamName(side === "home" ? match.awayTeam : match.homeTeam);
  const ownGoals = side === "home" ? match.result?.homeGoals : match.result?.awayGoals;
  const opponentGoals = side === "home" ? match.result?.awayGoals : match.result?.homeGoals;
  const ownShots = side === "home" ? stats?.homeShots : stats?.awayShots;
  const opponentShots = side === "home" ? stats?.awayShots : stats?.homeShots;
  const ownPossession = side === "home" ? stats?.homePossession : stats?.awayPossession;
  const goals = goalEvents(events).filter((event) => event.teamSide === side).length;
  const resultText =
    ownGoals != null && opponentGoals != null
      ? ownGoals > opponentGoals
        ? "fikk betalt"
        : ownGoals < opponentGoals
          ? "måtte jage"
          : "holdt seg i balanse"
      : "står foreløpig uten fullt fasitsignal";

  return [
    `${team} ${resultText} mot ${opponent}.`,
    formation ? `Utgangspunktet var ${formation}, som gir et første bilde av hvordan laget fordelte korridorene.` : "Formasjonen er ikke publisert i gratisdata ennå.",
    ownShots != null && opponentShots != null
      ? `${team} endte med ${ownShots} skudd mot ${opponentShots}, et greit temperaturmål på hvor ofte de fikk angrepene helt frem.`
      : null,
    ownPossession != null ? `Ballandelen var ${ownPossession} prosent.` : null,
    goals ? `${team} fikk ${goals} registrerte scoringer i hendelsesloggen.` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

function turningPoints(match: WorldCupMatch, events: MatchEvent[]) {
  const points = [...goalEvents(events), ...cardEvents(events)]
    .sort((a, b) => (a.minute ?? 999) - (b.minute ?? 999))
    .slice(0, 5)
    .map(formatEventNote);

  if (points.length) return points;
  return [`Sluttresultatet ${formatScore(match.result?.homeGoals, match.result?.awayGoals)} er foreløpig hovedpunktet, mens mer detaljert kampdata ventes.`];
}

function playerNotes(events: MatchEvent[]) {
  const notes = goalEvents(events)
    .slice(0, 6)
    .map((event) => {
      const player = event.playerName ?? "Ukjent spiller";
      const assist = event.assistPlayerName ? `, satt opp av ${event.assistPlayerName}` : "";
      return `${player}${assist}`;
    });
  return notes.length ? notes : ["Spillernotater fylles ut når gratisdata leverer målscorere, assist og bytter stabilt."];
}

function graphicsNotes(match: WorldCupMatch, stats: MatchStats | null, lineup: MatchLineup | null, events: MatchEvent[]): MatchAnalysis["graphicsNotes"] {
  const winner = winnerSide(match);
  const notes = [
    lineup?.formation.home || lineup?.formation.away
      ? `Tavlen viser ${lineup?.formation.home ?? "-"} mot ${lineup?.formation.away ?? "-"}.`
      : "Tavlen bruker resultat og hendelser til formasjonen er publisert.",
    stats ? "Statslinjene under tavlen er hentet fra gratis FIFA-data." : "Statslinjene er klare når FIFA-dataene fyller kampen.",
  ];

  return {
    notes,
    keyZones: [
      {
        x: winner === "away" ? 8 : 62,
        y: 18,
        width: 30,
        height: 28,
        label: winner === "away" ? "Bortelagets trykksone" : winner === "home" ? "Hjemmelagets trykksone" : "Delt midtbane",
        tone: winner === "away" ? "away" : winner === "home" ? "home" : "neutral",
      },
      stats?.homeShotsOnTarget != null && stats.awayShotsOnTarget != null
        ? {
            x: stats.homeShotsOnTarget >= stats.awayShotsOnTarget ? 68 : 2,
            y: 50,
            width: 30,
            height: 18,
            label: "Avslutninger på mål",
            tone: stats.homeShotsOnTarget >= stats.awayShotsOnTarget ? ("home" as const) : ("away" as const),
          }
        : null,
    ].filter((zone): zone is MatchAnalysis["graphicsNotes"]["keyZones"][number] => Boolean(zone)),
    arrows: [
      {
        from: winner === "away" ? { x: 72, y: 34 } : { x: 28, y: 34 },
        to: winner === "away" ? { x: 30, y: 34 } : { x: 70, y: 34 },
        label: winner === "draw" ? "Kontroll skiftet" : "Angrepsretning",
        teamSide: winner === "away" ? "away" : winner === "home" ? "home" : "neutral",
      },
      ...goalEvents(events)
        .slice(0, 2)
        .map((event) => ({
          from: event.teamSide === "away" ? { x: 58, y: 48 } : { x: 42, y: 20 },
          to: event.teamSide === "away" ? { x: 18, y: 34 } : { x: 82, y: 34 },
          label: event.minute != null ? `${event.minute}'` : "Mål",
          teamSide: event.teamSide ?? ("neutral" as const),
        })),
    ],
  };
}

function goalEvents(events: MatchEvent[]) {
  return events.filter((event) => event.type === "goal" || event.type === "own_goal" || event.type === "penalty_goal");
}

function cardEvents(events: MatchEvent[]) {
  return events.filter((event) => event.type === "yellow_card" || event.type === "red_card" || event.type === "second_yellow");
}

function formatEventNote(event: MatchEvent) {
  const minute = event.minute != null ? `${event.minute}'` : event.period ?? "Ukjent tid";
  const player = event.playerName ? ` ${event.playerName}` : "";
  const score = event.scoreAfter ? ` (${formatScore(event.scoreAfter.homeGoals, event.scoreAfter.awayGoals)})` : "";
  return `${minute}: ${eventLabel(event)}${player}${score}`;
}

function eventLabel(event: MatchEvent) {
  switch (event.type) {
    case "goal":
      return "mål";
    case "own_goal":
      return "selvmål";
    case "penalty_goal":
      return "straffemål";
    case "yellow_card":
      return "gult kort";
    case "red_card":
      return "rødt kort";
    case "second_yellow":
      return "andre gule";
    default:
      return "kampnotat";
  }
}
