import { describe, expect, it } from "vitest";

import { derivePlayerProfilesFromState } from "@/lib/player-profiles";
import { computeBonusTipStandings, computeStandings } from "@/lib/scoring";
import { initialState } from "@/lib/state";
import { teamSlug } from "@/lib/teams";
import {
  deriveTournamentBonusResult,
  getTournamentBonusPlayerOptions,
  saveTournamentBonusPredictionInState,
  scoreTournamentBonusPrediction,
} from "@/lib/tournament-bonus";
import type { AppState, MatchEvent, TournamentBonusPrediction } from "@/lib/types";

function withRealSquad(state: AppState, teamName: string): AppState {
  const next = {
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
  return {
    ...next,
    playerProfiles: derivePlayerProfilesFromState(next, "2026-06-01T10:00:00Z"),
  };
}

function tournamentPrediction(overrides: Partial<TournamentBonusPrediction> = {}): TournamentBonusPrediction {
  return {
    playerId: "alf",
    winnerTeamSlug: teamSlug("Mexico"),
    topScorerPlayerProfileId: "fifa-10",
    assistKingPlayerProfileId: "fifa-11",
    updatedAt: "2026-06-01T10:00:00Z",
    ...overrides,
  };
}

describe("tournament bonus", () => {
  it("saves valid tournament bonus tips before first kickoff and locks after kickoff", () => {
    const base = withRealSquad(initialState(), "Mexico");
    const options = getTournamentBonusPlayerOptions(base);
    const prediction = tournamentPrediction({
      topScorerPlayerProfileId: options[0].id,
      assistKingPlayerProfileId: options[1].id,
    });

    const updated = saveTournamentBonusPredictionInState(base, prediction, new Date("2026-06-01T12:00:00Z"));
    expect(updated.tournamentBonusPredictions).toEqual([prediction]);
    expect(() =>
      saveTournamentBonusPredictionInState(base, prediction, new Date("2026-06-12T12:00:00Z")),
    ).toThrow("Turneringsbonusen er låst");
  });

  it("scores winner, shared top scorer and assist king as bonus points", () => {
    const base = withRealSquad(initialState(), "Mexico");
    const options = getTournamentBonusPlayerOptions(base);
    const prediction = tournamentPrediction({
      topScorerPlayerProfileId: options[1].id,
      assistKingPlayerProfileId: options[0].id,
    });
    const state: AppState = {
      ...base,
      tournamentBonusPredictions: [prediction],
      tournamentBonusResult: {
        winnerTeamSlug: teamSlug("Mexico"),
        winnerTeamName: "Mexico",
        topScorerPlayerProfileIds: [options[0].id, options[1].id],
        topScorers: [
          { playerProfileId: options[0].id, playerName: options[0].name, teamName: "Mexico", value: 6 },
          { playerProfileId: options[1].id, playerName: options[1].name, teamName: "Mexico", value: 6 },
        ],
        assistKingPlayerProfileIds: [options[0].id],
        assistKings: [{ playerProfileId: options[0].id, playerName: options[0].name, teamName: "Mexico", value: 4 }],
        updatedAt: "2026-07-20T10:00:00Z",
        source: "test",
        unavailableReason: null,
      },
    };

    const score = scoreTournamentBonusPrediction(state, prediction);
    expect(score).toEqual({ winner: 15, topScorer: 10, assistKing: 10, total: 35 });

    const bonusStanding = computeBonusTipStandings(state).find((row) => row.player.id === "alf")!;
    expect(bonusStanding.points).toBe(35);
    expect(bonusStanding.tournamentBonusPoints).toBe(35);
    expect(bonusStanding.tournamentBonusTips).toBe(1);

    const regularStanding = computeStandings(state).find((row) => row.player.id === "alf")!;
    expect(regularStanding.resultTipPoints).toBe(0);
    expect(regularStanding.totalPoints).toBe(0);
    expect(regularStanding.bonusPoints).toBe(35);
  });

  it("derives tournament bonus result from the final and event fallback stats", () => {
    const base = withRealSquad(withRealSquad(initialState(), "Mexico"), "South Africa");
    const mexicoPlayers = getTournamentBonusPlayerOptions(base).filter((player) => player.teamName === "Mexico");
    const final = base.matches.find((match) => match.stage === "final")!;
    const resultMatch = {
      ...final,
      homeTeam: "Mexico",
      awayTeam: "South Africa",
      status: "finished" as const,
      result: {
        homeGoals: 2,
        awayGoals: 1,
        decidedByPenalties: false,
        advancingTeam: null,
        updatedAt: "2026-07-19T21:00:00Z",
        updatedBy: "test",
        source: "manual" as const,
      },
    };
    const events: MatchEvent[] = [
      goalEvent("goal-1", final.id, mexicoPlayers[0].id, mexicoPlayers[0].name, mexicoPlayers[1].name, 12),
      goalEvent("goal-2", final.id, mexicoPlayers[1].id, mexicoPlayers[1].name, mexicoPlayers[0].name, 44),
    ];
    const state = {
      ...base,
      matches: base.matches.map((match) => (match.id === final.id ? resultMatch : match)),
      matchEvents: events,
      tournamentStats: {
        ...base.tournamentStats,
        topScorers: [],
        assistMakers: [],
      },
    };
    const withProfiles = {
      ...state,
      playerProfiles: derivePlayerProfilesFromState(state, "2026-07-19T22:00:00Z"),
    };

    const result = deriveTournamentBonusResult(withProfiles, "2026-07-19T22:00:00Z");
    expect(result.winnerTeamSlug).toBe(teamSlug("Mexico"));
    expect(result.topScorerPlayerProfileIds).toEqual(expect.arrayContaining([mexicoPlayers[0].id, mexicoPlayers[1].id]));
    expect(result.assistKingPlayerProfileIds).toEqual(expect.arrayContaining([mexicoPlayers[0].id, mexicoPlayers[1].id]));
    expect(result.unavailableReason).toBeNull();
  });
});

function goalEvent(
  id: string,
  matchId: string,
  playerProfileId: string,
  playerName: string,
  assistPlayerName: string,
  minute: number,
): MatchEvent {
  return {
    id,
    matchId,
    minute,
    period: "first_half",
    type: "goal",
    teamSide: "home",
    playerId: playerProfileId.replace("fifa-", ""),
    playerProfileId,
    playerName,
    assistPlayerName,
    relatedPlayerName: null,
    scoreAfter: null,
    source: "manual",
    updatedAt: "2026-07-19T21:00:00Z",
  };
}
