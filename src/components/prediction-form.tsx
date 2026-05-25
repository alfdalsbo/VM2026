"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { usePathname } from "next/navigation";
import { TicketCheck } from "lucide-react";

import { savePredictionAction } from "@/app/actions";
import { displayTeamName } from "@/lib/display";
import { footballCopy } from "@/lib/football-jargon";
import { cx } from "@/lib/format";
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
  const pathname = usePathname();
  const [homeGoals, setHomeGoals] = useState(prediction?.homeGoals?.toString() ?? "");
  const [awayGoals, setAwayGoals] = useState(prediction?.awayGoals?.toString() ?? "");
  const [method, setMethod] = useState(prediction?.knockoutResolution?.method ?? "");
  const isDraw = homeGoals !== "" && awayGoals !== "" && homeGoals === awayGoals;
  const needsKnockoutResolution = isKnockoutMatch(match) && isDraw;
  const extraTimeResolution = prediction?.knockoutResolution?.method === "extra_time" ? prediction.knockoutResolution : null;
  const homeTeam = displayTeamName(match.homeTeam);
  const awayTeam = displayTeamName(match.awayTeam);

  if (locked) {
    return (
      <div className="locked-tip">
        <span>Din kupong</span>
        <strong>{describePrediction(prediction)}</strong>
      </div>
    );
  }

  return (
    <form action={savePredictionAction} className={cx("prediction-form", compact && "prediction-form-compact")}>
      <input type="hidden" name="matchId" value={match.id} />
      <input type="hidden" name="next" value={pathname} />
      <div className="prediction-teams">
        <label className="prediction-side">
          <span>{homeTeam}</span>
          <input
            aria-label={`${homeTeam} mål`}
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
        <span className="prediction-vs" aria-hidden="true">-</span>
        <label className="prediction-side prediction-side-away">
          <span>{awayTeam}</span>
          <input
            aria-label={`${awayTeam} mål`}
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
      </div>

      {needsKnockoutResolution ? (
        <div className="knockout-fields">
          <label>
            <span>Avgjørelse</span>
            <select name="knockoutMethod" value={method} onChange={(event) => setMethod(event.target.value)} required>
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
                  name="extraTimeHomeGoals"
                  required
                  type="number"
                  defaultValue={extraTimeResolution?.homeGoals ?? ""}
                />
              </label>
              <label>
                <span>{awayTeam} etter ekstra</span>
                <input
                  aria-label={`${awayTeam} mål etter ekstraomganger`}
                  inputMode="numeric"
                  min={0}
                  max={30}
                  name="extraTimeAwayGoals"
                  required
                  type="number"
                  defaultValue={extraTimeResolution?.awayGoals ?? ""}
                />
              </label>
            </>
          ) : null}
          {method ? (
            <label>
              <span>Videre</span>
              <select name="knockoutWinner" defaultValue={prediction?.knockoutResolution?.winner ?? ""} required>
                <option value="">Velg lag</option>
                <option value="home">{homeTeam}</option>
                <option value="away">{awayTeam}</option>
              </select>
            </label>
          ) : null}
        </div>
      ) : null}

      <p className="prediction-note">{footballCopy.predictionNote}</p>
      <TipSubmitButton hasPrediction={Boolean(prediction)} />
    </form>
  );
}

function TipSubmitButton({ hasPrediction }: { hasPrediction: boolean }) {
  const { pending } = useFormStatus();
  const label = hasPrediction ? "Oppdater tipset" : "Tipp kampen";
  return (
    <button className="btn-primary prediction-submit" type="submit" disabled={pending} aria-live="polite">
      <TicketCheck className="h-4 w-4" aria-hidden="true" />
      {pending ? "Tipper..." : label}
    </button>
  );
}
