import { afterEach, describe, expect, it, vi } from "vitest";

import { autofillBonusTipsInState, getPredictedOpenMatchIdsForBonusAutofill } from "@/lib/bonus-autofill";
import { savePredictionInState } from "@/lib/scoring";
import { initialState } from "@/lib/state";
import type { AppState, Prediction } from "@/lib/types";

function prediction(overrides: Partial<Prediction> = {}): Prediction {
  return {
    playerId: "alf",
    matchId: "m001",
    homeGoals: 1,
    awayGoals: 0,
    knockoutResolution: null,
    homeScorers: [],
    awayScorers: [],
    homeAssists: [],
    awayAssists: [],
    updatedAt: "2026-06-01T10:00:00Z",
    ...overrides,
  };
}

function withRealSquads(state: AppState, ...teamNames: string[]): AppState {
  const teams = new Set(teamNames);
  return {
    ...state,
    teamProfiles: state.teamProfiles.map((profile) =>
      teams.has(profile.teamName)
        ? {
            ...profile,
            squad: profile.squad.map((player) => ({ ...player, source: "FIFA public squad API" })),
          }
        : profile,
    ),
  };
}

function squadFor(state: AppState, teamName: string) {
  const squad = state.teamProfiles.find((profile) => profile.teamName === teamName)?.squad ?? [];
  expect(squad.length).toBeGreaterThan(0);
  return squad;
}

const originalBonusOddsUrl = process.env.BONUS_ODDS_URL;

function useOddsFeed(payload: unknown) {
  process.env.BONUS_ODDS_URL = "https://odds.example.test/bonus.json";
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => payload }) as Response),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalBonusOddsUrl === undefined) {
    delete process.env.BONUS_ODDS_URL;
  } else {
    process.env.BONUS_ODDS_URL = originalBonusOddsUrl;
  }
});

describe("bonus autofill", () => {
  it("fills empty bonus slots and card tips without changing result tips", async () => {
    const base = savePredictionInState(
      withRealSquads(initialState(), "Mexico", "Sør-Afrika"),
      prediction(),
      new Date("2026-06-01T10:00:00Z"),
    );
    const result = await autofillBonusTipsInState({
      state: base,
      playerId: "alf",
      matchIds: ["m001"],
      now: new Date("2026-06-01T10:00:00Z"),
    });
    const tip = result.state.predictions.find((item) => item.playerId === "alf" && item.matchId === "m001")!;

    expect(tip).toMatchObject({ homeGoals: 1, awayGoals: 0 });
    expect(tip.homeScorers).toHaveLength(1);
    expect(tip.homeAssists).toHaveLength(1);
    expect(result.state.livePotTips[0]).toMatchObject({
      playerId: "alf",
      matchId: "m001",
      homeYellowCardsTotal: expect.any(Number),
      awayYellowCardsTotal: expect.any(Number),
      homeRedCardsTotal: expect.any(Number),
      awayRedCardsTotal: expect.any(Number),
    });
    expect(result.summary).toMatchObject({ source: "fallback", matchesTouched: 1, playerSlotsFilled: 2, cardTipsFilled: 1 });
  });

  it("does not use placeholder squads for scorer or assist autofill", async () => {
    const base = savePredictionInState(initialState(), prediction(), new Date("2026-06-01T10:00:00Z"));
    const result = await autofillBonusTipsInState({
      state: base,
      playerId: "alf",
      matchIds: ["m001"],
      now: new Date("2026-06-01T10:00:00Z"),
    });
    const tip = result.state.predictions.find((item) => item.playerId === "alf" && item.matchId === "m001")!;

    expect(tip.homeScorers).toHaveLength(0);
    expect(tip.homeAssists).toHaveLength(0);
    expect(result.summary).toMatchObject({ matchesTouched: 1, playerSlotsFilled: 0, cardTipsFilled: 1 });
  });

  it("does not create scorer or assist slots for default 0-0 result tips", async () => {
    const result = await autofillBonusTipsInState({
      state: initialState(),
      playerId: "alf",
      matchIds: ["m001"],
      now: new Date("2026-06-01T10:00:00Z"),
    });

    expect(result.state.predictions).toHaveLength(0);
    expect(result.state.livePotTips).toHaveLength(1);
    expect(result.summary).toMatchObject({ playerSlotsFilled: 0, cardTipsFilled: 1 });
  });

  it("selects only the current player's stored result tips for bulk autofill", () => {
    const now = new Date("2026-06-01T10:00:00Z");
    const withAlf = savePredictionInState(initialState(), prediction({ playerId: "alf", matchId: "m001" }), now);
    const withOtherPlayer = savePredictionInState(withAlf, prediction({ playerId: "anders", matchId: "m002" }), now);

    expect(getPredictedOpenMatchIdsForBonusAutofill(withOtherPlayer, "alf", now)).toEqual(["m001"]);
    expect(getPredictedOpenMatchIdsForBonusAutofill(withOtherPlayer, "anders", now)).toEqual(["m002"]);
  });

  it("skips locked matches when selecting bulk autofill matches", async () => {
    const now = new Date("2026-06-01T10:00:00Z");
    const withPredictions = savePredictionInState(
      savePredictionInState(initialState(), prediction({ matchId: "m001" }), now),
      prediction({ matchId: "m002" }),
      now,
    );
    const state = {
      ...withPredictions,
      matches: withPredictions.matches.map((match) =>
        match.id === "m001" ? { ...match, kickoffAt: "2026-05-01T18:00:00.000Z" } : match,
      ),
    };
    const matchIds = getPredictedOpenMatchIdsForBonusAutofill(state, "alf", now);

    expect(matchIds).toEqual(["m002"]);

    const result = await autofillBonusTipsInState({
      state,
      playerId: "alf",
      matchIds,
      now,
    });

    expect(result.state.livePotTips.some((tip) => tip.matchId === "m001")).toBe(false);
    expect(result.state.livePotTips.some((tip) => tip.matchId === "m002")).toBe(true);
  });

  it("never picks the same player as scorer and assist for the same goal", async () => {
    const state = withRealSquads(initialState(), "Mexico");
    const [favorite, alternative] = squadFor(state, "Mexico");
    useOddsFeed({
      matches: {
        m001: {
          homeScorers: [{ playerId: favorite.id, weight: 10 }],
          homeAssists: [
            { playerId: favorite.id, weight: 10 },
            { playerId: alternative.id, weight: 1 },
          ],
        },
      },
    });
    const base = savePredictionInState(state, prediction({ homeGoals: 1 }), new Date("2026-06-01T10:00:00Z"));
    const result = await autofillBonusTipsInState({
      state: base,
      playerId: "alf",
      matchIds: ["m001"],
      now: new Date("2026-06-01T10:00:00Z"),
    });
    const tip = result.state.predictions.find((item) => item.playerId === "alf" && item.matchId === "m001")!;

    expect(tip.homeScorers).toEqual([favorite.id]);
    expect(tip.homeAssists).toEqual([alternative.id]);
    expect(tip.homeScorers?.[0]).not.toBe(tip.homeAssists?.[0]);
    expect(result.summary.source).toBe("odds");
  });

  it("does not repeat a scorer before realistic alternatives are used", async () => {
    const state = withRealSquads(initialState(), "Mexico");
    const base = savePredictionInState(state, prediction({ homeGoals: 3 }), new Date("2026-06-01T10:00:00Z"));
    const result = await autofillBonusTipsInState({
      state: base,
      playerId: "alf",
      matchIds: ["m001"],
      now: new Date("2026-06-01T10:00:00Z"),
    });
    const tip = result.state.predictions.find((item) => item.playerId === "alf" && item.matchId === "m001")!;

    expect(tip.homeScorers).toHaveLength(3);
    expect(new Set(tip.homeScorers).size).toBe(3);
    expect(tip.homeAssists).toHaveLength(3);
    tip.homeScorers?.forEach((scorer, index) => {
      expect(scorer).not.toBe(tip.homeAssists?.[index]);
    });
  });

  it("uses matched odds players before fallback and converts odds to stronger weights", async () => {
    const state = withRealSquads(initialState(), "Mexico");
    const [longShot, lowOddsFavorite, assist] = squadFor(state, "Mexico");
    useOddsFeed({
      matches: {
        m001: {
          homeScorers: [
            { playerId: longShot.id, odds: 1000 },
            { playerId: lowOddsFavorite.id, odds: 1.01 },
            { playerName: "Ikke en VM-spiller", odds: 1.01 },
          ],
          homeAssists: [{ playerId: assist.id, weight: 5 }],
        },
      },
    });
    const base = savePredictionInState(state, prediction({ homeGoals: 1 }), new Date("2026-06-01T10:00:00Z"));
    const result = await autofillBonusTipsInState({
      state: base,
      playerId: "alf",
      matchIds: ["m001"],
      now: new Date("2026-06-01T10:00:00Z"),
    });
    const tip = result.state.predictions.find((item) => item.playerId === "alf" && item.matchId === "m001")!;

    expect(tip.homeScorers).toEqual([lowOddsFavorite.id]);
    expect(tip.homeAssists).toEqual([assist.id]);
    expect(result.summary.source).toBe("odds");
  });

  it("falls back to synced squad players when odds players do not match", async () => {
    const state = withRealSquads(initialState(), "Mexico");
    const mexicoIds = new Set(squadFor(state, "Mexico").map((player) => player.id));
    useOddsFeed({
      matches: {
        m001: {
          homeScorers: [{ playerName: "Ukjent oddsnavn", odds: 1.01 }],
          homeAssists: [{ playerId: "missing-player", weight: 100 }],
        },
      },
    });
    const base = savePredictionInState(state, prediction({ homeGoals: 1 }), new Date("2026-06-01T10:00:00Z"));
    const result = await autofillBonusTipsInState({
      state: base,
      playerId: "alf",
      matchIds: ["m001"],
      now: new Date("2026-06-01T10:00:00Z"),
    });
    const tip = result.state.predictions.find((item) => item.playerId === "alf" && item.matchId === "m001")!;

    expect(tip.homeScorers).toHaveLength(1);
    expect(tip.homeAssists).toHaveLength(1);
    expect(mexicoIds.has(tip.homeScorers?.[0] ?? "")).toBe(true);
    expect(mexicoIds.has(tip.homeAssists?.[0] ?? "")).toBe(true);
    expect(tip.homeScorers?.[0]).not.toBe(tip.homeAssists?.[0]);
    expect(result.summary.source).toBe("fallback");
  });

  it("can replace existing single-match autofill values while bulk stays non-destructive", async () => {
    const state = withRealSquads(initialState(), "Mexico");
    const [badPick] = squadFor(state, "Mexico");
    const withBadAutofill = savePredictionInState(
      state,
      prediction({
        homeGoals: 3,
        homeScorers: [badPick.id, badPick.id, badPick.id],
        homeAssists: [badPick.id, badPick.id, badPick.id],
      }),
      new Date("2026-06-01T10:00:00Z"),
    );

    const bulkResult = await autofillBonusTipsInState({
      state: withBadAutofill,
      playerId: "alf",
      matchIds: ["m001"],
      now: new Date("2026-06-01T10:00:00Z"),
    });
    const bulkTip = bulkResult.state.predictions.find((item) => item.playerId === "alf" && item.matchId === "m001")!;
    expect(bulkTip.homeScorers).toEqual([badPick.id, badPick.id, badPick.id]);
    expect(bulkTip.homeAssists).toEqual([badPick.id, badPick.id, badPick.id]);

    const replaceResult = await autofillBonusTipsInState({
      state: withBadAutofill,
      playerId: "alf",
      matchIds: ["m001"],
      now: new Date("2026-06-01T10:00:00Z"),
      replaceExisting: true,
    });
    const replacedTip = replaceResult.state.predictions.find((item) => item.playerId === "alf" && item.matchId === "m001")!;

    expect(replacedTip.homeScorers).toHaveLength(3);
    expect(new Set(replacedTip.homeScorers).size).toBe(3);
    replacedTip.homeScorers?.forEach((scorer, index) => {
      expect(scorer).not.toBe(replacedTip.homeAssists?.[index]);
    });
    expect(replaceResult.summary.matchesTouched).toBe(1);
    expect(replaceResult.summary.playerSlotsFilled).toBeGreaterThan(0);
  });
});
