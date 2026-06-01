import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MatchupLinks, TeamLink } from "@/components/team-link";
import { Panel, Stat } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { formatOsloDateTime, formatScore } from "@/lib/format";
import { getPlayerProfile } from "@/lib/player-profiles";
import { getAppState } from "@/lib/state";

export const metadata = {
  title: "Spillerkort",
};

export default async function PlayerPage({ params }: { params: Promise<{ playerId: string }> }) {
  await requireSession();
  const { playerId } = await params;
  const state = await getAppState();
  const profile = getPlayerProfile(state, playerId);
  if (!profile) notFound();

  const events = state.matchEvents
    .filter((event) => event.playerProfileId === profile.id || event.playerName === profile.name)
    .sort((a, b) => a.matchId.localeCompare(b.matchId) || (a.minute ?? 999) - (b.minute ?? 999));
  const matches = state.matches.filter((match) => match.homeTeam === profile.teamName || match.awayTeam === profile.teamName);

  return (
    <div className="space-y-6">
      <Panel>
        <div className="player-hero">
          {profile.pictureUrl ? <Image src={profile.pictureUrl} alt="" width={78} height={78} className="player-photo" /> : null}
          <div>
            <p className="eyebrow">Spillerkort</p>
            <h1 className="section-title mt-2">{profile.name}</h1>
            <p className="lead mt-3">
              <TeamLink teamName={profile.teamName} />
              {profile.shirtNumber ? ` · #${profile.shirtNumber}` : ""} · {profile.positionDetail ?? positionLabel(profile.position)}
            </p>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Mål" value={profile.goals ?? 0} />
        <Stat label="Assist" value={profile.assists ?? 0} />
        <Stat label="Minutter" value={profile.minutesPlayed ?? "-"} />
        <Stat label="Kort" value={`${profile.yellowCards ?? 0}G/${profile.redCards ?? 0}R`} />
      </div>

      <Panel>
        <h2 className="section-title">Troppstatus</h2>
        <dl className="team-facts mt-4">
          <div>
            <dt>Status</dt>
            <dd>{rosterLabel(profile.rosterStatus)}</dd>
          </div>
          <div>
            <dt>Kamper</dt>
            <dd>{profile.matchesPlayed ?? "-"}</dd>
          </div>
          <div>
            <dt>Starter</dt>
            <dd>{profile.starts ?? "-"}</dd>
          </div>
          <div>
            <dt>Høyde</dt>
            <dd>{profile.heightCm ? `${profile.heightCm} cm` : "-"}</dd>
          </div>
        </dl>
      </Panel>

      <Panel>
        <h2 className="section-title">Kampnotater</h2>
        {events.length ? (
          <div className="player-event-list mt-4">
            {events.map((event) => {
              const match = state.matches.find((item) => item.id === event.matchId);
              return (
                <article key={event.id} className="player-event-card">
                  <Link href={`/kamp/${event.matchId}`}>
                    <strong>{eventName(event.type)}</strong>
                  </Link>
                  <span>
                    {event.minute != null ? `${event.minute}' · ` : ""}
                    {match ? <MatchupLinks match={match} /> : "Kamp"}
                    {event.scoreAfter ? ` · ${formatScore(event.scoreAfter.homeGoals, event.scoreAfter.awayGoals)}` : ""}
                  </span>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="lead mt-3">Ingen hendelser i protokollen ennå.</p>
        )}
      </Panel>

      <Panel>
        <h2 className="section-title">Kamper</h2>
        <div className="team-match-list mt-4">
          {matches.map((match) => (
            <article key={match.id} className="team-match-card">
              <strong><MatchupLinks match={match} /></strong>
              <span>{formatOsloDateTime(match.kickoffAt)} · {formatScore(match.result?.homeGoals, match.result?.awayGoals)}</span>
              <Link href={`/kamp/${match.id}`} className="team-match-card-action">Kampkort</Link>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function positionLabel(position: string) {
  if (position === "goalkeeper") return "Keeper";
  if (position === "defender") return "Forsvar";
  if (position === "midfielder") return "Midtbane";
  if (position === "forward") return "Angrep";
  return "Posisjon ikke publisert";
}

function rosterLabel(status: string) {
  if (status === "squad") return "I tropp";
  if (status === "lineup") return "I lagoppstilling";
  return "Kun registrert i kampnotat";
}

function eventName(type: string) {
  if (type === "goal" || type === "penalty_goal") return "Mål";
  if (type === "own_goal") return "Selvmål";
  if (type === "yellow_card") return "Gult kort";
  if (type === "red_card") return "Rødt kort";
  if (type === "substitution") return "Bytte";
  return "Kampnotat";
}
