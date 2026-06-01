"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { saveResultPredictionAction, type SaveResultPredictionInput } from "@/app/actions";
import { TeamLink } from "@/components/team-link";
import { displayTeamName } from "@/lib/display";
import { footballCopy } from "@/lib/football-jargon";
import { cx } from "@/lib/format";
import { hasUnresolvedKnockoutTeams } from "@/lib/knockout-placeholders";
import { describePrediction, isKnockoutMatch } from "@/lib/scoring";
import type { Prediction, WorldCupMatch } from "@/lib/types";

export function PredictionForm({
  match,
  prediction,
  locked,
  compact = false,
}: {
  match: WorldCupMatch;
  prediction: Prediction | null;
  locked: boolean;
  compact?: boolean;
}) {
  const [homeGoals, setHomeGoals] = useState(prediction?.homeGoals ?? 0);
  const [awayGoals, setAwayGoals] = useState(prediction?.awayGoals ?? 0);
  const [method, setMethod] = useState(prediction?.knockoutResolution?.method ?? "");
  const [winner, setWinner] = useState<"home" | "away" | "">(prediction?.knockoutResolution?.winner ?? "");
  const [extraTimeHomeGoals, setExtraTimeHomeGoals] = useState<number | "">(
    prediction?.knockoutResolution?.method === "extra_time" ? prediction.knockoutResolution.homeGoals : "",
  );
  const [extraTimeAwayGoals, setExtraTimeAwayGoals] = useState<number | "">(
    prediction?.knockoutResolution?.method === "extra_time" ? prediction.knockoutResolution.awayGoals : "",
  );
  const [saveDisplay, setSaveDisplay] = useState<{ key: string; tone: "ok" | "error"; message: string } | null>(null);
  const [, startTransition] = useTransition();
  const initialInput = buildInput(match, homeGoals, awayGoals, method, winner, extraTimeHomeGoals, extraTimeAwayGoals);
  const [lastSavedKey, setLastSavedKey] = useState("input" in initialInput ? JSON.stringify(initialInput.input) : "");
  const requestId = useRef(0);
  const knockoutPending = hasUnresolvedKnockoutTeams(match);
  const isDraw = homeGoals === awayGoals;
  const needsKnockoutResolution = isKnockoutMatch(match) && isDraw;
  const homeTeam = displayTeamName(match.homeTeam);
  const awayTeam = displayTeamName(match.awayTeam);
  const prepared = buildInput(match, homeGoals, awayGoals, method, winner, extraTimeHomeGoals, extraTimeAwayGoals);
  const currentKey = "error" in prepared ? "" : JSON.stringify(prepared.input);
  const display =
    "error" in prepared
      ? { tone: "error" as const, message: prepared.error }
      : saveDisplay?.key === currentKey && saveDisplay.tone === "error"
        ? saveDisplay
        : currentKey !== lastSavedKey
          ? { tone: "pending" as const, message: "Lagrer..." }
          : saveDisplay?.key === currentKey
            ? saveDisplay
            : { tone: "ok" as const, message: prediction ? "Registrert" : "0-0 står klart" };

  useEffect(() => {
    if (locked || knockoutPending) return;
    if ("error" in prepared) return;
    const key = JSON.stringify(prepared.input);
    if (key === lastSavedKey) return;

    const timeout = window.setTimeout(() => {
      requestId.current += 1;
      const current = requestId.current;
      startTransition(() => {
        void saveResultPredictionAction(prepared.input).then((result) => {
          if (current !== requestId.current) return;
          if (result.error) {
            setSaveDisplay({ key, tone: "error", message: result.error });
            return;
          }
          setLastSavedKey(key);
          setSaveDisplay({ key, tone: "ok", message: "Registrert" });
        });
      });
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [knockoutPending, lastSavedKey, locked, prepared, startTransition]);

  if (locked || knockoutPending) {
    return (
      <div className="locked-tip">
        <span>{knockoutPending ? "Sluttspillkupong" : "Din kupong"}</span>
        <strong>{knockoutPending ? footballCopy.knockoutPending : describePrediction(prediction)}</strong>
      </div>
    );
  }

  return (
    <div className={cx("prediction-form", compact && "prediction-form-compact")}>
      <div className="prediction-teams">
        <div className="prediction-side">
          <span><TeamLink teamName={match.homeTeam} /></span>
          <input
            aria-label={`${homeTeam} mål`}
            inputMode="numeric"
            min={0}
            max={30}
            name="homeGoals"
            onChange={(event) => setHomeGoals(Number(event.target.value))}
            required
            type="number"
            value={homeGoals}
          />
        </div>
        <span className="prediction-vs" aria-hidden="true">-</span>
        <div className="prediction-side prediction-side-away">
          <span><TeamLink teamName={match.awayTeam} /></span>
          <input
            aria-label={`${awayTeam} mål`}
            inputMode="numeric"
            min={0}
            max={30}
            name="awayGoals"
            onChange={(event) => setAwayGoals(Number(event.target.value))}
            required
            type="number"
            value={awayGoals}
          />
        </div>
      </div>

      {needsKnockoutResolution ? (
        <div className="knockout-fields">
          <label>
            <span>Avgjørelse</span>
            <select value={method} onChange={(event) => setMethod(event.target.value)} required>
              <option value="">Velg</option>
              <option value="extra_time">Vinner etter ekstraomganger</option>
              <option value="penalties">Vinner på straffer</option>
            </select>
          </label>
          {method === "extra_time" ? (
            <>
              <label>
                <span>{homeTeam} etter ekstra</span>
                <input
                  aria-label={`${homeTeam} mål etter ekstraomganger`}
                  inputMode="numeric"
                  min={0}
                  max={30}
                  required
                  type="number"
                  value={extraTimeHomeGoals}
                  onChange={(event) => setExtraTimeHomeGoals(event.target.value === "" ? "" : Number(event.target.value))}
                />
              </label>
              <label>
                <span>{awayTeam} etter ekstra</span>
                <input
                  aria-label={`${awayTeam} mål etter ekstraomganger`}
                  inputMode="numeric"
                  min={0}
                  max={30}
                  required
                  type="number"
                  value={extraTimeAwayGoals}
                  onChange={(event) => setExtraTimeAwayGoals(event.target.value === "" ? "" : Number(event.target.value))}
                />
              </label>
            </>
          ) : null}
          {method ? (
            <label>
              <span>Videre</span>
              <select value={winner} onChange={(event) => setWinner(sideValue(event.target.value))} required>
                <option value="">Velg lag</option>
                <option value="home">{homeTeam}</option>
                <option value="away">{awayTeam}</option>
              </select>
            </label>
          ) : null}
        </div>
      ) : null}

      <div className={cx("tip-save-signal", display.tone === "ok" && "tip-save-signal-ok", display.tone === "error" && "tip-save-signal-error")}>
        {display.tone === "ok" ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <AlertCircle className="h-4 w-4" aria-hidden="true" />}
        <span>{display.message}</span>
      </div>
    </div>
  );
}

function sideValue(value: string): "home" | "away" | "" {
  return value === "home" || value === "away" ? value : "";
}

function buildInput(
  match: WorldCupMatch,
  homeGoals: number,
  awayGoals: number,
  method: string,
  winner: "home" | "away" | "",
  extraTimeHomeGoals: number | "",
  extraTimeAwayGoals: number | "",
): { input: SaveResultPredictionInput; error?: never } | { input?: never; error: string } {
  const input: SaveResultPredictionInput = { matchId: match.id, homeGoals, awayGoals };
  if (!isKnockoutMatch(match) || homeGoals !== awayGoals) return { input };
  if (!method) return { error: "Velg avgjørelse" };
  if (!winner) return { error: "Velg hvem som går videre" };
  input.knockoutMethod = method;
  input.knockoutWinner = winner;
  if (method === "extra_time") {
    if (extraTimeHomeGoals === "" || extraTimeAwayGoals === "") return { error: "Skriv stillingen etter ekstra" };
    input.extraTimeHomeGoals = extraTimeHomeGoals;
    input.extraTimeAwayGoals = extraTimeAwayGoals;
  }
  return { input };
}
