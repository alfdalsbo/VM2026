import Link from "next/link";

import { displayTeamName } from "@/lib/display";
import type { LineupPlayer, LineupStatus, MatchLineup, WorldCupMatch } from "@/lib/types";

export function LineupBoard({ lineup, match }: { lineup: MatchLineup | null; match: WorldCupMatch }) {
  const hasFormation = Boolean(lineup?.formation.home || lineup?.formation.away);
  const hasPlayers = Boolean(lineup?.players.length);

  if (!lineup || (!hasFormation && !hasPlayers)) {
    return (
      <div className="lineup-empty">
        <p className="eyebrow">Lagoppstilling</p>
        <h3>Ikke publisert ennå</h3>
        <p>Når startelleverne slipper gjennom gratisdata, havner taktikkbildet her.</p>
      </div>
    );
  }

  if (!hasPlayers) {
    return (
      <div className="lineup-empty">
        <div className="lineup-heading">
          <div>
            <p className="eyebrow">Lagoppstilling</p>
            <h3>Formasjon publisert</h3>
          </div>
          <span>{statusLabel(lineup.status)}</span>
        </div>
        <p>
          {displayTeamName(match.homeTeam)}: {lineup.formation.home ?? "-"} · {displayTeamName(match.awayTeam)}: {lineup.formation.away ?? "-"}
        </p>
      </div>
    );
  }

  const starters = lineup.players.filter((player) => player.isStarter);
  const homeBench = lineup.homeBench.length ? lineup.homeBench : lineup.players.filter((player) => !player.isStarter && player.teamSide === "home");
  const awayBench = lineup.awayBench.length ? lineup.awayBench : lineup.players.filter((player) => !player.isStarter && player.teamSide === "away");

  return (
    <div className="lineup-board">
      <div className="lineup-heading">
        <div>
          <p className="eyebrow">Lagoppstilling</p>
          <h2 className="section-title mt-2">Taktikkbildet</h2>
        </div>
        <span>{statusLabel(lineup.status)}</span>
      </div>
      <div className="lineup-formations">
        <strong>{displayTeamName(match.homeTeam)}: {lineup.formation.home ?? "-"}</strong>
        <strong>{displayTeamName(match.awayTeam)}: {lineup.formation.away ?? "-"}</strong>
      </div>
      <div className="lineup-pitch" aria-label={`Taktikkbilde for ${displayTeamName(match.homeTeam)} mot ${displayTeamName(match.awayTeam)}`}>
        {starters.map((player) => (
          <PlayerDot key={`${player.teamSide}-${player.id}`} player={player} />
        ))}
      </div>
      <div className="bench-grid">
        <Bench title={`${displayTeamName(match.homeTeam)} benk`} players={homeBench} />
        <Bench title={`${displayTeamName(match.awayTeam)} benk`} players={awayBench} />
      </div>
    </div>
  );
}

function PlayerDot({ player }: { player: LineupPlayer }) {
  const content = (
    <>
      {player.shirtNumber ? <span>{player.shirtNumber}</span> : null}
      {player.name}
      {player.isCaptain ? <small>C</small> : null}
    </>
  );
  const style = {
    left: `${player.x ?? 50}%`,
    top: `${player.y ?? 50}%`,
  };

  if (!player.playerProfileId) {
    return (
      <span className={`lineup-player lineup-${player.teamSide}`} style={style}>
        {content}
      </span>
    );
  }

  return (
    <Link className={`lineup-player lineup-${player.teamSide}`} href={`/spiller/${player.playerProfileId}`} style={style}>
      {content}
    </Link>
  );
}

function Bench({ title, players }: { title: string; players: LineupPlayer[] }) {
  return (
    <section>
      <h3>{title}</h3>
      {players.length ? (
        <div>
          {players.map((player) =>
            player.playerProfileId ? (
              <Link key={player.id} href={`/spiller/${player.playerProfileId}`}>
                {player.shirtNumber ? `${player.shirtNumber} ` : ""}
                {player.name}
              </Link>
            ) : (
              <span key={player.id}>
                {player.shirtNumber ? `${player.shirtNumber} ` : ""}
                {player.name}
              </span>
            ),
          )}
        </div>
      ) : (
        <p className="lead">Benk ikke publisert.</p>
      )}
    </section>
  );
}

function statusLabel(status: LineupStatus) {
  if (status === "confirmed") return "Bekreftet";
  if (status === "expected") return "Forventet";
  return "Ikke publisert";
}
