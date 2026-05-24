import type { MatchLineup, WorldCupMatch } from "@/lib/types";

export function LineupBoard({ lineup, match }: { lineup: MatchLineup | null; match: WorldCupMatch }) {
  if (!lineup || !lineup.players.length) {
    return (
      <div className="lineup-empty">
        <p className="eyebrow">Lagoppstilling</p>
        <h3>Ikke publisert ennå</h3>
        <p>Hvis gratisdata leverer lagoppstilling rundt kampstart, dukker den opp her.</p>
      </div>
    );
  }

  const starters = lineup.players.filter((player) => player.isStarter);
  return (
    <div className="lineup-board">
      <div className="lineup-pitch" aria-label={`Taktikkbilde for ${match.homeTeam} mot ${match.awayTeam}`}>
        {starters.map((player) => (
          <span
            key={player.id}
            className="lineup-player"
            style={{
              left: `${player.x ?? 50}%`,
              top: `${player.y ?? 50}%`,
            }}
          >
            {player.shirtNumber ? `${player.shirtNumber} ` : ""}
            {player.name}
          </span>
        ))}
      </div>
      <p className="lead mt-3">
        Formasjon: {lineup.formation.home ?? "-"} / {lineup.formation.away ?? "-"}
      </p>
    </div>
  );
}
