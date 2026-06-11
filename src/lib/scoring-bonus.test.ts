import { describe, expect, it } from "vitest";

import { initialState } from "@/lib/state";
import { BONUS_TIPS_RESULT_AWARDS, computeBonusTipStandings, computeStandings, scorePrediction } from "@/lib/scoring";
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
    redCardsTotal: 0,
    updatedAt: "2026-06-11T19:20:00Z",
    ...overrides,
  };
}

function finishedResult() {
  return {
    homeGoals: 1,
    awayGoals: 0,
    decidedByPenalties: false,
    advancingTeam: null,
    updatedAt: "2026-07-19T21:00:00Z",
    updatedBy: "test",
    source: "manual" as const,
  };
}

function withFinishedMatches(state: AppState, matchIds: string[]) {
  const finished = new Set(matchIds);
  return {
    ...state,
    matches: state.matches.map((match) =>
      finished.has(match.id)
        ? {
            ...match,
            status: "finished" as const,
            result: finishedResult(),
          }
        : match,
    ),
  };
}

function withCompletedTournament(state: AppState) {
  return {
    ...state,
    matches: state.matches.map((match) => ({
      ...match,
      status: "finished" as const,
      result: finishedResult(),
    })),
  };
}

function withRealSquad(state: AppState, teamName: string): AppState {
  return {
    ...state,
    teamProfiles: state.teamProfiles.map((profile) =>
      profile.teamName === teamName
        ? {
            ...profile,
            squad: profile.squad.map((player) => ({ ...player, source: "FIFA public squad API" })),
          }
        : profile,
    ),
  };
}

describe("bonus scoring", () => {
  it("keeps scorer and assist points outside the official table score", () => {
    const base = withRealSquad(initialState(), "Mexico");
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
    expect(score.total).toBe(3);
    expect(score.bonus).toBe(4);
    expect(score.grandTotal).toBe(7);

    const standing = computeStandings(state).find((row) => row.player.id === "alf")!;
    expect(standing.totalPoints).toBe(3);
    expect(standing.resultTipPoints).toBe(3);
    expect(standing.bonusPoints).toBe(4);
    expect(standing.matchBonusPoints).toBe(4);
    expect(standing.liveBonusPoints).toBe(0);
  });

  it("ignores placeholder squad names in scorer and assist scoring", () => {
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
    };
    const match = state.matches.find((item) => item.id === "m001")!;

    expect(scorePrediction(match, tip, state).bonus).toBe(0);
  });

  it("combines match bonus and live bonus in one bonustips table", () => {
    const base = withRealSquad(initialState(), "Mexico");
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
    expect(alf.points).toBe(4);
    expect(alf.matchBonusPoints).toBe(2);
    expect(alf.liveBonusPoints).toBe(2);
    expect(alf.tips).toBe(2);
  });

  it("previews top three bonustips awards without changing the result table before the tournament is complete", () => {
    const state: AppState = {
      ...withFinishedMatches(initialState(), ["m001", "m002", "m003"]),
      livePotTips: [
        liveTip({ playerId: "alf", matchId: "m001" }),
        liveTip({ playerId: "alf", matchId: "m002" }),
        liveTip({ playerId: "alf", matchId: "m003" }),
        liveTip({ playerId: "anders", matchId: "m001" }),
        liveTip({ playerId: "anders", matchId: "m002" }),
        liveTip({ playerId: "danny", matchId: "m001" }),
      ],
    };

    const standings = computeStandings(state);
    const alf = standings.find((row) => row.player.id === "alf")!;
    const anders = standings.find((row) => row.player.id === "anders")!;
    const danny = standings.find((row) => row.player.id === "danny")!;
    const fredrik = standings.find((row) => row.player.id === "fredrik")!;

    expect([alf.bonusAwardPreview, anders.bonusAwardPreview, danny.bonusAwardPreview]).toEqual(BONUS_TIPS_RESULT_AWARDS);
    expect(fredrik.bonusAwardPreview).toBe(0);
    expect(alf.bonusWinnerAward).toBe(0);
    expect(alf.totalPoints).toBe(0);
  });

  it("awards the top three bonustips players result points when the tournament is complete", () => {
    const state: AppState = {
      ...withCompletedTournament(initialState()),
      livePotTips: [
        liveTip({ playerId: "alf", matchId: "m001" }),
        liveTip({ playerId: "alf", matchId: "m002" }),
        liveTip({ playerId: "alf", matchId: "m003" }),
        liveTip({ playerId: "anders", matchId: "m001" }),
        liveTip({ playerId: "anders", matchId: "m002" }),
        liveTip({ playerId: "danny", matchId: "m001" }),
      ],
    };

    const standings = computeStandings(state);
    const alf = standings.find((row) => row.player.id === "alf")!;
    const anders = standings.find((row) => row.player.id === "anders")!;
    const danny = standings.find((row) => row.player.id === "danny")!;

    expect([alf.bonusWinnerAward, anders.bonusWinnerAward, danny.bonusWinnerAward]).toEqual(BONUS_TIPS_RESULT_AWARDS);
    expect(alf.totalPoints).toBe(10);
    expect(anders.totalPoints).toBe(5);
    expect(danny.totalPoints).toBe(3);
  });

  it("gives tied bonustips ranks the same result award and skips the next rank", () => {
    const state: AppState = {
      ...withFinishedMatches(initialState(), ["m001", "m002"]),
      livePotTips: [
        liveTip({ playerId: "alf", matchId: "m001" }),
        liveTip({ playerId: "alf", matchId: "m002" }),
        liveTip({ playerId: "anders", matchId: "m001" }),
        liveTip({ playerId: "anders", matchId: "m002" }),
        liveTip({ playerId: "danny", matchId: "m001" }),
      ],
    };

    const standings = computeStandings(state);
    const alf = standings.find((row) => row.player.id === "alf")!;
    const anders = standings.find((row) => row.player.id === "anders")!;
    const danny = standings.find((row) => row.player.id === "danny")!;

    expect(alf.bonusAwardPreview).toBe(10);
    expect(anders.bonusAwardPreview).toBe(10);
    expect(danny.bonusAwardPreview).toBe(3);
  });
});
