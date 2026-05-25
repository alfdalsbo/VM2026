import { Medal, Star, Target } from "lucide-react";

import { Panel, Stat } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { displayMatchup } from "@/lib/display";
import { formatOsloDateTime, formatScore } from "@/lib/format";
import { computeStandings, describePrediction, getPrediction, scorePrediction } from "@/lib/scoring";
import { getAppState } from "@/lib/state";

export const metadata = {
  title: "Profil",
};

export default async function ProfilePage() {
  const [player, state] = await Promise.all([requireSession(), getAppState()]);
  const standings = computeStandings(state);
  const standing = standings.find((row) => row.player.id === player.id);
  const myPredictions = state.predictions.filter((prediction) => prediction.playerId === player.id);
  const completedPredictions = myPredictions.filter((prediction) =>
    state.matches.find((match) => match.id === prediction.matchId && match.result),
  );
  const hitRate = completedPredictions.length
    ? Math.round(((standing?.outcomeHits ?? 0) / completedPredictions.length) * 100)
    : 0;
  const history = [...state.matches]
    .filter((match) => match.result && getPrediction(state, player.id, match.id))
    .sort((a, b) => b.kickoffAt.localeCompare(a.kickoffAt))
    .slice(0, 12);

  const badges = [
    standing?.exactResults ? { icon: Star, title: "VAR-profet", text: `${standing.exactResults} eksakte resultater.` } : null,
    hitRate >= 50 ? { icon: Target, title: "Kupongkaptein", text: `${hitRate}% riktig utfall.` } : null,
    standing?.roundsWon ? { icon: Medal, title: "Kampdagens konge", text: `${standing.roundsWon} rundeseire.` } : null,
  ].filter(Boolean) as Array<{ icon: typeof Star; title: string; text: string }>;

  return (
    <div className="space-y-6">
      <Panel>
        <p className="eyebrow">Profil</p>
        <h1 className="section-title mt-2">{player.shortName}</h1>
        <p className="lead mt-3 max-w-3xl">
          Her ligger dine poeng, treff og sporene etter tipsene du senere kommer til å forklare som taktiske.
        </p>
      </Panel>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Plass" value={`#${standing?.rank ?? "-"}`} />
        <Stat label="Poeng" value={standing?.totalPoints ?? 0} />
        <Stat label="Treffprosent" value={`${hitRate}%`} />
        <Stat label="Eksakte" value={standing?.exactResults ?? 0} />
      </div>

      <Panel>
        <h2 className="section-title">Badges</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {badges.map((badge) => {
            const Icon = badge.icon;
            return (
              <article key={badge.title} className="rounded border border-black/10 bg-white/70 p-4">
                <Icon className="h-5 w-5 text-[#b4232f]" aria-hidden="true" />
                <h3 className="mt-2 font-black">{badge.title}</h3>
                <p className="lead mt-1">{badge.text}</p>
              </article>
            );
          })}
          {!badges.length ? <p className="lead">Ingen badges ennå. Garderoben venter tålmodig på dokumentert storhet.</p> : null}
        </div>
      </Panel>

      <Panel>
        <h2 className="section-title">Historikk</h2>
        <div className="table-wrap mt-4">
          <table>
            <thead>
              <tr>
                <th>Kamp</th>
                <th>Tid</th>
                <th>Tips</th>
                <th>Fasit</th>
                <th>Poeng</th>
              </tr>
            </thead>
            <tbody>
              {history.map((match) => {
                const prediction = getPrediction(state, player.id, match.id);
                const score = scorePrediction(match, prediction);
                return (
                  <tr key={match.id}>
                    <td>{displayMatchup(match)}</td>
                    <td>{formatOsloDateTime(match.kickoffAt)}</td>
                    <td>{describePrediction(prediction)}</td>
                    <td>{formatScore(match.result?.homeGoals, match.result?.awayGoals)}</td>
                    <td className="font-black">{score.total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
