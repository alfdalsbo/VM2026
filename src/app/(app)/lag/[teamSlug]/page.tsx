import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";

import { TeamImageShelf, TeamNostalgiaPass } from "@/components/nostalgia";
import { MatchupLinks } from "@/components/team-link";
import { Panel } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { displayTeamName } from "@/lib/display";
import { formatOsloDateTime, formatScore } from "@/lib/format";
import { playerProfileIdFor } from "@/lib/player-profiles";
import { getAppState } from "@/lib/state";
import { getTeamProfile, groupSquadByPosition, matchesForTeam } from "@/lib/teams";
import { formatMatchStatus } from "@/lib/tournament";
import { getTeamNostalgiaProfile } from "@/lib/world-cup-nostalgia";

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
  const nostalgiaProfile = getTeamNostalgiaProfile(profile.teamName);
  const hasOnlyHistoricalNames = profile.squad.length > 0 && profile.squad.every((player) => player.source === "placeholder");

  return (
    <div className="space-y-6">
      <Panel>
        <div className="team-profile-hero">
          {profile.flagUrl ? <Image src={profile.flagUrl} alt="" className="team-flag" width={58} height={58} /> : null}
          <div>
            <p className="eyebrow">Lag</p>
            <h1 className="section-title mt-2">{displayTeamName(profile.teamName)}</h1>
            <p className="lead mt-3">
              Trener: <strong>{profile.coach.name ?? "Ikke publisert i gratisdata ennå"}</strong>
              {profile.coach.countryCode ? ` · ${profile.coach.countryCode}` : ""}
            </p>
          </div>
        </div>
        <dl className="team-facts mt-4">
          <div>
            <dt>Kortnavn</dt>
            <dd>{profile.abbreviation ?? "-"}</dd>
          </div>
          <div>
            <dt>Forbund</dt>
            <dd>{profile.confederation ?? "-"}</dd>
          </div>
          <div>
            <dt>Stiftet</dt>
            <dd>{profile.foundationYear ?? "-"}</dd>
          </div>
          <div>
            <dt>Base</dt>
            <dd>{profile.city ?? "-"}</dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-3">
          <a className="btn-secondary" href={profile.fifaUrl} target="_blank" rel="noreferrer">FIFA</a>
          <a className="btn-secondary" href={profile.fotmobUrl} target="_blank" rel="noreferrer">FotMob-søk</a>
          {profile.officialSite ? <a className="btn-secondary" href={profile.officialSite} target="_blank" rel="noreferrer">Offisiell side</a> : null}
        </div>
      </Panel>

      <TeamNostalgiaPass profile={nostalgiaProfile} />
      <TeamImageShelf teamName={profile.teamName} />

      <Panel>
        <p className="eyebrow">{hasOnlyHistoricalNames ? "Historiske navn" : "Tropp"}</p>
        <h2 className="section-title mt-2">{hasOnlyHistoricalNames ? "Arkivtropp til FIFA-data kommer" : "Tropp"}</h2>
        <p className="lead mt-3">
          {hasOnlyHistoricalNames
            ? "Dette er historiske navn som holder garderoben varm til 2026-troppen publiseres i gratisdata."
            : "Publisert troppdata fra de tilgjengelige kampkildene."}
        </p>
        <div className="squad-grid mt-4">
          {squadGroups.map((group) => (
            <section key={group.position}>
              <h3>{group.label}</h3>
              {group.players.length ? (
                <ul>
                  {group.players.map((player) => (
                    <li key={player.id}>
                      <span>{player.shirtNumber ?? "-"}</span>
                      <div>
                        <Link href={`/spiller/${player.playerProfileId ?? playerProfileIdFor(profile.teamName, player.id, player.name)}`}>
                          <strong>{player.name}</strong>
                        </Link>
                        <small>
                          {[
                            player.positionDetail,
                            player.heightCm ? `${player.heightCm} cm` : null,
                            player.goals ? `${player.goals} mål` : null,
                            player.yellowCards ? `${player.yellowCards} gule` : null,
                            player.redCards ? `${player.redCards} røde` : null,
                            player.source === "placeholder" ? "Historisk navn" : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </small>
                      </div>
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
            <article key={match.id} className="team-match-card">
              <strong><MatchupLinks match={match} /></strong>
              <span>{formatOsloDateTime(match.kickoffAt)} · {formatMatchStatus(match)} · {formatScore(match.result?.homeGoals, match.result?.awayGoals)}</span>
              <Link href={`/kamp/${match.id}`} className="team-match-card-action">Kampkort</Link>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}
