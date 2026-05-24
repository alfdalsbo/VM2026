import Link from "next/link";
import { ArrowRight, CalendarClock, Crown, Target, Trophy } from "lucide-react";

import { MatchCard } from "@/components/match-card";
import { Panel, Stat } from "@/components/ui";
import { getAwards, pickLine } from "@/lib/awards";
import { requireSession } from "@/lib/auth";
import { formatOsloDateTime } from "@/lib/format";
import { computeStandings, getPrediction, isMatchLocked, scorePrediction } from "@/lib/scoring";
import { getAppState, getStorageMode } from "@/lib/state";

export const metadata = {
  title: "Hjem",
};

export default async function HomePage() {
  const [player, state] = await Promise.all([requireSession(), getAppState()]);
  const standings = computeStandings(state);
  const myStanding = standings.find((row) => row.player.id === player.id) ?? standings[0];
  const nextMatch = state.matches.find((match) => !isMatchLocked(match));
  const openMatches = state.matches.filter((match) => !isMatchLocked(match)).slice(0, 3);
  const completedMatches = state.matches.filter((match) => match.result).sort((a, b) => b.kickoffAt.localeCompare(a.kickoffAt)).slice(0, 4);
  const awards = getAwards(state);
  const predictions = state.predictions.filter((prediction) => prediction.playerId === player.id).length;
  const totalPossible = state.matches.length;
  const line = pickLine(new Date().toISOString().slice(0, 10));

  return (
    <div className="space-y-6">
      <section className="hero">
        <div>
          <p className="eyebrow">Privat VM-liga · 2026</p>
          <h1>Tippekampen som kommer til å bli tatt litt for alvorlig.</h1>
          <p>{line}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/kamper" className="btn-primary">
              Åpne kampene
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/tabell" className="btn-secondary">
              Se tabellen
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Din plass" value={`#${myStanding?.rank ?? "-"}`} detail={`${myStanding?.totalPoints ?? 0} poeng`} />
        <Stat label="Dine tips" value={`${predictions}/${totalPossible}`} detail="Ført før kampstart, som voksne folk nesten." />
        <Stat label="Neste frist" value={nextMatch ? `#${nextMatch.matchNumber}` : "Ferdig"} detail={nextMatch ? formatOsloDateTime(nextMatch.kickoffAt) : "Alle kamper er låst."} />
        <Stat label="Lagring" value={getStorageMode()} detail="Postgres først, Vercel Blob som varig fallback." />
      </div>

      <Panel>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Neste oppgave</p>
            <h2 className="section-title">Åpne tips</h2>
          </div>
          <Link href="/kamper" className="btn-secondary">
            Alle kamper
          </Link>
        </div>
        <div className="grid gap-4">
          {openMatches.map((match) => (
            <MatchCard key={match.id} match={match} player={player} state={state} />
          ))}
          {!openMatches.length ? <p className="lead">Ingen åpne kamper. Enten er VM over, eller så er tabellen i ferd med å skrive historie uten oss.</p> : null}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
        <Panel>
          <div className="mb-4 flex items-center gap-3">
            <Crown className="h-5 w-5 text-[#b4232f]" aria-hidden="true" />
            <h2 className="section-title">Kåringer</h2>
          </div>
          <div className="grid gap-3">
            {awards.map((award) => (
              <article key={award.title} className="rounded border border-black/10 bg-white/70 p-4">
                <h3 className="font-black">{award.title}</h3>
                <p className="lead mt-1">{award.text}</p>
              </article>
            ))}
          </div>
        </Panel>

        <Panel>
          <div className="mb-4 flex items-center gap-3">
            <Trophy className="h-5 w-5 text-[#b4232f]" aria-hidden="true" />
            <h2 className="section-title">Siste resultater</h2>
          </div>
          <div className="space-y-3">
            {completedMatches.map((match) => {
              const prediction = getPrediction(state, player.id, match.id);
              const score = scorePrediction(match, prediction);
              return (
                <article key={match.id} className="rounded border border-black/10 bg-white/70 p-4">
                  <p className="text-sm font-bold text-[#6f5a46]">#{match.matchNumber} · {match.group ?? match.stageLabel}</p>
                  <h3 className="mt-1 font-black">{match.homeTeam} - {match.awayTeam}</h3>
                  <p className="lead mt-1">Du fikk {score.total} poeng.</p>
                </article>
              );
            })}
            {!completedMatches.length ? (
              <p className="lead">Ingen resultater ført ennå. Optimismen er derfor fortsatt uregulert.</p>
            ) : null}
          </div>
        </Panel>
      </div>

      <Panel className="grid gap-4 md:grid-cols-2">
        <div className="flex gap-3">
          <CalendarClock className="mt-1 h-5 w-5 shrink-0 text-[#b4232f]" aria-hidden="true" />
          <div>
            <h2 className="font-black">Frister følger kampstart i Oslo-tid</h2>
            <p className="lead">Etter kampstart låses tipset. Da kan resten av gjengen se hva du faktisk mente, ikke hva du later som du mente.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Target className="mt-1 h-5 w-5 shrink-0 text-[#b4232f]" aria-hidden="true" />
          <div>
            <h2 className="font-black">Joker én gang per kampdag</h2>
            <p className="lead">Joker dobler poengene på valgt kamp. Bytter du joker på samme kampdag, flyttes den gamle automatisk.</p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
