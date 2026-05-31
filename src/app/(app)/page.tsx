import Link from "next/link";

import { DailyMatchImage } from "@/components/daily-match-image";
import { MatchTipCard } from "@/components/match-tip-card";
import { ScoringRulesPanel } from "@/components/scoring-rules-panel";
import { Panel } from "@/components/ui";
import { getAwards, getMatchdayWinner } from "@/lib/awards";
import { requireSession } from "@/lib/auth";
import { displayMatchup } from "@/lib/display";
import { footballCopy, pickDashboardLine } from "@/lib/football-jargon";
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

export default async function HomePage() {
  const [player, state] = await Promise.all([requireSession(), getAppState()]);
  const standings = computeStandings(state);
  const now = new Date();
  const todayKey = osloDateKey(now);
  const todayMatches = matchesOnDate(state, todayKey);
  const nextOpenMatch = state.matches.find((match) => new Date(match.kickoffAt).getTime() > now.getTime());
  const focusKey = todayMatches.length ? todayKey : nextOpenMatch ? osloDateKey(nextOpenMatch.kickoffAt) : todayKey;
  const focusMatches = todayMatches.length ? todayMatches : matchesOnDate(state, focusKey);
  const dashboardMatches = focusMatches;
  const tomorrowKey = focusMatches[0] ? osloDateKey(new Date(new Date(focusMatches[0].kickoffAt).getTime() + 24 * 60 * 60 * 1000)) : todayKey;
  const tomorrowMatches = matchesOnDate(state, tomorrowKey);
  const completedMatches = state.matches
    .filter((match) => match.result)
    .sort((a, b) => b.kickoffAt.localeCompare(a.kickoffAt))
    .slice(0, 4);
  const topStandings = standings.slice(0, 5);
  const awards = getAwards(state);
  const matchdayWinner = getMatchdayWinner(state, now);

  return (
    <div className="dashboard space-y-5">
      <DailyMatchImage focusDate={focusKey} />

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

      <div className="tip-day-matches">
        {dashboardMatches.map((match) => (
          <MatchTipCard key={match.id} match={match} player={player} state={state} />
        ))}
        {!dashboardMatches.length ? <Panel><p className="lead">{footballCopy.dashboardFallback}</p></Panel> : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
        <Panel className="matchday-winner-panel">
          <p className="eyebrow">Resultattips</p>
          <h2 className="section-title mt-2">{matchdayWinner?.title ?? "Rundevinner venter"}</h2>
          {matchdayWinner ? (
            <>
              <p className="lead mt-3">
                {formatWinnerNames(matchdayWinner.winners)} tok {formatWinnerPoints(matchdayWinner.winners)} på {matchdayWinner.dateLabel}.
                {matchdayWinner.isFallback ? " Gårsdagen hadde ingen ferdigspilte kamper, så kjelleren hentet siste kampdag." : ""}
              </p>
              <div className="matchday-winner-meta">
                <span>{matchdayWinner.matchCount} kamper</span>
                <span>{formatExactResults(matchdayWinner.winners)}</span>
              </div>
              <p className="matchday-winner-games">{matchdayWinner.matches.join(" · ")}</p>
            </>
          ) : (
            <p className="lead mt-3">Ingen ferdige kamper ennå. Pokalen står og later som den er tung.</p>
          )}
        </Panel>

        <ScoringRulesPanel />
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
              const score = scorePrediction(match, prediction, state);
              return (
                <Link key={match.id} href={`/kamp/${match.id}`} className="result-row">
                  <strong>{displayMatchup(match)}</strong>
                  <em>{formatScore(match.result?.homeGoals, match.result?.awayGoals)} · resultattips {score.total} p{score.bonus ? ` · bonustips ${score.bonus}` : ""}</em>
                </Link>
              );
            })}
            {!completedMatches.length ? <p className="lead">Ingen resultater ennå. Alle kan fortsatt late som planen er solid.</p> : null}
          </div>
        </Panel>

        <Panel>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Resultattips</p>
              <h2 className="section-title">Topp 5</h2>
            </div>
            <Link href="/tabell" className="btn-secondary">Resultattips</Link>
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
              <strong>{displayMatchup(match)}</strong>
              <span>{formatOsloDateTime(match.kickoffAt)} · {formatMatchStatus(match)}</span>
            </Link>
          ))}
          {!tomorrowMatches.length ? <p className="lead">Ingen kamper dagen etter denne kampdagen.</p> : null}
        </div>
      </Panel>
    </div>
  );
}

function formatWinnerNames(winners: NonNullable<ReturnType<typeof getMatchdayWinner>>["winners"]) {
  if (!winners.length) return "Ingen";
  if (winners.length === 1) return winners[0].playerName;
  if (winners.length === 2) return `${winners[0].playerName} og ${winners[1].playerName}`;
  return `${winners.slice(0, -1).map((winner) => winner.playerName).join(", ")} og ${winners.at(-1)?.playerName}`;
}

function formatWinnerPoints(winners: NonNullable<ReturnType<typeof getMatchdayWinner>>["winners"]) {
  if (!winners.length) return "0 poeng";
  return `${winners[0].points} poeng`;
}

function formatExactResults(winners: NonNullable<ReturnType<typeof getMatchdayWinner>>["winners"]) {
  if (!winners.length) return "0 eksakte";
  const exact = winners[0].exactResults;
  return `${exact} eksakt${exact === 1 ? "" : "e"}`;
}
