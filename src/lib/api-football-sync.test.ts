import { describe, expect, it, vi } from "vitest";

import {
  applyApiFootballPayloadsToState,
  budgetApiFootballRequests,
  emptyApiFootballSyncState,
  syncApiFootballForState,
  type ApiFootballPlannedRequest,
} from "@/lib/api-football-sync";
import { initialState } from "@/lib/state";
import type { AppState, ApiFootballUsage, MatchEvent, MatchResult } from "@/lib/types";

const syncedAt = "2026-06-11T19:32:00Z";

const apiFixture = {
  fixture: {
    id: 9001,
    date: "2026-06-11T19:00:00Z",
    status: { short: "1H", long: "First Half", elapsed: 32 },
  },
  league: { id: 1, season: 2026 },
  teams: {
    home: { id: 11, name: "Mexico" },
    away: { id: 12, name: "South Africa" },
  },
  goals: { home: 1, away: 0 },
  score: { fulltime: { home: null, away: null }, penalty: { home: null, away: null } },
};

function jsonResponse(response: unknown) {
  return new Response(JSON.stringify({ response }), { status: 200 });
}

function stateWithLink(overrides: Partial<AppState> = {}): AppState {
  const base = initialState();
  return {
    ...base,
    ...overrides,
    apiFootball: {
      ...emptyApiFootballSyncState(),
      enabled: true,
      leagueId: 1,
      season: 2026,
      fixtureLinks: [
        {
          matchId: "m001",
          fixtureId: 9001,
          leagueId: 1,
          season: 2026,
          homeTeam: "Mexico",
          awayTeam: "South Africa",
          kickoffAt: "2026-06-11T19:00:00Z",
          matchedAt: syncedAt,
          updatedAt: syncedAt,
          lastFetchedAt: {},
        },
      ],
      usage: emptyApiFootballSyncState().usage,
    },
  };
}

describe("API-Football sync", () => {
  it("does nothing without a server-side key", async () => {
    const fetcher = vi.fn();

    const result = await syncApiFootballForState(initialState(), {
      key: null,
      fetcher: fetcher as unknown as typeof fetch,
      now: new Date("2026-06-11T19:30:00Z"),
      syncedAt,
    });

    expect(fetcher).not.toHaveBeenCalled();
    expect(result.requestsUsed).toBe(0);
    expect(result.state.apiFootball.enabled).toBe(false);
    expect(result.skippedReason).toContain("API_FOOTBALL_KEY");
  });

  it("discovers World Cup fixtures and fills live facts without using odds endpoints", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname === "/leagues") {
        return jsonResponse([{ league: { id: 1, name: "World Cup" }, seasons: [{ year: 2026 }] }]);
      }
      if (url.pathname === "/fixtures" && url.searchParams.has("league")) {
        return jsonResponse([apiFixture]);
      }
      if (url.pathname === "/fixtures" && url.searchParams.get("id") === "9001") {
        return jsonResponse([apiFixture]);
      }
      if (url.pathname === "/fixtures/events") {
        return jsonResponse([
          {
            time: { elapsed: 18 },
            team: { id: 11, name: "Mexico" },
            player: { id: 101, name: "Mexico Captain" },
            assist: { id: 102, name: "Mexico Maker" },
            type: "Goal",
            detail: "Normal Goal",
          },
        ]);
      }
      if (url.pathname === "/fixtures/lineups") {
        return jsonResponse([
          {
            team: { id: 11, name: "Mexico" },
            formation: "4-3-3",
            startXI: [{ player: { id: 101, name: "Mexico Captain", number: 10, pos: "F", grid: "4:3" } }],
            substitutes: [{ player: { id: 102, name: "Mexico Maker", number: 8, pos: "M" } }],
          },
          {
            team: { id: 12, name: "South Africa" },
            formation: "4-2-3-1",
            startXI: [{ player: { id: 201, name: "South Africa Keeper", number: 1, pos: "G", grid: "1:3" } }],
            substitutes: [],
          },
        ]);
      }
      if (url.pathname === "/fixtures/statistics") {
        return jsonResponse([
          {
            team: { id: 11, name: "Mexico" },
            statistics: [
              { type: "Ball Possession", value: "58%" },
              { type: "Total Shots", value: 11 },
              { type: "Shots on Goal", value: 5 },
              { type: "Corner Kicks", value: 7 },
            ],
          },
          {
            team: { id: 12, name: "South Africa" },
            statistics: [
              { type: "Ball Possession", value: "42%" },
              { type: "Total Shots", value: 6 },
              { type: "Shots on Goal", value: 2 },
              { type: "Corner Kicks", value: 2 },
            ],
          },
        ]);
      }
      throw new Error(`Unexpected URL ${url.toString()}`);
    });

    const result = await syncApiFootballForState(initialState(), {
      key: "test-key",
      fetcher: fetcher as unknown as typeof fetch,
      now: new Date("2026-06-11T19:30:00Z"),
      syncedAt,
    });

    expect(fetcher).toHaveBeenCalledTimes(6);
    expect(fetcher.mock.calls.map(([input]) => new URL(String(input)).pathname)).not.toContain("/predictions");
    expect(result.state.apiFootball.fixtureLinks[0]).toMatchObject({ matchId: "m001", fixtureId: 9001 });
    expect(result.state.matches.find((match) => match.id === "m001")).toMatchObject({
      status: "live",
      minute: 32,
      result: { homeGoals: 1, awayGoals: 0, source: "api_football" },
    });
    expect(result.state.matchStats.find((stats) => stats.matchId === "m001")).toMatchObject({
      homePossession: 58,
      awayPossession: 42,
      source: "API-Football foreløpig",
    });
    expect(result.state.lineups.find((lineup) => lineup.matchId === "m001")).toMatchObject({
      formation: { home: "4-3-3", away: "4-2-3-1" },
      source: "API-Football foreløpig",
    });
    expect(result.state.matchEvents.find((event) => event.matchId === "m001")).toMatchObject({
      type: "goal",
      playerName: "Mexico Captain",
      source: "api_football",
    });
  });

  it("does not overwrite manual or FIFA results and drops API events when authoritative events exist", () => {
    const manualResult: MatchResult = {
      homeGoals: 5,
      awayGoals: 0,
      decidedByPenalties: false,
      advancingTeam: null,
      updatedAt: "2026-06-11T20:00:00Z",
      updatedBy: "alf",
      source: "manual",
    };
    const fifaEvent: MatchEvent = {
      id: "fifa-event",
      matchId: "m001",
      minute: 12,
      period: null,
      type: "goal",
      teamSide: "home",
      playerId: "10",
      playerProfileId: null,
      playerName: "FIFA Goal",
      assistPlayerName: null,
      relatedPlayerName: null,
      scoreAfter: { homeGoals: 1, awayGoals: 0 },
      source: "fifa",
      updatedAt: "2026-06-11T20:00:00Z",
    };
    const state = stateWithLink({
      matches: initialState().matches.map((match) => (match.id === "m001" ? { ...match, result: manualResult, status: "finished" } : match)),
      matchEvents: [fifaEvent],
    });

    const result = applyApiFootballPayloadsToState(
      state,
      {
        fixtures: new Map([[9001, apiFixture]]),
        events: new Map([[9001, [{ time: { elapsed: 18 }, team: { name: "Mexico" }, player: { name: "API Goal" }, type: "Goal", detail: "Normal Goal" }]]]),
        lineups: new Map(),
        statistics: new Map(),
        fetchedKinds: [{ fixtureId: 9001, kind: "fixture" }],
      },
      { syncedAt },
    );

    expect(result.state.matches.find((match) => match.id === "m001")?.result).toEqual(manualResult);
    expect(result.state.matchEvents).toEqual([fifaEvent]);
  });

  it("keeps the daily quota under 100 and skips postmatch before live when the budget is nearly empty", () => {
    const usage: ApiFootballUsage = {
      date: "2026-06-11",
      requests: 99,
      livePregameRequests: 69,
      postMatchRequests: 19,
      reserveRequests: 9,
      lastRequestAt: "2026-06-11T19:00:00Z",
      skippedReason: null,
    };
    const requests: ApiFootballPlannedRequest[] = [
      { matchId: "m001", fixtureId: 1, kind: "fixture", bucket: "live_pregame", priority: 1, reason: "live" },
      { matchId: "m002", fixtureId: 2, kind: "statistics", bucket: "post_match", priority: 40, reason: "post" },
    ];

    expect(budgetApiFootballRequests(requests, usage)).toEqual([requests[0]]);
  });
});
