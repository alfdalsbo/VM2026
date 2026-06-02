import Link from "next/link";

import { Avatar } from "@/components/avatar";
import { DailyMatchImage } from "@/components/daily-match-image";
import { HomeDailyWorldCupMoment } from "@/components/home-daily-world-cup-moment";
import { MatchTipCard } from "@/components/match-tip-card";
import { NextMatchCard } from "@/components/next-match-card";
import { ScoringRulesPanel } from "@/components/scoring-rules-panel";
import { MatchupLinks } from "@/components/team-link";
import { Panel } from "@/components/ui";
import { getAwards, getMatchdayVerdict } from "@/lib/awards";
import { requireSession } from "@/lib/auth";
import { footballCopy, pickDashboardLine } from "@/lib/football-jargon";
import { formatOsloDate, formatScore } from "@/lib/format";
import { getAvatarMap } from "@/lib/avatars";
import { computeStandings, getPrediction, scorePrediction } from "@/lib/scoring";
import { getAppState } from "@/lib/state";
import { pickDailyNostalgiaMoment } from "@/lib/world-cup-nostalgia";

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
  const dailyNostalgia = pickDailyNostalgiaMoment(focusKey, focusMatches);
  const dashboardMatches = focusMatches;
  const tomorrowKey = focusMatches[0] ? osloDateKey(new Date(new Date(focusMatches[0].kickoffAt).getTime() + 24 * 60 * 60 * 1000)) : todayKey;
  const tomorrowMatches = matchesOnDate(state, tomorrowKey);
  const completedMatches = state.matches
    .filter((match) => match.result)
    .sort((a, b) => b.kickoffAt.localeCompare(a.kickoffAt))
    .slice(0, 4);
  const topStandings = standings.slice(0, 5);
  const avatars = getAvatarMap(state);
  const awards = getAwards(state);
  const matchdayVerdict = getMatchdayVerdict(state, now);

  return (
    <div className="dashboard space-y-5">
      <DailyMatchImage />

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
          <MatchTipCard key={match.id} match={match} player={player} state={state} bonusNext="/" />
        ))}
        {!dashboardMatches.length ? <Panel><p className="lead">{footballCopy.dashboardFallback}</p></Panel> : null}
      </div>

      <HomeDailyWorldCupMoment dateKey={focusKey} matches={focusMatches} moment={dailyNostalgia} />

      <div className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
        <Panel className="matchday-winner-panel">
          <p className="eyebrow">Resultattips</p>
          <h2 className="section-title mt-2">{matchdayVerdict?.title ?? "Gårsdagens dom venter"}</h2>
          {matchdayVerdict ? (
            <>
              <p className="lead mt-3">
                Heder til <strong>{formatVerdictNames(matchdayVerdict.winners)}</strong> med {formatVerdictPoints(matchdayVerdict.winners)} på {matchdayVerdict.dateLabel}.
                {" "}Skammekroken peker mot <strong>{formatVerdictNames(matchdayVerdict.losers)}</strong> med {formatVerdictPoints(matchdayVerdict.losers)}.
                {matchdayVerdict.isFallback ? " Gårsdagen hadde ingen ferdigspilte kamper, så kjelleren hentet siste kampdag." : ""}
              </p>
              <div className="matchday-winner-meta">
                <span>{matchdayVerdict.matchCount} kamper</span>
                <span>Vinner: {formatExactResults(matchdayVerdict.winners)}</span>
                <span>Taper: {formatExactResults(matchdayVerdict.losers)}</span>
              </div>
              <p className="matchday-winner-games">{matchdayVerdict.matches.join(" · ")}</p>
            </>
          ) : (
            <p className="lead mt-3">Ingen ferdige kamper ennå. Heder og spott står klare i hver sin konvolutt.</p>
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
                <article key={match.id} className="result-row">
                  <div>
                    <strong><MatchupLinks match={match} /></strong>
                    <em>{formatScore(match.result?.homeGoals, match.result?.awayGoals)} · resultattips {score.total} p{score.bonus ? ` · bonustips ${score.bonus}` : ""}</em>
                  </div>
                  <Link href={`/kamp/${match.id}`} className="result-row-action">Kampkort</Link>
                </article>
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
                <Avatar player={standing.player} display={avatars[standing.player.id]} size={28} />
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
        <div className="next-match-grid">
          {tomorrowMatches.map((match) => (
            <NextMatchCard key={match.id} match={match} />
          ))}
          {!tomorrowMatches.length ? <p className="lead">Ingen kamper dagen etter denne kampdagen.</p> : null}
        </div>
      </Panel>
    </div>
  );
}

function formatVerdictNames(rows: NonNullable<ReturnType<typeof getMatchdayVerdict>>["winners"]) {
  if (!rows.length) return "Ingen";
  if (rows.length === 1) return rows[0].playerName;
  if (rows.length === 2) return `${rows[0].playerName} og ${rows[1].playerName}`;
  return `${rows.slice(0, -1).map((row) => row.playerName).join(", ")} og ${rows.at(-1)?.playerName}`;
}

function formatVerdictPoints(rows: NonNullable<ReturnType<typeof getMatchdayVerdict>>["winners"]) {
  if (!rows.length) return "0 poeng";
  return `${rows[0].points} poeng`;
}

function formatExactResults(rows: NonNullable<ReturnType<typeof getMatchdayVerdict>>["winners"]) {
  if (!rows.length) return "0 eksakte";
  const exact = rows[0].exactResults;
  return `${exact} eksakt${exact === 1 ? "" : "e"}`;
}
