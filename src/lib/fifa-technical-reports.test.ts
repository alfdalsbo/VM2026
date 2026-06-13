import { describe, expect, it } from "vitest";

import {
  discoverFifaTechnicalReportLinks,
  parseFifaTechnicalReportText,
  syncFifaTechnicalReportsForState,
} from "@/lib/fifa-technical-reports";
import { initialState } from "@/lib/state";
import type { AppState, MatchResult, WorldCupMatch } from "@/lib/types";

const result: MatchResult = {
  homeGoals: 2,
  awayGoals: 0,
  decidedByPenalties: false,
  advancingTeam: null,
  updatedAt: "2026-06-11T21:00:00Z",
  updatedBy: "sync:fifa",
  source: "fifa",
};

const reportText = `
--- PAGE 3 ---
Match Summary - Key Statistics Mexico South Africa Possession Total 57.1% 6.8% 36.1% Total 2 Goals 0 1.78 xG (Expected Goals) 0.1 16 (4) Attempts at Goal (On Target) 3 (2) 547 (495) Total Passes (Complete) 351 (290) 90 % Pass Completion % 83 % 105 Completed Line Breaks 57 10 Defensive Line Breaks 3 117 Receptions in the Final Third 36 13 Crosses 8 23 Ball Progressions 8 170 (26) Defensive Pressures Applied (Direct Pressures) 306 (45) 31 Forced Turnovers 32 56 Second Balls 45 107.3 km Total Distance Covered 97.1 km 5.3 km Zone 4 – Low Speed Sprinting: 20-25 km/h 5.1 km
--- PAGE 4 ---
Mexico Phases of Play South Africa IN POSSESSION 47% Build Up Unopposed 43% 13% Build Up Opposed 13% 16% Progression 14% 11% Final Third 7% 3% Long Ball 6% 10% Attacking Transition 12% 1% Counter Attack 2% 5% Set Piece 5% OUT OF POSSESSION 9% High Press 6% 3% Mid Press 3% 0% Low Press 1% 7% High Block 5% 25% Mid Block 30% 11% Low Block 14% 5% Recovery 2% 12% Defensive Transition 10% 8% Counter-press 7%
--- PAGE 15 ---
Attempts at Goal Mexico Time Player Outcome Body Part Delivery Type 8 Julian QUINONES On Target - Goal Right Foot Loose Ball 66 Raul JIMENEZ On Target - Goal Head Cross
--- PAGE 20 ---
Offering to Receive Mexico 424 Total Offers Made 166 Total Offers Received Most Offers 54 Julian QUINONES
--- PAGE 29 ---
Defensive Pressure Mexico South Africa 170 Total Pressures 306 26 Direct Pressures 45 Most Direct Pressures 4 Roberto ALVARADO Most Direct Pressures 8 Mbekezeli MBOKAZI
`;

function finishedState(): AppState {
  const state = initialState();
  return {
    ...state,
    matches: state.matches.map((match) => (match.id === "m001" ? { ...match, status: "finished", result } : match)),
  };
}

function match(): WorldCupMatch {
  return finishedState().matches.find((item) => item.id === "m001")!;
}

describe("FIFA technical reports", () => {
  it("discovers Training Centre PDF links by match number", () => {
    const links = discoverFifaTechnicalReportLinks(`
      <a href="/media/native/tournaments/fifa-world-cup/2026/PMSR-M01 MEX V RSA.pdf">MEX Mexico 2 - 0 South Africa RSA</a>
      <a href="/media/native/tournaments/fifa-world-cup/2026/PMSR-M02 KOR V CZE .pdf">KOR Korea Republic 2 - 1 Czechia CZE</a>
      <a href="/media/native/tournaments/fifa-world-cup/2026/PMSR-M03-CAN-V-BIH.pdf">CAN Canada 1 - 1 Bosnia and Herzegovina BIH</a>
    `);

    expect(links.map((link) => link.matchNumber)).toEqual([1, 2, 3]);
    expect(links[0].url).toBe("https://www.fifatrainingcentre.com/media/native/tournaments/fifa-world-cup/2026/PMSR-M01%20MEX%20V%20RSA.pdf");
  });

  it("parses key stats, phases and player highlights from report text", () => {
    const report = parseFifaTechnicalReportText({
      match: match(),
      sourceUrl: "https://www.fifatrainingcentre.com/report.pdf",
      fetchedAt: "2026-06-12T08:00:00Z",
      text: reportText,
    });

    expect(report.parseStatus).toBe("complete");
    expect(report.metrics.find((metric) => metric.key === "expected_goals")).toMatchObject({ home: 1.78, away: 0.1 });
    expect(report.metrics.find((metric) => metric.key === "attempts_at_goal")).toMatchObject({
      home: 16,
      away: 3,
      homeDetail: 4,
      awayDetail: 2,
    });
    expect(report.metrics.find((metric) => metric.key === "completed_line_breaks")).toMatchObject({ home: 105, away: 57 });
    expect(report.phases.find((phase) => phase.label === "Build Up Unopposed")).toMatchObject({ home: 47, away: 43 });
    expect(report.playerHighlights.some((highlight) => highlight.playerName === "Julian Quinones")).toBe(true);
  });

  it("adds reports to finished matches during sync", async () => {
    const state = finishedState();
    const fetcher = async (url: RequestInfo | URL) => {
      const href = String(url);
      if (href.includes("match-report-hub")) {
        return new Response(
          `<a href="/media/native/tournaments/fifa-world-cup/2026/PMSR-M01 MEX V RSA.pdf">MEX Mexico 2 - 0 South Africa RSA</a>`,
          { status: 200 },
        );
      }
      return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
    };

    const synced = await syncFifaTechnicalReportsForState(state, {
      fetcher: fetcher as typeof fetch,
      syncedAt: "2026-06-12T08:00:00Z",
      extractPdfText: async () => reportText,
    });

    expect(synced.updatedReports).toBe(1);
    expect(synced.state.matchTechnicalReports[0]).toMatchObject({
      matchId: "m001",
      parseStatus: "complete",
    });
  });
});
