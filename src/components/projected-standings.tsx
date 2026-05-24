import { compareStandings, computeProjectedStandings, computeStandings } from "@/lib/scoring";
import type { AppState, Player, WorldCupMatch } from "@/lib/types";

export function ProjectedStandings({
  match,
  player,
  state,
}: {
  match: WorldCupMatch;
  player: Player;
  state: AppState;
}) {
  const isLive = match.status === "live" || match.status === "halftime";
  if (!isLive) return null;

  if (!match.result) {
    return (
      <div className="projection-empty">
        <p className="eyebrow">Hvis dette står seg</p>
        <h2 className="section-title mt-2">Venter på første dommernotat</h2>
        <p className="lead mt-3">Når stillingen kommer inn, regner kjelleren umiddelbart på tabellen.</p>
      </div>
    );
  }

  const comparison = compareStandings(computeStandings(state), computeProjectedStandings(state, [match.id]));

  return (
    <div>
      <p className="eyebrow">Hvis dette står seg</p>
      <h2 className="section-title mt-2">Live tabell</h2>
      <div className="projection-table mt-4">
        {comparison.map((row) => (
          <div key={row.player.id} className={row.player.id === player.id ? "projection-me" : undefined}>
            <span>#{row.rank}</span>
            <strong>{row.player.shortName}</strong>
            <em>{row.totalPoints} p</em>
            <small>{formatDelta(row.pointsDelta, "p")}</small>
            <small>{formatRankDelta(row.rankDelta)}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDelta(value: number, suffix: string) {
  if (value > 0) return `+${value} ${suffix}`;
  if (value < 0) return `${value} ${suffix}`;
  return `0 ${suffix}`;
}

function formatRankDelta(value: number) {
  if (value > 0) return `+${value} plass`;
  if (value < 0) return `${value} plass`;
  return "Uendret";
}
