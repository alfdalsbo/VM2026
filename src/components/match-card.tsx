import Link from "next/link";

import { PredictionForm } from "@/components/prediction-form";
import { TeamLink } from "@/components/team-link";
import { displayMatchup, displayStageOrGroup, formatCompactMatchStatus } from "@/lib/display";
import { formatOsloDateTime, formatScore } from "@/lib/format";
import { getPrediction, isMatchLocked, isMatchPredictable, isPredictionForCurrentMatchup, scorePrediction } from "@/lib/scoring";
import type { AppState, Player, WorldCupMatch } from "@/lib/types";

export function MatchCard({
  match,
  player,
  state,
  showLockedPredictions = false,
}: {
  match: WorldCupMatch;
  player: Player;
  state: AppState;
  showLockedPredictions?: boolean;
}) {
  const prediction = getPrediction(state, player.id, match.id);
  const score = scorePrediction(match, prediction, state);
  const locked = isMatchLocked(match);
  const predictionClosed = !isMatchPredictable(match);
  const isLive = match.status === "live" || match.status === "halftime";
  const compactStatus = formatCompactMatchStatus(match);
  const otherPredictions =
    showLockedPredictions && locked
      ? state.predictions.filter((item) => item.matchId === match.id && item.playerId !== player.id && isPredictionForCurrentMatchup(match, item))
      : [];

  return (
    <article id={match.id} className={`match-card match-card-${compactStatus.tone}`}>
      <div className="match-meta">
        <span className={`status-pill status-${compactStatus.tone}`}>{compactStatus.label}</span>
        <span>{formatOsloDateTime(match.kickoffAt)}</span>
        <span>{displayStageOrGroup(match)}</span>
      </div>
      <div className="teams-row">
        <strong><TeamLink teamName={match.homeTeam} /></strong>
        <Link
          className="score-link"
          href={`/kamp/${match.id}`}
          aria-label={`Kampkort for ${displayMatchup(match)}`}
        >
          <span>{formatScore(match.result?.homeGoals, match.result?.awayGoals)}</span>
          <em>Kampkort</em>
        </Link>
        <strong><TeamLink teamName={match.awayTeam} /></strong>
      </div>
      <PredictionForm match={match} prediction={prediction} locked={predictionClosed} compact />
      {match.result ? (
        <p className="score-line">
          {isLive ? "Resultattips hvis dette står:" : "Resultattips:"} <strong>{score.total}</strong> · utfall {score.outcome}, eksakt {score.exactResult}
          {score.bonus ? <> · bonustips <strong>{score.bonus}</strong></> : null}
        </p>
      ) : null}
      {otherPredictions.length ? (
        <div className="other-predictions">
          <p>Åpne kuponger etter avspark</p>
          <div>
            {otherPredictions.map((item) => {
              const other = state.players.find((candidate) => candidate.id === item.playerId);
              return (
                <span key={item.playerId}>
                  {other?.shortName}: {formatScore(item.homeGoals, item.awayGoals)}
                </span>
              );
            })}
          </div>
        </div>
      ) : null}
    </article>
  );
}
