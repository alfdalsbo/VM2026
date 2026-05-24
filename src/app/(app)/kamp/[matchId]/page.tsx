import Link from "next/link";
import { notFound } from "next/navigation";

import { LineupBoard } from "@/components/lineup-board";
import { ShareButton } from "@/components/share-button";
import { TeamLink } from "@/components/team-link";
import { Panel } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { formatOsloDateTime, formatScore } from "@/lib/format";
import { createShareToken } from "@/lib/share-card";
import { describePrediction, getPrediction, scorePrediction } from "@/lib/scoring";
import { getAppState } from "@/lib/state";
import { formatBroadcast, formatMatchStatus } from "@/lib/tournament";

export const metadata = {
  title: "Kampkort",
};

export default async function MatchPage({ params }: { params: Promise<{ matchId: string }> }) {
  const [player, state] = await Promise.all([requireSession(), getAppState()]);
  const { matchId } = await params;
  const match = state.matches.find((item) => item.id === matchId);
  if (!match) notFound();

  const prediction = getPrediction(state, player.id, match.id);
  const score = scorePrediction(match, prediction);
  const lineup = state.lineups.find((item) => item.matchId === match.id) ?? null;
  const stats = state.matchStats.find((item) => item.matchId === match.id) ?? null;
  const shareToken =
    match.result && prediction
      ? createShareToken({
          playerId: player.id,
          matchId: match.id,
          issuedAt: Date.parse(prediction.updatedAt),
        })
      : null;
  const shareText = `${player.shortName} tippet ${describePrediction(prediction)} på ${match.homeTeam} - ${match.awayTeam}. Fasit: ${formatScore(match.result?.homeGoals, match.result?.awayGoals)}. ${score.total} poeng.`;

  return (
    <div className="space-y-6">
      <Panel>
        <p className="eyebrow">Kamp #{match.matchNumber}</p>
        <div className="teams-row">
          <strong><TeamLink teamName={match.homeTeam} /></strong>
          <span>{formatScore(match.result?.homeGoals, match.result?.awayGoals)}</span>
          <strong><TeamLink teamName={match.awayTeam} /></strong>
        </div>
        <p className="lead mt-4">
          {formatOsloDateTime(match.kickoffAt)} · {formatBroadcast(match)} · {formatMatchStatus(match)}
        </p>
      </Panel>

      <Panel>
        <div className="match-detail-grid">
          <div>
            <p className="eyebrow">Ditt kort</p>
            <h1 className="section-title mt-2">{describePrediction(prediction)}</h1>
            <p className="lead mt-3">Poeng: <strong>{score.total}</strong> · utfall {score.outcome}, målforskjell {score.goalDifference}, eksakt {score.exactResult}</p>
          </div>
          {shareToken ? (
            <ShareButton path={`/kort/${shareToken}`} text={shareText} title="Tippekjelleren-kort" />
          ) : (
            <Link className="btn-secondary" href="/kamper">Til kampene</Link>
          )}
        </div>
      </Panel>

      <Panel>
        <h2 className="section-title">Kampstatistikk</h2>
        {stats ? (
          <div className="stats-grid mt-4">
            <StatLine label="Ballbesittelse" home={stats.homePossession} away={stats.awayPossession} suffix="%" />
            <StatLine label="Skudd" home={stats.homeShots} away={stats.awayShots} />
            <StatLine label="Skudd på mål" home={stats.homeShotsOnTarget} away={stats.awayShotsOnTarget} />
            <StatLine label="Cornere" home={stats.homeCorners} away={stats.awayCorners} />
          </div>
        ) : (
          <p className="lead mt-3">Enkel statistikk vises her når gratisdata har noe å komme med.</p>
        )}
      </Panel>

      <Panel>
        <LineupBoard lineup={lineup} match={match} />
      </Panel>
    </div>
  );
}

function StatLine({ label, home, away, suffix = "" }: { label: string; home: number | null; away: number | null; suffix?: string }) {
  return (
    <div>
      <span>{home === null ? "-" : `${home}${suffix}`}</span>
      <strong>{label}</strong>
      <span>{away === null ? "-" : `${away}${suffix}`}</span>
    </div>
  );
}
