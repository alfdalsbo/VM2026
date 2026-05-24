import Link from "next/link";

import { formatScore } from "@/lib/format";
import type { MatchEvent } from "@/lib/types";

export function MatchEvents({ events }: { events: MatchEvent[] }) {
  return (
    <div className="match-events">
      <p className="eyebrow">Hendelser</p>
      <h2 className="section-title mt-2">Kampens protokoll</h2>
      {events.length ? (
        <ol className="event-list mt-4">
          {events.map((event) => (
            <li key={event.id}>
              <span>{event.minute != null ? `${event.minute}'` : event.period ?? "-"}</span>
              <strong>{eventLabel(event)}</strong>
              <p>
                {event.playerName ? <PlayerName event={event} /> : null}
                {event.assistPlayerName ? ` · assist ${event.assistPlayerName}` : null}
                {event.relatedPlayerName ? ` · ${event.relatedPlayerName}` : null}
              </p>
              {event.scoreAfter ? <em>{formatScore(event.scoreAfter.homeGoals, event.scoreAfter.awayGoals)}</em> : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="lead mt-3">Ingen hendelser i protokollen ennå.</p>
      )}
    </div>
  );
}

function PlayerName({ event }: { event: MatchEvent }) {
  if (!event.playerProfileId) return <>{event.playerName}</>;
  return <Link href={`/spiller/${event.playerProfileId}`}>{event.playerName}</Link>;
}

function eventLabel(event: MatchEvent) {
  switch (event.type) {
    case "goal":
      return "Mål";
    case "own_goal":
      return "Selvmål";
    case "penalty_goal":
      return "Straffe i mål";
    case "penalty_missed":
      return "Straffebom";
    case "yellow_card":
      return "Gult kort";
    case "red_card":
      return "Rødt kort";
    case "second_yellow":
      return "Andre gule";
    case "substitution":
      return "Bytte";
    case "var":
      return "VAR-sjekk";
    case "period":
      return "Periode";
    default:
      return "Dommernotat";
  }
}
