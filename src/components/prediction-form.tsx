"use client";

import { useMemo, useState } from "react";
import { Save } from "lucide-react";

import { savePredictionAction } from "@/app/actions";
import { formatScore } from "@/lib/format";
import { inferPredictionOutcome, sutLabel } from "@/lib/scoring";
import { isMatchLocked } from "@/lib/scoring";
import type { Prediction, PredictionOutcome, WorldCupMatch } from "@/lib/types";

export function PredictionForm({
  match,
  prediction,
}: {
  match: WorldCupMatch;
  prediction: Prediction | null;
}) {
  const locked = isMatchLocked(match);
  const [homeGoals, setHomeGoals] = useState(prediction?.homeGoals?.toString() ?? "");
  const [awayGoals, setAwayGoals] = useState(prediction?.awayGoals?.toString() ?? "");
  const selectedOutcome = useMemo(() => {
    if (homeGoals === "" || awayGoals === "") return prediction?.outcome ?? null;
    const home = Number(homeGoals);
    const away = Number(awayGoals);
    if (!Number.isInteger(home) || !Number.isInteger(away)) return null;
    return inferPredictionOutcome(home, away);
  }, [awayGoals, homeGoals, prediction?.outcome]);
  const hasDrawPrediction = homeGoals !== "" && awayGoals !== "" && homeGoals === awayGoals;

  function setQuickTip(outcome: PredictionOutcome) {
    if (outcome === "home") {
      setHomeGoals("1");
      setAwayGoals("0");
    } else if (outcome === "draw") {
      setHomeGoals("1");
      setAwayGoals("1");
    } else {
      setHomeGoals("0");
      setAwayGoals("1");
    }
  }

  if (locked) {
    const outcome = prediction ? sutLabel(prediction.outcome ?? inferPredictionOutcome(prediction.homeGoals, prediction.awayGoals)) : null;
    return (
      <div className="locked-tip">
        <span>Ditt tips</span>
        <strong>{prediction ? `${outcome} · ${formatScore(prediction.homeGoals, prediction.awayGoals)}` : "Ikke levert"}</strong>
        {prediction?.joker ? <em>Joker</em> : null}
      </div>
    );
  }

  return (
    <form action={savePredictionAction} className="prediction-form">
      <input type="hidden" name="matchId" value={match.id} />
      <input type="hidden" name="predictedOutcome" value={selectedOutcome ?? ""} />
      <div className="sut-controls" aria-label="SUT hurtigvalg">
        {(["home", "draw", "away"] as const).map((outcome) => (
          <button
            aria-pressed={selectedOutcome === outcome}
            className={selectedOutcome === outcome ? "sut-button sut-button-active" : "sut-button"}
            key={outcome}
            onClick={() => setQuickTip(outcome)}
            type="button"
          >
            <strong>{sutLabel(outcome)}</strong>
            <span>{outcome === "home" ? "Seier" : outcome === "draw" ? "Uavgjort" : "Tap"}</span>
          </button>
        ))}
      </div>
      <label>
        <span>{match.homeTeam}</span>
        <input
          aria-label={`${match.homeTeam} mål`}
          inputMode="numeric"
          min={0}
          max={30}
          name="homeGoals"
          onChange={(event) => setHomeGoals(event.target.value)}
          required
          type="number"
          value={homeGoals}
        />
      </label>
      <label>
        <span>{match.awayTeam}</span>
        <input
          aria-label={`${match.awayTeam} mål`}
          inputMode="numeric"
          min={0}
          max={30}
          name="awayGoals"
          onChange={(event) => setAwayGoals(event.target.value)}
          required
          type="number"
          value={awayGoals}
        />
      </label>
      <label className="select-advancer">
        <span>Videre ved uavgjort</span>
        <select name="advancingTeam" defaultValue={prediction?.advancingTeam ?? ""}>
          <option value="">Ikke relevant</option>
          <option value="home">{match.homeTeam}</option>
          <option value="away">{match.awayTeam}</option>
        </select>
        {hasDrawPrediction ? <small>Brukes i sluttspill hvis kampen går til straffer.</small> : null}
      </label>
      <label className="joker-toggle">
        <input name="joker" type="checkbox" defaultChecked={prediction?.joker ?? false} />
        <span>Joker</span>
      </label>
      <button className="btn-primary" type="submit">
        <Save className="h-4 w-4" aria-hidden="true" />
        Lagre
      </button>
    </form>
  );
}
