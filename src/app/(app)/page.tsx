import Link from "next/link";

import { MatchCard } from "@/components/match-card";
import { Notice, Panel } from "@/components/ui";
import { getAwards } from "@/lib/awards";
import { requireSession } from "@/lib/auth";
import { footballCopy, pickDashboardLine } from "@/lib/football-jargon";
import { followedMatchIdsForPlayer } from "@/lib/followed-matches";
import { formatOsloDate, formatOsloDateTime, formatScore } from "@/lib/format";
import { computeStandings, getPrediction, scorePrediction } from "@/lib/scoring";
import { getAppState } from "@/lib/state";
import { formatMatchStatus } from "@/lib/tournament";

export const metadata = {
  title: "Hjem",
};

const osloKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "Europe/Oslo",
  year: "numeric",
});

function osloDateKey(value: string | Date) {
  const parts = osloKeyFormatter.formatToParts(typeof value === "string" ? new Date(value) : value);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

function matchesOnDate(state: Awaited<ReturnType<typeof getAppState>>, key: string) {
  return state.matches.filter((match) => osloDateKey(match.kickoffAt) === key).sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt));
}

function uniqueMatches(matches: Awaited<ReturnType<typeof getAppState>>["matches"]) {
  const seen = new Set<string>();
  return matches.filter((match) => {
    if (seen.has(match.id)) return false;
    seen.add(match.id);
    return true;
  });
}

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; error?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const [player, state] = await Promise.all([requireSession(), getAppState()]);
  const standings = computeStandings(state);
  const now = new Date();
  const todayKey = osloDateKey(now);
  const todayMatches = matchesOnDate(state, todayKey);
  const nextOpenMatch = state.matches.find((match) => new Date(match.kickoffAt).getTime() > now.getTime());
  const focusKey = todayMatches.length ? todayKey : nextOpenMatch ? osloDateKey(nextOpenMatch.kickoffAt) : todayKey;
  const focusMatches = todayMatches.length ? todayMatches : matchesOnDate(state, focusKey);
  const followedIds = followedMatchIdsForPlayer(state, player.id);
  const followWindowEnd = now.getTime() + 48 * 60 * 60 * 1000;
  const followedFocusMatches = state.matches
    .filter((match) => {
      if (!followedIds.has(match.id)) return false;
      const kickoff = new Date(match.kickoffAt).getTime();
      return match.status === "live" || match.status === "halftime" || (kickoff >= now.getTime() && kickoff <= followWindowEnd);
    })
    .sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt));
  const dashboardMatches = uniqueMatches([...followedFocusMatches, ...focusMatches]);
  const tomorrowKey = focusMatches[0] ? osloDateKey(new Date(new Date(focusMatches[0].kickoffAt).getTime() + 24 * 60 * 60 * 1000)) : todayKey;
  const tomorrowMatches = matchesOnDate(state, tomorrowKey);
  const completedMatches = state.matches
    .filter((match) => match.result)
    .sort((a, b) => b.kickoffAt.localeCompare(a.kickoffAt))
    .slice(0, 4);
  const topStandings = standings.slice(0, 5);
  const awards = getAwards(state);

  return (
    <div className="dashboard space-y-5">
      <Notice message={params.status} />
      <Notice message={params.error} tone="error" />

      <section className="dashboard-top">
        <div>
          <p className="eyebrow">Tippekjelleren · VM 2026</p>
          <h1 className="dashboard-title">{todayMatches.length ? "Dagens kamper" : "Neste kampdag"}</h1>
          <p className="lead">{formatOsloDate(focusMatches[0]?.kickoffAt ?? new Date().toISOString())}</p>
          <p className="dashboard-line">{pickDashboardLine(focusKey)}</p>
        </div>
        <Link href="/kamper" className="btn-secondary">
          Alle kamper
        </Link>
      </section>

      <div className="grid gap-3">
        {dashboardMatches.map((match) => (
          <MatchCard key={match.id} match={match} player={player} state={state} />
        ))}
        {!dashboardMatches.length ? <Panel><p className="lead">{footballCopy.dashboardFallback}</p></Panel> : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
        <Panel>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Resultater</p>
              <h2 className="section-title">Siste ferdige</h2>
            </div>
            <Link href="/kamper" className="btn-secondary">Se alle</Link>
          </div>
          <div className="space-y-3">
            {completedMatches.map((match) => {
              const prediction = getPrediction(state, player.id, match.id);
              const score = scorePrediction(match, prediction);
              return (
                <Link key={match.id} href={`/kamp/${match.id}`} className="result-row">
                  <span>#{match.matchNumber}</span>
                  <strong>{match.homeTeam} - {match.awayTeam}</strong>
                  <em>{formatScore(match.result?.homeGoals, match.result?.awayGoals)} · {score.total} p</em>
                </Link>
              );
            })}
            {!completedMatches.length ? <p className="lead">Ingen resultater ennå. Alle kan fortsatt late som planen er solid.</p> : null}
          </div>
        </Panel>

        <Panel>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Tabell</p>
              <h2 className="section-title">Topp 5</h2>
            </div>
            <Link href="/tabell" className="btn-secondary">Tabell</Link>
          </div>
          <div className="standings-mini">
            {topStandings.map((standing) => (
              <div key={standing.player.id}>
                <span>#{standing.rank}</span>
                <strong>{standing.player.shortName}</strong>
                <em>{standing.totalPoints} p</em>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel>
        <div className="mb-4">
          <p className="eyebrow">Kjellerjuryen</p>
          <h2 className="section-title">Dagens bemerkninger</h2>
        </div>
        <div className="awards-grid">
          {awards.map((award) => (
            <article key={award.title}>
              <strong>{award.title}</strong>
              <p>{award.text}</p>
            </article>
          ))}
        </div>
      </Panel>

      <Panel>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Neste</p>
            <h2 className="section-title">Morgendagens kamper</h2>
          </div>
          <span className="lead text-sm">{formatOsloDate(tomorrowMatches[0]?.kickoffAt ?? focusMatches[0]?.kickoffAt ?? new Date().toISOString())}</span>
        </div>
        <div className="tomorrow-grid">
          {tomorrowMatches.map((match) => (
            <Link key={match.id} href={`/kamp/${match.id}`}>
              <strong>{match.homeTeam} - {match.awayTeam}</strong>
              <span>{formatOsloDateTime(match.kickoffAt)} · {formatMatchStatus(match)}</span>
            </Link>
          ))}
          {!tomorrowMatches.length ? <p className="lead">Ingen kamper dagen etter denne kampdagen.</p> : null}
        </div>
      </Panel>
    </div>
  );
}
