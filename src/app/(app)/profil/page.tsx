import { Medal, Star, Target } from "lucide-react";

import { AvatarEditor } from "@/components/avatar-editor";
import { MatchupLinks } from "@/components/team-link";
import { Panel, Stat } from "@/components/ui";
import { getAvatarDisplay, getAvatarOptions } from "@/lib/avatars";
import { requireSession } from "@/lib/auth";
import { formatOsloDateTime, formatScore } from "@/lib/format";
import { computeStandings, describePrediction, getPrediction, scorePrediction } from "@/lib/scoring";
import { getAppState } from "@/lib/state";
import { buildNostalgiaBadges, type BadgeTheme } from "@/lib/world-cup-nostalgia";

export const metadata = {
  title: "Profil",
};

export default async function ProfilePage() {
  const [player, state] = await Promise.all([requireSession(), getAppState()]);
  const avatarOptions = getAvatarOptions();
  const avatarDisplay = getAvatarDisplay(state, player.id);
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

  const iconByBadge = {
    "rekdal-pen": Star,
    "rossi-row": Target,
    "maracanazo-alert": Medal,
    "baggio-miss": Target,
    "zidane-glance": Star,
  } satisfies Record<BadgeTheme["id"], typeof Star>;
  const badges = buildNostalgiaBadges({
    standing,
    hitRate,
    completedTips: completedPredictions.length,
  }).map((badge) => ({
    ...badge,
    icon: iconByBadge[badge.id],
  }));

  return (
    <div className="space-y-6">
      <Panel>
        <div className="profile-hero">
          <AvatarEditor player={player} display={avatarDisplay} options={avatarOptions} size={72} />
          <div>
            <p className="eyebrow">Profil</p>
            <h1 className="section-title mt-2">{player.shortName}</h1>
            <p className="lead mt-3 max-w-3xl">
              Trykk på sirkelen for å velge og plassere din egen avatar.
            </p>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-5">
        <Stat label="Plass" value={`#${standing?.rank ?? "-"}`} />
        <Stat label="Resultattips" value={standing?.resultTipPoints ?? 0} />
        <Stat label="Bonustips" value={standing?.bonusPoints ?? 0} />
        <Stat label="Treffprosent" value={`${hitRate}%`} />
        <Stat label="Eksakte" value={standing?.exactResults ?? 0} />
      </div>

      <Panel>
        <p className="eyebrow">Kjellerarkivet</p>
        <h2 className="section-title mt-2">Historiske badges</h2>
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
                <th>Resultattips</th>
                <th>Bonustips</th>
              </tr>
            </thead>
            <tbody>
              {history.map((match) => {
                const prediction = getPrediction(state, player.id, match.id);
                const score = scorePrediction(match, prediction, state);
                return (
                  <tr key={match.id}>
                    <td><MatchupLinks match={match} /></td>
                    <td>{formatOsloDateTime(match.kickoffAt)}</td>
                    <td>{describePrediction(prediction)}</td>
                    <td>{formatScore(match.result?.homeGoals, match.result?.awayGoals)}</td>
                    <td className="font-black">{score.total}</td>
                    <td>{score.bonus}</td>
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
