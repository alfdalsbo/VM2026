import { describe, expect, it } from "vitest";

import { upsertMatchResultInState } from "@/lib/scoring";
import { initialState } from "@/lib/state";
import { applyFifaMatchesToState, mapFifaResult, mergeFifaTeamProfile } from "@/lib/world-cup-sync";
import type { FifaMatch } from "@/lib/world-cup-sync";

const fifaFinished: FifaMatch = {
  IdMatch: "400021443",
  MatchNumber: 1,
  MatchStatus: 2,
  HomeTeamScore: 2,
  AwayTeamScore: 1,
  Home: { IdTeam: "home", TeamName: [{ Locale: "en-GB", Description: "Mexico" }] },
  Away: { IdTeam: "away", TeamName: [{ Locale: "en-GB", Description: "South Africa" }] },
  Winner: "home",
};

describe("world cup sync", () => {
  it("maps FIFA results into app results", () => {
    expect(mapFifaResult(fifaFinished, "2026-06-11T21:00:00Z")).toMatchObject({
      homeGoals: 2,
      awayGoals: 1,
      source: "fifa",
      updatedBy: "sync:fifa",
    });
  });

  it("does not overwrite manual results unless forced", () => {
    const manualState = upsertMatchResultInState(initialState(), "m001", {
      homeGoals: 5,
      awayGoals: 0,
      decidedByPenalties: false,
      advancingTeam: null,
      updatedAt: "2026-06-11T21:00:00Z",
      updatedBy: "alf",
      source: "manual",
    });

    const protectedSync = applyFifaMatchesToState(manualState, [fifaFinished], { syncedAt: "2026-06-11T22:00:00Z" });
    expect(protectedSync.state.matches.find((match) => match.id === "m001")?.result?.homeGoals).toBe(5);

    const forcedSync = applyFifaMatchesToState(manualState, [fifaFinished], { force: true, syncedAt: "2026-06-11T22:00:00Z" });
    expect(forcedSync.state.matches.find((match) => match.id === "m001")?.result?.homeGoals).toBe(2);
  });

  it("stores FIFA match facts and formations when they are available", () => {
    const synced = applyFifaMatchesToState(
      initialState(),
      [
        {
          ...fifaFinished,
          Attendance: "67372",
          BallPossession: { OverallHome: 47.08, OverallAway: 52.92 },
          Weather: {
            Temperature: "24",
            WindSpeed: "8",
            TypeLocalized: [{ Locale: "en-GB", Description: "Clear Night" }],
          },
          Home: { ...fifaFinished.Home, Tactics: "5-3-2" },
          Away: { ...fifaFinished.Away, Tactics: "4-4-2" },
          Officials: [
            {
              OfficialId: "315593",
              IdCountry: "ITA",
              Name: [{ Locale: "en-GB", Description: "Daniele Orsato" }],
              TypeLocalized: [{ Locale: "en-GB", Description: "Referee" }],
            },
          ],
        },
      ],
      { syncedAt: "2026-06-11T22:00:00Z" },
    );

    expect(synced.state.matchStats.find((stats) => stats.matchId === "m001")).toMatchObject({
      attendance: 67372,
      homePossession: 47.08,
      awayPossession: 52.92,
      weather: "Clear Night",
      temperatureCelsius: 24,
      homeFormation: "5-3-2",
      awayFormation: "4-4-2",
      officials: [{ name: "Daniele Orsato", role: "Referee", countryCode: "ITA" }],
    });
    expect(synced.state.lineups.find((lineup) => lineup.matchId === "m001")?.formation).toEqual({
      home: "5-3-2",
      away: "4-4-2",
    });
  });

  it("maps FIFA team detail and squad data into team profiles", () => {
    const profile = mergeFifaTeamProfile(
      null,
      {
        id: "43922",
        name: "Argentina",
        calendarTeam: {
          IdTeam: "43922",
          IdCountry: "ARG",
          Abbreviation: "ARG",
          PictureUrl: "https://api.fifa.com/api/v3/picture/flags-{format}-{size}/ARG",
          TeamName: [{ Locale: "en-GB", Description: "Argentina" }],
        },
      },
      {
        IdTeam: "43922",
        IdConfederation: "CONMEBOL",
        Name: [{ Locale: "en-GB", Description: "Argentina" }],
        IdCountry: "ARG",
        City: "BUENOS AIRES",
        FoundationYear: 1893,
        Abbreviation: "ARG",
        PictureUrl: "https://api.fifa.com/api/v3/picture/flags-{format}-{size}/ARG",
      },
      {
        IdTeam: "43922",
        IdCountry: "ARG",
        Players: [
          {
            IdPlayer: "398422",
            PlayerName: [{ Locale: "en-GB", Description: "Franco ARMANI" }],
            ShortName: [{ Locale: "en-GB", Description: "ARMANI" }],
            JerseyNum: 1,
            RealPosition: 0,
            RealPositionLocalized: [{ Locale: "en-GB", Description: "Goalkeeper" }],
            Height: 189,
            Weight: 88,
            Goals: 0,
            YellowCards: 1,
            RedCards: 0,
            PlayerPicture: { PictureUrl: "https://digitalhub.fifa.com/player.png" },
          },
        ],
        Officials: [
          {
            IdCoach: "153933",
            Name: [{ Locale: "en-GB", Description: "Lionel SCALONI" }],
            Role: 0,
            IdCountry: "ARG",
          },
        ],
      },
      "2026-06-11T22:00:00Z",
    );

    expect(profile).toMatchObject({
      teamName: "Argentina",
      fifaTeamId: "43922",
      abbreviation: "ARG",
      confederation: "CONMEBOL",
      flagUrl: "https://api.fifa.com/api/v3/picture/flags-sq-2/ARG",
      coach: { name: "Lionel SCALONI", countryCode: "ARG" },
    });
    expect(profile.squad[0]).toMatchObject({
      name: "Franco ARMANI",
      position: "goalkeeper",
      heightCm: 189,
      yellowCards: 1,
    });
  });
});
