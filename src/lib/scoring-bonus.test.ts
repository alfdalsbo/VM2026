import { describe, expect, it } from "vitest";

import { initialState } from "@/lib/state";
import { BONUS_TIPS_WINNER_AWARD, computeBonusTipStandings, computeStandings, scorePrediction } from "@/lib/scoring";
import type { AppState, LivePotTip, MatchEvent, Prediction } from "@/lib/types";

function prediction(overrides: Partial<Prediction> = {}): Prediction {
  return {
    playerId: "alf",
    matchId: "m001",
    homeGoals: 1,
    awayGoals: 0,
    knockoutResolution: null,
    homeScorers: [],
    homeAssists: [],
    updatedAt: "2026-06-01T10:00:00Z",
    ...overrides,
  };
}

function liveTip(overrides: Partial<LivePotTip> = {}): LivePotTip {
  return {
    playerId: "alf",
    matchId: "m001",
    yellowCardsTotal: 0,
    redCard: "no",
    updatedAt: "2026-06-11T19:20:00Z",
    ...overrides,
  };
}

describe("bonus scoring", () => {
  it("keeps scorer and assist points outside the official table score", () => {
    const base = initialState();
    const seedMatch = base.matches.find((match) => match.id === "m001")!;
    const homeSquad = base.teamProfiles.find((profile) => profile.teamName === seedMatch.homeTeam)!.squad;
    const scorer = homeSquad[0];
    const assister = homeSquad[1];
    const tip = prediction({ homeScorers: [scorer.id], homeAssists: [assister.id] });
    const result = {
      homeGoals: 1,
      awayGoals: 0,
      decidedByPenalties: false,
      advancingTeam: null,
      updatedAt: "2026-06-11T21:00:00Z",
      updatedBy: "test",
      source: "manual" as const,
    };
    const event: MatchEvent = {
      id: "goal-1",
      matchId: "m001",
      minute: 12,
      period: "first_half",
      type: "goal",
      teamSide: "home",
      playerId: scorer.id,
      playerProfileId: null,
      playerName: scorer.name,
      assistPlayerName: assister.name,
      relatedPlayerName: null,
      scoreAfter: { homeGoals: 1, awayGoals: 0 },
      source: "manual",
      updatedAt: "2026-06-11T19:12:00Z",
    };
    const state: AppState = {
      ...base,
      matches: base.matches.map((match) => (match.id === "m001" ? { ...match, status: "finished", result } : match)),
      predictions: [tip],
      matchEvents: [event],
    };
    const match = state.matches.find((item) => item.id === "m001")!;

    const score = scorePrediction(match, tip, state);
    expect(score.total).toBe(10);
    expect(score.bonus).toBe(3);
    expect(score.grandTotal).toBe(13);

    const standing = computeStandings(state).find((row) => row.player.id === "alf")!;
    expect(standing.totalPoints).toBe(10);
    expect(standing.resultTipPoints).toBe(10);
    expect(standing.bonusPoints).toBe(3);
    expect(standing.matchBonusPoints).toBe(3);
    expect(standing.liveBonusPoints).toBe(0);
  });

  it("combines match bonus and live bonus in one bonustips table", () => {
    const base = initialState();
    const seedMatch = base.matches.find((match) => match.id === "m001")!;
    const homeSquad = base.teamProfiles.find((profile) => profile.teamName === seedMatch.homeTeam)!.squad;
    const scorer = homeSquad[0];
    const tip = prediction({ homeScorers: [scorer.id] });
    const result = {
      homeGoals: 1,
      awayGoals: 0,
      decidedByPenalties: false,
      advancingTeam: null,
      updatedAt: "2026-06-11T21:00:00Z",
      updatedBy: "test",
      source: "manual" as const,
    };
    const event: MatchEvent = {
      id: "goal-1",
      matchId: "m001",
      minute: 12,
      period: "first_half",
      type: "goal",
      teamSide: "home",
      playerId: scorer.id,
      playerProfileId: null,
      playerName: scorer.name,
      assistPlayerName: null,
      relatedPlayerName: null,
      scoreAfter: { homeGoals: 1, awayGoals: 0 },
      source: "manual",
      updatedAt: "2026-06-11T19:12:00Z",
    };
    const state: AppState = {
      ...base,
      matches: base.matches.map((match) => (match.id === "m001" ? { ...match, status: "finished", result } : match)),
      predictions: [tip],
      matchEvents: [event],
      livePotTips: [liveTip()],
    };

    const standings = computeBonusTipStandings(state);
    const alf = standings.find((row) => row.player.id === "alf")!;
    expect(alf.points).toBe(6);
    expect(alf.matchBonusPoints).toBe(2);
    expect(alf.liveBonusPoints).toBe(4);
    expect(alf.tips).toBe(2);
  });

  it("awards the bonustips winner 10 result points when the tournament is complete", () => {
    const base = initialState();
    const finishedState: AppState = {
      ...base,
      matches: base.matches.map((match) => ({
        ...match,
        status: "finished" as const,
        result: {
          homeGoals: 0,
          awayGoals: 0,
          decidedByPenalties: false,
          advancingTeam: null,
          updatedAt: "2026-07-19T21:00:00Z",
          updatedBy: "test",
          source: "manual" as const,
        },
      })),
      livePotTips: [liveTip()],
    };

    const standing = computeStandings(finishedState).find((row) => row.player.id === "alf")!;
    expect(standing.resultTipPoints).toBe(0);
    expect(standing.bonusPoints).toBe(4);
    expect(standing.bonusWinnerAward).toBe(BONUS_TIPS_WINNER_AWARD);
    expect(standing.totalPoints).toBe(BONUS_TIPS_WINNER_AWARD);
  });
});
