import rawMatchAnalyses from "@/data/match-analyses.json";
import { displayTeamName } from "@/lib/display";
import { fifaTrainingCentreReportHubUrl } from "@/lib/fifa-technical-reports";
import { formatScore } from "@/lib/format";
import type { MatchEvent, MatchLineup, MatchStats, MatchTechnicalReport, TeamSide, TechnicalReportMetric, WorldCupMatch } from "@/lib/types";
import { fifaScheduleSource } from "@/lib/world-cup-2026";
import { z } from "zod";

const analysisStatusSchema = z.enum(["preliminary", "fifa_report", "tsg_enriched"]);

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

export type MatchAnalysis = z.infer<typeof matchAnalysisSchema> & {
  technicalReport?: MatchTechnicalReport | null;
};
export type GraphicsNote = MatchAnalysis["graphicsNotes"];

type MatchAnalysisContext = {
  match: WorldCupMatch;
  stats: MatchStats | null;
  lineup: MatchLineup | null;
  events: MatchEvent[];
  technicalReport?: MatchTechnicalReport | null;
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
  technicalReport = null,
  storedAnalyses = matchAnalyses,
  now = new Date(),
}: MatchAnalysisContext): MatchAnalysis | null {
  const stored = getStoredMatchAnalysis(match.id, storedAnalyses);
  if (match.status !== "finished" || !match.result) return null;
  if (stored?.status === "tsg_enriched") return stored;
  if (technicalReport && technicalReport.parseStatus !== "unavailable" && (technicalReport.metrics.length || technicalReport.phases.length)) {
    return buildFifaReportMatchAnalysis({ match, stats, lineup, events, technicalReport, now });
  }
  if (stored) return stored;
  return buildPreliminaryMatchAnalysis({ match, stats, lineup, events, now });
}

function buildFifaReportMatchAnalysis({
  match,
  stats,
  lineup,
  events,
  technicalReport,
  now,
}: Required<Pick<MatchAnalysisContext, "match" | "events" | "now">> & {
  stats: MatchStats | null;
  lineup: MatchLineup | null;
  technicalReport: MatchTechnicalReport;
}): MatchAnalysis {
  const home = displayTeamName(match.homeTeam);
  const away = displayTeamName(match.awayTeam);
  const result = formatScore(match.result?.homeGoals, match.result?.awayGoals);
  const xg = reportMetric(technicalReport, "expected_goals");
  const attempts = reportMetric(technicalReport, "attempts_at_goal");
  const possession = reportMetric(technicalReport, "possession");
  const lineBreaks = reportMetric(technicalReport, "completed_line_breaks");
  const progressions = reportMetric(technicalReport, "ball_progressions");
  const pressures = reportMetric(technicalReport, "defensive_pressures");
  const homeFormation = lineup?.formation.home ?? stats?.homeFormation ?? null;
  const awayFormation = lineup?.formation.away ?? stats?.awayFormation ?? null;

  return {
    matchId: match.id,
    updatedAt: technicalReport.parsedAt ?? technicalReport.fetchedAt ?? now.toISOString(),
    status: "fifa_report",
    headline: headlineForFifaReport(match, xg),
    summary: [
      `FIFA-rapporten gjør ${home} - ${away} (${result}) til et ferdig kampbilde.`,
      xg ? `xG endte ${formatMetricValue(xg.home, xg.unit)}-${formatMetricValue(xg.away, xg.unit)}, mens skuddene var ${formatMetricWithDetail(attempts, "home")} mot ${formatMetricWithDetail(attempts, "away")}.` : null,
      possession ? `${dominantSideText(possession, home, away, "hadde mest ball")} ${lineBreaks ? dominantSideText(lineBreaks, home, away, "brøt flest ledd") : ""}` : null,
      technicalReport.parseStatus === "partial" ? "Importen er delvis, men tallene som finnes er brukt direkte." : null,
    ]
      .filter(Boolean)
      .join(" "),
    tacticalThemes: [
      technicalMetricTheme(xg, home, away, "sjansebildet mot"),
      technicalMetricTheme(lineBreaks, home, away, "line-break-bildet mot"),
      technicalMetricTheme(progressions, home, away, "ballprogresjonene mot"),
      technicalMetricTheme(pressures, home, away, "pressvolumet mot", "homeDetail", "awayDetail"),
      phaseTheme(technicalReport, "in_possession", home, away),
      phaseTheme(technicalReport, "out_of_possession", home, away),
    ].filter((theme): theme is string => Boolean(theme)),
    homeAnalysis: teamTechnicalAnalysis("home", match, technicalReport, homeFormation),
    awayAnalysis: teamTechnicalAnalysis("away", match, technicalReport, awayFormation),
    turningPoints: fifaReportTurningPoints(match, technicalReport, events),
    playerNotes: technicalPlayerNotes(technicalReport, events),
    graphicsNotes: fifaReportGraphicsNotes(match, technicalReport, lineup),
    sources: [
      {
        title: "Post Match Summary Report",
        url: technicalReport.sourceUrl,
        publisher: "FIFA Training Centre",
        accessedAt: technicalReport.fetchedAt,
      },
      {
        title: "FIFA public calendar API",
        url: fifaScheduleSource,
        publisher: "FIFA",
      },
    ],
    technicalReport,
  };
}

function headlineForFifaReport(match: WorldCupMatch, xg: TechnicalReportMetric | null) {
  const home = displayTeamName(match.homeTeam);
  const away = displayTeamName(match.awayTeam);
  const winner = winnerSide(match);
  if (xg?.home != null && xg.away != null && Math.abs(xg.home - xg.away) >= 0.75) {
    return `${xg.home > xg.away ? home : away} vant også sjanseregnskapet`;
  }
  if (winner === "home") return `${home} gjorde rapporten rødgrønn nok`;
  if (winner === "away") return `${away} tok bortekampen på alvor`;
  if (winner === "draw") return `${home} og ${away} delte tallene skjevt nok`;
  return `${home} - ${away}: ferdig FIFA-rapport`;
}

function reportMetric(report: MatchTechnicalReport, key: string) {
  return report.metrics.find((metric) => metric.key === key) ?? null;
}

function formatMetricValue(value: number | null | undefined, unit: string | null | undefined) {
  if (value == null) return "-";
  const formatted = Number.isInteger(value) ? String(value) : value.toLocaleString("nb-NO", { maximumFractionDigits: 2 });
  return unit ? `${formatted}${unit === "%" ? " %" : ` ${unit}`}` : formatted;
}

function formatMetricWithDetail(metric: TechnicalReportMetric | null, side: TeamSide) {
  if (!metric) return "-";
  const value = side === "home" ? metric.home : metric.away;
  const detail = side === "home" ? metric.homeDetail : metric.awayDetail;
  const base = formatMetricValue(value, metric.unit);
  return detail == null ? base : `${base} (${formatMetricValue(detail, metric.unit)})`;
}

function dominantSideText(metric: TechnicalReportMetric, home: string, away: string, action: string) {
  if (metric.home == null || metric.away == null) return "";
  if (metric.home === metric.away) return `${metric.label} var helt jevnt.`;
  return `${metric.home > metric.away ? home : away} ${action}.`;
}

function technicalMetricTheme(
  metric: TechnicalReportMetric | null,
  home: string,
  away: string,
  intro: string,
  homeKey: "home" | "homeDetail" = "home",
  awayKey: "away" | "awayDetail" = "away",
) {
  if (!metric) return null;
  const homeValue = metric[homeKey];
  const awayValue = metric[awayKey];
  if (homeValue == null || awayValue == null) return null;
  if (homeValue === awayValue) return `${metric.label}: lagene var helt like på ${formatMetricValue(homeValue, metric.unit)}.`;
  const leader = homeValue > awayValue ? home : away;
  const follower = homeValue > awayValue ? away : home;
  const leaderValue = homeValue > awayValue ? homeValue : awayValue;
  const followerValue = homeValue > awayValue ? awayValue : homeValue;
  return `${metric.label}: ${leader} dreide ${intro}, ${formatMetricValue(leaderValue, metric.unit)} mot ${formatMetricValue(followerValue, metric.unit)} for ${follower}.`;
}

function phaseTheme(report: MatchTechnicalReport, group: "in_possession" | "out_of_possession", home: string, away: string) {
  const homePhase = topPhase(report, group, "home");
  const awayPhase = topPhase(report, group, "away");
  if (!homePhase && !awayPhase) return null;
  const label = group === "in_possession" ? "med ball" : "uten ball";
  return `${label}: ${home} hadde mest ${homePhase ? `${phaseLabel(homePhase.label)} (${homePhase.home} %)` : "uten tydelig fase"}, mens ${away} lå tyngst i ${awayPhase ? `${phaseLabel(awayPhase.label)} (${awayPhase.away} %)` : "samme mønster"}.`;
}

function topPhase(report: MatchTechnicalReport, group: "in_possession" | "out_of_possession", side: TeamSide) {
  return report.phases
    .filter((phase) => phase.group === group)
    .sort((a, b) => ((side === "home" ? b.home : b.away) ?? -1) - ((side === "home" ? a.home : a.away) ?? -1))[0] ?? null;
}

function topPhases(report: MatchTechnicalReport, group: "in_possession" | "out_of_possession", side: TeamSide, count = 2) {
  return report.phases
    .filter((phase) => phase.group === group && (side === "home" ? phase.home : phase.away) != null)
    .sort((a, b) => ((side === "home" ? b.home : b.away) ?? 0) - ((side === "home" ? a.home : a.away) ?? 0))
    .slice(0, count);
}

function teamTechnicalAnalysis(side: TeamSide, match: WorldCupMatch, report: MatchTechnicalReport, formation: string | null) {
  const team = displayTeamName(side === "home" ? match.homeTeam : match.awayTeam);
  const opponent = displayTeamName(side === "home" ? match.awayTeam : match.homeTeam);
  const xg = reportMetric(report, "expected_goals");
  const attempts = reportMetric(report, "attempts_at_goal");
  const lineBreaks = reportMetric(report, "completed_line_breaks");
  const finalThird = reportMetric(report, "final_third_receptions");
  const progressions = reportMetric(report, "ball_progressions");
  const pressures = reportMetric(report, "defensive_pressures");
  const inPossession = topPhases(report, "in_possession", side)
    .map((phase) => `${phaseLabel(phase.label)} ${side === "home" ? phase.home : phase.away} %`)
    .join(" og ");
  const outOfPossession = topPhases(report, "out_of_possession", side)
    .map((phase) => `${phaseLabel(phase.label)} ${side === "home" ? phase.home : phase.away} %`)
    .join(" og ");

  return [
    `${team} ${formation ? `stod i ${formation}` : "mangler publisert formasjon"} mot ${opponent}.`,
    xg ? `Sjanseverdien var ${formatMetricWithDetail(xg, side)}, og skuddlinjen ${formatMetricWithDetail(attempts, side)} viser hvor ofte de kom til avslutning.` : null,
    lineBreaks ? `De fullførte ${formatMetricWithDetail(lineBreaks, side)} line breaks og hadde ${formatMetricWithDetail(finalThird, side)} mottak i siste tredjedel.` : null,
    progressions ? `Ballprogresjonene landet på ${formatMetricWithDetail(progressions, side)}, et mål på hvor ofte laget flyttet kampen fremover med kontroll.` : null,
    pressures ? `Uten ball registrerte FIFA ${formatMetricWithDetail(pressures, side)} defensive press, med direkte press i parentes.` : null,
    inPossession ? `Med ball var hovedfasene ${inPossession}.` : null,
    outOfPossession ? `Uten ball var tyngdepunktet ${outOfPossession}.` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

function fifaReportTurningPoints(match: WorldCupMatch, report: MatchTechnicalReport, events: MatchEvent[]) {
  const eventPoints = turningPoints(match, events).filter((point) => !point.includes("foreløpig"));
  if (eventPoints.length > 1 || goalEvents(events).length) return eventPoints;
  const points = [
    technicalMetricTheme(reportMetric(report, "expected_goals"), displayTeamName(match.homeTeam), displayTeamName(match.awayTeam), "sjansebildet mot"),
    technicalMetricTheme(reportMetric(report, "completed_line_breaks"), displayTeamName(match.homeTeam), displayTeamName(match.awayTeam), "det strukturelle bruddet mot"),
    technicalMetricTheme(reportMetric(report, "forced_turnovers"), displayTeamName(match.homeTeam), displayTeamName(match.awayTeam), "gjenvinningskampen mot"),
  ].filter((point): point is string => Boolean(point));
  return points.length ? points : [`Sluttresultatet ${formatScore(match.result?.homeGoals, match.result?.awayGoals)} står som kampens tydeligste bruddpunkt i FIFA-rapporten.`];
}

function technicalPlayerNotes(report: MatchTechnicalReport, events: MatchEvent[]) {
  const notes = report.playerHighlights.map((highlight) => {
    const value = highlight.value == null ? "" : ` ${formatMetricValue(highlight.value, highlight.unit ?? null)}`;
    const detail = highlight.detail ? ` (${highlight.detail})` : "";
    return `${highlight.playerName}: ${highlight.label}${value}${detail}.`;
  });
  return notes.length ? notes : playerNotes(events);
}

function fifaReportGraphicsNotes(match: WorldCupMatch, report: MatchTechnicalReport, lineup: MatchLineup | null): MatchAnalysis["graphicsNotes"] {
  const home = displayTeamName(match.homeTeam);
  const away = displayTeamName(match.awayTeam);
  const xg = reportMetric(report, "expected_goals");
  const lineBreaks = reportMetric(report, "completed_line_breaks");
  const pressures = reportMetric(report, "defensive_pressures");
  const winner = winnerSide(match);
  const lineBreakLeader = lineBreaks?.home != null && lineBreaks.away != null ? (lineBreaks.home >= lineBreaks.away ? "home" : "away") : winner;
  const pressureLeader = pressures?.home != null && pressures.away != null ? (pressures.home >= pressures.away ? "home" : "away") : winner;

  return {
    notes: [
      xg ? `xG: ${home} ${formatMetricValue(xg.home, xg.unit)} - ${away} ${formatMetricValue(xg.away, xg.unit)}.` : "xG-modellen vises når rapporten leverer tallet.",
      lineup?.formation.home || lineup?.formation.away
        ? `Formasjon: ${home} ${lineup?.formation.home ?? "-"} mot ${away} ${lineup?.formation.away ?? "-"}.`
        : "Formasjon hentes fra FIFA calendar API når den er publisert.",
      `Oppdatert ${formatAnalysisTimestamp(report.fetchedAt)} fra FIFA Training Centre.`,
    ],
    keyZones: [
      {
        x: lineBreakLeader === "away" ? 9 : 61,
        y: 14,
        width: 30,
        height: 23,
        label: "Line breaks",
        tone: lineBreakLeader === "away" ? "away" : lineBreakLeader === "home" ? "home" : "neutral",
      },
      {
        x: pressureLeader === "away" ? 9 : 61,
        y: 39,
        width: 30,
        height: 13,
        label: "Press",
        tone: pressureLeader === "away" ? "away" : pressureLeader === "home" ? "home" : "neutral",
      },
    ],
    arrows: [
      {
        from: lineBreakLeader === "away" ? { x: 72, y: 27 } : { x: 28, y: 27 },
        to: lineBreakLeader === "away" ? { x: 31, y: 27 } : { x: 69, y: 27 },
        label: "brudd",
        teamSide: lineBreakLeader === "away" ? "away" : lineBreakLeader === "home" ? "home" : "neutral",
      },
      {
        from: pressureLeader === "away" ? { x: 35, y: 45 } : { x: 65, y: 45 },
        to: pressureLeader === "away" ? { x: 19, y: 45 } : { x: 81, y: 45 },
        label: "press",
        teamSide: pressureLeader === "away" ? "away" : pressureLeader === "home" ? "home" : "neutral",
      },
    ],
  };
}

function phaseLabel(label: string) {
  const labels: Record<string, string> = {
    "Build Up Unopposed": "rolig oppbygging",
    "Build Up Opposed": "oppbygging under press",
    Progression: "progresjon",
    "Final Third": "siste tredjedel",
    "Long Ball": "lang ball",
    "Attacking Transition": "angrepstransisjon",
    "Counter Attack": "kontring",
    "Set Piece": "dødball",
    "High Press": "høyt press",
    "Mid Press": "midtpress",
    "Low Press": "lavt press",
    "High Block": "høy blokk",
    "Mid Block": "midtblokk",
    "Low Block": "lav blokk",
    Recovery: "gjenvinning",
    "Defensive Transition": "defensiv overgang",
    "Counter-press": "motpress",
  };
  return labels[label] ?? label.toLowerCase();
}

function formatAnalysisTimestamp(value: string | null | undefined) {
  if (!value) return "ukjent tidspunkt";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("nb-NO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Oslo",
  });
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
      goals.length ? `Målene flyttet rytmen: ${goals.slice(0, 3).map(formatEventNote).join("; ")}.` : "FIFA-rapporten ventes, så dette er et nøkternt førsteutkast.",
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
      {
        title: "FIFA Training Centre Match Report Hub",
        url: fifaTrainingCentreReportHubUrl,
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
