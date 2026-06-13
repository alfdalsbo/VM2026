import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import MatchesPage from "@/app/(app)/kamper/page";
import { players } from "@/lib/players";
import { initialState } from "@/lib/state";
import type { AppState, MatchResult, WorldCupMatch } from "@/lib/types";

const stateFixture = vi.hoisted(() => ({
  current: null as unknown as AppState,
}));
const now = new Date("2026-06-13T12:00:00Z");

vi.mock("@/components/bonus-autofill-button", () => ({
  BonusAutofillButton: ({ label }: { label?: string }) => React.createElement("button", null, label ?? "Autofyll"),
}));

vi.mock("@/components/match-tip-card", () => ({
  MatchTipCard: ({ match }: { match: WorldCupMatch }) =>
    React.createElement("article", { "data-match-card": true, id: match.id }, `${match.homeTeam} - ${match.awayTeam}`),
}));

vi.mock("@/components/prediction-deadline-panel", () => ({
  PredictionDeadlinePanel: () => React.createElement("section", { "data-testid": "deadline-panel" }, "Fristpanel"),
}));

vi.mock("@/lib/auth", () => ({
  requireSession: vi.fn(async () => players[0]),
}));

vi.mock("@/lib/state", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/state")>();
  return {
    ...actual,
    getAppState: vi.fn(async () => stateFixture.current),
  };
});

function result(overrides: Partial<MatchResult> = {}): MatchResult {
  return {
    homeGoals: 1,
    awayGoals: 0,
    advancingTeam: null,
    decidedByPenalties: false,
    source: "fifa",
    updatedAt: "2026-06-11T21:00:00Z",
    updatedBy: "test",
    ...overrides,
  };
}

function kickoff(hoursFromNow: number) {
  return new Date(now.getTime() + hoursFromNow * 60 * 60 * 1000).toISOString();
}

function stateWithFinishedArchive(): AppState {
  const base = initialState();
  return {
    ...base,
    matches: base.matches.slice(0, 3).map((match) => {
      if (match.id === "m001") {
        return {
          ...match,
          kickoffAt: kickoff(-4),
          result: result(),
          status: "finished" as const,
        };
      }
      if (match.id === "m002") {
        return {
          ...match,
          kickoffAt: kickoff(-4),
          minute: 54,
          result: result({ homeGoals: 0, awayGoals: 1 }),
          status: "live" as const,
        };
      }
      return { ...match, kickoffAt: kickoff(1) };
    }),
  };
}

function stateWithTimedArchive(): AppState {
  const base = initialState();
  return {
    ...base,
    matches: base.matches.slice(0, 4).map((match) => {
      if (match.id === "m001") {
        return { ...match, kickoffAt: kickoff(-4), result: null, status: "scheduled" as const };
      }
      if (match.id === "m002") {
        return { ...match, kickoffAt: kickoff(-2), result: null, status: "scheduled" as const };
      }
      if (match.id === "m003") {
        return { ...match, kickoffAt: kickoff(-4), result: null, status: "live" as const };
      }
      if (match.id === "m004") {
        return { ...match, kickoffAt: kickoff(-4), result: null, status: "halftime" as const };
      }
      return match;
    }),
  };
}

describe("MatchesPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("summarizes finished matches in a closed archive and keeps live/upcoming matches visible", async () => {
    stateFixture.current = stateWithFinishedArchive();

    const html = renderToStaticMarkup(await MatchesPage());

    expect(html).toContain("Ferdigspilte kamper");
    expect(html).toContain("1 ferdigspilt kamp");
    expect(html).toContain("aria-expanded=\"false\"");
    expect(html).not.toContain("id=\"m001\"");
    expect(html).toContain("id=\"m002\"");
    expect(html).toContain("id=\"m003\"");
  });

  it("archives non-live matches three hours after kickoff but keeps live and halftime matches visible", async () => {
    stateFixture.current = stateWithTimedArchive();

    const html = renderToStaticMarkup(await MatchesPage());

    expect(html).toContain("1 ferdigspilt kamp");
    expect(html).not.toContain("id=\"m001\"");
    expect(html).toContain("id=\"m002\"");
    expect(html).toContain("id=\"m003\"");
    expect(html).toContain("id=\"m004\"");
  });
});
