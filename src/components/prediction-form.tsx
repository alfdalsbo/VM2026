import { Save } from "lucide-react";

import { savePredictionAction } from "@/app/actions";
import { formatScore } from "@/lib/format";
import { isMatchLocked } from "@/lib/scoring";
import type { Prediction, WorldCupMatch } from "@/lib/types";

export function PredictionForm({
  match,
  prediction,
}: {
  match: WorldCupMatch;
  prediction: Prediction | null;
}) {
  const locked = isMatchLocked(match);
  const hasDrawPrediction = prediction?.homeGoals === prediction?.awayGoals;

  if (locked) {
    return (
      <div className="locked-tip">
        <span>Ditt tips</span>
        <strong>{prediction ? formatScore(prediction.homeGoals, prediction.awayGoals) : "Ikke levert"}</strong>
        {prediction?.joker ? <em>Joker</em> : null}
      </div>
    );
  }

  return (
    <form action={savePredictionAction} className="prediction-form">
      <input type="hidden" name="matchId" value={match.id} />
      <label>
        <span>{match.homeTeam}</span>
        <input
          aria-label={`${match.homeTeam} mål`}
          inputMode="numeric"
          min={0}
          max={30}
          name="homeGoals"
          required
          type="number"
          defaultValue={prediction?.homeGoals ?? ""}
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
          required
          type="number"
          defaultValue={prediction?.awayGoals ?? ""}
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
