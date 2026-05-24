import Link from "next/link";
import { MapPin } from "lucide-react";

import { PredictionForm } from "@/components/prediction-form";
import { TeamLink } from "@/components/team-link";
import { formatOsloDateTime, formatScore } from "@/lib/format";
import { getPrediction, isMatchLocked, scorePrediction } from "@/lib/scoring";
import { formatBroadcast, formatMatchStatus } from "@/lib/tournament";
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
  const score = scorePrediction(match, prediction);
  const locked = isMatchLocked(match);
  const otherPredictions =
    showLockedPredictions && locked
      ? state.predictions.filter((item) => item.matchId === match.id && item.playerId !== player.id)
      : [];

  return (
    <article id={match.id} className="match-card">
      <div className="match-meta">
        <span>#{match.matchNumber}</span>
        <span>{match.group ?? match.stageLabel}</span>
        <span>{formatOsloDateTime(match.kickoffAt)}</span>
        <span>{formatBroadcast(match)}</span>
        <span>{formatMatchStatus(match)}</span>
      </div>
      <div className="teams-row">
        <strong><TeamLink teamName={match.homeTeam} /></strong>
        <Link
          className="score-link"
          href={`/kamp/${match.id}`}
          aria-label={`Kampkort for ${match.homeTeam} mot ${match.awayTeam}`}
        >
          <span>{formatScore(match.result?.homeGoals, match.result?.awayGoals)}</span>
          <em>Kampkort</em>
        </Link>
        <strong><TeamLink teamName={match.awayTeam} /></strong>
      </div>
      <p className="venue">
        <MapPin className="h-4 w-4" aria-hidden="true" />
        {match.city} · {match.venue}
      </p>
      <PredictionForm match={match} prediction={prediction} locked={locked} />
      {match.result && prediction ? (
        <p className="score-line">
          Poeng: <strong>{score.total}</strong> · utfall {score.outcome}, målforskjell {score.goalDifference}, eksakt {score.exactResult}
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
