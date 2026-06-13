import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PostMatchAnalysis } from "@/components/post-match-analysis";
import { getMatchAnalysisForMatch, parseMatchAnalyses, type MatchAnalysis } from "@/lib/match-analysis";
import { initialState } from "@/lib/state";
import type { MatchEvent, MatchStats, MatchTechnicalReport, WorldCupMatch } from "@/lib/types";

const result = {
  homeGoals: 2,
  awayGoals: 1,
  decidedByPenalties: false,
  advancingTeam: null,
  updatedAt: "2026-06-11T21:00:00Z",
  updatedBy: "sync:fifa",
  source: "fifa" as const,
};

function finishedMatch(): WorldCupMatch {
  return {
    ...initialState().matches[0],
    status: "finished",
    result,
  };
}

function sampleAnalysis(overrides: Partial<MatchAnalysis> = {}): MatchAnalysis {
  return {
    matchId: "m001",
    updatedAt: "2026-06-12T05:30:00Z",
    status: "preliminary",
    headline: "Mexico tok styringen etter pause",
    summary: "En tett kamp fikk et tydeligere taktisk bilde da Mexico flyttet laget høyere.",
    tacticalThemes: ["Mexico presset høyere etter ledermålet."],
    homeAnalysis: "Mexico brukte ballen tålmodig og kom oftere til avslutning.",
    awayAnalysis: "Sør-Afrika måtte forsvare lavere etter hvert.",
    turningPoints: ["48': mål Alvarez (1-0)"],
    playerNotes: ["Alvarez satte retningen."],
    graphicsNotes: {
      notes: ["Tavlen markerer Mexicos høyreside."],
      keyZones: [{ x: 62, y: 18, width: 28, height: 24, label: "Trykksone", tone: "home" }],
      arrows: [{ from: { x: 35, y: 34 }, to: { x: 76, y: 34 }, label: "Press", teamSide: "home" }],
    },
    sources: [{ title: "FIFA Training Centre", url: "https://inside.fifa.com/talent-development/technical-study-group", publisher: "FIFA" }],
    ...overrides,
  };
}

function sampleTechnicalReport(): MatchTechnicalReport {
  return {
    matchId: "m001",
    sourceUrl: "https://www.fifatrainingcentre.com/media/native/tournaments/fifa-world-cup/2026/PMSR-M01%20MEX%20V%20RSA.pdf",
    fetchedAt: "2026-06-12T08:00:00Z",
    parsedAt: "2026-06-12T08:01:00Z",
    parseStatus: "complete",
    unavailableReason: null,
    metrics: [
      { key: "possession", label: "Ballbesittelse", home: 57.1, away: 36.1, unit: "%" },
      { key: "expected_goals", label: "xG", home: 1.78, away: 0.1, unit: null },
      { key: "attempts_at_goal", label: "Avslutninger", home: 16, away: 3, unit: null, homeDetail: 4, awayDetail: 2 },
      { key: "completed_line_breaks", label: "Fullførte line breaks", home: 105, away: 57, unit: null },
      { key: "final_third_receptions", label: "Mottak i siste tredjedel", home: 117, away: 36, unit: null },
      { key: "ball_progressions", label: "Ballprogresjoner", home: 23, away: 8, unit: null },
      { key: "defensive_pressures", label: "Defensive press", home: 170, away: 306, unit: null, homeDetail: 26, awayDetail: 45 },
      { key: "forced_turnovers", label: "Fremprovoserte brudd", home: 31, away: 32, unit: null },
    ],
    phases: [
      { group: "in_possession", label: "Build Up Unopposed", home: 47, away: 43 },
      { group: "in_possession", label: "Progression", home: 16, away: 14 },
      { group: "in_possession", label: "Final Third", home: 11, away: 7 },
      { group: "out_of_possession", label: "High Press", home: 9, away: 6 },
      { group: "out_of_possession", label: "Mid Block", home: 25, away: 30 },
      { group: "out_of_possession", label: "Defensive Transition", home: 12, away: 10 },
    ],
    playerHighlights: [
      { playerName: "Julian Quinones", teamSide: "home", label: "flest pasningstilbud", value: 54, unit: "tilbud" },
      { playerName: "Mbekezeli Mbokazi", teamSide: "away", label: "flest direkte press", value: 8, unit: "direkte press" },
    ],
    notes: ["Rapport importert."],
  };
}

const stats: MatchStats = {
  matchId: "m001",
  homePossession: 58,
  awayPossession: 42,
  homeShots: 13,
  awayShots: 7,
  homeShotsOnTarget: 5,
  awayShotsOnTarget: 2,
  homeCorners: 6,
  awayCorners: 3,
  attendance: 72000,
  weather: null,
  temperatureCelsius: null,
  windSpeed: null,
  officials: [],
  homeFormation: "4-3-3",
  awayFormation: "4-2-3-1",
  firstHalfStartedAt: null,
  secondHalfStartedAt: null,
  firstHalfExtraTimeStartedAt: null,
  secondHalfExtraTimeStartedAt: null,
  source: "FIFA public calendar API",
  updatedAt: "2026-06-11T21:00:00Z",
};

const events: MatchEvent[] = [
  {
    id: "m001-48-goal",
    matchId: "m001",
    minute: 48,
    period: "second_half",
    type: "goal",
    teamSide: "home",
    playerId: "alvarez",
    playerProfileId: null,
    playerName: "Alvarez",
    assistPlayerName: "Lozano",
    relatedPlayerName: null,
    scoreAfter: { homeGoals: 1, awayGoals: 0 },
    source: "fifa",
    updatedAt: "2026-06-11T20:10:00Z",
  },
];

describe("match analysis data", () => {
  it("validates stored analyses and rejects unknown statuses", () => {
    expect(parseMatchAnalyses([sampleAnalysis()])).toHaveLength(1);
    expect(parseMatchAnalyses([sampleAnalysis({ status: "external_fallback" })])).toHaveLength(1);
    expect(parseMatchAnalyses([sampleAnalysis({ status: "fifa_report" })])).toHaveLength(1);
    expect(() => parseMatchAnalyses([{ ...sampleAnalysis(), status: "paid_feed" }])).toThrow();
  });

  it("does not show an analysis before the match is finished", () => {
    const match = initialState().matches[0];
    expect(getMatchAnalysisForMatch({ match, stats: null, lineup: null, events: [] })).toBeNull();
  });

  it("builds a preliminary free-data analysis when no stored analysis exists", () => {
    const analysis = getMatchAnalysisForMatch({
      match: finishedMatch(),
      stats,
      lineup: null,
      events,
      storedAnalyses: [],
      now: new Date("2026-06-12T05:30:00Z"),
    });

    expect(analysis).toMatchObject({
      matchId: "m001",
      status: "preliminary",
    });
    expect(analysis?.summary).toContain("Kjellerens foreløpige kampbilde");
    expect(analysis?.graphicsNotes.arrows.length).toBeGreaterThan(0);
  });

  it("prefers a TSG-enriched stored analysis after full time", () => {
    const analysis = getMatchAnalysisForMatch({
      match: finishedMatch(),
      stats,
      lineup: null,
      events,
      storedAnalyses: [sampleAnalysis({ status: "tsg_enriched" })],
    });

    expect(analysis?.status).toBe("tsg_enriched");
    expect(analysis?.sources[0].publisher).toBe("FIFA");
  });

  it("builds an automatic FIFA report analysis from technical report data", () => {
    const analysis = getMatchAnalysisForMatch({
      match: finishedMatch(),
      stats,
      lineup: null,
      events,
      technicalReport: sampleTechnicalReport(),
      storedAnalyses: [],
      now: new Date("2026-06-12T09:00:00Z"),
    });

    expect(analysis).toMatchObject({
      matchId: "m001",
      status: "fifa_report",
      technicalReport: { parseStatus: "complete" },
    });
    expect(analysis?.summary).toContain("FIFA-rapporten");
    expect(analysis?.summary).toContain("xG");
    expect(analysis?.sources[0].publisher).toBe("FIFA Training Centre");
  });

  it("uses API-Football as a richer provisional analysis before the FIFA report arrives", () => {
    const analysis = getMatchAnalysisForMatch({
      match: finishedMatch(),
      stats: { ...stats, source: "API-Football foreløpig", updatedAt: "2026-06-12T06:00:00Z" },
      lineup: null,
      events: [{ ...events[0], source: "api_football", updatedAt: "2026-06-12T06:01:00Z" }],
      storedAnalyses: [],
      now: new Date("2026-06-12T09:00:00Z"),
    });

    expect(analysis).toMatchObject({
      matchId: "m001",
      status: "external_fallback",
    });
    expect(analysis?.summary).toContain("API-Football foreløpig");
    expect(analysis?.sources[0].publisher).toBe("API-Football");
  });

  it("still prefers the FIFA technical report over API-Football fallback data", () => {
    const analysis = getMatchAnalysisForMatch({
      match: finishedMatch(),
      stats: { ...stats, source: "API-Football foreløpig" },
      lineup: null,
      events: [{ ...events[0], source: "api_football" }],
      technicalReport: sampleTechnicalReport(),
      storedAnalyses: [],
      now: new Date("2026-06-12T09:00:00Z"),
    });

    expect(analysis?.status).toBe("fifa_report");
  });
});

describe("PostMatchAnalysis", () => {
  it("renders a non-empty SVG board with source links", () => {
    const html = renderToStaticMarkup(
      React.createElement(PostMatchAnalysis, {
        analysis: sampleAnalysis({ status: "tsg_enriched" }),
        match: finishedMatch(),
        stats,
        lineup: null,
        events,
      }),
    );

    expect(html).toContain("Taktisk rapport");
    expect(html).toContain("TSG-beriket");
    expect(html).toContain("<svg");
    expect(html).toContain("FIFA Training Centre");
  });

  it("renders FIFA report models when technical report data exists", () => {
    const analysis = getMatchAnalysisForMatch({
      match: finishedMatch(),
      stats,
      lineup: null,
      events,
      technicalReport: sampleTechnicalReport(),
      storedAnalyses: [],
    });

    const html = renderToStaticMarkup(
      React.createElement(PostMatchAnalysis, {
        analysis: analysis!,
        match: finishedMatch(),
        stats,
        lineup: null,
        events,
      }),
    );

    expect(html).toContain("FIFA-rapport");
    expect(html).toContain("xG og avslutninger");
    expect(html).toContain("Faser i spill");
    expect(html).toContain("Fullførte line breaks");
  });

  it("renders API-Football fallback as a distinct provisional source", () => {
    const analysis = getMatchAnalysisForMatch({
      match: finishedMatch(),
      stats: { ...stats, source: "API-Football foreløpig" },
      lineup: null,
      events: [{ ...events[0], source: "api_football" }],
      storedAnalyses: [],
    });

    const html = renderToStaticMarkup(
      React.createElement(PostMatchAnalysis, {
        analysis: analysis!,
        match: finishedMatch(),
        stats,
        lineup: null,
        events,
      }),
    );

    expect(html).toContain("API-Football foreløpig");
    expect(html).toContain("Fixtures, events, lineups and statistics");
  });
});
