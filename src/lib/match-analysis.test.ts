import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PostMatchAnalysis } from "@/components/post-match-analysis";
import { getMatchAnalysisForMatch, parseMatchAnalyses, type MatchAnalysis } from "@/lib/match-analysis";
import { initialState } from "@/lib/state";
import type { MatchEvent, MatchStats, WorldCupMatch } from "@/lib/types";

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
});
