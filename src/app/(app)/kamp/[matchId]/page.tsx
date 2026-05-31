import Link from "next/link";
import { notFound } from "next/navigation";

import { LineupBoard } from "@/components/lineup-board";
import { LiveAutoRefresh } from "@/components/live-auto-refresh";
import { LivePotCard } from "@/components/live-pot-card";
import { MatchEvents } from "@/components/match-events";
import { ProjectedStandings } from "@/components/projected-standings";
import { ScorerAssistPicker } from "@/components/scorer-assist-picker";
import { ShareButton } from "@/components/share-button";
import { TeamLink } from "@/components/team-link";
import { Panel } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { displayMatchup, displayTeamName } from "@/lib/display";
import { formatOsloDateTime, formatScore } from "@/lib/format";
import { createShareToken } from "@/lib/share-card";
import { describePrediction, getPrediction, isMatchLocked, scorePrediction } from "@/lib/scoring";
import { getAppState } from "@/lib/state";
import type { MatchStats } from "@/lib/types";
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
  const score = scorePrediction(match, prediction, state);
  const lineup = state.lineups.find((item) => item.matchId === match.id) ?? null;
  const stats = state.matchStats.find((item) => item.matchId === match.id) ?? null;
  const events = state.matchEvents
    .filter((event) => event.matchId === match.id)
    .sort((a, b) => (a.minute ?? 999) - (b.minute ?? 999) || a.id.localeCompare(b.id));
  const isLive = match.status === "live" || match.status === "halftime";
  const locked = isMatchLocked(match);
  const homeSquad = state.teamProfiles.find((profile) => profile.teamName === match.homeTeam)?.squad ?? [];
  const awaySquad = state.teamProfiles.find((profile) => profile.teamName === match.awayTeam)?.squad ?? [];
  const shareToken =
    match.result && prediction
      ? createShareToken({
          playerId: player.id,
          matchId: match.id,
          issuedAt: Date.parse(prediction.updatedAt),
        })
      : null;
  const shareText = `${player.shortName} tippet ${describePrediction(prediction)} på ${displayMatchup(match)}. Fasit: ${formatScore(match.result?.homeGoals, match.result?.awayGoals)}. ${score.total} resultattips, ${score.bonus} bonustips.`;

  return (
    <div className="space-y-6">
      {isLive ? <LiveAutoRefresh /> : null}

      <Panel>
        <p className="eyebrow">Kamp {match.matchNumber}</p>
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
            <p className="lead mt-3">
              {isLive ? "Resultattips hvis dette står:" : "Resultattips:"} <strong>{score.total}</strong> · utfall {score.outcome}, målforskjell {score.goalDifference}, eksakt {score.exactResult}
              {score.bonus ? <> · bonustips <strong>{score.bonus}</strong></> : null}
            </p>
          </div>
          {shareToken ? (
            <ShareButton path={`/kort/${shareToken}`} text={shareText} title="Tippekjelleren-kort" />
          ) : (
            <Link className="btn-secondary" href="/kamper">Til kampene</Link>
          )}
        </div>
      </Panel>

      {!locked ? (
        <Panel>
          <div className="mb-4">
            <p className="eyebrow">Bonustips</p>
            <h2 className="section-title">Mine spillere</h2>
            <p className="lead mt-2 max-w-2xl">
              Tipp hvem som scorer og hvem som setter dem opp. Rekkefølgen spiller ingen rolle — en treff for hver gang riktig spiller står for et mål/assist.
            </p>
          </div>
          <ScorerAssistPicker
            match={match}
            prediction={prediction}
            homeSquad={homeSquad}
            awaySquad={awaySquad}
          />
        </Panel>
      ) : null}

      {isLive ? (
        <LivePotCard match={match} player={player} state={state} />
      ) : null}

      {isLive ? (
        <Panel>
          <ProjectedStandings match={match} player={player} state={state} />
        </Panel>
      ) : null}

      <Panel>
        <MatchEvents events={events} />
      </Panel>

      <Panel>
        <h2 className="section-title">Kampstatistikk</h2>
        {stats ? (
          <>
            <div className="stats-grid mt-4">
              <StatLine label="Ballbesittelse" home={stats.homePossession} away={stats.awayPossession} suffix="%" />
              <StatLine label="Skudd" home={stats.homeShots} away={stats.awayShots} />
              <StatLine label="Skudd på mål" home={stats.homeShotsOnTarget} away={stats.awayShotsOnTarget} />
              <StatLine label="Cornere" home={stats.homeCorners} away={stats.awayCorners} />
            </div>
            <div className="match-facts mt-4">
              <Fact label="Tilskuere" value={stats.attendance != null ? stats.attendance.toLocaleString("nb-NO") : null} />
              <Fact label="Vær" value={formatWeather(stats)} />
              <Fact label={displayTeamName(match.homeTeam)} value={stats.homeFormation ? `Formasjon ${stats.homeFormation}` : null} />
              <Fact label={displayTeamName(match.awayTeam)} value={stats.awayFormation ? `Formasjon ${stats.awayFormation}` : null} />
            </div>
            {(stats.officials ?? []).length ? (
              <div className="official-list mt-4">
                {(stats.officials ?? []).map((official) => (
                  <span key={official.id}>
                    <strong>{official.role}</strong>
                    {official.name}{official.countryCode ? ` (${official.countryCode})` : ""}
                  </span>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <p className="lead mt-3">Kampstatistikk legges på dommerbordet når gratisdata har noe å komme med.</p>
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
      <span>{home == null ? "-" : `${home}${suffix}`}</span>
      <strong>{label}</strong>
      <span>{away == null ? "-" : `${away}${suffix}`}</span>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value ?? "-"}</strong>
    </div>
  );
}

function formatWeather(stats: MatchStats) {
  const parts = [
    stats.weather,
    stats.temperatureCelsius != null ? `${stats.temperatureCelsius} °C` : null,
    stats.windSpeed != null ? `${stats.windSpeed} km/t vind` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}
