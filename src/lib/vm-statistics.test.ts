import { describe, expect, it } from "vitest";

import { initialState } from "@/lib/state";
import type { AppState, LivePotTip, MatchEvent, Prediction, WorldCupMatch } from "@/lib/types";
import { buildWorldCupStatistics } from "@/lib/vm-statistics";

const now = new Date("2026-06-10T12:00:00Z");
const updatedAt = "2026-06-11T21:00:00Z";

describe("buildWorldCupStatistics", () => {
  it("handles the pre-tournament state without pretending FIFA stats exist", () => {
    const stats = buildWorldCupStatistics(initialState(), now);

    expect(stats.overview.cards[0]).toMatchObject({
      label: "Kamper dømt",
      value: "0/104",
    });
    expect(stats.hallOfFame.rows[0]).toMatchObject({
      title: "Første eksakte",
      value: "Ikke utdelt",
    });
    expect(stats.officialStats.sourceDetail).toContain("Gratis FIFA-data");
  });

  it("uses the same 0-0 default as scoring for effective tips", () => {
    const state = finishMatch(initialState(), "m001", 0, 0);
    const stats = buildWorldCupStatistics(state, now);

    expect(stats.playerRecords.cards[0].value).toBe("Alf Kåre");
    expect(stats.playerRecords.cards[0].detail).toContain("0 levert");
    expect(stats.hallOfFame.rows[0].detail).toContain("0-0-standarden");
  });

  it("keeps delivered tips separate from effective 0-0 tips", () => {
    const state = withPredictions(
      initialState(),
      prediction("alf", "m002", 3, 1),
      prediction("anders", "m002", 0, 0),
    );

    const stats = buildWorldCupStatistics(state, now);
    const alfRow = stats.playerRecords.rows.find((row) => row.title === "Alf Kåre");

    expect(alfRow?.detail).toContain("1 levert");
    expect(alfRow?.detail).toContain("104 effektive");
    expect(stats.matchDrama.cards[0].detail).toContain("2 leverte tips");
  });

  it("finds exact hits and team bias from finished matches", () => {
    const state = withPredictions(
      finishMatch(initialState(), "m001", 2, 1),
      prediction("alf", "m001", 2, 1),
      prediction("anders", "m001", 3, 0),
      prediction("danny", "m001", 0, 1),
    );

    const stats = buildWorldCupStatistics(state, now);

    expect(stats.hallOfFame.rows[0]).toMatchObject({
      title: "Første eksakte",
      value: "Alf Kåre",
    });
    expect(stats.teamBias.cards.find((card) => card.label === "Mest overvurdert")?.value).toBe("Sør-Afrika");
    expect(stats.teamBias.cards.find((card) => card.label === "Mest undervurdert")?.value).toBe("Mexico");
  });

  it("includes live card data and live table swings", () => {
    const state = withLivePotTips(
      withEvents(withMatch(initialState(), "m001", { status: "live", result: result(1, 0) }), yellowEvent("m001"), redEvent("m001")),
      {
        playerId: "alf",
        matchId: "m001",
        yellowCardsTotal: 1,
        redCardsTotal: 1,
        updatedAt,
      },
    );

    const stats = buildWorldCupStatistics(state, now);

    expect(stats.overview.cards.find((card) => card.label === "Kortregnskap")?.detail).toBe("1 gule · 1 røde. Kortjuristene følger med.");
    expect(stats.matchDrama.rows.find((row) => row.title === "Hvis dette står seg")).toBeTruthy();
  });
});

function withMatch(state: AppState, matchId: string, patch: Partial<WorldCupMatch>): AppState {
  return {
    ...state,
    matches: state.matches.map((match) => (match.id === matchId ? { ...match, ...patch } : match)),
  };
}

function finishMatch(state: AppState, matchId: string, homeGoals: number, awayGoals: number): AppState {
  return withMatch(state, matchId, {
    status: "finished",
    result: result(homeGoals, awayGoals),
  });
}

function result(homeGoals: number, awayGoals: number): WorldCupMatch["result"] {
  return {
    homeGoals,
    awayGoals,
    decidedByPenalties: false,
    advancingTeam: null,
    updatedAt,
    updatedBy: "test",
    source: "manual",
  };
}

function prediction(playerId: string, matchId: string, homeGoals: number, awayGoals: number): Prediction {
  return {
    playerId,
    matchId,
    homeGoals,
    awayGoals,
    outcome: homeGoals > awayGoals ? "home" : awayGoals > homeGoals ? "away" : "draw",
    knockoutResolution: null,
    homeScorers: [],
    awayScorers: [],
    homeAssists: [],
    awayAssists: [],
    updatedAt,
  };
}

function withPredictions(state: AppState, ...predictions: Prediction[]): AppState {
  return {
    ...state,
    predictions,
  };
}

function withEvents(state: AppState, ...events: MatchEvent[]): AppState {
  return {
    ...state,
    matchEvents: events,
  };
}

function withLivePotTips(state: AppState, ...livePotTips: LivePotTip[]): AppState {
  return {
    ...state,
    livePotTips,
  };
}

function yellowEvent(matchId: string): MatchEvent {
  return {
    id: `${matchId}-yellow`,
    matchId,
    minute: 12,
    period: "first",
    type: "yellow_card",
    teamSide: "home",
    playerId: null,
    playerProfileId: null,
    playerName: "Kort Kandidat",
    assistPlayerName: null,
    relatedPlayerName: null,
    scoreAfter: null,
    source: "manual",
    updatedAt,
  };
}

function redEvent(matchId: string): MatchEvent {
  return {
    id: `${matchId}-red`,
    matchId,
    minute: 44,
    period: "first",
    type: "red_card",
    teamSide: "away",
    playerId: null,
    playerProfileId: null,
    playerName: "Dusj Før Pause",
    assistPlayerName: null,
    relatedPlayerName: null,
    scoreAfter: null,
    source: "manual",
    updatedAt,
  };
}
