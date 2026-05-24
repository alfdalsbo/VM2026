import Link from "next/link";
import { notFound } from "next/navigation";

import { Panel } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { formatOsloDateTime, formatScore } from "@/lib/format";
import { getAppState } from "@/lib/state";
import { getTeamProfile, groupSquadByPosition, matchesForTeam } from "@/lib/teams";
import { formatMatchStatus } from "@/lib/tournament";

export const metadata = {
  title: "Lag",
};

export default async function TeamPage({ params }: { params: Promise<{ teamSlug: string }> }) {
  await requireSession();
  const { teamSlug } = await params;
  const state = await getAppState();
  const profile = getTeamProfile(state, teamSlug);
  if (!profile) notFound();
  const matches = matchesForTeam(state, profile.teamName);
  const squadGroups = groupSquadByPosition(profile.squad);

  return (
    <div className="space-y-6">
      <Panel>
        <p className="eyebrow">Lag</p>
        <h1 className="section-title mt-2">{profile.teamName}</h1>
        <p className="lead mt-3">
          Trener: <strong>{profile.coach.name ?? "Ikke publisert i gratisdata ennå"}</strong>
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a className="btn-secondary" href={profile.fifaUrl} target="_blank" rel="noreferrer">FIFA</a>
          <a className="btn-secondary" href={profile.fotmobUrl} target="_blank" rel="noreferrer">FotMob-søk</a>
        </div>
      </Panel>

      <Panel>
        <h2 className="section-title">Tropp</h2>
        <div className="squad-grid mt-4">
          {squadGroups.map((group) => (
            <section key={group.position}>
              <h3>{group.label}</h3>
              {group.players.length ? (
                <ul>
                  {group.players.map((player) => (
                    <li key={player.id}>
                      <span>{player.shirtNumber ?? "-"}</span>
                      <strong>{player.name}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="lead">Ikke tilgjengelig ennå.</p>
              )}
            </section>
          ))}
        </div>
      </Panel>

      <Panel>
        <h2 className="section-title">Kamper</h2>
        <div className="team-match-list mt-4">
          {matches.map((match) => (
            <Link key={match.id} href={`/kamp/${match.id}`}>
              <strong>{match.homeTeam} - {match.awayTeam}</strong>
              <span>{formatOsloDateTime(match.kickoffAt)} · {formatMatchStatus(match)} · {formatScore(match.result?.homeGoals, match.result?.awayGoals)}</span>
            </Link>
          ))}
        </div>
      </Panel>
    </div>
  );
}
